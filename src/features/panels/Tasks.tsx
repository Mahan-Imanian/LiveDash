import { type DragEvent, type KeyboardEvent, useMemo, useRef, useState } from 'react'
import { openUrl } from '@/lib/chrome'
import { dayDiff, formatDue, formatTime, isOverdue } from '@/lib/format'
import { hostOf } from '@/lib/url'
import { parseWhen } from '@/lib/when'
import {
	addTask,
	clearCompleted,
	completeTask,
	editTask,
	REPEAT_LABEL,
	removeTask,
	reorderTasks,
} from '@/store/actions'
import { update, useStore } from '@/store/store'
import type { Task } from '@/store/types'
import { CheckMark } from '@/ui/controls'
import { Glyph } from '@/ui/Glyph'
import { openMenu } from '@/ui/Menu'
import { toast } from '@/ui/toast'

type G = 'overdue' | 'today' | 'upcoming' | 'someday'
const GROUPS: { key: G; label: string; sortable: boolean }[] = [
	{ key: 'overdue', label: 'Overdue', sortable: false },
	{ key: 'today', label: 'Today', sortable: true },
	{ key: 'upcoming', label: 'Upcoming', sortable: false },
	{ key: 'someday', label: 'Whenever', sortable: true },
]

function groupOf(t: Task, now: number): G {
	if (t.due === null) return 'someday'
	if (isOverdue(t.due, t.allDay, now)) return 'overdue'
	return dayDiff(t.due, now) === 0 ? 'today' : 'upcoming'
}

