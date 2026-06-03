import { useQuery } from '@tanstack/react-query'
import { getMainClient } from '@/services/api'

export interface FetchedTimezone {
	label: string
	value: string
	offset: string
}

function getLocalTimezone(): FetchedTimezone {
	const value = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
	const label = value.includes('/')
		? value.replace(/_/g, ' ').replace('/', ' / ')
		: value
	const offsetMinutes = -new Date().getTimezoneOffset()
	const sign = offsetMinutes >= 0 ? '+' : '-'
	const abs = Math.abs(offsetMinutes)
	const hours = Math.floor(abs / 60).toString().padStart(2, '0')
	const minutes = (abs % 60).toString().padStart(2, '0')
	return { label, value, offset: `${sign}${hours}:${minutes}` }
}

const fallbackTimezones: FetchedTimezone[] = [
	getLocalTimezone(),
	{ label: 'UTC', value: 'UTC', offset: '+00:00' },
	{ label: 'Europe / London', value: 'Europe/London', offset: '+00:00' },
	{ label: 'Europe / Berlin', value: 'Europe/Berlin', offset: '+01:00' },
	{ label: 'Europe / Paris', value: 'Europe/Paris', offset: '+01:00' },
	{ label: 'America / New York', value: 'America/New_York', offset: '-05:00' },
	{ label: 'America / Los Angeles', value: 'America/Los_Angeles', offset: '-08:00' },
]

function mergeLocalTimezone(list: FetchedTimezone[]) {
	const local = getLocalTimezone()
	const clean = list.map((tz) => ({
		...tz,
		offset: tz.offset || (tz.value === local.value ? local.offset : ''),
	}))
	if (!clean.some((tz) => tz.value === local.value)) clean.unshift(local)
	return clean
}

export async function getTimezones(): Promise<FetchedTimezone[]> {
	try {
		const api = await getMainClient()
		const response = await api.get<FetchedTimezone[]>('/date/timezones')
		return mergeLocalTimezone(response.data)
	} catch {
		return fallbackTimezones
	}
}

export function useTimezones(enabled: boolean = true) {
	// react query
	return useQuery<FetchedTimezone[]>({
		queryKey: ['timezones'],
		queryFn: getTimezones,
		enabled,
		gcTime: 1000 * 60 * 5, // 5 minutes
	})
}
