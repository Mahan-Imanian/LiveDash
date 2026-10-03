import { X } from 'lucide-react'
import { type ReactNode, useEffect, useId, useRef, useState } from 'react'

interface Props {
	open: boolean
	onClose: () => void
	title: string
	variant?: 'center' | 'sheet'
	children: ReactNode
	footer?: ReactNode
	initialFocus?: string
}

export function Dialog({
	open,
	onClose,
	title,
	variant = 'center',
	children,
	footer,
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
			const target = initialFocus ? d.querySelector<HTMLElement>(initialFocus) : null
			target?.focus()
		} else if (!open && d.open) {
			d.close()
		}
	}, [open, initialFocus])

	return (
		<dialog
			ref={ref}
			className={`dialog${variant === 'sheet' ? ' dialog--sheet' : ''}`}
			aria-labelledby={titleId}
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
				<div className="dialog-inner">
					<div className="dialog-head">
						<h2 className="dialog-title" id={titleId}>
							{title}
						</h2>
						<button type="button" className="icon-btn" aria-label="Close" onClick={onClose}>
							<X size={18} />
						</button>
					</div>
					<div className="dialog-body">{children}</div>
					{footer && <div className="dialog-foot">{footer}</div>}
				</div>
			)}
		</dialog>
	)
}
