import { type DragEvent, type KeyboardEvent, useEffect, useMemo, useRef, useState } from 'react'
import { on } from '@/lib/bus'
import { openUrl } from '@/lib/chrome'
import { dayDiff, formatDue, formatRelative, formatTime, isOverdue } from '@/lib/format'
import { hostOf } from '@/lib/url'
import { parseWhen } from '@/lib/when'
import {
	addNote,
	addTask,
	clearCompleted,
	editTask,
	noteTitle,
	removeNote,
	removeTask,
	reorderTasks,
	saveNote,
	toggleTask,
} from '@/store/actions'
import { getState, update, useStore } from '@/store/store'
import type { Task } from '@/store/types'
import { CheckMark } from '@/ui/controls'
import { toast } from '@/ui/toast'

type GroupKey = 'overdue' | 'today' | 'upcoming' | 'someday'

const GROUPS: { key: GroupKey; label: string; sortable: boolean }[] = [
	{ key: 'overdue', label: 'overdue', sortable: false },
	{ key: 'today', label: 'today', sortable: true },
	{ key: 'upcoming', label: 'upcoming', sortable: false },
	{ key: 'someday', label: 'whenever', sortable: true },
]

const reduceMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches

function groupOf(t: Task, now: number): GroupKey {
	if (t.due === null) return 'someday'
	if (isOverdue(t.due, t.allDay, now)) return 'overdue'
	return dayDiff(t.due, now) === 0 ? 'today' : 'upcoming'
}

function useMinute(): number {
	const [now, setNow] = useState(Date.now())
	useEffect(() => {
		const t = setInterval(() => !document.hidden && setNow(Date.now()), 30_000)
		return () => clearInterval(t)
	}, [])
	return now
}

