import { Bell, Pause, Play, RotateCcw, SkipForward } from 'lucide-react'
import { useEffect, useState } from 'react'
import { hasPermission, requestPermission } from '@/lib/chrome'
import { formatDuration } from '@/lib/format'
import {
	MODE_LABEL,
	modeMs,
	pause,
	remainingMs,
	reset,
	setMode,
	settle,
	start,
} from '@/store/focus-logic'
import { getState, todayKey, update, useStore } from '@/store/store'
import type { FocusMode } from '@/store/types'
import { Segmented } from '@/ui/controls'
import { toast } from '@/ui/toast'
import { chime } from './chime'

const MODES: { value: FocusMode; label: string }[] = [
	{ value: 'focus', label: 'Focus' },
	{ value: 'short', label: 'Short break' },
	{ value: 'long', label: 'Long break' },
]

export function finishIfDue(): void {
	const s = getState()
	const { state, finished } = settle(s.focus, s.settings)
	if (state === s.focus) return
	update('focus', () => state)
	if (!finished) return
	if (s.settings.focus.sound) chime()
	const next = MODE_LABEL[state.mode].toLowerCase()
	toast(
		finished === 'focus'
			? `Focus session complete. Time for a ${next}.`
			: 'Break’s over. Ready to focus?',
		{
			tone: 'success',
			action: { label: `Start ${next}`, run: () => update('focus', (f) => start(f)) },
		},
	)
}

export function Focus() {
	const focus = useStore((s) => s.focus)
	const settings = useStore((s) => s.settings)
	const [now, setNow] = useState(Date.now())
	const [canNotify, setCanNotify] = useState(true)

	useEffect(() => {
		if (focus.status !== 'running') return
		let timer = 0
		const tick = () => {
			setNow(Date.now())
			finishIfDue()
			const left = remainingMs(getState().focus)
			timer = window.setTimeout(tick, Math.max(50, left % 1000 || 1000))
		}
		tick()
		const vis = () => document.hidden || tick()
		document.addEventListener('visibilitychange', vis)
		return () => {
			clearTimeout(timer)
			document.removeEventListener('visibilitychange', vis)
		}
	}, [focus.status])

	useEffect(() => {
		hasPermission({ permissions: ['notifications'] }).then(setCanNotify)
	}, [])

	const left = remainingMs(focus, now)
	const total = modeMs(focus.mode, settings)
	const progress = total ? 1 - left / total : 0
	const sessionsToday = focus.day === todayKey() ? focus.sessions : 0
	const running = focus.status === 'running'

	async function enableNotify() {
		const ok = await requestPermission({ permissions: ['notifications'] })
		setCanNotify(ok)
		if (ok) {
			update('settings', (s) => ({ ...s, focus: { ...s.focus, notify: true } }))
			toast('You’ll get a notification when a session ends', { tone: 'success' })
		}
	}

	return (
		<section aria-labelledby="focus-title">
			<div className="section-head">
				<h2 className="section-title" id="focus-title">
					Focus
				</h2>
				{sessionsToday > 0 && (
					<span className="section-count" title="Focus sessions completed today">
						{sessionsToday} today
					</span>
				)}
			</div>
			<div className="focus-panel">
				<Segmented
					label="Timer mode"
					value={focus.mode}
					options={MODES}
					onChange={(m) => {
						if (m === focus.mode) return
						update('focus', (f) => setMode(f, m, getState().settings))
					}}
				/>
				<div className="focus-row">
					<p
						className="timer"
						data-status={focus.status}
						role="timer"
						aria-live="off"
						aria-label={`${MODE_LABEL[focus.mode]} timer, ${formatDuration(left)} left${focus.status === 'paused' ? ', paused' : ''}`}
					>
						{formatDuration(left)}
					</p>
					<div className="focus-controls">
						<button
							type="button"
							className="btn btn--primary"
							aria-keyshortcuts="F"
							onClick={() => update('focus', (f) => (f.status === 'running' ? pause(f) : start(f)))}
						>
							{running ? (
								<Pause size={16} aria-hidden="true" />
							) : (
								<Play size={16} aria-hidden="true" />
							)}
							{running ? 'Pause' : focus.status === 'paused' ? 'Resume' : 'Start'}
						</button>
						{focus.status !== 'idle' ? (
							<button
								type="button"
								className="icon-btn icon-btn--md"
								aria-label="Reset timer"
								title="Reset timer"
								onClick={() => update('focus', (f) => reset(f, getState().settings))}
							>
								<RotateCcw size={16} />
							</button>
						) : (
							<button
								type="button"
								className="icon-btn icon-btn--md"
								aria-label={`Skip to ${MODE_LABEL[focus.mode === 'focus' ? 'short' : 'focus']}`}
								title="Skip"
								onClick={() =>
									update('focus', (f) =>
										setMode(f, f.mode === 'focus' ? 'short' : 'focus', getState().settings),
									)
								}
							>
								<SkipForward size={16} />
							</button>
						)}
					</div>
				</div>
				<div className="progress" aria-hidden="true">
					<div
						className="progress-bar"
						style={{ transform: `scaleX(${Math.max(0, Math.min(1, progress))})` }}
					/>
				</div>
				{focus.lastCompletedAt && !canNotify && !settings.focus.notify && (
					<div className="inline-note">
						<Bell size={14} aria-hidden="true" />
						<span>Want a notification when a session ends, even if this tab is closed?</span>
						<button type="button" className="link-btn" onClick={enableNotify}>
							Turn on
						</button>
					</div>
				)}
			</div>
		</section>
	)
}
