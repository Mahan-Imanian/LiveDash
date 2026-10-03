import { formatDue } from '@/lib/format'
import { titleFromUrl, toUrl } from '@/lib/url'
import { parseWhen } from '@/lib/when'
import { toast } from '@/ui/toast'
import { getState, uid, update } from './store'
import type { Note, Shortcut, ShortcutIcon, Task } from './types'

function restore<T extends { id: string }>(list: T[], item: T, index: number): T[] {
	if (list.some((x) => x.id === item.id)) return list
	const next = [...list]
	next.splice(Math.min(index, next.length), 0, item)
	return next
}

export function addTask(input: string, opts: { quiet?: boolean } = {}): Task | null {
	const text = input.trim()
	if (!text) {
		toast('Type something first, like “Call Alex tomorrow at 3pm”.', { tone: 'error' })
		return null
	}
	const p = parseWhen(text)
	const tasks = getState().tasks
	const task: Task = {
		id: uid(),
		title: p.title,
		due: p.due,
		allDay: p.allDay,
		done: false,
		doneAt: null,
		createdAt: Date.now(),
		order: tasks.reduce((m, t) => Math.max(m, t.order), 0) + 1,
	}
	update('tasks', (list) => [...list, task])
	if (!opts.quiet) {
		const when = task.due
			? ` · ${formatDue(task.due, task.allDay, getState().settings.hourCycle)}`
			: ''
		toast(`Task added${when}`, {
			tone: 'success',
			undo: () => update('tasks', (list) => list.filter((t) => t.id !== task.id)),
		})
	}
	return task
}

export function toggleTask(id: string): void {
	update('tasks', (list) =>
		list.map((t) =>
			t.id === id ? { ...t, done: !t.done, doneAt: t.done ? null : Date.now() } : t,
		),
	)
}

export function editTask(id: string, input: string, keepDate: boolean): void {
	const text = input.trim()
	if (!text) return
	const p = parseWhen(text)
	update('tasks', (list) =>
		list.map((t) => {
			if (t.id !== id) return t
			if (p.due === null && keepDate) return { ...t, title: text }
			return { ...t, title: p.title, due: p.due, allDay: p.allDay }
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

export function addShortcut(
	rawUrl: string,
	title?: string,
	icon: ShortcutIcon = { kind: 'site' },
): Shortcut | null {
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
	const s: Shortcut = { id: uid(), url, title: title?.trim() || titleFromUrl(url), icon }
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
