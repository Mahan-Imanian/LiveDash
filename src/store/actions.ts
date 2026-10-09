import { formatDue } from '@/lib/format'
import { titleFromUrl, toUrl } from '@/lib/url'
import { nextOccurrence, parseWhen, type Repeat } from '@/lib/when'
import { toast } from '@/ui/toast'
import { newTask } from './defaults'
import { getState, uid, update } from './store'
import type { Group, Note, Shortcut, Task } from './types'

function restore<T extends { id: string }>(list: T[], item: T, index: number): T[] {
	if (list.some((x) => x.id === item.id)) return list
	const next = [...list]
	next.splice(Math.min(index, next.length), 0, item)
	return next
}

export function addTask(input: string, opts: { quiet?: boolean; url?: string } = {}): Task | null {
	const text = input.trim()
	if (!text) {
		toast('Type something first, like “Call Alex tomorrow at 3pm”.', { tone: 'error' })
		return null
	}
	const task = newTask(parseWhen(text), getState().tasks, opts.url)
	update('tasks', (list) => [...list, task])
	if (!opts.quiet) {
		const when = task.due
			? ` · ${formatDue(task.due, task.allDay, getState().settings.hourCycle)}`
			: ''
		toast(`Added${when}${task.repeat ? `, repeats ${REPEAT_LABEL[task.repeat]}` : ''}`, {
			tone: 'success',
			undo: () => update('tasks', (list) => list.filter((t) => t.id !== task.id)),
		})
	}
	return task
}

export const REPEAT_LABEL: Record<Repeat, string> = {
	daily: 'daily',
	weekdays: 'on weekdays',
	weekly: 'weekly',
	monthly: 'monthly',
	yearly: 'yearly',
}

export function completeTask(id: string): void {
	const t = getState().tasks.find((x) => x.id === id)
	if (!t) return
	if (t.done) {
		update('tasks', (list) =>
			list.map((x) => (x.id === id ? { ...x, done: false, doneAt: null } : x)),
		)
		return
	}
	if (t.repeat && t.due !== null) {
		const before = t
		const repeatDay = t.repeatDay ?? new Date(t.due).getDate()
		const due = nextOccurrence(t.due, t.repeat, Date.now(), repeatDay)
		const keepDay = t.repeat === 'monthly' || t.repeat === 'yearly' ? { repeatDay } : {}
		update('tasks', (list) => list.map((x) => (x.id === id ? { ...x, due, ...keepDay } : x)))
		toast(`Done. Next: ${formatDue(due, t.allDay, getState().settings.hourCycle).toLowerCase()}`, {
			tone: 'success',
			undo: () => update('tasks', (list) => list.map((x) => (x.id === id ? before : x))),
		})
		return
	}
	update('tasks', (list) =>
		list.map((x) => (x.id === id ? { ...x, done: true, doneAt: Date.now() } : x)),
	)
	toast(`Done: ${t.title}`, {
		tone: 'success',
		undo: () =>
			update('tasks', (list) =>
				list.map((x) => (x.id === id ? { ...x, done: false, doneAt: null } : x)),
			),
	})
}

export function editTask(id: string, input: string, keepDate: boolean): void {
	const text = input.trim()
	if (!text) return
	const p = parseWhen(text)
	update('tasks', (list) =>
		list.map((t) => {
			if (t.id !== id) return t
			if (p.due === null && keepDate) return { ...t, title: text }
			return {
				...t,
				title: p.title,
				due: p.due,
				allDay: p.allDay,
				repeat: p.repeat,
				repeatDay: p.repeatDay,
			}
		}),
	)
}

export function removeTask(id: string): void {
	const list = getState().tasks
	const index = list.findIndex((t) => t.id === id)
	if (index < 0) return
	const item = list[index]
	update('tasks', (l) => l.filter((t) => t.id !== id))
	toast(`Deleted “${item.title}”`, { undo: () => update('tasks', (l) => restore(l, item, index)) })
}

export function clearCompleted(): void {
	const before = getState().tasks
	const done = before.filter((t) => t.done)
	if (!done.length) return
	update('tasks', (l) => l.filter((t) => !t.done))
	toast(`Cleared ${done.length} completed ${done.length === 1 ? 'task' : 'tasks'}`, {
		undo: () =>
			update('tasks', (l) => [...l, ...done.filter((d) => !l.some((x) => x.id === d.id))]),
	})
}

export function reorderTasks(ids: string[]): void {
	const pos = new Map(ids.map((id, i) => [id, i]))
	const orders = ids
		.map((id) => getState().tasks.find((t) => t.id === id)?.order ?? 0)
		.sort((a, b) => a - b)
	update('tasks', (list) =>
		list.map((t) => (pos.has(t.id) ? { ...t, order: orders[pos.get(t.id)!] } : t)),
	)
}

