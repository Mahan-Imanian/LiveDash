import { useEffect, useState } from 'react'
import type { View } from '@/lib/bus'
import { openUrl } from '@/lib/chrome'
import { formatDuration, formatTime } from '@/lib/format'
import { pause, remainingMs, start } from '@/store/focus-logic'
import { finishIfDue } from '@/store/focus-run'
import { update, useStore } from '@/store/store'

function useTick(fast: boolean): number {
	const [now, setNow] = useState(Date.now())
	useEffect(() => {
		let t = 0
		const unit = fast ? 1000 : 60_000
		const tick = () => {
			setNow(Date.now())
			if (fast) finishIfDue()
			t = window.setTimeout(tick, unit - (Date.now() % unit) + 5)
		}
		const vis = () => {
			clearTimeout(t)
			if (!document.hidden) tick()
		}
		tick()
		document.addEventListener('visibilitychange', vis)
		return () => {
			clearTimeout(t)
			document.removeEventListener('visibilitychange', vis)
		}
	}, [fast])
	return now
}

export function Top({ view, onView }: { view: View; onView: (v: View) => void }) {
	const focus = useStore((s) => s.focus)
	const events = useStore((s) => s.calendar.events)
	const tasks = useStore((s) => s.tasks)
	const cycle = useStore((s) => s.settings.hourCycle)
	const now = useTick(focus.status === 'running')

	const date = new Intl.DateTimeFormat(undefined, {
		weekday: 'short',
		day: 'numeric',
		month: 'short',
	}).format(now)
	const current = events.find((e) => !e.allDay && e.start <= now && e.end > now)
	const next = events.find((e) => !e.allDay && e.start > now && e.start - now < 90 * 60_000)
	const mins = next ? Math.max(1, Math.round((next.start - now) / 60_000)) : 0
	const open = tasks.filter((t) => !t.done).length

	return (
		<>
			<div className="context">
				<span className="context-now">
					{date} <time dateTime={new Date(now).toISOString()}>{formatTime(now, cycle)}</time>
				</span>
				{current && (
					<span className="context-hot">
						{current.title} · until {formatTime(current.end, cycle)}
						{current.link && (
							<>
								{' '}
								<button
									type="button"
									className="text-btn text-btn--accent"
									onClick={() => openUrl(current.link!)}
								>
									join
								</button>
							</>
						)}
					</span>
				)}
				{!current && next && (
					<span className={mins <= 10 ? 'context-hot' : undefined}>
						{next.title} in {mins} min
						{next.link && (
							<>
								{' '}
								<button
									type="button"
									className="text-btn text-btn--accent"
									onClick={() => openUrl(next.link!)}
								>
									join
								</button>
							</>
						)}
					</span>
				)}
				{focus.status !== 'idle' && (
					<span className={focus.status === 'running' ? 'context-hot' : undefined}>
						focus {formatDuration(remainingMs(focus, now))}
						{focus.status === 'paused' ? ' paused' : ''}{' '}
						<button
							type="button"
							className="text-btn"
							onClick={() => update('focus', (f) => (f.status === 'running' ? pause(f) : start(f)))}
						>
							{focus.status === 'running' ? 'pause' : 'resume'}
						</button>
					</span>
				)}
			</div>
			<nav className="nav" aria-label="Views">
				<button
					type="button"
					aria-current={view === 'go' ? 'page' : undefined}
					onClick={() => onView('go')}
				>
					go
				</button>
				<button
					type="button"
					aria-current={view === 'later' ? 'page' : undefined}
					onClick={() => onView('later')}
				>
					later{open > 0 && <span className="nav-count">{open}</span>}
				</button>
				<button
					type="button"
					aria-current={view === 'settings' ? 'page' : undefined}
					onClick={() => onView('settings')}
				>
					settings
				</button>
				<button
					type="button"
					aria-current={view === 'keys' ? 'page' : undefined}
					aria-label="Keyboard shortcuts"
					onClick={() => onView('keys')}
				>
					?
				</button>
			</nav>
		</>
	)
}
