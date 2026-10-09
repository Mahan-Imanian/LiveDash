import {
	closeTabs,
	type DeviceTab,
	logLaunch,
	openAll,
	restoreClosed,
	type Snapshot,
	switchToTab,
} from '@/lib/browser'
import { emit } from '@/lib/bus'
import { isPopup, openUrl, searchWeb } from '@/lib/chrome'
import { engineName, engineUrl, matchKeyword } from '@/lib/engines'
import { formatDue, formatRelative, isOverdue } from '@/lib/format'
import { score } from '@/lib/fuzzy'
import {
	COMMAND_KEYWORD_PENALTY_POINTS,
	COMMAND_MIN_POINTS,
	COMMAND_TOP_HIT_MIN_POINTS,
	type Dest,
	ITEM_MIN_TEXT_POINTS,
	rankQuery,
	TOP_HIT_MIN_TEXT_POINTS,
} from '@/lib/rank'
import { hostOf, looksLikeUrl, toUrl } from '@/lib/url'
import { parseWhen } from '@/lib/when'
import {
	addNote,
	addTask,
	completeTask,
	hideSuggestion,
	noteTitle,
	REPEAT_LABEL,
	togglePin,
} from '@/store/actions'
import { exportData } from '@/store/data'
import { pause, reset, start } from '@/store/focus-logic'
import { startFocus } from '@/store/focus-run'
import { getState, update } from '@/store/store'
import type { State, Task } from '@/store/types'
import type { GlyphName } from '@/ui/Glyph'
import { toast } from '@/ui/toast'

export interface Mods {
	newTab: boolean
	later: boolean
	web: boolean
}

export type Icon = { favicon: string; label: string } | { glyph: GlyphName }

export interface Action {
	label: string
	glyph?: GlyphName
	run: () => unknown
}

export type Cat =
	| 'top'
	| 'Open tabs'
	| 'Shortcuts'
	| 'History'
	| 'Bookmarks'
	| 'Other devices'
	| 'Tasks'
	| 'Notes'
	| 'Commands'
	| 'Also'

export interface Row {
	id: string
	cat: Cat
	icon: Icon
	title: string
	sub?: string
	meta?: string
	tone?: 'live' | 'due'
	key?: string
	verb: string
	run: (m: Mods) => unknown
	actions?: Action[]
}

export interface Page {
	url: string
	title: string
}

const ORDER: Cat[] = [
	'Open tabs',
	'Shortcuts',
	'History',
	'Bookmarks',
	'Other devices',
	'Tasks',
	'Notes',
	'Commands',
	'Also',
]

function webUrl(s: State, q: string): string | null {
	return engineUrl(s.settings.engine, s.settings.customEngine, q)
}

async function go(url: string, q: string, m: Mods, d?: Dest) {
	logLaunch(url, q)
	if (
		d?.tabId !== undefined &&
		d.windowId !== undefined &&
		getState().settings.switchTabs &&
		!m.newTab
	) {
		await switchToTab(d.tabId, d.windowId)
		return
	}
	await openUrl(url, m.newTab)
}

export function destActions(
	url: string,
	title: string,
	key?: string,
	pinned?: boolean,
	q = '',
): Action[] {
	return [
		{
			label: 'Open in new tab',
			glyph: 'tabs',
			run: () => go(url, q, { newTab: true, later: false, web: false }),
		},
		{
			label: pinned ? 'Remove from shortcuts' : 'Add to shortcuts',
			glyph: 'pin',
			run: () => togglePin(url, title),
		},
		{ label: 'Save for later', glyph: 'later', run: () => addTask(title, { url }) },
		{
			label: 'Copy link',
			glyph: 'link',
			run: () => navigator.clipboard.writeText(url).then(() => toast('Link copied')),
		},
		...(key && !pinned
			? [
					{
						label: 'Never suggest this',
						glyph: 'close' as GlyphName,
						run: () => hideSuggestion(key, hostOf(url)),
					},
				]
			: []),
	]
}

