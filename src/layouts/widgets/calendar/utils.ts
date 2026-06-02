import moment from 'moment'
import hijriMoment from 'moment-hijri'
import momentTz from 'moment-timezone'
import type { FetchedAllEvents, FetchedEvent } from '@/services/hooks/date/getEvents.hook'
import type { GoogleCalendarEvent } from '@/services/hooks/date/getGoogleCalendarEvents.hook'

export const formatDateStr = (date: moment.Moment) => {
	return date.format('YYYY-MM-DD')
}

export type LiveDashDate = moment.Moment

export function getRegionalEvents(
	_events: FetchedAllEvents,
	_selectedDate: moment.Moment
): FetchedEvent[] {
	return []
}

export function convertGregorianToHijri(date: moment.Moment): hijriMoment.Moment {
	return hijriMoment(date.toDate())
}

export function getHijriEvents(
	events: FetchedAllEvents,
	selectedDate: moment.Moment
): FetchedEvent[] {
	const hijriDate = convertGregorianToHijri(selectedDate)
	const month = hijriDate.iMonth() + 1
	const day = hijriDate.iDate()

	return events.hijriEvents.filter(
		(event) => event.month === month && event.day === day
	)
}

export function getGregorianEvents(
	events: FetchedAllEvents,
	date: moment.Moment
): FetchedEvent[] {
	const gregorianDay = date.format('D')
	const gregorianMonth = date.format('M')

	return events.gregorianEvents.filter(
		(event) => event.month === +gregorianMonth && event.day === +gregorianDay
	)
}

export function getCurrentDate(timeZone: string) {
	return moment(momentTz.tz(new Date(), timeZone).toDate()).locale('en')
}

export function filterGoogleEventsByDate(
	events: GoogleCalendarEvent[],
	currentDate: LiveDashDate
): GoogleCalendarEvent[] {
	const dateStr = currentDate.clone().locale('en').format('YYYY-MM-DD')

	return events.filter((event) => {
		if (!event || !event.start || !event.start.dateTime) {
			return false
		}

		if (event.eventType === 'birthday') return false

		const eventDateStr = event.start.dateTime.split('T')[0]
		return eventDateStr === dateStr
	})
}