export function Tasks() {
	const now = Date.now()
	const tasks = useStore((s) => s.tasks)
	const cycle = useStore((s) => s.settings.hourCycle)
	const doneOpen = useStore((s) => s.ui.completedOpen)
	const [input, setInput] = useState('')
	const [editing, setEditing] = useState<string | null>(null)
	const [active, setActive] = useState<string | null>(null)
	const [leaving, setLeaving] = useState<Set<string>>(new Set())
	const [drag, setDrag] = useState<{ id: string; over?: string; pos?: 'before' | 'after' } | null>(
		null,
	)
	const listRef = useRef<HTMLDivElement>(null)
	const inputRef = useRef<HTMLInputElement>(null)

	const grouped = useMemo(() => {
		const g: Record<G, Task[]> = { overdue: [], today: [], upcoming: [], someday: [] }
		for (const t of tasks) if (!t.done || leaving.has(t.id)) g[groupOf(t, now)].push(t)
		g.overdue.sort((a, b) => (a.due ?? 0) - (b.due ?? 0))
		g.today.sort((a, b) => a.order - b.order)
		g.upcoming.sort((a, b) => (a.due ?? 0) - (b.due ?? 0) || a.order - b.order)
		g.someday.sort((a, b) => a.order - b.order)
		return g
	}, [tasks, now, leaving])
	const flat = GROUPS.flatMap((g) => grouped[g.key])
	const done = tasks
		.filter((t) => t.done && !leaving.has(t.id))
		.sort((a, b) => (b.doneAt ?? 0) - (a.doneAt ?? 0))
	const roving = active && flat.some((t) => t.id === active) ? active : flat[0]?.id
	const p = parseWhen(input)

	function focusTask(id: string | undefined) {
		if (!id) return inputRef.current?.focus()
		setActive(id)
		requestAnimationFrame(() =>
			listRef.current?.querySelector<HTMLElement>(`[data-task="${id}"] .check`)?.focus(),
		)
	}

	function complete(t: Task) {
		const i = flat.findIndex((x) => x.id === t.id)
		const next = flat[i + 1]?.id ?? flat[i - 1]?.id
		if (t.repeat) {
			completeTask(t.id)
			return
		}
		setLeaving((s) => new Set(s).add(t.id))
		completeTask(t.id)
		setTimeout(() => {
			setLeaving((s) => {
				const n = new Set(s)
				n.delete(t.id)
				return n
			})
			if (document.activeElement?.closest(`[data-task="${t.id}"]`)) focusTask(next)
		}, 520)
	}

	function move(t: Task, dir: -1 | 1) {
		const g = groupOf(t, now)
		if (!GROUPS.find((x) => x.key === g)!.sortable)
			return toast('Dated tasks stay in date order. Change the date to move one.')
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

	function menu(t: Task) {
		return [
			{
				label: t.repeat ? 'Done for this time' : 'Mark done',
				glyph: 'check' as const,
				hint: 'Space',
				run: () => complete(t),
			},
			{ label: 'Edit', glyph: 'edit' as const, hint: 'E', run: () => setEditing(t.id) },
			...(t.url
				? [{ label: 'Open link', glyph: 'go' as const, run: () => openUrl(t.url!, true) }]
				: []),
			{
				label: 'Delete',
				glyph: 'trash' as const,
				hint: 'Del',
				danger: true,
				run: () => removeTask(t.id),
			},
		]
	}

	function onKey(e: KeyboardEvent, t: Task) {
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
		} else if (e.key === 'Enter' || e.key === 'e' || e.key === 'F2') {
			e.preventDefault()
			if (e.key === 'Enter' && t.url) openUrl(t.url, e.altKey)
			else setEditing(t.id)
		} else if (e.key === 'Delete' || e.key === 'Backspace') {
			e.preventDefault()
			removeTask(t.id)
			focusTask(flat[i + 1]?.id ?? flat[i - 1]?.id)
		} else if (e.key === 'ContextMenu' || (e.shiftKey && e.key === 'F10')) {
			e.preventDefault()
			openMenu(e.currentTarget as HTMLElement, menu(t), `Actions for ${t.title}`)
		}
	}

	function onDragOver(e: DragEvent, t: Task, g: G) {
		if (!drag || drag.id === t.id) return
		const from = tasks.find((x) => x.id === drag.id)
		if (!from || groupOf(from, now) !== g) return
		e.preventDefault()
		const r = (e.currentTarget as HTMLElement).getBoundingClientRect()
		const pos = e.clientY < r.top + r.height / 2 ? 'before' : 'after'
		if (drag.over !== t.id || drag.pos !== pos) setDrag({ ...drag, over: t.id, pos })
	}

	function onDrop(g: G) {
		if (!drag?.over) return setDrag(null)
		const ids = grouped[g].map((x) => x.id).filter((id) => id !== drag.id)
		ids.splice(ids.indexOf(drag.over) + (drag.pos === 'after' ? 1 : 0), 0, drag.id)
		reorderTasks(ids)
		setDrag(null)
	}

	return (
		<div className="tasks">
			<form
				className="panel-search"
				onSubmit={(e) => {
					e.preventDefault()
					if (input.trim() && addTask(input)) setInput('')
				}}
			>
				<Glyph name="plus" />
				<label className="sr-only" htmlFor="task-new">
					New task. Dates and repeats like “every monday 9am” are understood.
				</label>
				<input
					id="task-new"
					ref={inputRef}
					autoFocus
					className="line-input"
					placeholder="New task — “pay rent every month on the 1st”"
					value={input}
					autoComplete="off"
					onChange={(e) => setInput(e.target.value)}
					onKeyDown={(e) => {
						if (e.key === 'ArrowDown') {
							e.preventDefault()
							focusTask(roving)
						}
					}}
				/>
				{p.due && (
					<span className="quick-chip">
						{formatDue(p.due, p.allDay, cycle)}
						{p.repeat ? ` · ${REPEAT_LABEL[p.repeat]}` : ''}
					</span>
				)}
			</form>

			<span id="task-help" hidden>
				Space marks done, Enter edits or opens the link, Delete removes, Alt plus arrows reorders,
				menu key shows actions.
			</span>

			<div ref={listRef}>
				{flat.length === 0 && (
					<p className="panel-hint">
						{done.length ? 'All done. ' : ''}Type a task above. Dates (“friday 5pm”, “in 2 hours”)
						and repeats (“every weekday”) are understood. Right-click any web page to save it here.
					</p>
				)}
				{GROUPS.map((g) => {
					const list = grouped[g.key]
					if (!list.length) return null
					return (
						<section key={g.key} className="task-group" aria-label={g.label}>
							<h3 className={`kicker${g.key === 'overdue' ? ' kicker--due' : ''}`}>
								{g.label} <span className="count">{list.length}</span>
							</h3>
							<ul className="task-list">
								{list.map((t) => (
									<li
										key={t.id}
										className="task"
										data-task={t.id}
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
										onContextMenu={(e) => {
											e.preventDefault()
											openMenu(e, menu(t), `Actions for ${t.title}`)
										}}
									>
										<button
											type="button"
											role="checkbox"
											className="check"
											aria-checked={leaving.has(t.id)}
											aria-label={t.title}
											aria-describedby="task-help"
											tabIndex={t.id === roving ? 0 : -1}
											onFocus={() => setActive(t.id)}
											onClick={() => complete(t)}
											onKeyDown={(e) => e.key !== ' ' && onKey(e, t)}
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
											<span className="task-body" onDoubleClick={() => setEditing(t.id)}>
												<span className="task-title">{t.title}</span>
												<span className="task-meta">
													{t.url && (
														<a href={t.url} className="task-link" tabIndex={-1}>
															{hostOf(t.url)}
														</a>
													)}
													{t.repeat && (
														<span className="task-repeat">
															<Glyph name="repeat" size={11} /> {REPEAT_LABEL[t.repeat]}
														</span>
													)}
													{t.due !== null && (
														<span
															className={
																g.key === 'overdue' ? 'task-due task-due--over' : 'task-due'
															}
														>
															{g.key === 'today'
																? t.allDay
																	? ''
																	: formatTime(t.due, cycle)
																: formatDue(t.due, t.allDay, cycle, now)}
														</span>
													)}
												</span>
											</span>
										)}
										<button
											type="button"
											className="row-more"
											tabIndex={-1}
											aria-label={`Actions for ${t.title}`}
											onClick={(e) => openMenu(e.currentTarget, menu(t), `Actions for ${t.title}`)}
										>
											<Glyph name="more" size={14} />
										</button>
									</li>
								))}
							</ul>
						</section>
					)
				})}
			</div>

			{done.length > 0 && (
				<section className="task-group">
					<button
						type="button"
						className="disclose"
						aria-expanded={doneOpen}
						onClick={() => update('ui', (u) => ({ ...u, completedOpen: !u.completedOpen }))}
					>
						<Glyph name="chevron" size={12} /> Done <span className="count">{done.length}</span>
					</button>
					{doneOpen && (
						<>
							<ul className="task-list">
								{done.slice(0, 40).map((t) => (
									<li key={t.id} className="task" data-done="true">
										<button
											type="button"
											role="checkbox"
											className="check"
											aria-checked="true"
											aria-label={`Not done: ${t.title}`}
											onClick={() => completeTask(t.id)}
										>
											<CheckMark />
										</button>
										<span className="task-body">
											<span className="task-title">{t.title}</span>
										</span>
										<button
											type="button"
											className="row-more"
											aria-label={`Delete ${t.title}`}
											onClick={() => removeTask(t.id)}
										>
											<Glyph name="trash" size={14} />
										</button>
									</li>
								))}
							</ul>
							<button type="button" className="text-btn" onClick={clearCompleted}>
								Clear done
							</button>
						</>
					)}
				</section>
			)}
		</div>
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
	const [keep, setKeep] = useState(true)
	const p = parseWhen(value)
	const preview =
		p.due !== null
			? formatDue(p.due, p.allDay, cycle)
			: keep && task.due !== null
				? formatDue(task.due, task.allDay, cycle)
				: null
	const committed = useRef(false)
	const commit = () => {
		if (committed.current) return
		committed.current = true
		if (!value.trim()) removeTask(task.id)
		else editTask(task.id, value, keep)
		onDone()
	}
	return (
		<span className="task-edit">
			<input
				className="line-input"
				aria-label="Edit task"
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
			<span className="fine">
				{preview ? `Due ${preview}` : 'No date'}
				{p.due === null && keep && task.due !== null && (
					<>
						{' · '}
						<button
							type="button"
							className="text-btn"
							onMouseDown={(e) => e.preventDefault()}
							onClick={() => setKeep(false)}
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
