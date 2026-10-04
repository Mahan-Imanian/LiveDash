import { useEffect, useRef, useState } from 'react'
import { formatDuration } from '@/lib/format'
import { MODE_LABEL, modeMs, pause, remainingMs, reset, setMode, start } from '@/store/focus-logic'
import { finishIfDue } from '@/store/focus-run'
import { getState, todayKey, update, useStore } from '@/store/store'
import { Glyph } from '@/ui/Glyph'

const PRESETS = [15, 25, 50, 90]

export function FocusMode({ onClose }: { onClose: () => void }) {
	const focus = useStore((s) => s.focus)
	const settings = useStore((s) => s.settings)
	const [now, setNow] = useState(Date.now())
	const ref = useRef<HTMLDivElement>(null)
	const primary = useRef<HTMLButtonElement>(null)

	useEffect(() => {
		const before = document.activeElement as HTMLElement | null
		primary.current?.focus()
		return () => before?.focus()
	}, [])

	useEffect(() => {
		let t = 0
		const tick = () => {
			setNow(Date.now())
			finishIfDue()
			t = window.setTimeout(tick, 1000 - (Date.now() % 1000) + 5)
		}
		tick()
		return () => clearTimeout(t)
	}, [])

	const left = remainingMs(focus, now)
	const total = focus.status === 'idle' ? left : Math.max(left, modeMs(focus.mode, settings))
	const progress = total ? 1 - left / total : 0
	const running = focus.status === 'running'
	const sessions = focus.day === todayKey() ? focus.sessions : 0

	function toggle() {
		update('focus', (f) => (f.status === 'running' ? pause(f) : start(f)))
	}

	return (
		<div
			ref={ref}
			className="focus"
			role="dialog"
			aria-modal="true"
			aria-label="Focus mode"
			onKeyDown={(e) => {
				if (e.target instanceof HTMLInputElement) {
					if (e.key === 'Escape') (e.target as HTMLInputElement).blur()
					return
				}
				if (e.key === 'Escape') {
					e.preventDefault()
					e.stopPropagation()
					onClose()
				} else if (e.key === ' ' && e.target === ref.current) {
					e.preventDefault()
					toggle()
				} else if (e.key === 'r') {
					update('focus', (f) => reset(f, getState().settings))
				}
			}}
			tabIndex={-1}
		>
			<div className="focus-inner">
				<p className="kicker">
					{MODE_LABEL[focus.mode]}
					{running ? '' : focus.status === 'paused' ? ' · paused' : ''}
				</p>
				<p className="focus-time" role="timer" aria-live="off">
					{formatDuration(left)}
				</p>
				<div className="focus-bar" aria-hidden="true">
					<span style={{ transform: `scaleX(${Math.max(0, Math.min(1, progress))})` }} />
				</div>
				<label className="sr-only" htmlFor="focus-intent">
					What are you working on?
				</label>
				<input
					id="focus-intent"
					className="focus-intent"
					placeholder="What are you working on?"
					value={focus.intent ?? ''}
					onChange={(e) => update('focus', (f) => ({ ...f, intent: e.target.value }))}
				/>
				<div className="focus-controls">
					<button ref={primary} type="button" className="btn btn--big" onClick={toggle}>
						{running ? 'Pause' : focus.status === 'paused' ? 'Resume' : 'Start'} <kbd>space</kbd>
					</button>
					{focus.status !== 'idle' && (
						<button
							type="button"
							className="btn btn--quiet btn--big"
							onClick={() => update('focus', (f) => reset(f, getState().settings))}
						>
							Reset <kbd>r</kbd>
						</button>
					)}
				</div>
				{focus.status === 'idle' && (
					<div className="focus-presets" role="group" aria-label="Length">
						{PRESETS.map((m) => (
							<button
								key={m}
								type="button"
								className="chip"
								aria-pressed={focus.mode === 'focus' && focus.remaining === m * 60_000}
								onClick={() =>
									update('focus', (f) => ({ ...f, mode: 'focus', remaining: m * 60_000 }))
								}
							>
								{m} min
							</button>
						))}
						<button
							type="button"
							className="chip"
							aria-pressed={focus.mode === 'short'}
							onClick={() => update('focus', (f) => setMode(f, 'short', getState().settings))}
						>
							Break {settings.focus.short}
						</button>
					</div>
				)}
				<p className="focus-foot">
					{sessions > 0 ? `${sessions} ${sessions === 1 ? 'session' : 'sessions'} today · ` : ''}
					<button type="button" className="text-btn" onClick={onClose}>
						Leave focus mode <kbd>esc</kbd>
					</button>{' '}
					The timer keeps running.
				</p>
			</div>
			<button
				type="button"
				className="icon-btn focus-close"
				aria-label="Leave focus mode"
				onClick={onClose}
			>
				<Glyph name="close" />
			</button>
		</div>
	)
}
