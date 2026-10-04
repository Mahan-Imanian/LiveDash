import { closeTabs, logLaunch, restoreClosed, type Snapshot, switchToTab } from '@/lib/browser'
import { emit } from '@/lib/bus'
import { isPopup, openUrl, searchWeb } from '@/lib/chrome'
import { dayDiff, formatDue, formatRelative, isOverdue } from '@/lib/format'
import { score } from '@/lib/fuzzy'
import { type Dest, rankQuery } from '@/lib/rank'
import { hostOf, looksLikeUrl, toUrl } from '@/lib/url'
import { parseWhen } from '@/lib/when'
import { addNote, addTask, hideSuggestion, noteTitle, togglePin, toggleTask } from '@/store/actions'
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

export type Icon = { favicon: string } | { glyph: GlyphName }

export interface Action {
	label: string
	run: () => unknown
}

export interface Row {
	id: string
	section: string
	key?: string
	icon: Icon
	title: string
	host?: string
	path?: string
	text?: string
	meta?: string
	tone?: 'live' | 'due'
	verb: string
	run: (m: Mods) => unknown
	actions?: Action[]
}

export interface Built {
	rows: Row[]
	chip?: string
}

function ago(t: number, now: number): string {
	const m = Math.round((now - t) / 60_000)
	if (m < 1) return 'now'
	if (m < 60) return `${m}m`
	const h = Math.round(m / 60)
	if (h < 24) return `${h}h`
	const d = Math.round(h / 24)
	return d < 30 ? `${d}d` : `${Math.round(d / 30)}mo`
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

function destRow(d: Dest, q: string, now: number, section: string, key?: string): Row {
	const open = d.tabId !== undefined
	const switching = open && getState().settings.switchTabs
	const pinned = d.pinned !== undefined
	const actions: Action[] = [
		{
			label: 'Open in new tab',
			run: () => go(d.url, q, { newTab: true, later: false, web: false }),
		},
		...(switching ? [{ label: 'Open here instead', run: () => openUrl(d.url) }] : []),
		{ label: pinned ? 'Unpin' : 'Pin', run: () => togglePin(d.url, d.title) },
		{ label: 'Save for later', run: () => addTask(d.title, { url: d.url }) },
		{
			label: 'Copy link',
			run: () => navigator.clipboard.writeText(d.url).then(() => toast('Link copied')),
		},
		...(!pinned ? [{ label: 'Never suggest', run: () => hideSuggestion(d.key, d.host) }] : []),
	]
	return {
		id: `d:${d.key}`,
		section,
		key,
		icon: { favicon: d.url },
		title: d.title,
		host: d.host,
		path: d.path,
		meta: switching
			? 'open · switch'
			: open
				? 'open'
				: pinned
					? 'pinned'
					: d.lastVisit
						? ago(d.lastVisit, now)
						: undefined,
		tone: open ? 'live' : undefined,
		verb: switching ? 'Switch to tab' : 'Open',
		run: (m) => go(d.url, q, m, d),
		actions,
	}
}

function taskRow(t: Task, now: number, section: string): Row {
	const overdue = isOverdue(t.due, t.allDay, now)
	const cycle = getState().settings.hourCycle
	return {
		id: `t:${t.id}`,
		section,
		icon: { glyph: 'later' },
		title: t.title,
		host: t.url ? hostOf(t.url) : undefined,
		meta: t.due
			? overdue
				? `overdue · ${formatDue(t.due, t.allDay, cycle, now).toLowerCase()}`
				: formatDue(t.due, t.allDay, cycle, now).toLowerCase()
			: undefined,
		tone: overdue ? 'due' : undefined,
		verb: t.url ? 'Open' : 'Done',
		run: (m) => {
			if (t.url) return openUrl(t.url, m.newTab)
			toggleTask(t.id)
			toast(`Done: ${t.title}`, { tone: 'success', undo: () => toggleTask(t.id) })
			return isPopup() ? `Done: ${t.title}` : undefined
		},
		actions: [
			{
				label: 'Mark done',
				run: () => {
					toggleTask(t.id)
					toast(`Done: ${t.title}`, { tone: 'success', undo: () => toggleTask(t.id) })
				},
			},
			...(t.url ? [{ label: 'Open in new tab', run: () => openUrl(t.url!, true) }] : []),
			{ label: 'Show in Later', run: () => emit({ type: 'view', view: 'later' }) },
		],
	}
}

interface Command {
	id: string
	label: string
	words: string
	glyph: GlyphName
	when?: boolean
	run: () => unknown
}

function commands(
	s: State,
	snap: Snapshot | null,
	page: { url: string; title: string } | null,
	q: string,
): Command[] {
	const f = s.focus
	const minutes = /(\d{1,3})\s*(m|min|mins|minutes)?$/i.exec(q.trim())?.[1]
	const lastClosed = snap?.closed[0]
	const dups = snap?.duplicates ?? []
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
			label: 'Pin this page',
			words: 'add shortcut',
			glyph: 'pin',
			when: !!page,
			run: () => {
				togglePin(page!.url, page!.title)
				return 'Pinned'
			},
		},
		{
			id: 'page-note',
			label: 'Note about this page',
			words: 'clip write',
			glyph: 'note',
			when: !!page,
			run: () => {
				addNote(`${page!.title}\n${page!.url}\n`)
				return 'Saved to notes'
			},
		},
		{
			id: 'later',
			label: 'Open Later',
			words: 'tasks todo reminders notes list',
			glyph: 'later',
			when: !isPopup(),
			run: () => emit({ type: 'view', view: 'later' }),
		},
		{
			id: 'focus',
			label:
				f.status === 'running'
					? 'Pause focus'
					: f.status === 'paused'
						? 'Resume focus'
						: `Start focus · ${minutes ?? s.settings.focus.focus} min`,
			words: 'focus pomodoro timer deep work',
			glyph: 'later',
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
				return isPopup() ? msg : toast(msg, { tone: 'success' })
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
		{
			id: 'theme-dark',
			label: 'Theme: dark',
			words: 'appearance night mode',
			glyph: 'command',
			run: () => update('settings', (x) => ({ ...x, theme: 'dark' })),
		},
		{
			id: 'theme-light',
			label: 'Theme: light',
			words: 'appearance day mode',
			glyph: 'command',
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
			id: 'calendar',
			label: 'Connect a calendar',
			words: 'ical ics google outlook meeting',
			glyph: 'command',
			when: !isPopup(),
			run: () => emit({ type: 'view', view: 'settings' }),
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
			words: 'preferences options permissions',
			glyph: 'command',
			when: !isPopup(),
			run: () => emit({ type: 'view', view: 'settings' }),
		},
		{
			id: 'keys',
			label: 'Keyboard shortcuts',
			words: 'help keys hotkeys',
			glyph: 'command',
			when: !isPopup(),
			run: () => emit({ type: 'view', view: 'keys' }),
		},
	]
	return list.filter((c) => c.when !== false)
}

