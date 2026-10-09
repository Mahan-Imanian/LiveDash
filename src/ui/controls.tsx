import { Component, type ReactNode, useEffect, useState } from 'react'
import { faviconUrl } from '@/lib/chrome'
import type { ShortcutIcon } from '@/store/types'

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
}: {
	label: string
	desc?: ReactNode
	children: ReactNode
}) {
	return (
		<div className="setting">
			<div className="setting-text">
				<span className="setting-label">{label}</span>
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
						onChange(options[(i + step + options.length) % options.length].value)
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

type Probe = { ok: boolean; tone?: 'light' | 'dark' }
const known = new Map<string, Probe>()
let blank: Promise<Probe & { sig: string }> | null = null

function probe(src: string): Promise<Probe & { sig: string }> {
	return new Promise((resolve) => {
		const img = new Image()
		img.onload = () => {
			const c = document.createElement('canvas')
			c.width = 16
			c.height = 16
			const ctx = c.getContext('2d', { willReadFrequently: true })
			if (!ctx) return resolve({ ok: true, sig: '' })
			ctx.drawImage(img, 0, 0, 16, 16)
			const px = ctx.getImageData(0, 0, 16, 16).data
			let n = 0
			let lum = 0
			let sat = 0
			for (let i = 0; i < px.length; i += 4) {
				if (px[i + 3] < 128) continue
				const [r, g, b] = [px[i], px[i + 1], px[i + 2]]
				n++
				lum += (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255
				sat += (Math.max(r, g, b) - Math.min(r, g, b)) / 255
			}
			const mono = n >= 20 && sat / n < 0.12
			const tone = !mono ? undefined : lum / n > 0.82 ? 'light' : lum / n < 0.2 ? 'dark' : undefined
			resolve({ ok: true, tone, sig: c.toDataURL() })
		}
		img.onerror = () => resolve({ ok: false, sig: '' })
		img.src = src
	})
}

async function faviconProbe(url: string): Promise<Probe> {
	blank ??= probe(faviconUrl('https://favicon-probe.invalid/', 32))
	const [a, b] = await Promise.all([blank, probe(faviconUrl(url, 32))])
	return { ok: !!b.sig && a.sig !== b.sig, tone: b.tone }
}

function hostOf(url: string): string {
	try {
		return new URL(url).host
	} catch {
		return url
	}
}

export const LETTER_COLORS = [
	'#b33a17',
	'#2c55d6',
	'#18764a',
	'#6a45d8',
	'#92590d',
	'#0f766e',
	'#be185d',
	'#3f4349',
]

export function letterColor(url: string): string {
	const h = hostOf(url)
	let n = 0
	for (const c of h) n = (n * 31 + c.charCodeAt(0)) >>> 0
	return LETTER_COLORS[n % LETTER_COLORS.length]
}

export function Favicon({
	url,
	label,
	icon,
	size = 32,
}: {
	url: string
	label: string
	icon?: ShortcutIcon
	size?: number
}) {
	const host = hostOf(url)
	const [info, setInfo] = useState<Probe | undefined>(known.get(host))
	const real = info?.ok
	const wantsSite = !icon || icon.kind === 'site'
	useEffect(() => {
		if (!wantsSite) return
		if (known.has(host)) {
			setInfo(known.get(host))
			return
		}
		let live = true
		faviconProbe(url).then((p) => {
			known.set(host, p)
			if (live) setInfo(p)
		})
		return () => {
			live = false
		}
	}, [url, host, wantsSite])
	if (icon?.kind === 'image') return <img className="fav fav--image" src={icon.data} alt="" />
	if (icon?.kind === 'letter' || (wantsSite && !real)) {
		return (
			<span
				className="fav fav--letter"
				aria-hidden="true"
				style={{
					background: icon?.kind === 'letter' ? icon.color : letterColor(url),
					opacity: icon?.kind !== 'letter' && real === undefined ? 0 : 1,
				}}
			>
				{(label.trim()[0] ?? '?').toUpperCase()}
			</span>
		)
	}
	return (
		<img
			className={`fav${info?.tone ? ` fav--${info.tone}` : ''}`}
			src={faviconUrl(url, size)}
			alt=""
		/>
	)
}

export function CheckMark() {
	return (
		<svg
			viewBox="0 0 12 12"
			fill="none"
			stroke="currentColor"
			strokeWidth="2.2"
			strokeLinecap="round"
			strokeLinejoin="round"
			aria-hidden="true"
		>
			<path d="M2.5 6.5 5 9l4.5-6" />
		</svg>
	)
}

export class Boundary extends Component<{ name: string; children: ReactNode }, { error: boolean }> {
	override state = { error: false }

	static getDerivedStateFromError() {
		return { error: true }
	}

	override render() {
		if (!this.state.error) return this.props.children
		return (
			<p className="crash" role="alert">
				{this.props.name} couldn’t be displayed. Your data is safe.{' '}
				<button type="button" className="text-btn" onClick={() => this.setState({ error: false })}>
					Try again
				</button>
			</p>
		)
	}
}