export function Later({ openNote }: { openNote?: string }) {
	const now = useMinute()
	const tasks = useStore((s) => s.tasks)
	const notes = useStore((s) => s.notes)
	const completedOpen = useStore((s) => s.ui.completedOpen)
	const cycle = useStore((s) => s.settings.hourCycle)
	const [input, setInput] = useState('')
	const [activeId, setActiveId] = useState<string | null>(null)
	const [editing, setEditing] = useState<string | null>(null)
	const [leaving, setLeaving] = useState<Set<string>>(new Set())
	const [drag, setDrag] = useState<{ id: string; over?: string; pos?: 'before' | 'after' } | null>(
		null,
	)
	const [noteId, setNoteId] = useState<string | null>(openNote ?? null)
	const listRef = useRef<HTMLDivElement>(null)
	const inputRef = useRef<HTMLInputElement>(null)

	useEffect(
		() => on((e) => e.type === 'view' && e.view === 'later' && e.note && setNoteId(e.note)),
		[],
	)

	const grouped = useMemo(() => {
		const g: Record<GroupKey, Task[]> = { overdue: [], today: [], upcoming: [], someday: [] }
		for (const t of tasks) if (!t.done || leaving.has(t.id)) g[groupOf(t, now)].push(t)
		g.overdue.sort((a, b) => (a.due ?? 0) - (b.due ?? 0))
		g.today.sort((a, b) => a.order - b.order)
		g.upcoming.sort((a, b) => (a.due ?? 0) - (b.due ?? 0) || a.order - b.order)
		g.someday.sort((a, b) => a.order - b.order)
		return g
	}, [tasks, now, leaving])
	const flat = useMemo(() => GROUPS.flatMap((g) => grouped[g.key]), [grouped])
	const done = useMemo(
		() =>
			tasks
				.filter((t) => t.done && !leaving.has(t.id))
				.sort((a, b) => (b.doneAt ?? 0) - (a.doneAt ?? 0)),
		[tasks, leaving],
	)
	const rovingId = activeId && flat.some((t) => t.id === activeId) ? activeId : flat[0]?.id
	const p = parseWhen(input)

	function focusTask(id: string | undefined) {
		if (!id) return inputRef.current?.focus()
		setActiveId(id)
		requestAnimationFrame(() =>
			listRef.current?.querySelector<HTMLElement>(`[data-task="${id}"] .check`)?.focus(),
		)
	}

	function complete(t: Task) {
		if (t.done) return toggleTask(t.id)
		const idx = flat.findIndex((x) => x.id === t.id)
		const next = flat[idx + 1]?.id ?? flat[idx - 1]?.id
		const finish = () => {
			setLeaving((s) => {
				const n = new Set(s)
				n.delete(t.id)
				return n
			})
			toast(`Done: ${t.title}`, { tone: 'success', undo: () => toggleTask(t.id) })
		}
		toggleTask(t.id)
		if (reduceMotion()) {
			finish()
			return focusTask(next)
		}
		setLeaving((s) => new Set(s).add(t.id))
		setTimeout(() => {
			finish()
			if (document.activeElement?.closest(`[data-task="${t.id}"]`)) focusTask(next)
		}, 580)
	}

	function move(t: Task, dir: -1 | 1) {
		const g = groupOf(t, now)
		if (!GROUPS.find((x) => x.key === g)!.sortable) {
			toast('Dated items stay in date order. Change the date to move one.')
			return
		}
		const ids = grouped[g].map((x) => x.id)
		const i = ids.indexOf(t.id)
		const j = i + dir
		if (j < 0 || j >= ids.length) return
		const a = ids[i]
		ids[i] = ids[j]
		ids[j] = a
		reorderTasks(ids)
		focusTask(t.id)
	}

	function onRowKey(e: KeyboardEvent, t: Task) {
		const i = flat.findIndex((x) => x.id === t.id)
		if (e.altKey && (e.key === 'ArrowUp' || e.key === 'ArrowDown')) {
			e.preventDefault()
			move(t, e.key === 'ArrowUp' ? -1 : 1)
		} else if (e.key === 'ArrowDown') {
			e.preventDefault()
			focusTask(flat[Math.min(flat.length - 1, i + 1)]?.id)
		} else if (e.key === 'ArrowUp') {
			e.preventDefault()
			if (i === 0) inputRef.current?.focus()
			else focusTask(flat[i - 1]?.id)
		} else if (e.key === 'Enter' || e.key === 'F2') {
			e.preventDefault()
			if (e.key === 'Enter' && t.url && !e.shiftKey) openUrl(t.url, e.altKey || e.ctrlKey)
			else setEditing(t.id)
		} else if (e.key === 'e') {
			e.preventDefault()
			setEditing(t.id)
		} else if (e.key === 'Delete' || e.key === 'Backspace') {
			e.preventDefault()
			removeTask(t.id)
			focusTask(flat[i + 1]?.id ?? flat[i - 1]?.id)
		}
	}

	function onDragOver(e: DragEvent, t: Task, g: GroupKey) {
		if (!drag || drag.id === t.id) return
		const from = tasks.find((x) => x.id === drag.id)
		if (!from || groupOf(from, now) !== g) return
		e.preventDefault()
		const r = (e.currentTarget as HTMLElement).getBoundingClientRect()
		const pos = e.clientY < r.top + r.height / 2 ? 'before' : 'after'
		if (drag.over !== t.id || drag.pos !== pos) setDrag({ ...drag, over: t.id, pos })
	}

	function onDrop(g: GroupKey) {
		if (!drag?.over) return setDrag(null)
		const ids = grouped[g].map((x) => x.id).filter((id) => id !== drag.id)
		ids.splice(ids.indexOf(drag.over) + (drag.pos === 'after' ? 1 : 0), 0, drag.id)
		reorderTasks(ids)
		setDrag(null)
	}

	const openNoteData = noteId ? notes.find((n) => n.id === noteId) : undefined
	const sortedNotes = [...notes].sort((a, b) => b.updatedAt - a.updatedAt)
	let index = 0

	if (openNoteData) {
		return (
			<NoteEditor
				key={openNoteData.id}
				id={openNoteData.id}
				initial={openNoteData.text}
				onClose={() => {
					const n = getState().notes.find((x) => x.id === openNoteData.id)
					if (n && !n.text.trim()) removeNote(n.id)
					setNoteId(null)
					requestAnimationFrame(() => inputRef.current?.focus())
				}}
			/>
		)
	}

	return (
		<>
			<form
				className="prompt"
				onSubmit={(e) => {
					e.preventDefault()
					if (!input.trim()) return
					if (addTask(input)) setInput('')
				}}
			>
				<span className="prompt-sigil" aria-hidden="true">
					+
				</span>
				<div className="prompt-field">
					<input
						ref={inputRef}
						className="prompt-input"
						aria-label="Save something for later. Dates like Friday 5pm are understood."
						placeholder="Save something for later…"
						autoComplete="off"
						spellCheck={false}
						autoFocus
						value={input}
						onChange={(e) => setInput(e.target.value)}
						onKeyDown={(e) => {
							if (e.key === 'ArrowDown') {
								e.preventDefault()
								focusTask(rovingId)
							} else if (e.key === 'Enter' && e.shiftKey) {
								e.preventDefault()
								if (!input.trim()) return
								setNoteId(addNote(input).id)
								setInput('')
							}
						}}
					/>
					{p.due && <span className="prompt-chip">{formatDue(p.due, p.allDay, cycle)}</span>}
				</div>
			</form>

			<span id="task-keys" hidden>
				Space to mark done, Enter to open or edit, E to edit, Delete to remove, Alt plus arrow keys
				to reorder.
			</span>

			<div ref={listRef}>
				{flat.length === 0 && (
					<div className="block">
						<p className="empty-line">
							{done.length ? 'Nothing waiting. ' : ''}Type above to save a task, or press ⇧↵ for a
							note. Dates like “friday 5pm” are understood. From any page, Alt+Shift+L saves that
							page here.
						</p>
					</div>
				)}
				{GROUPS.map((g) => {
					const list = grouped[g.key]
					if (!list.length) return null
					return (
						<div className="block" key={g.key}>
							<h2
								className="block-label"
								style={g.key === 'overdue' ? { color: 'var(--danger)' } : undefined}
							>
								{g.label} · {list.length}
							</h2>
							<ul className="list" aria-label={g.label}>
								{list.map((t) => (
									<li
										key={t.id}
										className="task"
										style={{ '--i': index++ } as React.CSSProperties}
										data-task={t.id}
										data-done={t.done && !leaving.has(t.id)}
										data-leaving={leaving.has(t.id)}
										data-dragging={drag?.id === t.id}
										data-drop={drag?.over === t.id ? drag.pos : undefined}
										draggable={g.sortable && editing !== t.id}
										onDragStart={(e) => {
											e.dataTransfer.effectAllowed = 'move'
											setDrag({ id: t.id })
										}}
										onDragOver={(e) => onDragOver(e, t, g.key)}
										onDrop={() => onDrop(g.key)}
										onDragEnd={() => setDrag(null)}
									>
										<span className="task-key" aria-hidden="true" />
										<button
											type="button"
											role="checkbox"
											className="check"
											aria-checked={t.done || leaving.has(t.id)}
											aria-label={t.title}
											aria-describedby="task-keys"
											tabIndex={t.id === rovingId ? 0 : -1}
											onFocus={() => setActiveId(t.id)}
											onClick={() => complete(t)}
											onKeyDown={(e) => e.key !== ' ' && onRowKey(e, t)}
										>
											<CheckMark />
										</button>
										{editing === t.id ? (
											<TaskEditor
												task={t}
												cycle={cycle}
												onDone={() => {
													setEditing(null)
													focusTask(t.id)
												}}
											/>
										) : (
											<>
												<span className="task-body" onDoubleClick={() => setEditing(t.id)}>
													<span className="task-title">{t.title}</span>
													{t.url && (
														<a className="task-link" href={t.url} tabIndex={-1}>
															{hostOf(t.url)}
														</a>
													)}
												</span>
												<span className="task-meta" data-overdue={g.key === 'overdue'}>
													<span className="task-tools">
														<button
															type="button"
															tabIndex={-1}
															onClick={() => setEditing(t.id)}
															aria-label={`Edit ${t.title}`}
														>
															edit
														</button>
														<button
															type="button"
															tabIndex={-1}
															onClick={() => removeTask(t.id)}
															aria-label={`Delete ${t.title}`}
														>
															delete
														</button>
													</span>
													{t.due !== null &&
														(g.key === 'today'
															? t.allDay
																? ''
																: formatTime(t.due, cycle)
															: formatDue(t.due, t.allDay, cycle, now).toLowerCase())}
												</span>
											</>
										)}
									</li>
								))}
							</ul>
						</div>
					)
				})}
			</div>

			{done.length > 0 && (
				<div className="block">
					<button
						type="button"
						className="disclose"
						aria-expanded={completedOpen}
						onClick={() => update('ui', (u) => ({ ...u, completedOpen: !u.completedOpen }))}
					>
						{completedOpen ? '▾' : '▸'} done · {done.length}
					</button>
					{completedOpen && (
						<>
							<ul className="list" aria-label="Done">
								{done.slice(0, 40).map((t) => (
									<li key={t.id} className="task" data-done="true">
										<span className="task-key" aria-hidden="true" />
										<button
											type="button"
											role="checkbox"
											className="check"
											aria-checked="true"
											aria-label={t.title}
											onClick={() => toggleTask(t.id)}
										>
											<CheckMark />
										</button>
										<span className="task-body">
											<span className="task-title">{t.title}</span>
										</span>
										<span className="task-meta">
											<span className="task-tools">
												<button
													type="button"
													onClick={() => removeTask(t.id)}
													aria-label={`Delete ${t.title}`}
												>
													delete
												</button>
											</span>
										</span>
									</li>
								))}
							</ul>
							<button type="button" className="disclose" onClick={clearCompleted}>
								clear done
							</button>
						</>
					)}
				</div>
			)}

			<div className="block">
				<h2 className="block-label">notes · {notes.length}</h2>
				{notes.length === 0 ? (
					<p className="empty-line">
						Notes save as you type and stay on this device. Write one with ⇧↵ above.
					</p>
				) : (
					<div className="list">
						{sortedNotes.map((n, i) => {
							const rest = n.text.trim().split('\n').slice(1).join(' ').trim()
							return (
								<button
									type="button"
									key={n.id}
									className="note-row"
									style={{ '--i': i } as React.CSSProperties}
									onClick={() => setNoteId(n.id)}
								>
									<span aria-hidden="true" />
									<span>
										<span className="note-row-title">{noteTitle(n)}</span>
										{rest && <span className="note-row-sub">{rest.slice(0, 140)}</span>}
									</span>
									<span className="task-meta">{formatRelative(n.updatedAt, now)}</span>
								</button>
							)
						})}
					</div>
				)}
			</div>
		</>
	)
}