function destRow(d: Dest, q: string): Row {
	const open = d.tabId !== undefined
	const switching = open && getState().settings.switchTabs
	const pinned = d.pinned !== undefined
	return {
		id: `d:${d.key}`,
		cat: open
			? 'Open tabs'
			: pinned
				? 'Shortcuts'
				: d.bookmark && !d.visits
					? 'Bookmarks'
					: 'History',
		icon: { favicon: d.url, label: d.title },
		title: d.title,
		sub: d.host + d.path,
		meta: switching ? 'open' : d.lastVisit ? formatRelative(d.lastVisit) : undefined,
		tone: switching ? 'live' : undefined,
		verb: switching ? 'Switch to tab' : 'Open',
		run: (m) => go(d.url, q, m, d),
		actions: [
			...(switching
				? [{ label: 'Open here instead', glyph: 'go' as GlyphName, run: () => openUrl(d.url) }]
				: []),
			...destActions(d.url, d.title, d.key, pinned, q),
		],
	}
}

export function taskRow(t: Task, now: number, cat: Cat = 'Tasks'): Row {
	const overdue = isOverdue(t.due, t.allDay, now)
	const cycle = getState().settings.hourCycle
	return {
		id: `t:${t.id}`,
		cat,
		icon: { glyph: t.repeat ? 'repeat' : 'later' },
		title: t.title,
		sub: t.url ? hostOf(t.url) : t.repeat ? `repeats ${REPEAT_LABEL[t.repeat]}` : undefined,
		meta: t.due ? formatDue(t.due, t.allDay, cycle, now) : undefined,
		tone: overdue ? 'due' : undefined,
		verb: t.url ? 'Open' : 'Mark done',
		run: (m) => {
			if (t.url) return openUrl(t.url, m.newTab)
			completeTask(t.id)
			return isPopup() ? `Done: ${t.title}` : undefined
		},
		actions: [
			{ label: 'Mark done', glyph: 'check', run: () => completeTask(t.id) },
			...(t.url
				? [
						{
							label: 'Open in new tab',
							glyph: 'tabs' as GlyphName,
							run: () => openUrl(t.url!, true),
						},
					]
				: []),
			{
				label: 'Show all tasks',
				glyph: 'later',
				run: () => emit({ type: 'open', panel: 'tasks' }),
			},
		],
	}
}

function deviceRow(t: DeviceTab, q: string): Row {
	return {
		id: `v:${t.device}:${t.url}`,
		cat: 'Other devices',
		icon: { favicon: t.url, label: t.title },
		title: t.title,
		sub: `${hostOf(t.url)} · ${t.device}`,
		meta: formatRelative(t.at),
		verb: 'Open',
		run: (m) => go(t.url, q, m),
		actions: destActions(t.url, t.title, undefined, false, q),
	}
}

interface Command {
	id: string
	label: string
	words: string
	glyph: GlyphName
	when?: boolean
	hint?: string
	run: () => unknown
}

