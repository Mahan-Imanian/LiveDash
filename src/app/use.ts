import { useEffect, useState } from 'react'
import { browser } from 'wxt/browser'
import { ORIGINS } from '@/memory/settings'

/** The current time, refreshed on the minute. */
export function useNow(): number {
	const [now, setNow] = useState(Date.now)
	useEffect(() => {
		let t: ReturnType<typeof setTimeout>
		const tick = () => {
			setNow(Date.now())
			t = setTimeout(tick, 60_000 - (Date.now() % 60_000) + 20)
		}
		t = setTimeout(tick, 60_000 - (Date.now() % 60_000) + 20)
		return () => clearTimeout(t)
	}, [])
	return now
}

/** Whether LiveDash may read sites, kept current as the user grants or removes it. */
export function useAccess(): boolean | null {
	const [ok, setOk] = useState<boolean | null>(null)
	useEffect(() => {
		const check = () =>
			browser.permissions
				.contains({ origins: ORIGINS })
				.then(setOk)
				.catch(() => setOk(false))
		check()
		browser.permissions.onAdded.addListener(check)
		browser.permissions.onRemoved.addListener(check)
		return () => {
			browser.permissions.onAdded.removeListener(check)
			browser.permissions.onRemoved.removeListener(check)
		}
	}, [])
	return ok
}

export function formatClock(t: number, cycle: 'auto' | 'h12' | 'h23'): string {
	const opts: Intl.DateTimeFormatOptions = { hour: 'numeric', minute: '2-digit' }
	if (cycle !== 'auto') opts.hourCycle = cycle
	// The day period is left off, as on a phone's lock screen.
	return new Intl.DateTimeFormat(undefined, opts)
		.formatToParts(t)
		.filter((p) => p.type !== 'dayPeriod')
		.map((p) => p.value)
		.join('')
		.trim()
}

export function formatDate(t: number): string {
	return new Intl.DateTimeFormat(undefined, {
		weekday: 'long',
		month: 'long',
		day: 'numeric',
	}).format(t)
}

export function formatBytes(n: number): string {
	if (n < 1e6) return `${Math.max(1, Math.round(n / 1e3))} KB`
	if (n < 1e9) return `${Math.round(n / 1e6)} MB`
	return `${(n / 1e9).toFixed(1)} GB`
}