function TaskEditor({
	task,
	cycle,
	onDone,
}: {
	task: Task
	cycle: 'auto' | 'h12' | 'h23'
	onDone: () => void
}) {
	const [value, setValue] = useState(task.title)
	const [keepDate, setKeepDate] = useState(true)
	const p = parseWhen(value)
	const preview =
		p.due !== null
			? formatDue(p.due, p.allDay, cycle)
			: keepDate && task.due !== null
				? formatDue(task.due, task.allDay, cycle)
				: null
	const committed = useRef(false)

	function commit() {
		if (committed.current) return
		committed.current = true
		if (!value.trim()) removeTask(task.id)
		else editTask(task.id, value, keepDate)
		onDone()
	}

	return (
		<span className="task-edit">
			<input
				className="line-input"
				aria-label="Edit"
				value={value}
				autoFocus
				onChange={(e) => setValue(e.target.value)}
				onBlur={commit}
				onKeyDown={(e) => {
					if (e.key === 'Enter') {
						e.preventDefault()
						commit()
					} else if (e.key === 'Escape') {
						e.preventDefault()
						e.stopPropagation()
						committed.current = true
						onDone()
					}
				}}
			/>
			<span className="line-help">
				{preview ? `due ${preview.toLowerCase()}` : 'no date'}
				{p.due === null && keepDate && task.due !== null && (
					<>
						{' · '}
						<button
							type="button"
							className="text-btn"
							onMouseDown={(e) => e.preventDefault()}
							onClick={() => setKeepDate(false)}
						>
							remove date
						</button>
					</>
				)}
				{' · ↵ save · esc cancel'}
			</span>
		</span>
	)
}

