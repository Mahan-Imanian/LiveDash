import { useEffect, useState } from 'react'
import { browser } from 'wxt/browser'
import { Launcher } from '@/features/launcher/Launcher'
import { Glyph } from '@/ui/Glyph'
import { ToastHost } from '@/ui/ToastHost'

export function Popup() {
	const [page, setPage] = useState<{ url: string; title: string } | null | undefined>(undefined)
	const [done, setDone] = useState<string | null>(null)

	useEffect(() => {
		browser.tabs
			.query({ active: true, currentWindow: true })
			.then(([tab]) =>
				setPage(
					tab?.url && /^https?:/.test(tab.url)
						? { url: tab.url, title: tab.title || tab.url }
						: null,
				),
			)
			.catch(() => setPage(null))
	}, [])

	useEffect(() => {
		if (!done) return
		const t = setTimeout(() => window.close(), 850)
		return () => clearTimeout(t)
	}, [done])

	if (done) {
		return (
			<output className="popup-done">
				<span style={{ color: 'var(--accent)' }}>
					<Glyph name="check" size={20} />
				</span>
				{done}
			</output>
		)
	}

	if (page === undefined) return null

	return (
		<div className="canvas">
			<main className="stage">
				<Launcher page={page} onDone={setDone} />
			</main>
			<ToastHost />
		</div>
	)
}
