import {
	Bookmark,
	CalendarDays,
	CircleCheck,
	CloudSun,
	CornerDownLeft,
	Download,
	Globe,
	Keyboard,
	ListTodo,
	Monitor,
	Moon,
	NotebookPen,
	Pause,
	Pin,
	Play,
	RotateCcw,
	Search,
	Settings,
	Sparkles,
	StickyNote,
	Sun,
} from 'lucide-react'
import type { ReactNode } from 'react'
import { emit } from '@/lib/bus'
import { faviconUrl, isPopup, openUrl, searchWeb } from '@/lib/chrome'
import { formatDue, isOverdue } from '@/lib/format'
import { score } from '@/lib/fuzzy'
import { hostOf, looksLikeUrl, toUrl } from '@/lib/url'
import { parseWhen } from '@/lib/when'
import { addNote, addShortcut, addTask, noteTitle, toggleTask } from '@/store/actions'
import { exportData } from '@/store/data'
import { pause, reset, start } from '@/store/focus-logic'
import { getState, update } from '@/store/store'
import type { State } from '@/store/types'

export interface Mods {
	search: boolean
	note: boolean
	newTab: boolean
}

export interface Item {
	id: string
	group: string
	title: ReactNode
	label: string
	sub?: string
	chip?: string
	icon: ReactNode
	action: string
	run: (m: Mods) => unknown
}

export interface Ctx {
	page?: { url: string; title: string } | null
	bookmarks: { id: string; title: string; url: string }[]
	canBookmarks: boolean
	canTopSites: boolean
}

interface Command {
	id: string
	label: string
	keywords: string
	icon: ReactNode
	when?: (s: State, c: Ctx) => boolean
	run: () => unknown
}

const I = 16

function commands(s: State, ctx: Ctx): Command[] {
	const running = s.focus.status === 'running'
	return [
		{
			id: 'pin-page',
			label: 'Pin this page to shortcuts',
			keywords: 'add current tab bookmark save shortcut',
			icon: <Pin size={I} />,
			when: (_s, c) => !!c.page,
			run: () => {
				const page = ctx.page!
				const s2 = addShortcut(page.url, page.title)
				return s2 ? `Pinned ${s2.title}` : ''
			},
		},
		{
			id: 'note-page',
			label: 'Save this page as a note',
			keywords: 'clip read later link',
			icon: <StickyNote size={I} />,
			when: (_s, c) => !!c.page,
			run: () => {
				const page = ctx.page!
				addNote(`${page.title}\n${page.url}`)
				return 'Saved to notes'
			},
		},
		{
			id: 'new-note',
			label: 'New note',
			keywords: 'write jot',
			icon: <NotebookPen size={I} />,
			when: () => !isPopup(),
			run: () => emit({ type: 'note' }),
		},
		{
			id: 'add-shortcut',
			label: 'Add a shortcut',
			keywords: 'pin site link bookmark',
			icon: <Pin size={I} />,
			when: () => !isPopup(),
			run: () => emit({ type: 'shortcut' }),
		},
		{
			id: 'focus-toggle',
			label: running
				? 'Pause focus timer'
				: s.focus.status === 'paused'
					? 'Resume focus timer'
					: 'Start focus timer',
			keywords: 'pomodoro timer focus session',
			icon: running ? <Pause size={I} /> : <Play size={I} />,
			run: () => {
				update('focus', (f) => (f.status === 'running' ? pause(f) : start(f)))
				return isPopup() ? (running ? 'Focus paused' : 'Focus started') : undefined
			},
		},
		{
			id: 'focus-reset',
			label: 'Reset focus timer',
			keywords: 'pomodoro stop',
			icon: <RotateCcw size={I} />,
			when: (st) => st.focus.status !== 'idle',
			run: () => {
				update('focus', (f) => reset(f, getState().settings))
			},
		},
		{
			id: 'theme-auto',
			label: 'Theme: match system',
			keywords: 'appearance auto mode',
			icon: <Monitor size={I} />,
			run: () => {
				update('settings', (x) => ({ ...x, theme: 'auto' }))
			},
		},
		{
			id: 'theme-light',
			label: 'Theme: light',
			keywords: 'appearance mode',
			icon: <Sun size={I} />,
			run: () => {
				update('settings', (x) => ({ ...x, theme: 'light' }))
			},
		},
		{
			id: 'theme-dark',
			label: 'Theme: dark',
			keywords: 'appearance mode night',
			icon: <Moon size={I} />,
			run: () => {
				update('settings', (x) => ({ ...x, theme: 'dark' }))
			},
		},
		{
			id: 'bookmarks',
			label: 'Search Chrome bookmarks here',
			keywords: 'permission enable bookmarks',
			icon: <Bookmark size={I} />,
			when: (_s, c) => !c.canBookmarks && !isPopup(),
			run: () => emit({ type: 'settings', section: 'privacy' }),
		},
		{
			id: 'suggest',
			label: 'Suggest shortcuts from most-visited sites',
			keywords: 'top sites frequent',
			icon: <Sparkles size={I} />,
			when: () => !isPopup(),
			run: () => emit({ type: 'shortcut', url: 'suggest' }),
		},
		{
			id: 'calendar',
			label: 'Connect a calendar',
			keywords: 'ics ical google outlook events agenda',
			icon: <CalendarDays size={I} />,
			when: () => !isPopup(),
			run: () => emit({ type: 'settings', section: 'calendar' }),
		},
		{
			id: 'weather',
			label: 'Set weather location',
			keywords: 'forecast temperature city',
			icon: <CloudSun size={I} />,
			when: () => !isPopup(),
			run: () => emit({ type: 'settings', section: 'weather' }),
		},
		{
			id: 'export',
			label: 'Export my data',
			keywords: 'backup download json',
			icon: <Download size={I} />,
			when: () => !isPopup(),
			run: () => {
				exportData()
			},
		},
		{
			id: 'settings',
			label: 'Open settings',
			keywords: 'preferences options',
			icon: <Settings size={I} />,
			when: () => !isPopup(),
			run: () => emit({ type: 'settings' }),
		},
		{
			id: 'help',
			label: 'Keyboard shortcuts',
			keywords: 'help keys hotkeys',
			icon: <Keyboard size={I} />,
			when: () => !isPopup(),
			run: () => emit({ type: 'help' }),
		},
	]
}

