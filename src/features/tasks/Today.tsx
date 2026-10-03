import { Check, ChevronRight, Pencil, Trash2 } from 'lucide-react'
import { type DragEvent, type KeyboardEvent, useEffect, useMemo, useRef, useState } from 'react'
import { emit, on } from '@/lib/bus'
import { dayDiff, formatDue, formatTime, isOverdue } from '@/lib/format'
import { parseWhen } from '@/lib/when'
import { clearCompleted, editTask, removeTask, reorderTasks, toggleTask } from '@/store/actions'
import { update, useStore } from '@/store/store'
import type { Task } from '@/store/types'
import { toast } from '@/ui/toast'

type GroupKey = 'overdue' | 'today' | 'upcoming' | 'someday'

const GROUPS: { key: GroupKey; label: string; sortable: boolean }[] = [
	{ key: 'overdue', label: 'Overdue', sortable: false },
	{ key: 'today', label: 'Today', sortable: true },
	{ key: 'upcoming', label: 'Upcoming', sortable: false },
	{ key: 'someday', label: 'No date', sortable: true },
]

const reduceMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches

function groupOf(t: Task, now: number): GroupKey {
	if (t.due === null) return 'someday'
	if (isOverdue(t.due, t.allDay, now)) return 'overdue'
	return dayDiff(t.due, now) === 0 ? 'today' : 'upcoming'
}

