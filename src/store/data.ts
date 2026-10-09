import { browser } from 'wxt/browser'
import { titleFromUrl, toUrl } from '@/lib/url'
import { toast } from '@/ui/toast'
import { defaults, getState, uid, update } from './store'
import type { Group, Note, Shortcut, Task } from './types'

const FORMAT = 'livedash-backup'

export function exportData(): void {
	const s = getState()
	const payload = {
		format: FORMAT,
		version: 2,
		exportedAt: new Date().toISOString(),
		tasks: s.tasks,
		notes: s.notes,
		shortcuts: s.shortcuts,
		groups: s.groups,
		settings: s.settings,
		calendarUrl: s.calendar.url,
		hidden: s.hidden,
	}
	const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
	const a = document.createElement('a')
	a.href = URL.createObjectURL(blob)
	a.download = `livedash-backup-${new Date().toISOString().slice(0, 10)}.json`
	a.click()
	setTimeout(() => URL.revokeObjectURL(a.href), 1000)
	toast('Backup downloaded', { tone: 'success' })
}

function isArrayOf<T>(v: unknown, check: (x: Record<string, unknown>) => boolean): v is T[] {
	return (
		Array.isArray(v) &&
		v.every((x) => x && typeof x === 'object' && check(x as Record<string, unknown>))
	)
}

export async function importData(file: File): Promise<void> {
	let raw: Record<string, unknown>
	try {
		raw = JSON.parse(await file.text())
	} catch {
		toast('That file isn’t a LiveDash backup (not valid JSON).', { tone: 'error' })
		return
	}
	if (raw.format !== FORMAT) {
		toast('That file isn’t a LiveDash backup.', { tone: 'error' })
		return
	}
	const tasks = isArrayOf<Task>(
		raw.tasks,
		(t) => typeof t.id === 'string' && typeof t.title === 'string',
	)
		? raw.tasks
		: []
	const notes = isArrayOf<Note>(
		raw.notes,
		(n) => typeof n.id === 'string' && typeof n.text === 'string',
	)
		? raw.notes
		: []
	const shortcuts = isArrayOf<Shortcut>(
		raw.shortcuts,
		(x) => typeof x.id === 'string' && typeof x.url === 'string' && !!toUrl(x.url),
	)
		? raw.shortcuts
		: []
	const groups = isArrayOf<Group>(
		raw.groups,
		(g) => typeof g.id === 'string' && typeof g.name === 'string',
	)
		? raw.groups
		: []
	const before = getState()
	const merge = <T extends { id: string }>(cur: T[], inc: T[]) => [
		...cur,
		...inc.filter((x) => !cur.some((c) => c.id === x.id)),
	]
	update('groups', (l) => merge(l, groups))
	update('tasks', (l) => merge(l, tasks))
	update('notes', (l) => merge(l, notes))
	update('shortcuts', (l) => merge(l, shortcuts))
	const added =
		getState().tasks.length -
		before.tasks.length +
		getState().notes.length -
		before.notes.length +
		getState().shortcuts.length -
		before.shortcuts.length
	toast(
		added
			? `Imported ${added} ${added === 1 ? 'item' : 'items'}`
			: 'Nothing new to import — everything was already here',
		{
			tone: 'success',
			undo: added
				? () => {
						update('tasks', () => before.tasks)
						update('notes', () => before.notes)
						update('shortcuts', () => before.shortcuts)
					}
				: undefined,
		},
	)
}

export async function eraseAll(): Promise<void> {
	const d = defaults()
	for (const k of [
		'tasks',
		'notes',
		'shortcuts',
		'groups',
		'focus',
		'calendar',
		'weather',
		'daily',
		'photo',
		'launches',
		'hidden',
		'hours',
		'cache',
	] as const) {
		update(k, () => d[k] as never)
	}
	update('settings', () => d.settings)
	update('ui', (u) => ({ ...u, welcomed: false }))
	try {
		localStorage.removeItem('ld-theme')
		localStorage.removeItem('ld-accent')
		localStorage.removeItem('ld-type')
	} catch {}
	toast('All LiveDash data on this device was erased')
}

interface LegacyTodo {
	text?: string
	completed?: boolean
	date?: string
}
interface LegacyNote {
	title?: string
	body?: string
	createdAt?: number
	updatedAt?: number
}
interface LegacyBookmark {
	title?: string
	url?: string | null
	type?: string
}

export async function migrateLegacy(): Promise<void> {
	if (getState().ui.migrated) return
	const old = await browser.storage.local.get(['todos', 'notes', 'bookmarks'])
	const now = Date.now()
	let n = 0
	const tasks: Task[] = (Array.isArray(old.todos) ? (old.todos as LegacyTodo[]) : [])
		.filter((t) => t?.text?.trim())
		.map((t, i) => {
			const d = t.date ? new Date(t.date.length === 10 ? `${t.date}T00:00:00` : t.date) : null
			return {
				id: uid(),
				title: t.text!.trim(),
				due:
					d && !Number.isNaN(d.getTime())
						? new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()
						: null,
				allDay: true,
				done: !!t.completed,
				doneAt: t.completed ? now : null,
				createdAt: now,
				order: i + 1,
			}
		})
	const notes: Note[] = (Array.isArray(old.notes) ? (old.notes as LegacyNote[]) : [])
		.map((x) => ({
			text: [x.title, x.body].filter(Boolean).join('\n').trim(),
			at: x.updatedAt ?? x.createdAt ?? now,
		}))
		.filter((x) => x.text)
		.map((x) => ({ id: uid(), text: x.text, createdAt: x.at, updatedAt: x.at }))
	const shortcuts: Shortcut[] = (
		Array.isArray(old.bookmarks) ? (old.bookmarks as LegacyBookmark[]) : []
	)
		.filter((b) => b?.type !== 'FOLDER' && b?.url && toUrl(b.url))
		.map((b) => {
			const url = toUrl(b.url!)!
			return {
				id: uid(),
				url,
				title: b.title?.trim() || titleFromUrl(url),
			}
		})
	if (tasks.length) update('tasks', (l) => [...l, ...tasks])
	if (notes.length) update('notes', (l) => [...l, ...notes])
	if (shortcuts.length) update('shortcuts', (l) => [...l, ...shortcuts])
	n = tasks.length + notes.length + shortcuts.length
	update('ui', (u) => ({ ...u, migrated: true }))
	if (n)
		toast(`Brought over ${n} ${n === 1 ? 'item' : 'items'} from the previous version`, {
			tone: 'success',
		})
}