function quoted(s: string) {
	return `“${s}”`
}

export function buildItems(query: string, s: State, ctx: Ctx): Item[] {
	const q = query.trim()
	const cmds = commands(s, ctx).filter((c) => !c.when || c.when(s, ctx))

	if (!q) {
		const quick: Item[] = cmds
			.filter((c) =>
				[
					'pin-page',
					'note-page',
					'new-note',
					'focus-toggle',
					'add-shortcut',
					'calendar',
					'settings',
					'help',
				].includes(c.id),
			)
			.map((c) => ({
				id: `cmd:${c.id}`,
				group: 'Actions',
				title: c.label,
				label: c.label,
				icon: c.icon,
				action: 'Run',
				run: c.run,
			}))
		const today = s.tasks
			.filter(
				(t) =>
					!t.done &&
					t.due !== null &&
					(isOverdue(t.due, t.allDay) ||
						new Date(t.due).toDateString() === new Date().toDateString()),
			)
			.slice(0, 4)
			.map((t) => taskItem(t, s))
		return [...today, ...quick]
	}

	const intents: Item[] = []
	const url = looksLikeUrl(q) ? toUrl(q) : null
	if (url) {
		intents.push({
			id: 'intent:open',
			group: '',
			title: <>Open {hostOf(url)}</>,
			label: `Open ${hostOf(url)}`,
			sub: url,
			icon: <Globe size={I} />,
			action: 'Open',
			run: (m) => openUrl(url, m.newTab),
		})
	}
	const p = parseWhen(q)
	const taskIntent: Item = {
		id: 'intent:task',
		group: '',
		title: <>Add task {quoted(p.title)}</>,
		label: `Add task ${quoted(p.title)}`,
		chip: p.due ? formatDue(p.due, p.allDay, s.settings.hourCycle) : undefined,
		icon: <ListTodo size={I} />,
		action: 'Add task',
		run: () =>
			addTask(q, { quiet: isPopup() })
				? isPopup()
					? `Task added${p.due ? ` · ${formatDue(p.due, p.allDay, s.settings.hourCycle)}` : ''}`
					: undefined
				: '',
	}
	const noteIntent: Item = {
		id: 'intent:note',
		group: '',
		title: <>New note {quoted(q.length > 48 ? `${q.slice(0, 48)}…` : q)}</>,
		label: 'New note',
		icon: <StickyNote size={I} />,
		action: 'New note',
		run: () => {
			const n = addNote(q)
			if (isPopup()) return 'Saved to notes'
			emit({ type: 'note', id: n.id })
		},
	}
	const searchIntent: Item = {
		id: 'intent:search',
		group: '',
		title: <>Search the web for {quoted(q)}</>,
		label: 'Search the web',
		icon: <Search size={I} />,
		action: 'Search',
		run: (m) => searchWeb(q, m.newTab),
	}
	const question =
		/\?$/.test(q) || /^(what|how|why|who|when|where|is|are|can|does|define|weather)\b/i.test(q)
	if (question) intents.push(searchIntent, taskIntent, noteIntent)
	else intents.push(taskIntent, searchIntent, noteIntent)

	const matches: { item: Item; score: number }[] = []
	for (const sc of s.shortcuts) {
		const v = Math.max(score(q, sc.title), score(q, hostOf(sc.url)) - 5)
		if (v > 0)
			matches.push({
				score: v,
				item: {
					id: `sc:${sc.id}`,
					group: 'Shortcuts',
					title: sc.title,
					label: sc.title,
					sub: hostOf(sc.url),
					icon: <img src={faviconUrl(sc.url, 32)} alt="" />,
					action: 'Open',
					run: (m) => openUrl(sc.url, m.newTab),
				},
			})
	}
	for (const b of ctx.bookmarks) {
		if (s.shortcuts.some((x) => x.url === b.url)) continue
		matches.push({
			score: Math.max(30, score(q, b.title) - 8),
			item: {
				id: `bm:${b.id}`,
				group: 'Bookmarks',
				title: b.title || hostOf(b.url),
				label: b.title || hostOf(b.url),
				sub: hostOf(b.url),
				icon: <img src={faviconUrl(b.url, 32)} alt="" />,
				action: 'Open',
				run: (m) => openUrl(b.url, m.newTab),
			},
		})
	}
	for (const t of s.tasks) {
		if (t.done) continue
		const v = score(q, t.title)
		if (v >= 40) matches.push({ score: v - 10, item: taskItem(t, s) })
	}
	for (const n of s.notes) {
		const v = Math.max(
			score(q, noteTitle(n)),
			n.text.toLowerCase().includes(q.toLowerCase()) ? 45 : 0,
		)
		if (v >= 40)
			matches.push({
				score: v - 12,
				item: {
					id: `note:${n.id}`,
					group: 'Notes',
					title: noteTitle(n),
					label: noteTitle(n),
					icon: <StickyNote size={I} />,
					action: 'Open note',
					run: () => emit({ type: 'note', id: n.id }),
				},
			})
	}
	for (const c of cmds) {
		const v = Math.max(score(q, c.label), score(q, c.keywords) - 15)
		if (v >= 40)
			matches.push({
				score: v,
				item: {
					id: `cmd:${c.id}`,
					group: 'Actions',
					title: c.label,
					label: c.label,
					icon: c.icon,
					action: 'Run',
					run: c.run,
				},
			})
	}
	matches.sort((a, b) => b.score - a.score)
	const capped: Item[] = []
	const perGroup = new Map<string, number>()
	for (const m of matches) {
		const n = perGroup.get(m.item.group) ?? 0
		if (n >= 4) continue
		perGroup.set(m.item.group, n + 1)
		capped.push(m.item)
	}
	const strong = matches[0] && matches[0].score >= 75 && !url
	return strong ? [...capped, ...intents] : [...intents, ...capped]
}

function taskItem(t: State['tasks'][number], s: State): Item {
	return {
		id: `task:${t.id}`,
		group: 'Tasks',
		title: t.title,
		label: t.title,
		chip: t.due ? formatDue(t.due, t.allDay, s.settings.hourCycle) : undefined,
		icon: <CircleCheck size={I} />,
		action: isPopup() ? 'Complete' : 'Show',
		run: () => {
			if (isPopup()) {
				toggleTask(t.id)
				return `Completed “${t.title}”`
			}
			emit({ type: 'task', id: t.id })
		},
	}
}

export const ENTER_ICON = <CornerDownLeft size={14} aria-hidden="true" />