export function Today({ now }: { now: number }) {
	const tasks = useStore((s) => s.tasks)
	const events = useStore((s) => s.calendar.events)
	const completedOpen = useStore((s) => s.ui.completedOpen)
	const cycle = useStore((s) => s.settings.hourCycle)
	const [activeId, setActiveId] = useState<string | null>(null)
	const [editing, setEditing] = useState<string | null>(null)
	const [leaving, setLeaving] = useState<Set<string>>(new Set())
	const [drag, setDrag] = useState<{ id: string; over?: string; pos?: 'before' | 'after' } | null>(
		null,
	)
	const listRef = useRef<HTMLDivElement>(null)

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
	const agenda = useMemo(
		() =>
			events
				.filter(
					(e) =>
						dayDiff(e.start, now) <= 0 &&
						e.end > now &&
						(e.allDay
							? dayDiff(e.start, now) === 0 || e.start <= now
							: dayDiff(e.start, now) === 0),
				)
				.slice(0, 6),
		[events, now],
	)
	const openCount = grouped.overdue.length + grouped.today.length
	const rovingId = activeId && flat.some((t) => t.id === activeId) ? activeId : flat[0]?.id

	useEffect(
		() =>
			on((e) => {
				if (e.type !== 'task') return
				setActiveId(e.id)
				requestAnimationFrame(() => {
					const el = listRef.current?.querySelector<HTMLElement>(`[data-task="${e.id}"] .check`)
					el?.scrollIntoView({ block: 'center', behavior: reduceMotion() ? 'auto' : 'smooth' })
					el?.focus()
				})
			}),
		[],
	)

	function focusTask(id: string | undefined) {
		if (!id) return
		setActiveId(id)
		requestAnimationFrame(() =>
			listRef.current?.querySelector<HTMLElement>(`[data-task="${id}"] .check`)?.focus(),
		)
	}

	function complete(t: Task) {
		if (t.done) {
			toggleTask(t.id)
			return
		}
		const finish = () => {
			setLeaving((s) => {
				const n = new Set(s)
				n.delete(t.id)
				return n
			})
			toast(`Completed “${t.title}”`, { tone: 'success', undo: () => toggleTask(t.id) })
		}
		const idx = flat.findIndex((x) => x.id === t.id)
		const nextFocus = flat[idx + 1]?.id ?? flat[idx - 1]?.id
		if (reduceMotion()) {
			toggleTask(t.id)
			finish()
			setActiveId(nextFocus ?? null)
			return
		}
		setLeaving((s) => new Set(s).add(t.id))
		toggleTask(t.id)
		setTimeout(() => {
			finish()
			if (document.activeElement?.closest(`[data-task="${t.id}"]`)) focusTask(nextFocus)
		}, 560)
	}

	function move(t: Task, dir: -1 | 1) {
		const g = groupOf(t, now)
		const meta = GROUPS.find((x) => x.key === g)!
		if (!meta.sortable) {
			toast('Dated tasks are ordered by date. Change the date to move it.')
			return
		}
		const ids = grouped[g].map((x) => x.id)
		const i = ids.indexOf(t.id)
		const j = i + dir
		if (j < 0 || j >= ids.length) return
		const a = ids[i]!
		ids[i] = ids[j]!
		ids[j] = a
		reorderTasks(ids)
		focusTask(t.id)
	}

	function onRowKey(e: KeyboardEvent, t: Task) {
		const i = flat.findIndex((x) => x.id === t.id)
		if (e.altKey && (e.key === 'ArrowUp' || e.key === 'ArrowDown')) {
			e.preventDefault()
			move(t, e.key === 'ArrowUp' ? -1 : 1)
		} else if (e.key === 'ArrowDown' || e.key === 'j') {
			e.preventDefault()
			focusTask(flat[Math.min(flat.length - 1, i + 1)]?.id)
		} else if (e.key === 'ArrowUp' || e.key === 'k') {
			e.preventDefault()
			focusTask(flat[Math.max(0, i - 1)]?.id)
		} else if (e.key === 'Home') {
			e.preventDefault()
			focusTask(flat[0]?.id)
		} else if (e.key === 'End') {
			e.preventDefault()
			focusTask(flat[flat.length - 1]?.id)
		} else if (e.key === 'Enter' || e.key === 'e' || e.key === 'F2') {
			e.preventDefault()
			setEditing(t.id)
		} else if (e.key === 'Delete' || e.key === 'Backspace') {
			e.preventDefault()
			const next = flat[i + 1]?.id ?? flat[i - 1]?.id
			removeTask(t.id)
			focusTask(next)
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
		const at = ids.indexOf(drag.over) + (drag.pos === 'after' ? 1 : 0)
		ids.splice(at, 0, drag.id)
		reorderTasks(ids)
		setDrag(null)
	}

	const empty = flat.length === 0

	return (
		<section aria-labelledby="today-title">
			<div className="section-head">
				<h2 className="section-title" id="today-title">
					Today
				</h2>
				{openCount > 0 && <span className="section-count">{openCount}</span>}
			</div>

			{agenda.length > 0 && (
				<ul className="list" aria-label="Calendar events today">
					{agenda.map((ev) => {
						const isNow = !ev.allDay && ev.start <= now && ev.end > now
						return (
							<li key={`${ev.title}-${ev.start}`} className="agenda-item" data-now={isNow}>
								<span className="agenda-time">
									{ev.allDay ? 'All day' : isNow ? 'Now' : formatTime(ev.start, cycle)}
								</span>
								<span
									className="agenda-title"
									title={ev.location ? `${ev.title} · ${ev.location}` : ev.title}
								>
									{ev.title}
								</span>
							</li>
						)
					})}
				</ul>
			)}

			<span id="task-keys" hidden>
				Space to complete, Enter to edit, Delete to remove, Alt plus arrow keys to reorder.
			</span>

			<div ref={listRef}>
				{empty && (
					<div className="empty">
						<p>
							{done.length
								? 'All clear. Nice work.'
								: 'Nothing planned yet. Type a task in the box above — dates like “Friday 5pm” or “tomorrow” are understood.'}
						</p>
						{!done.length && (
							<div className="empty-actions">
								<button
									type="button"
									className="chip-btn"
									onClick={() => emit({ type: 'palette', text: 'Plan the week tomorrow 9am' })}
								>
									Try “Plan the week tomorrow 9am”
								</button>
							</div>
						)}
					</div>
				)}
				{GROUPS.map((g) => {
					const list = grouped[g.key]
					if (!list.length) return null
					const showLabel = g.key !== 'today' || grouped.overdue.length > 0 || agenda.length > 0
					return (
						<div key={g.key}>
							{showLabel && (
								<div
									className={`group-label${g.key === 'overdue' ? ' group-label--danger' : ''}`}
									id={`tg-${g.key}`}
								>
									{g.label}
									<span className="section-count">{list.length}</span>
								</div>
							)}
							<ul className="list" aria-label={g.label}>
								{list.map((t) => (
									<li
										key={t.id}
										className="task"
										data-task={t.id}
										data-done={t.done && !leaving.has(t.id)}
										data-leaving={leaving.has(t.id)}
										data-dragging={drag?.id === t.id}
										data-drop={drag?.over === t.id ? drag.pos : undefined}
										draggable={g.sortable && editing !== t.id}
										onDragStart={(e) => {
											e.dataTransfer.effectAllowed = 'move'
											e.dataTransfer.setData('text/plain', t.title)
											setDrag({ id: t.id })
										}}
										onDragOver={(e) => onDragOver(e, t, g.key)}
										onDrop={() => onDrop(g.key)}
										onDragEnd={() => setDrag(null)}
									>
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
											onKeyDown={(e) => {
												if (e.key === ' ') return
												onRowKey(e, t)
											}}
										>
											<Check size={12} strokeWidth={3} aria-hidden="true" />
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
													{t.due !== null && (
														<span className="task-due" data-overdue={g.key === 'overdue'}>
															{g.key === 'today'
																? t.allDay
																	? ''
																	: formatTime(t.due, cycle)
																: formatDue(t.due, t.allDay, cycle, now)}
														</span>
													)}
												</span>
												<span className="task-actions">
													<button
														type="button"
														className="icon-btn"
														tabIndex={-1}
														aria-label={`Edit “${t.title}”`}
														onClick={() => setEditing(t.id)}
													>
														<Pencil size={15} />
													</button>
													<button
														type="button"
														className="icon-btn"
														tabIndex={-1}
														aria-label={`Delete “${t.title}”`}
														onClick={() => removeTask(t.id)}
													>
														<Trash2 size={15} />
													</button>
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
				<div>
					<button
						type="button"
						className="completed-toggle"
						aria-expanded={completedOpen}
						aria-controls="completed-list"
						onClick={() => update('ui', (u) => ({ ...u, completedOpen: !u.completedOpen }))}
					>
						<ChevronRight size={14} aria-hidden="true" />
						Completed · {done.length}
					</button>
					{completedOpen && (
						<>
							<ul className="list" id="completed-list" aria-label="Completed tasks">
								{done.slice(0, 30).map((t) => (
									<li key={t.id} className="task" data-done="true" data-task={t.id}>
										<button
											type="button"
											role="checkbox"
											className="check"
											aria-checked="true"
											aria-label={t.title}
											onClick={() => toggleTask(t.id)}
										>
											<Check size={12} strokeWidth={3} aria-hidden="true" />
										</button>
										<span className="task-body">
											<span className="task-title">{t.title}</span>
										</span>
										<span className="task-actions">
											<button
												type="button"
												className="icon-btn"
												aria-label={`Delete “${t.title}”`}
												onClick={() => removeTask(t.id)}
											>
												<Trash2 size={15} />
											</button>
										</span>
									</li>
								))}
							</ul>
							<button type="button" className="more-btn" onClick={clearCompleted}>
								Clear completed
							</button>
						</>
					)}
				</div>
			)}
		</section>
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
	const done = useRef(false)

	function commit() {
		if (done.current) return
		done.current = true
		if (!value.trim()) {
			removeTask(task.id)
		} else {
			editTask(task.id, value, keepDate)
		}
		onDone()
	}

	return (
		<div className="task-edit">
			<input
				className="text-input"
				aria-label="Edit task"
				aria-describedby={`edit-help-${task.id}`}
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
						done.current = true
						onDone()
					}
				}}
			/>
			<span className="input-help" id={`edit-help-${task.id}`}>
				{preview ? `Due ${preview}` : 'No date'}
				{p.due === null && keepDate && task.due !== null && (
					<button
						type="button"
						className="link-btn"
						onMouseDown={(e) => e.preventDefault()}
						onClick={() => setKeepDate(false)}
					>
						Remove date
					</button>
				)}
				<span>· Enter to save, Esc to cancel</span>
			</span>
		</div>
	)
}
