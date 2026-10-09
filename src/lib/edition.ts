import { dayDiff } from './format.ts'
import type { CalEvent } from './ics.ts'

export interface Lead {
	event: CalEvent
	live: boolean
	minutes: number
	following?: CalEvent
}

const SOON = 3 * 3_600_000

export function pickLead(events: CalEvent[], now: number): Lead | null {
	const timed = events.filter((e) => !e.allDay && e.end > now).sort((a, b) => a.start - b.start)
	const current = timed.find((e) => e.start <= now)
	const later = (after: number) =>
		timed.find((e) => e.start >= after && e !== current && dayDiff(e.start, now) === 0)
	if (current)
		return {
			event: current,
			live: true,
			minutes: Math.max(1, Math.ceil((current.end - now) / 60_000)),
			following: later(now),
		}
	const next = timed.find(
		(e) => e.start > now && (e.start - now < SOON || dayDiff(e.start, now) === 0),
	)
	if (!next) return null
	return {
		event: next,
		live: false,
		minutes: Math.max(1, Math.round((next.start - now) / 60_000)),
		following: later(next.end),
	}
}

export function isoWeek(t: number): number {
	const d = new Date(t)
	const day = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()))
	const wd = day.getUTCDay() || 7
	day.setUTCDate(day.getUTCDate() + 4 - wd)
	const yearStart = Date.UTC(day.getUTCFullYear(), 0, 1)
	return Math.ceil(((day.getTime() - yearStart) / 86_400_000 + 1) / 7)
}

export function editionName(t: number): string {
	const h = new Date(t).getHours()
	if (h >= 5 && h < 12) return 'Morning edition'
	if (h >= 12 && h < 17) return 'Afternoon edition'
	if (h >= 17 && h < 22) return 'Evening edition'
	return 'Late edition'
}

export function countdown(minutes: number): string {
	if (minutes < 60) return `${minutes} min`
	const h = Math.floor(minutes / 60)
	const m = minutes % 60
	return m ? `${h} h ${m} min` : `${h} h`
}
