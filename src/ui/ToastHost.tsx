import { CircleAlert, CircleCheck, X } from 'lucide-react'
import { useEffect, useRef } from 'react'
import { dismissToast, runUndo, useToast } from './toast'

export function ToastHost() {
	const t = useToast()
	const hover = useRef(false)

	useEffect(() => {
		if (!t) return
		const ms = t.undo || t.action ? 7000 : t.tone === 'error' ? 8000 : 3500
		let left = ms
		const tick = 250
		const timer = setInterval(() => {
			if (hover.current || document.hidden) return
			left -= tick
			if (left <= 0) dismissToast(t.id)
		}, tick)
		return () => clearInterval(timer)
	}, [t])

	return (
		<div className="toast-region" aria-live="polite" aria-atomic="true">
			{t && (
				<div
					key={t.id}
					className="toast"
					data-tone={t.tone}
					role={t.tone === 'error' ? 'alert' : 'status'}
					onMouseEnter={() => {
						hover.current = true
					}}
					onMouseLeave={() => {
						hover.current = false
					}}
					onFocus={() => {
						hover.current = true
					}}
					onBlur={() => {
						hover.current = false
					}}
				>
					{t.tone === 'success' && (
						<CircleCheck size={18} className="toast-icon" aria-hidden="true" />
					)}
					{t.tone === 'error' && (
						<CircleAlert size={18} className="toast-icon" aria-hidden="true" />
					)}
					<span className="toast-msg">{t.message}</span>
					{t.undo && (
						<button type="button" className="btn" onClick={() => runUndo()}>
							Undo
						</button>
					)}
					{t.action && (
						<button
							type="button"
							className="btn"
							onClick={() => {
								t.action?.run()
								dismissToast(t.id)
							}}
						>
							{t.action.label}
						</button>
					)}
					<button
						type="button"
						className="icon-btn"
						aria-label="Dismiss"
						onClick={() => dismissToast(t.id)}
					>
						<X size={16} />
					</button>
				</div>
			)}
		</div>
	)
}
