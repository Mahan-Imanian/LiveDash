import type { ReactNode } from 'react'
import { createRoot } from 'react-dom/client'
import { migrateLegacy } from '@/store/data'
import { getState, loadStore, onStoreError, subscribe } from '@/store/store'
import type { Settings } from '@/store/types'
import { toast } from '@/ui/toast'
import '@/styles/tokens.css'
import '@/styles/app.css'

function applyTheme(s: Settings) {
	const root = document.documentElement
	if (s.theme === 'auto') delete root.dataset.theme
	else root.dataset.theme = s.theme
	if (s.accent === 'ember') delete root.dataset.accent
	else root.dataset.accent = s.accent
	try {
		localStorage.setItem('ld-theme', s.theme)
		localStorage.setItem('ld-accent', s.accent)
		localStorage.setItem('ld-type', s.typeOnOpen ? '1' : '0')
	} catch {}
}

export async function boot(surface: 'newtab' | 'popup', app: ReactNode) {
	document.documentElement.dataset.surface = surface
	if ((window as { __ldRedirect?: boolean }).__ldRedirect)
		await new Promise((r) => setTimeout(r, 800))
	await loadStore()
	let last = getState().settings
	applyTheme(last)
	subscribe(() => {
		const s = getState().settings
		if (s !== last) {
			last = s
			applyTheme(s)
		}
	})
	onStoreError((m) => toast(m, { tone: 'error' }))
	createRoot(document.getElementById('root')!).render(app)
	if (surface === 'newtab') migrateLegacy().catch(() => {})
}
