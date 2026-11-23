import { useEffect, useState } from 'react'
import { browser } from 'wxt/browser'
import { neverKeep, pageKey, type Reason, siteOf } from '@/memory/privacy'
import { loadSettings, type Message, ORIGINS, type Settings, saveSettings } from '@/memory/settings'

const REASON: Record<Reason, string> = {
	'not-web': 'LiveDash only remembers secure web pages.',
	'sensitive-site': 'This kind of site is never remembered.',
	'private-page': 'Sign-in, account and checkout pages are never remembered.',
	paused: 'You paused this site.',
}

/** The toolbar popup: what happens to the page in front of you, and a way to change it. */
export function Popup() {
	const [url, setUrl] = useState<string | null>(null)
	const [settings, setSettings] = useState<Settings | null>(null)
	const [access, setAccess] = useState(false)
	const [done, setDone] = useState('')

	useEffect(() => {
		browser.tabs
			.query({ active: true, currentWindow: true })
			.then(([t]) => setUrl(t?.url ?? null))
			.catch(() => setUrl(null))
		loadSettings().then(setSettings)
		browser.permissions
			.contains({ origins: ORIGINS })
			.then(setAccess)
			.catch(() => setAccess(false))
	}, [])

	if (!settings) return null
	const site = url ? siteOf(url) : ''
	const on = settings.remember && access
	const reason = url ? neverKeep(pageKey(url), settings.paused) : 'not-web'
	const paused = reason === 'paused'

	const togglePause = async () => {
		const next = paused ? settings.paused.filter((h) => h !== site) : [...settings.paused, site]
		setSettings(await saveSettings({ paused: next }))
		setDone(paused ? `Remembering ${site} again.` : `Paused ${site}.`)
	}

	const forgetPage = async () => {
		if (!url) return
		await browser.runtime.sendMessage({ type: 'ld-forget', scope: 'page', value: url } as Message)
		setDone('Forgot this page.')
	}

	return (
		<main className="pop">
			<h1>{site || 'This page'}</h1>
			<p role="status">
				{done ||
					(!on
						? 'Remembering is off. Turn it on from the new tab.'
						: reason && !paused
							? REASON[reason]
							: paused
								? REASON.paused
								: 'Remembered on this device once you have read it for a few seconds.')}
			</p>
			{on && url && (reason === null || paused) && (
				<div className="stack">
					<button type="button" className="btn" onClick={togglePause}>
						{paused ? 'Resume this site' : 'Pause this site'}
					</button>
					{!paused && (
						<button type="button" className="btn ghost" onClick={forgetPage}>
							Forget this page
						</button>
					)}
				</div>
			)}
		</main>
	)
}
