import { useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore } from 'react'
import { Glyph, type GlyphName } from './Glyph'

export interface MenuItem {
	label: string
	glyph?: GlyphName
	hint?: string
	danger?: boolean
	run: () => unknown
}

interface Open {
	x: number
	y: number
	items: MenuItem[]
	label: string
	restore: HTMLElement | null
}

let current: Open | null = null
const listeners = new Set<() => void>()
const emit = () => {
	for (const l of listeners) l()
}

export function openMenu(
	e: { clientX: number; clientY: number } | HTMLElement,
	items: MenuItem[],
	label: string,
): void {
	const restore = document.activeElement as HTMLElement | null
	if (e instanceof HTMLElement) {
		const r = e.getBoundingClientRect()
		current = { x: r.left, y: r.bottom + 6, items, label, restore }
	} else current = { x: e.clientX, y: e.clientY, items, label, restore }
	emit()
}

function closeMenu(focusBack = true) {
	const r = current?.restore
	current = null
	emit()
	if (focusBack) r?.focus()
}

export function MenuHost() {
	const m = useSyncExternalStore(
		(l) => {
			listeners.add(l)
			return () => listeners.delete(l)
		},
		() => current,
	)
	const ref = useRef<HTMLDivElement>(null)
	const [pos, setPos] = useState<{ x: number; y: number } | null>(null)
	const [active, setActive] = useState(0)

	useLayoutEffect(() => {
		if (!m || !ref.current) return
		const r = ref.current.getBoundingClientRect()
		setPos({
			x: Math.max(8, Math.min(m.x, window.innerWidth - r.width - 8)),
			y: m.y + r.height > window.innerHeight - 8 ? Math.max(8, m.y - r.height - 12) : m.y,
		})
		setActive(0)
		requestAnimationFrame(() =>
			ref.current?.querySelector<HTMLElement>('[role="menuitem"]')?.focus(),
		)
	}, [m])

	useEffect(() => {
		if (!m) return
		const down = (e: MouseEvent) => {
			if (!ref.current?.contains(e.target as Node)) closeMenu(false)
		}
		const scroll = () => closeMenu(false)
		window.addEventListener('mousedown', down, true)
		window.addEventListener('blur', scroll)
		window.addEventListener('resize', scroll)
		return () => {
			window.removeEventListener('mousedown', down, true)
			window.removeEventListener('blur', scroll)
			window.removeEventListener('resize', scroll)
		}
	}, [m])

	if (!m) return null

	return (
		<div
			ref={ref}
			className="menu"
			role="menu"
			aria-label={m.label}
			style={pos ? { left: pos.x, top: pos.y } : { left: m.x, top: m.y, visibility: 'hidden' }}
			onKeyDown={(e) => {
				const n = m.items.length
				if (e.key === 'ArrowDown' || e.key === 'ArrowUp' || e.key === 'Home' || e.key === 'End') {
					e.preventDefault()
					const next =
						e.key === 'Home'
							? 0
							: e.key === 'End'
								? n - 1
								: (active + (e.key === 'ArrowDown' ? 1 : -1) + n) % n
					setActive(next)
					ref.current?.querySelectorAll<HTMLElement>('[role="menuitem"]')[next]?.focus()
				} else if (e.key === 'Escape' || e.key === 'Tab') {
					e.preventDefault()
					e.stopPropagation()
					closeMenu()
				}
			}}
		>
			{m.items.map((it, i) => (
				<button
					key={it.label}
					type="button"
					role="menuitem"
					tabIndex={i === active ? 0 : -1}
					className={`menu-item${it.danger ? ' menu-item--danger' : ''}`}
					onMouseEnter={(e) => {
						setActive(i)
						e.currentTarget.focus()
					}}
					onClick={() => {
						closeMenu()
						it.run()
					}}
				>
					<span className="menu-glyph">{it.glyph && <Glyph name={it.glyph} />}</span>
					<span className="menu-label">{it.label}</span>
					{it.hint && <kbd>{it.hint}</kbd>}
				</button>
			))}
		</div>
	)
}
