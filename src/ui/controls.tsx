import { Component, type ReactNode, useEffect, useState } from 'react'
import { faviconUrl } from '@/lib/chrome'
import { hostOf } from '@/lib/url'
import type { Shortcut } from '@/store/types'

export function Switch({
	checked,
	onChange,
	label,
}: {
	checked: boolean
	onChange: (v: boolean) => void
	label: string
}) {
	return (
		<button
			type="button"
			role="switch"
			className="switch"
			aria-checked={checked}
			aria-label={label}
			onClick={() => onChange(!checked)}
		/>
	)
}

export function Setting({
	label,
	desc,
	children,
	id,
}: {
	label: string
	desc?: ReactNode
	children: ReactNode
	id?: string
}) {
	return (
		<div className="setting">
			<div className="setting-text">
				<span className="setting-label" id={id}>
					{label}
				</span>
				{desc && <span className="setting-desc">{desc}</span>}
			</div>
			{children}
		</div>
	)
}

export function Segmented<T extends string>({
	value,
	options,
	onChange,
	label,
}: {
	value: T
	options: { value: T; label: string }[]
	onChange: (v: T) => void
	label: string
}) {
	return (
		<div className="segmented" role="radiogroup" aria-label={label}>
			{options.map((o) => (
				<button
					key={o.value}
					type="button"
					role="radio"
					aria-checked={o.value === value}
					tabIndex={o.value === value ? 0 : -1}
					onClick={() => onChange(o.value)}
					onKeyDown={(e) => {
						const i = options.findIndex((x) => x.value === value)
						const step =
							e.key === 'ArrowRight' || e.key === 'ArrowDown'
								? 1
								: e.key === 'ArrowLeft' || e.key === 'ArrowUp'
									? -1
									: 0
						if (!step) return
						e.preventDefault()
						const next = options[(i + step + options.length) % options.length]
						onChange(next.value)
						const group = e.currentTarget.parentElement
						requestAnimationFrame(() =>
							group?.querySelector<HTMLElement>('[aria-checked="true"]')?.focus(),
						)
					}}
				>
					{o.label}
				</button>
			))}
		</div>
	)
}

export const MONO_COLORS = [
	'#b33a17',
	'#2c55d6',
	'#18764a',
	'#6a45d8',
	'#92590d',
	'#0f766e',
	'#be185d',
	'#3f4349',
]

export function monoText(title: string): string {
	const words = title.trim().split(/\s+/).filter(Boolean)
	if (words.length > 1) return (words[0][0] + words[1][0]).toUpperCase()
	return (words[0] ?? '?').charAt(0).toUpperCase()
}

const known = new Map<string, boolean>()
let blank: Promise<string> | null = null

function signature(src: string): Promise<string> {
	return new Promise((resolve) => {
		const img = new Image()
		img.onload = () => {
			const c = document.createElement('canvas')
			c.width = 16
			c.height = 16
			c.getContext('2d')?.drawImage(img, 0, 0, 16, 16)
			resolve(c.toDataURL())
		}
		img.onerror = () => resolve('')
		img.src = src
	})
}

async function hasRealFavicon(url: string): Promise<boolean> {
	blank ??= signature(faviconUrl('https://favicon-probe.invalid/', 64))
	const [a, b] = await Promise.all([blank, signature(faviconUrl(url, 64))])
	return !!b && a !== b
}

export function SiteIcon({ s }: { s: Pick<Shortcut, 'url' | 'title' | 'icon'> }) {
	const [real, setReal] = useState<boolean | undefined>(known.get(s.url))
	const failed = real === false
	useEffect(() => {
		if (s.icon.kind !== 'site' || known.has(s.url)) return
		let live = true
		hasRealFavicon(s.url).then((ok) => {
			known.set(s.url, ok)
			if (live) setReal(ok)
		})
		return () => {
			live = false
		}
	}, [s.url, s.icon.kind])
	if (s.icon.kind === 'image') return <img src={s.icon.data} alt="" data-kind="image" />
	if (s.icon.kind === 'mono' || failed) {
		const color =
			s.icon.kind === 'mono' ? s.icon.color : MONO_COLORS[hostOf(s.url).length % MONO_COLORS.length]
		return (
			<span className="mono" style={{ background: color }} aria-hidden="true">
				{monoText(s.title)}
			</span>
		)
	}
	if (real === undefined) return null
	return <img src={faviconUrl(s.url, 64)} alt="" />
}

export class PanelBoundary extends Component<
	{ name: string; children: ReactNode },
	{ error: boolean }
> {
	override state = { error: false }

	static getDerivedStateFromError() {
		return { error: true }
	}

	override render() {
		if (!this.state.error) return this.props.children
		return (
			<div className="crash" role="alert">
				<span>{this.props.name} couldn’t be displayed. Your data is safe.</span>
				<span>
					<button
						type="button"
						className="link-btn"
						onClick={() => this.setState({ error: false })}
					>
						Try again
					</button>
				</span>
			</div>
		)
	}
}
