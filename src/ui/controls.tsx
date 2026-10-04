import { Component, type ReactNode, useEffect, useState } from 'react'
import { faviconUrl } from '@/lib/chrome'

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
	blank ??= signature(faviconUrl('https://favicon-probe.invalid/', 32))
	const [a, b] = await Promise.all([blank, signature(faviconUrl(url, 32))])
	return !!b && a !== b
}

function hostOf(url: string): string {
	try {
		return new URL(url).host
	} catch {
		return url
	}
}

export function Favicon({ url, label }: { url: string; label: string }) {
	const host = hostOf(url)
	const [real, setReal] = useState<boolean | undefined>(known.get(host))
	useEffect(() => {
		if (known.has(host)) {
			setReal(known.get(host))
			return
		}
		let live = true
		hasRealFavicon(url).then((ok) => {
			known.set(host, ok)
			if (live) setReal(ok)
		})
		return () => {
			live = false
		}
	}, [url, host])
	if (!real) {
		return (
			<span
				className="row-letter"
				aria-hidden="true"
				style={real === undefined ? { opacity: 0 } : undefined}
			>
				{(label.trim()[0] ?? '?').toUpperCase()}
			</span>
		)
	}
	return <img src={faviconUrl(url, 32)} alt="" />
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
