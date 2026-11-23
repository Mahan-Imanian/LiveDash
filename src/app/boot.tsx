import type { ReactNode } from 'react'
import { createRoot } from 'react-dom/client'
import '@/styles/fonts.css'
import '@/styles/app.css'

export async function boot(app: ReactNode) {
	// early.js may be reopening this tab so the search field gets focus instead of the address bar.
	if ((window as { __ldRedirect?: boolean }).__ldRedirect)
		await new Promise((r) => setTimeout(r, 800))
	createRoot(document.getElementById('root')!).render(app)
}
