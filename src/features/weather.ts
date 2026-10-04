import { hasPermission, removePermission, requestPermission } from '@/lib/chrome'
import { getState, update } from '@/store/store'
import type { Forecast, Place } from '@/store/types'

export const WEATHER_ORIGINS = [
	'https://api.open-meteo.com/*',
	'https://geocoding-api.open-meteo.com/*',
]
const STALE = 30 * 60_000

export function weatherUnit(): 'c' | 'f' {
	const u = getState().settings.weatherUnit
	if (u !== 'auto') return u
	const region = new Intl.Locale(navigator.language).maximize().region
	return region && ['US', 'LR', 'MM', 'BS', 'BZ', 'KY', 'PW'].includes(region) ? 'f' : 'c'
}

export async function ensureWeatherAccess(): Promise<boolean> {
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
	const res = await fetch(u, { credentials: 'omit', signal: AbortSignal.timeout(10_000) })
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

export async function locateMe(): Promise<Place> {
	const pos = await new Promise<GeolocationPosition>((resolve, reject) =>
		navigator.geolocation.getCurrentPosition(
			resolve,
			() => reject(new Error('Your location couldn’t be found. Search for a city instead.')),
			{
				timeout: 10_000,
				maximumAge: 3_600_000,
			},
		),
	)
	const lat = Math.round(pos.coords.latitude * 100) / 100
	const lon = Math.round(pos.coords.longitude * 100) / 100
	return { name: 'Your location', lat, lon }
}

export function setPlace(place: Place): void {
	update('weather', () => ({ place, data: null, fetchedAt: null, error: null }))
	refreshWeather(true)
}

export async function refreshWeather(force = false): Promise<void> {
	const w = getState().weather
	const unit = weatherUnit()
	if (!w.place || !getState().settings.modules.weather) return
	if (!force && w.fetchedAt && Date.now() - w.fetchedAt < STALE && w.data?.unit === unit) return
	if (!(await hasPermission({ origins: WEATHER_ORIGINS }))) {
		update('weather', (x) => ({ ...x, error: 'Weather access was turned off' }))
		return
	}
	const u = new URL('https://api.open-meteo.com/v1/forecast')
	u.searchParams.set('latitude', String(w.place.lat))
	u.searchParams.set('longitude', String(w.place.lon))
	u.searchParams.set('current', 'temperature_2m,weather_code,is_day')
	u.searchParams.set('hourly', 'temperature_2m,weather_code')
	u.searchParams.set(
		'daily',
		'temperature_2m_max,temperature_2m_min,weather_code,precipitation_probability_max',
	)
	u.searchParams.set('forecast_days', '5')
	u.searchParams.set('forecast_hours', '12')
	u.searchParams.set('timezone', 'auto')
	if (unit === 'f') u.searchParams.set('temperature_unit', 'fahrenheit')
	try {
		const res = await fetch(u, { credentials: 'omit', signal: AbortSignal.timeout(10_000) })
		if (!res.ok) throw new Error(`Weather service error (${res.status})`)
		const d = (await res.json()) as {
			current: { temperature_2m: number; weather_code: number; is_day: number }
			hourly: { time: string[]; temperature_2m: number[]; weather_code: number[] }
			daily: {
				time: string[]
				temperature_2m_max: number[]
				temperature_2m_min: number[]
				weather_code: number[]
				precipitation_probability_max: (number | null)[]
			}
		}
		const data: Forecast = {
			temp: Math.round(d.current.temperature_2m),
			code: d.current.weather_code,
			isDay: d.current.is_day === 1,
			unit,
			days: d.daily.time.map((date, i) => ({
				date,
				max: Math.round(d.daily.temperature_2m_max[i]),
				min: Math.round(d.daily.temperature_2m_min[i]),
				code: d.daily.weather_code[i],
				rain: d.daily.precipitation_probability_max[i] ?? 0,
			})),
			hourly: d.hourly.time.map((t, i) => ({
				t: new Date(t).getTime(),
				temp: Math.round(d.hourly.temperature_2m[i]),
				code: d.hourly.weather_code[i],
			})),
		}
		update('weather', (x) => ({ ...x, data, fetchedAt: Date.now(), error: null }))
	} catch (e) {
		const offline =
			!navigator.onLine || e instanceof TypeError || (e as Error).name === 'TimeoutError'
		update('weather', (x) => ({ ...x, error: offline ? 'Offline' : (e as Error).message }))
	}
}

export async function turnOffWeather(): Promise<void> {
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
	return 'Thunderstorms'
}

export type Sky = 'sun' | 'moon' | 'partly' | 'cloud' | 'fog' | 'rain' | 'snow' | 'storm'

export function sky(code: number, isDay = true): Sky {
	if (code === 0) return isDay ? 'sun' : 'moon'
	if (code <= 2) return 'partly'
	if (code === 3) return 'cloud'
	if (code <= 48) return 'fog'
	if (code <= 67 || (code >= 80 && code <= 82)) return 'rain'
	if (code <= 86) return 'snow'
	return 'storm'
}
