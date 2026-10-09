import { useState } from 'react'
import { emit } from '@/lib/bus'
import { openUrl } from '@/lib/chrome'
import { dayDiff, formatDue, formatTime, isOverdue } from '@/lib/format'
import { hostOf } from '@/lib/url'
import { parseWhen } from '@/lib/when'
import { addTask, completeTask, REPEAT_LABEL } from '@/store/actions'
import { useStore } from '@/store/store'
import { CheckMark } from '@/ui/controls'
import { Glyph } from '@/ui/Glyph'

export function Today({ now }: { now: number }) {
	const tasks = useStore((s) => s.tasks)
	const events = useStore((s) => s.calendar.events)
	const hasCal = useStore((s) => !!s.calendar.url)
	const cycle = useStore((s) => s.settings.hourCycle)
	const [text, setText] = useState('')
	const [done, setDone] = useState<Set<string>>(new Set())

	const agenda = events
		.filter((e) =>
			e.allDay
				? dayDiff(e.start, now) <= 0 && e.end > now
				: dayDiff(e.start, now) === 0 && e.end > now,
		)
		.slice(0, 5)
	const open = tasks.filter((t) => !t.done || done.has(t.id))
	const due = open
		.filter((t) => t.due !== null && (isOverdue(t.due, t.allDay, now) || dayDiff(t.due, now) === 0))
		.sort((a, b) => (a.due ?? 0) - (b.due ?? 0))
	const next = open
		.filter((t) => t.due !== null && dayDiff(t.due, now) > 0)
		.sort((a, b) => (a.due ?? 0) - (b.due ?? 0))
		.slice(0, Math.max(0, 3 - due.length))
	const undated = open
		.filter((t) => t.due === null)
		.sort((a, b) => a.order - b.order)
		.slice(0, Math.max(0, 2 - due.length))
	const list = [...due, ...next, ...undated].slice(0, 6)
	const p = parseWhen(text)
	const chip = p.due ? formatDue(p.due, p.allDay, cycle, now) : null

	return (
		<section className="col" aria-labelledby="td-title">
			<h2 className="col-head" id="td-title">
				Today
			</h2>
			{agenda.length > 0 && (
				<ul className="agenda">
					{agenda.map((e) => {
						const live = !e.allDay && e.start <= now && e.end > now
						return (
							<li key={`${e.title}${e.start}`} className="agenda-row" data-live={live}>
								<span className="agenda-time">
									{e.allDay ? 'All day' : live ? 'Now' : formatTime(e.start, cycle)}
								</span>
								<span className="agenda-title">{e.title}</span>
								{e.link && (
									<button
										type="button"
										className="text-btn text-btn--accent agenda-join"
										onClick={() => openUrl(e.link!)}
									>
										Join
									</button>
								)}
							</li>
						)
					})}
				</ul>
			)}
			{list.length > 0 && (
				<ul className="col-list">
					{list.map((t) => {
						const overdue = isOverdue(t.due, t.allDay, now)
						const checked = done.has(t.id)
						return (
							<li key={t.id} className="todo" data-done={checked}>
								<button
									type="button"
									role="checkbox"
									className="check"
									aria-checked={checked}
									aria-label={`Done: ${t.title}`}
									onClick={() => {
										setDone((s) => new Set(s).add(t.id))
										setTimeout(() => {
											completeTask(t.id)
											setDone((s) => {
												const n = new Set(s)
												n.delete(t.id)
												return n
											})
										}, 420)
									}}
								>
									<CheckMark />
								</button>
								<span className="todo-text">
									{t.url ? (
										<a className="todo-title" href={t.url}>
											{t.title}
										</a>
									) : (
										<span className="todo-title">{t.title}</span>
									)}
									<span className={`todo-meta${overdue ? ' todo-meta--due' : ''}`}>
										{t.due !== null &&
											(dayDiff(t.due, now) === 0
												? t.allDay
													? 'Today'
													: formatTime(t.due, cycle)
												: formatDue(t.due, t.allDay, cycle, now))}
										{t.repeat && (
											<>
												{' '}
												<Glyph name="repeat" size={11} /> {REPEAT_LABEL[t.repeat]}
											</>
										)}
										{t.url && ` · ${hostOf(t.url)}`}
									</span>
								</span>
							</li>
						)
					})}
				</ul>
			)}
			<form
				className="quick"
				onSubmit={(e) => {
					e.preventDefault()
					if (text.trim() && addTask(text)) setText('')
				}}
			>
				<label className="sr-only" htmlFor="quick-task">
					Add a task. Dates like friday 5pm are understood.
				</label>
				<Glyph name="plus" size={14} />
				<input
					id="quick-task"
					className="quick-input"
					placeholder={list.length ? 'Add a task' : 'Add a task — try “call mum friday 6pm”'}
					value={text}
					autoComplete="off"
					onChange={(e) => setText(e.target.value)}
				/>
				{chip && <span className="quick-chip">{chip}</span>}
			</form>
			<p className="col-foot">
				<button
					type="button"
					className="text-btn"
					onClick={() => emit({ type: 'open', panel: 'tasks' })}
				>
					All tasks{tasks.some((t) => !t.done) ? ` · ${tasks.filter((t) => !t.done).length}` : ''}
				</button>
				{!hasCal && (
					<button
						type="button"
						className="text-btn"
						onClick={() => emit({ type: 'open', panel: 'settings', arg: 'integrations' })}
					>
						Connect a calendar
					</button>
				)}
			</p>
		</section>
	)
}