function commands(s: State, snap: Snapshot | null, page: Page | null, q: string): Command[] {
	const f = s.focus
	const minutes = /(\d{1,3})\s*(m|min|mins|minutes)?$/i.exec(q.trim())?.[1]
	const lastClosed = snap?.closed[0]
	const dups = snap?.duplicates ?? []
	const groups = s.groups.filter((g) => s.shortcuts.some((x) => x.group === g.id))
	const list: Command[] = [
		{
			id: 'page-later',
			label: 'Save this page for later',
			words: 'read later bookmark keep',
			glyph: 'later',
			when: !!page,
			run: () => (addTask(page!.title, { url: page!.url, quiet: true }) ? 'Saved for later' : ''),
		},
		{
			id: 'page-pin',
			label: 'Add this page to shortcuts',
			words: 'pin shortcut speed dial',
			glyph: 'pin',
			when: !!page,
			run: () => {
				togglePin(page!.url, page!.title)
				return 'Added to shortcuts'
			},
		},
		{
			id: 'page-note',
			label: 'Write a note about this page',
			words: 'clip write',
			glyph: 'note',
			when: !!page,
			run: () => {
				addNote(`${page!.title}\n${page!.url}\n`)
				return 'Saved to notes'
			},
		},
		{
			id: 'focus',
			label:
				f.status === 'running'
					? 'Pause focus'
					: f.status === 'paused'
						? 'Resume focus'
						: `Start focus for ${minutes ?? s.settings.focus.focus} minutes`,
			words: 'focus pomodoro timer deep work concentrate',
			glyph: 'focus',
			hint: 'F',
			run: () => {
				if (f.status === 'running') {
					update('focus', (x) => pause(x))
					return isPopup() ? 'Focus paused' : undefined
				}
				if (f.status === 'paused' && !minutes) {
					update('focus', (x) => start(x))
					return isPopup() ? 'Focus resumed' : undefined
				}
				const msg = startFocus(minutes ? Number(minutes) : undefined)
				if (isPopup()) return msg
				emit({ type: 'focus-mode', on: true })
			},
		},
		{
			id: 'focus-stop',
			label: 'Stop focus',
			words: 'end cancel timer',
			glyph: 'close',
			when: f.status !== 'idle',
			run: () => update('focus', (x) => reset(x, getState().settings)),
		},
		{
			id: 'tasks',
			label: 'Open tasks',
			words: 'todo list later reminders',
			glyph: 'later',
			hint: 'T',
			when: !isPopup(),
			run: () => emit({ type: 'open', panel: 'tasks' }),
		},
		{
			id: 'notes',
			label: 'Open notes',
			words: 'write jot scratch',
			glyph: 'note',
			hint: 'N',
			when: !isPopup(),
			run: () => emit({ type: 'open', panel: 'notes' }),
		},
		{
			id: 'bookmarks',
			label: 'Browse bookmarks',
			words: 'folders favorites',
			glyph: 'bookmark',
			hint: 'B',
			when: !isPopup(),
			run: () => emit({ type: 'open', panel: 'bookmarks' }),
		},
		{
			id: 'restore',
			label: lastClosed ? `Reopen “${lastClosed.title}”` : 'Reopen last closed tab',
			words: 'restore closed undo tab',
			glyph: 'restore',
			when: !!lastClosed,
			run: () => restoreClosed(lastClosed!.id),
		},
		{
			id: 'dedupe',
			label: `Close ${dups.length} duplicate ${dups.length === 1 ? 'tab' : 'tabs'}`,
			words: 'duplicates clean tabs tidy',
			glyph: 'close',
			when: dups.length > 0 && !!snap,
			run: async () => {
				const undo = await closeTabs(dups, snap!.tabs)
				toast(`Closed ${dups.length} duplicate ${dups.length === 1 ? 'tab' : 'tabs'}`, {
					undo: () => void undo(),
				})
				emit({ type: 'refresh' })
			},
		},
		...groups.map<Command>((g) => ({
			id: `group-${g.id}`,
			label: `Open “${g.name}” as a tab group`,
			words: `group workspace session open all ${g.name}`,
			glyph: 'tabs',
			run: () =>
				openAll(
					s.shortcuts.filter((x) => x.group === g.id).map((x) => x.url),
					g.name,
				),
		})),
		{
			id: 'add-shortcut',
			label: 'Add a shortcut',
			words: 'pin site speed dial',
			glyph: 'plus',
			when: !isPopup(),
			run: () => emit({ type: 'shortcut' }),
		},
		{
			id: 'customize',
			label: 'Customize this page',
			words: 'theme background wallpaper layout accent appearance',
			glyph: 'brush',
			hint: 'C',
			when: !isPopup(),
			run: () => emit({ type: 'open', panel: 'customize' }),
		},
		{
			id: 'theme-dark',
			label: 'Theme: dark',
			words: 'appearance night mode',
			glyph: 'moon',
			run: () => update('settings', (x) => ({ ...x, theme: 'dark' })),
		},
		{
			id: 'theme-light',
			label: 'Theme: light',
			words: 'appearance day mode',
			glyph: 'sun',
			run: () => update('settings', (x) => ({ ...x, theme: 'light' })),
		},
		{
			id: 'theme-auto',
			label: 'Theme: match system',
			words: 'appearance auto',
			glyph: 'command',
			run: () => update('settings', (x) => ({ ...x, theme: 'auto' })),
		},
		{
			id: 'minimal',
			label:
				s.settings.modules.pickup || s.settings.modules.today || s.settings.modules.notes
					? 'Quiet layout: hide the columns'
					: 'Show the columns again',
			words: 'minimal focused simple clean layout hide',
			glyph: 'brush',
			when: !isPopup(),
			run: () => {
				const on = s.settings.modules.pickup || s.settings.modules.today || s.settings.modules.notes
				update('settings', (x) => ({
					...x,
					modules: { ...x.modules, pickup: !on, today: !on, notes: !on },
				}))
			},
		},
		{
			id: 'calendar',
			label: 'Connect a calendar',
			words: 'ical ics google outlook meeting agenda',
			glyph: 'command',
			when: !isPopup(),
			run: () => emit({ type: 'open', panel: 'settings', arg: 'integrations' }),
		},
		{
			id: 'weather',
			label: 'Set weather location',
			words: 'forecast temperature city',
			glyph: 'partly',
			when: !isPopup(),
			run: () => emit({ type: 'open', panel: 'customize', arg: 'weather' }),
		},
		{
			id: 'export',
			label: 'Export my data',
			words: 'backup download json',
			glyph: 'command',
			when: !isPopup(),
			run: () => exportData(),
		},
		{
			id: 'settings',
			label: 'Settings',
			words: 'preferences options permissions privacy',
			glyph: 'gear',
			hint: ',',
			when: !isPopup(),
			run: () => emit({ type: 'open', panel: 'settings' }),
		},
		{
			id: 'keys',
			label: 'Keyboard shortcuts',
			words: 'help keys hotkeys',
			glyph: 'keyboard',
			hint: '?',
			when: !isPopup(),
			run: () => emit({ type: 'open', panel: 'settings', arg: 'keys' }),
		},
	]
	return list.filter((c) => c.when !== false)
}

