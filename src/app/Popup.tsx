import { useEffect, useState } from 'react'
import { browser } from 'wxt/browser'
import { Search } from '@/features/search/Search'
import { Glyph } from '@/ui/Glyph'
import { MenuHost } from '@/ui/Menu'
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
				<Glyph name="check" size={20} />
				{done}
			</output>
		)
	}

	if (page === undefined) return null

	return (
		<div className="popup-shell">
			<Search page={page} alwaysOpen onDone={setDone} />
			<MenuHost />
			<ToastHost />
		</div>
	)
}