export function addNote(text = ''): Note {
	const now = Date.now()
	const note: Note = { id: uid(), text, createdAt: now, updatedAt: now }
	update('notes', (list) => [note, ...list])
	return note
}

export function saveNote(id: string, text: string): void {
	update('notes', (list) =>
		list.map((n) => (n.id === id && n.text !== text ? { ...n, text, updatedAt: Date.now() } : n)),
	)
}

export function removeNote(id: string): void {
	const list = getState().notes
	const index = list.findIndex((n) => n.id === id)
	if (index < 0) return
	const item = list[index]
	update('notes', (l) => l.filter((n) => n.id !== id))
	if (item.text.trim()) {
		toast('Note deleted', { undo: () => update('notes', (l) => restore(l, item, index)) })
	}
}

export function noteTitle(n: Note): string {
	return n.text.trim().split('\n')[0].slice(0, 120) || 'Empty note'
}

export function togglePinNote(id: string): void {
	update('notes', (list) => list.map((n) => (n.id === id ? { ...n, pinned: !n.pinned } : n)))
}

export function addGroup(name: string): Group | null {
	const clean = name.trim().slice(0, 32)
	if (!clean) return null
	const existing = getState().groups.find((g) => g.name.toLowerCase() === clean.toLowerCase())
	if (existing) return existing
	const g: Group = { id: uid(), name: clean }
	update('groups', (l) => [...l, g])
	return g
}

export function renameGroup(id: string, name: string): void {
	const clean = name.trim().slice(0, 32)
	if (!clean) return
	update('groups', (l) => l.map((g) => (g.id === id ? { ...g, name: clean } : g)))
}

export function removeGroup(id: string): void {
	const before = { groups: getState().groups, shortcuts: getState().shortcuts }
	const g = before.groups.find((x) => x.id === id)
	if (!g) return
	update('groups', (l) => l.filter((x) => x.id !== id))
	update('shortcuts', (l) => l.map((s) => (s.group === id ? { ...s, group: undefined } : s)))
	update('ui', (u) => (u.group === id ? { ...u, group: 'all' } : u))
	toast(`Removed group “${g.name}”. Its sites are still pinned.`, {
		undo: () => {
			update('groups', () => before.groups)
			update('shortcuts', () => before.shortcuts)
		},
	})
}

export function addShortcut(rawUrl: string, title?: string, group?: string): Shortcut | null {
	const url = toUrl(rawUrl)
	if (!url) {
		toast('That doesn’t look like a web address. Try something like example.com.', {
			tone: 'error',
		})
		return null
	}
	const existing = getState().shortcuts.find((s) => s.url === url)
	if (existing) {
		toast(`${existing.title} is already pinned`)
		return existing
	}
	const s: Shortcut = {
		id: uid(),
		url,
		title: title?.trim() || titleFromUrl(url),
		group: group && group !== 'all' ? group : undefined,
	}
	update('shortcuts', (list) => [...list, s])
	return s
}

export function editShortcut(id: string, patch: Partial<Omit<Shortcut, 'id'>>): boolean {
	if (patch.url !== undefined) {
		const url = toUrl(patch.url)
		if (!url) {
			toast('That doesn’t look like a web address.', { tone: 'error' })
			return false
		}
		patch = { ...patch, url }
	}
	update('shortcuts', (list) => list.map((s) => (s.id === id ? { ...s, ...patch } : s)))
	return true
}

export function removeShortcut(id: string): void {
	const list = getState().shortcuts
	const index = list.findIndex((s) => s.id === id)
	if (index < 0) return
	const item = list[index]
	update('shortcuts', (l) => l.filter((s) => s.id !== id))
	toast(`Unpinned ${item.title}`, {
		undo: () => update('shortcuts', (l) => restore(l, item, index)),
	})
}

export function moveItem<T extends { id: string }>(list: T[], id: string, to: number): T[] {
	const from = list.findIndex((x) => x.id === id)
	if (from < 0) return list
	const clamped = Math.max(0, Math.min(list.length - 1, to))
	if (clamped === from) return list
	const next = [...list]
	const [item] = next.splice(from, 1)
	next.splice(clamped, 0, item)
	return next
}

export function hideSuggestion(key: string, label: string): void {
	update('hidden', (l) => (l.includes(key) ? l : [...l, key]))
	toast(`Won’t suggest ${label} again`, {
		undo: () => update('hidden', (l) => l.filter((k) => k !== key)),
	})
}

export function togglePin(url: string, title: string): void {
	const existing = getState().shortcuts.find((s) => s.url === url)
	if (existing) removeShortcut(existing.id)
	else if (addShortcut(url, title)) toast(`Pinned ${title}`, { tone: 'success' })
}
