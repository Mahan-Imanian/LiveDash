import { hasPermission, removePermission, requestPermission } from '@/lib/chrome'
import { dayStart } from '@/lib/format'
import { parseIcs } from '@/lib/ics'
import { getState, update } from '@/store/store'

const CAL_STALE = 15 * 60_000

function originPattern(url: string): string {
	return `${new URL(url).origin}/*`
}

export function normalizeCalendarUrl(raw: string): string | null {
	const s = raw.trim().replace(/^webcals?:\/\//i, 'https://')
	try {
		const u = new URL(s)
		return u.protocol === 'https:' ? u.href : null
	} catch {
		return null
	}
}

async function fetchCalendar(url: string) {
	let res: Response
	try {
		res = await fetch(url, { cache: 'no-store', credentials: 'omit' })
	} catch {
		throw new Error('Couldn’t reach the calendar. You may be offline.')
	}
	if (!res.ok)
		throw new Error(
			`The calendar address returned an error (${res.status}). Check that it’s a secret iCal link.`,
		)
	const text = await res.text()
	if (!/BEGIN:VCALENDAR/i.test(text))
		throw new Error('That address didn’t return a calendar. Use the iCal (.ics) link.')
	const from = dayStart(Date.now())
	return parseIcs(text, from, from + 15 * 86_400_000)
}

export async function connectCalendar(raw: string): Promise<string | null> {
	const url = normalizeCalendarUrl(raw)
	if (!url) return 'Enter an https:// or webcal:// calendar address.'
	const granted = await requestPermission({ origins: [originPattern(url)] })
	if (!granted)
		return `LiveDash needs permission to read ${new URL(url).hostname} to show your events.`
	try {
		const events = await fetchCalendar(url)
		update('calendar', () => ({ url, events, fetchedAt: Date.now(), error: null }))
		return null
	} catch (e) {
		return (e as Error).message
	}
}

export async function refreshCalendar(force = false): Promise<void> {
	const c = getState().calendar
	if (!c.url) return
	if (!force && c.fetchedAt && Date.now() - c.fetchedAt < CAL_STALE) return
	if (!(await hasPermission({ origins: [originPattern(c.url)] }))) {
		update('calendar', (x) => ({
			...x,
			error: 'Permission to read this calendar was removed. Reconnect it in Settings.',
		}))
		return
	}
	try {
		const events = await fetchCalendar(c.url)
		update('calendar', (x) => ({ ...x, events, fetchedAt: Date.now(), error: null }))
	} catch (e) {
		update('calendar', (x) => ({ ...x, error: (e as Error).message }))
	}
}

export async function disconnectCalendar(): Promise<void> {
	const url = getState().calendar.url
	update('calendar', () => ({ url: null, events: [], fetchedAt: null, error: null }))
	if (url) await removePermission({ origins: [originPattern(url)] })
}
