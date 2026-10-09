const DAY = 86_400_000

export type HourCycle = 'auto' | 'h12' | 'h23'

export function dayStart(t: number): number {
	const d = new Date(t)
	d.setHours(0, 0, 0, 0)
	return d.getTime()
}

const MONTH_DAYS = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]

export function daysInMonth(year: number, month: number): number {
	const leap = (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0
	return month === 1 && leap ? 29 : MONTH_DAYS[month]
}

export function dateOf(year: number, month: number, day: number): Date | null {
	if (!(month >= 0 && month <= 11 && day >= 1 && day <= daysInMonth(year, month))) return null
	const d = new Date(2000, 0, 1)
	d.setFullYear(year, month, day)
	return d
}

export function dayDiff(t: number, now = Date.now()): number {
	return Math.round((dayStart(t) - dayStart(now)) / DAY)
}

export function formatTime(t: number, cycle: HourCycle = 'auto'): string {
	const opts: Intl.DateTimeFormatOptions = { hour: 'numeric', minute: '2-digit' }
	if (cycle !== 'auto') opts.hourCycle = cycle
	return new Intl.DateTimeFormat(undefined, opts).format(t)
}

export function formatDay(t: number, now = Date.now()): string {
	const diff = dayDiff(t, now)
	if (diff === 0) return 'Today'
	if (diff === 1) return 'Tomorrow'
	if (diff === -1) return 'Yesterday'
	if (diff > 1 && diff < 7) return new Intl.DateTimeFormat(undefined, { weekday: 'long' }).format(t)
	const sameYear = new Date(t).getFullYear() === new Date(now).getFullYear()
	return new Intl.DateTimeFormat(undefined, {
		weekday: diff > -7 && diff < 14 ? 'short' : undefined,
		month: 'short',
		day: 'numeric',
		year: sameYear ? undefined : 'numeric',
	}).format(t)
}

export function formatDue(
	due: number,
	allDay: boolean,
	cycle: HourCycle = 'auto',
	now = Date.now(),
): string {
	const day = formatDay(due, now)
	return allDay ? day : `${day}, ${formatTime(due, cycle)}`
}

export function isOverdue(due: number | null, allDay: boolean, now = Date.now()): boolean {
	if (due === null) return false
	return allDay ? dayStart(due) < dayStart(now) : due < now
}

export function formatRelative(t: number, now = Date.now()): string {
	const mins = Math.round((t - now) / 60_000)
	const abs = Math.abs(mins)
	const rtf = new Intl.RelativeTimeFormat(undefined, { numeric: 'auto', style: 'short' })
	if (abs < 1) return 'now'
	if (abs < 60) return rtf.format(mins, 'minute')
	if (abs < 60 * 24) return rtf.format(Math.round(mins / 60), 'hour')
	return rtf.format(Math.round(mins / 1440), 'day')
}

export function formatDuration(ms: number): string {
	const total = Math.max(0, Math.ceil(ms / 1000))
	const m = Math.floor(total / 60)
	const s = total % 60
	return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}