function cmdRow(c: Command): Row {
	return {
		id: `c:${c.id}`,
		section: 'do',
		icon: { glyph: c.glyph },
		title: c.label,
		verb: 'Run',
		run: () => c.run(),
	}
}

export function buildHome(
	s: State,
	snap: Snapshot | null,
	page: { url: string; title: string } | null,
	now: number,
): Built {
	const rows: Row[] = []
	const home = snap?.home ?? s.cache.home
	if (page) {
		for (const c of commands(s, snap, page, '').filter((c) => c.id.startsWith('page-')))
			rows.push({ ...cmdRow(c), section: 'this page' })
		const tabs = (snap?.tabs ?? [])
			.filter((t) => t.url !== page.url)
			.sort((a, b) => b.lastAccessed - a.lastAccessed)
			.slice(0, 5)
		tabs.forEach((t, i) => {
			const d = snap?.dests.find((x) => x.tabId === t.id)
			if (d) rows.push(destRow(d, '', now, 'recent tabs', String(i + 1)))
		})
		return { rows }
	}
	for (const [i, d] of home.slice(0, 9).entries())
		rows.push(destRow(d, '', now, 'go', String(i + 1)))

	const due = s.tasks
		.filter(
			(t) =>
				!t.done && t.due !== null && (isOverdue(t.due, t.allDay, now) || dayDiff(t.due, now) === 0),
		)
		.sort((a, b) => (a.due ?? 0) - (b.due ?? 0))
	for (const t of due.slice(0, 3)) rows.push(taskRow(t, now, 'due'))

	const closed = snap?.closed ?? s.cache.closed
	for (const c of closed.slice(0, 3)) {
		rows.push({
			id: `x:${c.id}`,
			section: 'pick up',
			icon: c.url ? { favicon: c.url } : { glyph: 'restore' },
			title: c.kind === 'window' ? `${c.title} + ${c.count - 1} more` : c.title,
			host: c.url ? hostOf(c.url) : undefined,
			meta: `closed ${ago(c.at, now)}`,
			verb: c.kind === 'window' ? 'Reopen window' : 'Reopen',
			run: () => restoreClosed(c.id),
		})
	}
	const dups = snap?.duplicates ?? []
	if (snap && dups.length > 0) {
		rows.push({
			id: 'dupes',
			section: 'pick up',
			icon: { glyph: 'switch' },
			title: `${dups.length} duplicate ${dups.length === 1 ? 'tab' : 'tabs'} open`,
			meta: `${snap.tabs.length} tabs`,
			verb: 'Close duplicates',
			run: async () => {
				const undo = await closeTabs(dups, snap.tabs)
				toast(`Closed ${dups.length} duplicate ${dups.length === 1 ? 'tab' : 'tabs'}`, {
					undo: () => void undo(),
				})
				emit({ type: 'refresh' })
			},
		})
	}

	return { rows }
}