function NoteEditor({
	id,
	initial,
	onClose,
}: {
	id: string
	initial: string
	onClose: () => void
}) {
	const [text, setText] = useState(initial)
	const [status, setStatus] = useState<'saved' | 'saving'>('saved')
	const timer = useRef(0)
	const latest = useRef(text)
	latest.current = text

	useEffect(
		() => () => {
			clearTimeout(timer.current)
			saveNote(id, latest.current)
		},
		[id],
	)

	function flush() {
		clearTimeout(timer.current)
		saveNote(id, latest.current)
		setStatus('saved')
	}

	return (
		<div className="block">
			<div className="note-editor">
				<label htmlFor={`note-${id}`} className="sr-only">
					Note. The first line is the title.
				</label>
				<textarea
					id={`note-${id}`}
					className="note-text"
					value={text}
					autoFocus
					placeholder="Write. The first line becomes the title."
					onFocus={(e) => {
						const end = e.currentTarget.value.length
						e.currentTarget.setSelectionRange(end, end)
					}}
					onBlur={flush}
					onChange={(e) => {
						setText(e.target.value)
						setStatus('saving')
						clearTimeout(timer.current)
						timer.current = window.setTimeout(() => {
							saveNote(id, e.target.value)
							setStatus('saved')
						}, 400)
					}}
					onKeyDown={(e) => {
						if (e.key === 'Escape') {
							e.preventDefault()
							e.stopPropagation()
							flush()
							onClose()
						}
					}}
				/>
				<div className="note-bar" aria-live="polite">
					<span>{status === 'saving' ? 'saving…' : 'saved on this device'}</span>
					<button
						type="button"
						className="text-btn"
						onClick={() => {
							flush()
							onClose()
						}}
					>
						done
					</button>
					<button
						type="button"
						className="text-btn text-btn--danger"
						onClick={() => {
							clearTimeout(timer.current)
							removeNote(id)
							onClose()
						}}
					>
						delete
					</button>
					<span>esc to close</span>
				</div>
			</div>
		</div>
	)
}