function cmdRow(c: Command): Row {
	return {
		id: `c:${c.id}`,
		cat: 'Commands',
		icon: { glyph: c.glyph },
		title: c.label,
		key: c.hint,
		verb: 'Run',
		run: () => c.run(),
	}
}

function commandScore(q: string, c: Command): number {
	return Math.max(score(q, c.label), score(q, c.words) - COMMAND_KEYWORD_PENALTY_POINTS)
}

export interface Built {
	rows: Row[]
	chip?: string
	mode: 'search' | 'command'
}

export function buildCommands(
	s: State,
	snap: Snapshot | null,
	page: Page | null,
	q: string,
): Row[] {
	return commands(s, snap, page, q)
		.map((c) => ({ c, v: q ? commandScore(q, c) : 50 }))
		.filter((x) => x.v > 0)
		.sort((a, b) => b.v - a.v)
		.map((x) => cmdRow(x.c))
}

export function buildQuery(
	query: string,
	s: State,
	snap: Snapshot | null,
	extra: Dest[],
	page: Page | null,
	now: number,
): Built {
	const text = query.trim()
	if (text.startsWith('>'))
		return { rows: buildCommands(s, snap, page, text.slice(1).trim()), mode: 'command' }

	const top: Row[] = []
	const kw = matchKeyword(text, s.settings.keywords)
	const url = !kw && looksLikeUrl(text) ? toUrl(text) : null
	const p = parseWhen(text)
	const chip = p.due
		? `${formatDue(p.due, p.allDay, s.settings.hourCycle, now)}${p.repeat ? ` · ${REPEAT_LABEL[p.repeat]}` : ''}`
		: undefined
	const engine = engineName(s.settings.engine)

	if (kw) {
		const target = kw.kw.url.replace(/%s/g, encodeURIComponent(kw.query))
		top.push({
			id: 'i:kw',
			cat: 'top',
			icon: { favicon: target, label: kw.kw.name },
			title: kw.query,
			sub: `search ${kw.kw.name}`,
			verb: `Search ${kw.kw.name}`,
			run: (m) => openUrl(target, m.newTab),
		})
	}
	if (url) {
		top.push({
			id: 'i:open',
			cat: 'top',
			icon: { favicon: url, label: hostOf(url) },
			title: hostOf(url),
			sub: url,
			verb: 'Open',
			run: (m) => go(url, text, m),
			actions: destActions(url, hostOf(url), undefined, false, text),
		})
	}

	const ctx = { now, launches: s.launches, hidden: s.hidden }
	const dests = rankQuery(text, [...(snap?.dests ?? s.cache.home), ...extra], ctx)
	const strong =
		dests.length > 0 &&
		Math.max(
			score(text, dests[0].title),
			score(text, dests[0].host),
			score(text, dests[0].host.split('.')[0]),
		) >= TOP_HIT_MIN_TEXT_POINTS
	const destRows = dests.map((d) => destRow(d, text))

	const scoredCmds = commands(s, snap, page, text)
		.map((c) => ({ c, v: commandScore(text, c) }))
		.filter((x) => x.v >= COMMAND_MIN_POINTS)
		.sort((a, b) => b.v - a.v)
		.slice(0, 3)
	const cmdRows = scoredCmds.map((x) => cmdRow(x.c))

	const taskRows = s.tasks
		.filter((t) => !t.done && score(text, t.title) >= ITEM_MIN_TEXT_POINTS)
		.slice(0, 3)
		.map((t) => taskRow(t, now))
	const noteRows = s.notes
		.filter(
			(n) =>
				score(text, noteTitle(n)) >= ITEM_MIN_TEXT_POINTS ||
				(text.length > 2 && n.text.toLowerCase().includes(text.toLowerCase())),
		)
		.slice(0, 3)
		.map<Row>((n) => ({
			id: `n:${n.id}`,
			cat: 'Notes',
			icon: { glyph: 'note' },
			title: noteTitle(n),
			meta: formatRelative(n.updatedAt, now),
			verb: 'Open note',
			run: () => emit({ type: 'open', panel: 'notes', arg: n.id }),
		}))
	const deviceRows = (snap?.devices ?? [])
		.filter(
			(t) => Math.max(score(text, t.title), score(text, hostOf(t.url))) >= ITEM_MIN_TEXT_POINTS,
		)
		.slice(0, 3)
		.map((t) => deviceRow(t, text))

	const searchRow: Row = {
		id: 'i:search',
		cat: 'Also',
		icon: { glyph: 'search' },
		title: text,
		sub: `search ${s.settings.engine === 'default' ? 'the web' : engine}`,
		verb: 'Search',
		run: (m) => searchWeb(text, m.newTab, webUrl(s, text)),
	}
	const laterRow: Row = {
		id: 'i:later',
		cat: 'Also',
		icon: { glyph: p.repeat ? 'repeat' : 'later' },
		title: p.title,
		sub: chip ? undefined : 'add as a task',
		meta: chip,
		tone: chip ? 'live' : undefined,
		verb: 'Add task',
		run: () => {
			const t = addTask(text, { quiet: isPopup() })
			if (!t) return ''
			return isPopup() ? `Added${chip ? ` · ${chip}` : ''}` : undefined
		},
	}
	const noteRow: Row = {
		id: 'i:note',
		cat: 'Also',
		icon: { glyph: 'note' },
		title: text,
		sub: 'write as a note',
		verb: 'Write note',
		run: () => {
			const n = addNote(text)
			if (isPopup()) return 'Saved to notes'
			emit({ type: 'open', panel: 'notes', arg: n.id })
		},
	}

	const cmdStrong = (scoredCmds[0]?.v ?? 0) >= COMMAND_TOP_HIT_MIN_POINTS
	const question =
		/\?$/.test(text) || /^(what|how|why|who|when|where|is|are|can|does|define)\b/i.test(text)
	let rest: Row[] = [...destRows, ...deviceRows, ...taskRows, ...noteRows, ...cmdRows]
	if (!top.length) {
		if (p.due && !strong) top.push({ ...laterRow, cat: 'top' })
		else if (strong && !question) top.push({ ...destRows[0], cat: 'top' })
		else if (cmdStrong && !question) top.push({ ...cmdRows[0], cat: 'top' })
		else top.push({ ...searchRow, cat: 'top' })
	}
	const topId = top[0].id
	rest = rest.filter((r) => r.id !== topId)
	const also = [searchRow, laterRow, noteRow].filter((r) => r.id !== topId)
	rest.sort((a, b) => ORDER.indexOf(a.cat) - ORDER.indexOf(b.cat))
	return { rows: [...top, ...rest, ...also], chip, mode: 'search' }
}
