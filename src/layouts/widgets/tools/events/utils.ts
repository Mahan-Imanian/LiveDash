import type { FetchedAllEvents } from '@/services/hooks/date/getEvents.hook'
import type { GoogleCalendarEvent } from '@/services/hooks/date/getGoogleCalendarEvents.hook'
import {
	type LiveDashDate,
	filterGoogleEventsByDate,
	getGregorianEvents,
	getHijriEvents,
	getRegionalEvents,
} from '../../calendar/utils'

export interface CombinedEvent {
	title: string
	isHoliday: boolean
	icon?: string | null
	source: 'regional' | 'gregorian' | 'hijri' | 'google'
	id?: string
	time?: string | null
	location?: string
	googleItem?: GoogleCalendarEvent
}

export function combineAndSortEvents(
	events: FetchedAllEvents,
	currentDate: LiveDashDate,
	googleEvents: GoogleCalendarEvent[] = []
): CombinedEvent[] {
	const regionalEvents = getRegionalEvents(events, currentDate)
	const gregorianEvents = getGregorianEvents(events, currentDate)
	const hijriEvents = getHijriEvents(events, currentDate)
	const filteredGoogleEvents = filterGoogleEventsByDate(googleEvents, currentDate)

	// All events combined
	const allEvents = [
		...regionalEvents.map((event) => ({
			...event,
			source: 'regional' as const,
			time: null,
		})),
		...gregorianEvents.map((event) => ({
			...event,
			source: 'gregorian' as const,
			time: null,
		})),
		...hijriEvents.map((event) => ({
			...event,
			source: 'hijri' as const,
			time: null,
		})),
		...filteredGoogleEvents.map((event) => ({
			title: event.summary,
			isHoliday: false,
			icon: null,
			source: 'google' as const,
			id: event.id,
			time: event.start.dateTime,
			location: event.location,
			googleItem: event,
		})),
	]

	return allEvents.sort((a, b) => {
		if (a.isHoliday && !b.isHoliday) return -1
		if (!a.isHoliday && b.isHoliday) return 1

		if (a.time && b.time) {
			return new Date(a.time).getTime() - new Date(b.time).getTime()
		}

		if (a.time && !b.time) return -1
		if (!a.time && b.time) return 1

		return 0
	})
}

export function formatEventTime(dateTimeStr: string) {
	if (!dateTimeStr) return null
	const date = new Date(dateTimeStr)
	return date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
}
