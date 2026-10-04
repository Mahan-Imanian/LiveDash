import { type ReactNode, useEffect, useId, useRef, useState } from 'react'
import { Glyph } from './Glyph'

interface Props {
	open: boolean
	onClose: () => void
	title: string
	kicker?: string
	width?: 'narrow' | 'wide'
	center?: boolean
	children: ReactNode
	actions?: ReactNode
	initialFocus?: string
}

export function Drawer({
	open,
	onClose,
	title,
	kicker,
	width = 'narrow',
	center = false,
	children,
	actions,
	initialFocus,
}: Props) {
	const ref = useRef<HTMLDialogElement>(null)
	const titleId = useId()
	const [mounted, setMounted] = useState(open)
	if (open && !mounted) setMounted(true)

	useEffect(() => {
		const d = ref.current
		if (!d) return
		if (open && !d.open) {
			d.showModal()
			requestAnimationFrame(() => {
				const target = initialFocus ? d.querySelector<HTMLElement>(initialFocus) : null
				if (target) target.focus()
				else if (document.activeElement?.closest('.drawer-actions')) d.focus()
			})
		} else if (!open && d.open) d.close()
	}, [open, initialFocus])

	return (
		<dialog
			ref={ref}
			className={`drawer drawer--${width}${center ? ' drawer--center' : ''}`}
			aria-labelledby={titleId}
			tabIndex={-1}
			onClose={onClose}
			onCancel={(e) => {
				e.preventDefault()
				onClose()
			}}
			onTransitionEnd={(e) => {
				if (e.target === e.currentTarget && !open) setMounted(false)
			}}
			onMouseDown={(e) => {
				if (e.target === e.currentTarget) onClose()
			}}
		>
			{mounted && (
				<div className="drawer-inner">
					<header className="drawer-head">
						<div>
							{kicker && <p className="kicker">{kicker}</p>}
							<h2 className="drawer-title" id={titleId}>
								{title}
							</h2>
						</div>
						<div className="drawer-actions">
							{actions}
							<button type="button" className="icon-btn" aria-label="Close" onClick={onClose}>
								<Glyph name="close" />
							</button>
						</div>
					</header>
					<div className="drawer-body">{children}</div>
				</div>
			)}
		</dialog>
	)
}
