import { CircleCheck } from 'lucide-react'
import { useEffect, useState } from 'react'
import { browser } from 'wxt/browser'
import { Palette } from '@/features/palette/Palette'
import { ToastHost } from '@/ui/ToastHost'

export function Popup() {
	const [page, setPage] = useState<{ url: string; title: string } | null>(null)
	const [done, setDone] = useState<string | null>(null)

	useEffect(() => {
		browser.tabs
			.query({ active: true, currentWindow: true })
			.then(([tab]) => {
				if (tab?.url && /^https?:/.test(tab.url))
					setPage({ url: tab.url, title: tab.title || tab.url })
			})
			.catch(() => {})
	}, [])

	useEffect(() => {
		if (!done) return
		const t = setTimeout(() => window.close(), 900)
		return () => clearTimeout(t)
	}, [done])

	if (done) {
		return (
			<output className="popup-done">
				<CircleCheck size={22} aria-hidden="true" />
				{done}
			</output>
		)
	}

	return (
		<>
			<Palette inline page={page} onDone={setDone} />
			<ToastHost />
		</>
	)
}
