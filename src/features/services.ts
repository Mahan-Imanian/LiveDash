import { hasPermission, removePermission, requestPermission } from '@/lib/chrome'
import { dayStart } from '@/lib/format'
import { parseIcs } from '@/lib/ics'
import { getState, update } from '@/store/store'
import type { Place, WeatherData } from '@/store/types'

const CAL_STALE = 15 * 60_000
const WEATHER_STALE = 30 * 60_000
const WEATHER_ORIGINS = ['https://api.open-meteo.com/*', 'https://geocoding-api.open-meteo.com/*']

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

export function weatherUnit(): 'c' | 'f' {
	const u = getState().settings.weatherUnit
	if (u !== 'auto') return u
	const region = new Intl.Locale(navigator.language).maximize().region
	return region && ['US', 'LR', 'MM', 'BS', 'BZ', 'KY', 'PW'].includes(region) ? 'f' : 'c'
}

export async function ensureWeatherPermission(): Promise<boolean> {
	return (
		(await hasPermission({ origins: WEATHER_ORIGINS })) ||
		requestPermission({ origins: WEATHER_ORIGINS })
	)
}

export async function searchPlaces(q: string): Promise<Place[]> {
	const u = new URL('https://geocoding-api.open-meteo.com/v1/search')
	u.searchParams.set('name', q)
	u.searchParams.set('count', '6')
	u.searchParams.set('language', navigator.language.split('-')[0] || 'en')
	const res = await fetch(u, { credentials: 'omit' })
	if (!res.ok) throw new Error(`Place search failed (${res.status})`)
	const data = (await res.json()) as {
		results?: {
			name: string
			admin1?: string
			country?: string
			latitude: number
			longitude: number
		}[]
	}
	return (data.results ?? []).map((r) => ({
		name: r.name,
		region: [r.admin1, r.country].filter(Boolean).join(', '),
		lat: r.latitude,
		lon: r.longitude,
	}))
}

export async function refreshWeather(force = false): Promise<void> {
	const w = getState().weather
	const unit = weatherUnit()
	if (!w.place) return
	const fresh = w.fetchedAt && Date.now() - w.fetchedAt < WEATHER_STALE && w.data?.unit === unit
	if (!force && fresh) return
	if (!(await hasPermission({ origins: WEATHER_ORIGINS }))) {
		update('weather', (x) => ({
			...x,
			error: 'Weather access was turned off. Turn it on again in Settings.',
		}))
		return
	}
	const u = new URL('https://api.open-meteo.com/v1/forecast')
	u.searchParams.set('latitude', String(w.place.lat))
	u.searchParams.set('longitude', String(w.place.lon))
	u.searchParams.set('current', 'temperature_2m,weather_code,is_day')
	u.searchParams.set('daily', 'temperature_2m_max,temperature_2m_min')
	u.searchParams.set('forecast_days', '1')
	u.searchParams.set('timezone', 'auto')
	if (unit === 'f') u.searchParams.set('temperature_unit', 'fahrenheit')
	try {
		const res = await fetch(u, { credentials: 'omit' })
		if (!res.ok) throw new Error(`Weather service error (${res.status})`)
		const d = (await res.json()) as {
			current: { temperature_2m: number; weather_code: number; is_day: number }
			daily: { temperature_2m_max: number[]; temperature_2m_min: number[] }
		}
		const data: WeatherData = {
			temp: Math.round(d.current.temperature_2m),
			code: d.current.weather_code,
			isDay: d.current.is_day === 1,
			max: Math.round(d.daily.temperature_2m_max[0] ?? d.current.temperature_2m),
			min: Math.round(d.daily.temperature_2m_min[0] ?? d.current.temperature_2m),
			unit,
		}
		update('weather', (x) => ({ ...x, data, fetchedAt: Date.now(), error: null }))
	} catch (e) {
		const offline = !navigator.onLine || e instanceof TypeError
		update('weather', (x) => ({ ...x, error: offline ? 'Offline' : (e as Error).message }))
	}
}

export async function disconnectWeather(): Promise<void> {
	update('weather', () => ({ place: null, data: null, fetchedAt: null, error: null }))
	await removePermission({ origins: WEATHER_ORIGINS })
}

export function weatherLabel(code: number): string {
	if (code === 0) return 'Clear'
	if (code <= 2) return 'Partly cloudy'
	if (code === 3) return 'Overcast'
	if (code <= 48) return 'Fog'
	if (code <= 57) return 'Drizzle'
	if (code <= 67) return 'Rain'
	if (code <= 77) return 'Snow'
	if (code <= 82) return 'Showers'
	if (code <= 86) return 'Snow showers'
	return 'Thunderstorm'
}