export function buildQuery(
	q: string,
	s: State,
	snap: Snapshot | null,
	extra: Dest[],
	page: { url: string; title: string } | null,
	now: number,
): Built {
	const text = q.trim()
	const commandMode = text.startsWith('>')
	const cq = commandMode ? text.slice(1).trim() : text
	const scoredCmds = commands(s, snap, page, cq)
		.map((c) => ({ c, v: cq ? Math.max(score(cq, c.label), score(cq, c.words) - 12) : 50 }))
		.filter((x) => x.v >= (commandMode ? 1 : 62))
		.sort((a, b) => b.v - a.v)
		.slice(0, commandMode ? 12 : 3)
	const cmds = scoredCmds.map((x) => cmdRow(x.c))
	const cmdStrong = (scoredCmds[0]?.v ?? 0) >= 75
	if (commandMode) return { rows: cmds }

	const ctx = { now, launches: s.launches, hidden: s.hidden }
	const dests = rankQuery(text, [...(snap?.dests ?? s.cache.home), ...extra], ctx, 6)
	const strong =
		dests.length > 0 &&
		Math.max(
			score(text, dests[0].title),
			score(text, dests[0].host),
			score(text, dests[0].host.split('.')[0]),
		) >= 70
	const destRows = dests.map((d) => destRow(d, text, now, 'go', ''))

	const tasks = s.tasks
		.filter((t) => !t.done && score(text, t.title) >= 55)
		.slice(0, 3)
		.map((t) => taskRow(t, now, 'later'))
	const notes = s.notes
		.filter(
			(n) =>
				score(text, noteTitle(n)) >= 55 ||
				(text.length > 2 && n.text.toLowerCase().includes(text.toLowerCase())),
		)
		.slice(0, 3)
		.map<Row>((n) => ({
			id: `n:${n.id}`,
			section: 'later',
			icon: { glyph: 'note' },
			title: noteTitle(n),
			meta: formatRelative(n.updatedAt, now),
			verb: 'Open note',
			run: () => emit({ type: 'view', view: 'later', note: n.id }),
		}))

	const p = parseWhen(text)
	const cycle = s.settings.hourCycle
	const chip = p.due ? formatDue(p.due, p.allDay, cycle, now) : undefined
	const url = looksLikeUrl(text) ? toUrl(text) : null
	const intents: Row[] = []
	const openRow: Row | null = url
		? {
				id: 'i:open',
				section: 'go',
				icon: { glyph: 'go' },
				title: hostOf(url),
				path: new URL(url).pathname.replace(/\/$/, ''),
				verb: 'Open',
				run: (m) => go(url, text, m),
			}
		: null
	const searchRow: Row = {
		id: 'i:search',
		section: 'go',
		icon: { glyph: 'search' },
		title: text,
		meta: 'search the web',
		verb: 'Search',
		run: (m) => searchWeb(text, m.newTab),
	}
	const laterRow: Row = {
		id: 'i:later',
		section: 'keep',
		icon: { glyph: 'later' },
		title: p.title,
		meta: chip ? chip.toLowerCase() : 'save for later',
		tone: chip ? 'live' : undefined,
		verb: 'Save for later',
		run: () => {
			const t = addTask(text, { quiet: isPopup() })
			if (!t) return ''
			return isPopup() ? `Saved${chip ? ` · ${chip}` : ''}` : undefined
		},
	}
	const noteRow: Row = {
		id: 'i:note',
		section: 'keep',
		icon: { glyph: 'note' },
		title: text,
		meta: 'write as note',
		verb: 'Write note',
		run: () => {
			const n = addNote(text)
			if (isPopup()) return 'Saved to notes'
			emit({ type: 'view', view: 'later', note: n.id })
		},
	}

	if (openRow) intents.push(openRow)
	if (p.due) intents.push(laterRow, searchRow, noteRow)
	else intents.push(searchRow, laterRow, noteRow)

	const rows =
		cmdStrong && !strong
			? [
					...cmds.slice(0, 1),
					...intents.slice(0, 1),
					...destRows,
					...cmds.slice(1),
					...tasks,
					...notes,
					...intents.slice(1),
				]
			: strong
				? [
						...destRows.slice(0, 1),
						...intents.slice(0, 1),
						...destRows.slice(1),
						...cmds,
						...tasks,
						...notes,
						...intents.slice(1),
					]
				: [...intents.slice(0, 1), ...destRows, ...cmds, ...tasks, ...notes, ...intents.slice(1)]
	return { rows, chip }
}
