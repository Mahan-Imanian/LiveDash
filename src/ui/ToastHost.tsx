import { useEffect, useRef } from 'react'
import { dismissToast, runUndo, useToast } from './toast'

export function ToastHost() {
	const t = useToast()
	const hold = useRef(false)

	useEffect(() => {
		if (!t) return
		let left = t.undo || t.action ? 7000 : t.tone === 'error' ? 8000 : 3200
		const timer = setInterval(() => {
			if (hold.current || document.hidden) return
			left -= 250
			if (left <= 0) dismissToast(t.id)
		}, 250)
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
					onPointerEnter={() => {
						hold.current = true
					}}
					onPointerLeave={() => {
						hold.current = false
					}}
					onFocusCapture={() => {
						hold.current = true
					}}
					onBlurCapture={() => {
						hold.current = false
					}}
				>
					<span className="toast-mark" aria-hidden="true" />
					<span className="toast-msg">{t.message}</span>
					{t.undo && (
						<button type="button" onClick={() => runUndo()}>
							undo
						</button>
					)}
					{t.action && (
						<button
							type="button"
							onClick={() => {
								t.action?.run()
								dismissToast(t.id)
							}}
						>
							{t.action.label.toLowerCase()}
						</button>
					)}
					<button type="button" aria-label="Dismiss" onClick={() => dismissToast(t.id)}>
						×
					</button>
				</div>
			)}
		</div>
	)
}
