import { dateOf, dayStart, daysInMonth } from './format.ts'

export interface Parsed {
	title: string
	due: number | null
	allDay: boolean
	repeat?: Repeat
	repeatDay?: number
}

const DAY = 86_400_000
const LEAP_YEAR_SEARCH_YEARS = 8

const WEEKDAYS: Record<string, number> = {
	sunday: 0,
	monday: 1,
	mon: 1,
	tuesday: 2,
	tue: 2,
	tues: 2,
	wednesday: 3,
	wed: 3,
	thursday: 4,
	thu: 4,
	thur: 4,
	thurs: 4,
	friday: 5,
	fri: 5,
	saturday: 6,
}

const MONTHS: Record<string, number> = {
	jan: 0,
	january: 0,
	feb: 1,
	february: 1,
	mar: 2,
	march: 2,
	apr: 3,
	april: 3,
	may: 4,
	jun: 5,
	june: 5,
	jul: 6,
	july: 6,
	aug: 7,
	august: 7,
	sep: 8,
	sept: 8,
	september: 8,
	oct: 9,
	october: 9,
	nov: 10,
	november: 10,
	dec: 11,
	december: 11,
}

const WD = Object.keys(WEEKDAYS).join('|')
const MO = Object.keys(MONTHS).join('|')

const UNITS: Record<string, number> = {
	m: 60_000,
	min: 60_000,
	mins: 60_000,
	minute: 60_000,
	minutes: 60_000,
	h: 3_600_000,
	hr: 3_600_000,
	hrs: 3_600_000,
	hour: 3_600_000,
	hours: 3_600_000,
	d: DAY,
	day: DAY,
	days: DAY,
	w: 7 * DAY,
	week: 7 * DAY,
	weeks: 7 * DAY,
}

interface Hit {
	start: number
	end: number
}

function startOfDay(t: number): Date {
	return new Date(dayStart(t))
}

function addDays(d: Date, n: number): Date {
	const r = new Date(d)
	r.setDate(r.getDate() + n)
	return r
}

function take(text: string, re: RegExp, hits: Hit[]): RegExpExecArray | null {
	const m = re.exec(text)
	if (!m) return null
	const start = m.index + (m[0].length - m[0].trimStart().length)
	hits.push({ start, end: m.index + m[0].length })
	return m
}

function drop(hits: Hit[]): null {
	hits.pop()
	return null
}

function parseTime(text: string, hits: Hit[]): { h: number; m: number } | null {
	const word = take(text, /(?:^|\s)(?:at\s+)?(noon|midnight)\b/i, hits)
	if (word) return word[1].toLowerCase() === 'noon' ? { h: 12, m: 0 } : { h: 0, m: 0 }

	const ampm = take(
		text,
		/(?:^|\s)(?:at\s+|@\s*)?(\d{1,2})(?:[:.](\d{2}))?\s*(am|pm|a\.m\.|p\.m\.)(?=\s|$|[,.!?])/i,
		hits,
	)
	if (ampm) {
		let h = Number(ampm[1])
		const m = Number(ampm[2] ?? 0)
		if (h < 1 || h > 12 || m > 59) return drop(hits)
		const pm = ampm[3].toLowerCase().startsWith('p')
		if (h === 12) h = pm ? 12 : 0
		else if (pm) h += 12
		return { h, m }
	}

	const clock = take(text, /(?:^|\s)(?:at\s+|@\s*)?([01]?\d|2[0-3]):([0-5]\d)(?=\s|$|[,!?])/i, hits)
	if (clock) return { h: Number(clock[1]), m: Number(clock[2]) }

	const bare = take(text, /(?:^|\s)(?:at|@)\s*(\d{1,2})(?=\s|$|[,.!?])/i, hits)
	if (bare) {
		let h = Number(bare[1])
		if (h > 23) return drop(hits)
		if (h >= 1 && h <= 7) h += 12
		return { h, m: 0 }
	}
	return null
}

function parseDay(
	text: string,
	now: number,
	hits: Hit[],
): { day: Date; time?: { h: number; m: number }; repeatDay?: number } | null {
	const today = startOfDay(now)

	const rel = take(
		text,
		/(?:^|\s)in\s+(\d{1,3}|an?|one|two|three)\s+(minutes?|mins?|m|hours?|hrs?|h|days?|d|weeks?|w)(?=\s|$|[,.!?])/i,
		hits,
	)
	if (rel) {
		const words: Record<string, number> = { a: 1, an: 1, one: 1, two: 2, three: 3 }
		const n = Number.isNaN(Number(rel[1])) ? words[rel[1].toLowerCase()] : Number(rel[1])
		const unit = rel[2].toLowerCase()
		const ms = n * UNITS[unit]
		if (/^[dw]/.test(unit)) return { day: addDays(today, ms / DAY) }
		const at = new Date(now + ms)
		return { day: startOfDay(at.getTime()), time: { h: at.getHours(), m: at.getMinutes() } }
	}

	const iso = take(text, /(?:^|\s)(?:on\s+)?(\d{4})-(\d{2})-(\d{2})(?=\s|$|[,.!?])/i, hits)
	if (iso) {
		const d = dateOf(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3]))
		return d ? { day: d } : drop(hits)
	}

	if (take(text, /(?:^|\s)(?:the\s+)?day\s+after\s+tomorrow\b/i, hits))
		return { day: addDays(today, 2) }
	if (take(text, /(?:^|\s)(?:today|tod)\b/i, hits)) return { day: today }
	if (take(text, /(?:^|\s)tonight\b/i, hits)) return { day: today, time: { h: 20, m: 0 } }
	if (take(text, /(?:^|\s)(?:tomorrow|tmrw|tmr)\b/i, hits)) return { day: addDays(today, 1) }

	if (take(text, /(?:^|\s)next\s+week\b/i, hits)) {
		const offset = (8 - today.getDay()) % 7 || 7
		return { day: addDays(today, offset) }
	}
	if (take(text, /(?:^|\s)(?:this\s+|on\s+the\s+|the\s+)?weekend\b/i, hits)) {
		const offset = (6 - today.getDay() + 7) % 7
		return { day: addDays(today, offset) }
	}

	const wd = take(text, new RegExp(`(?:^|\\s)(?:on\\s+)?(next\\s+|this\\s+)?(${WD})\\b`, 'i'), hits)
	if (wd) {
		const target = WEEKDAYS[wd[2].toLowerCase()]
		let offset = (target - today.getDay() + 7) % 7
		if (wd[1]?.trim().toLowerCase() === 'next') offset = (offset || 7) + 7
		return { day: addDays(today, offset) }
	}

	const md = take(
		text,
		new RegExp(
			`(?:^|\\s)(?:on\\s+)?(${MO})\\.?\\s+(\\d{1,2})(?:st|nd|rd|th)?(?:,?\\s+(\\d{4}))?(?=\\s|$|[,.!?])`,
			'i',
		),
		hits,
	)
	const dm = md
		? null
		: take(
				text,
				new RegExp(
					`(?:^|\\s)(?:on\\s+)?(?:the\\s+)?(\\d{1,2})(?:st|nd|rd|th)?\\s+(?:of\\s+)?(${MO})\\.?(?:,?\\s+(\\d{4}))?(?=\\s|$|[,.!?])`,
					'i',
				),
				hits,
			)
	const dateHit = md ?? dm
	if (dateHit) {
		const month = MONTHS[(md ? md[1] : dm![2]).toLowerCase()]
		const date = Number(md ? md[2] : dm![1])
		if (dateHit[3]) {
			const d = dateOf(Number(dateHit[3]), month, date)
			return d ? { day: d } : drop(hits)
		}
		const year = today.getFullYear()
		for (let y = year; y <= year + LEAP_YEAR_SEARCH_YEARS; y++) {
			const d = dateOf(y, month, date)
			if (d && d >= today) return { day: d }
		}
		return drop(hits)
	}

	const ord = take(
		text,
		/(?:^|\s)(?:on\s+)?the\s+(\d{1,2})(?:st|nd|rd|th)(?=\s*$|\s*[,.!?]|\s+(?:at\s|@|\d))/i,
		hits,
	)
	if (ord) {
		const n = Number(ord[1])
		if (n < 1 || n > 31) return drop(hits)
		const inMonth = (offset: number) => {
			const first = new Date(today.getFullYear(), today.getMonth() + offset, 1)
			first.setDate(Math.min(n, daysInMonth(first.getFullYear(), first.getMonth())))
			return first
		}
		const d = inMonth(0) < today ? inMonth(1) : inMonth(0)
		return d.getDate() === n ? { day: d } : { day: d, repeatDay: n }
	}
	return null
}

function strip(text: string, hits: Hit[]): string {
	let out = text
	for (const h of [...hits].sort((a, b) => b.start - a.start)) {
		out = out.slice(0, h.start) + out.slice(h.end)
	}
	return out
		.replace(/\s+(on|at|by|due|for)\s*$/i, '')
		.replace(/^\s*(on|at|by|due)\s+/i, '')
		.replace(/\s{2,}/g, ' ')
		.replace(/\s+([,.!?])/g, '$1')
		.replace(/[,\s]+$/, '')
		.trim()
}

export type Repeat = 'daily' | 'weekdays' | 'weekly' | 'monthly' | 'yearly'

const REPEATS: [RegExp, Repeat][] = [
	[/^(every\s+day|daily)$/i, 'daily'],
	[/^(every\s+weekday|weekdays)$/i, 'weekdays'],
	[/^(every\s+week|weekly)$/i, 'weekly'],
	[/^(every\s+month|monthly)$/i, 'monthly'],
	[/^(every\s+year|yearly|annually)$/i, 'yearly'],
]

function parseRepeat(text: string, hits: Hit[]): Repeat | undefined {
	const m = take(
		text,
		/(?:^|\s)(every\s+day|daily|every\s+weekday|weekdays|every\s+week|weekly|every\s+month|monthly|every\s+year|yearly|annually)\b/i,
		hits,
	)
	if (m) return REPEATS.find(([re]) => re.test(m[1]))?.[1]
	if (take(text, new RegExp(`(?:^|\\s)every(?=\\s+(?:${WD}|saturday|sunday)\\b)`, 'i'), hits))
		return 'weekly'
	return undefined
}

function mask(text: string, hits: Hit[]): string {
	return hits.reduce(
		(s, h) => s.slice(0, h.start) + ' '.repeat(h.end - h.start) + s.slice(h.end),
		text,
	)
}

function isWeekend(d: Date): boolean {
	return d.getDay() === 0 || d.getDay() === 6
}

export function nextOccurrence(
	due: number,
	repeat: Repeat,
	now = Date.now(),
	repeatDay = new Date(due).getDate(),
): number {
	const d = new Date(due)
	const today = startOfDay(now).getTime()
	const addMonths = (n: number) => {
		const target = new Date(d.getFullYear(), d.getMonth() + n, 1, d.getHours(), d.getMinutes())
		target.setDate(Math.min(repeatDay, daysInMonth(target.getFullYear(), target.getMonth())))
		d.setTime(target.getTime())
	}
	const step = () => {
		if (repeat === 'daily') d.setDate(d.getDate() + 1)
		else if (repeat === 'weekdays') {
			do d.setDate(d.getDate() + 1)
			while (isWeekend(d))
		} else if (repeat === 'weekly') d.setDate(d.getDate() + 7)
		else if (repeat === 'monthly') addMonths(1)
		else addMonths(12)
	}
	step()
	for (let i = 0; i < 1000 && d.getTime() < today; i++) step()
	return d.getTime()
}

const LEAD_IN = /^(?:please\s+)?(?:remind me to|remember to|don'?t forget to|i need to|todo:?)\s+/i

export function parseWhen(input: string, now = Date.now()): Parsed {
	const text = input.trim().replace(LEAD_IN, '') || input.trim()
	const hits: Hit[] = []
	const repeat = parseRepeat(text, hits)
	const day = parseDay(mask(text, hits), now, hits)
	const timeHits: Hit[] = []
	const time = day?.time ?? parseTime(mask(text, hits), timeHits)
	hits.push(...timeHits)

	if (!day && !time && !repeat) return { title: text, due: null, allDay: false }

	const title = strip(text, hits) || text
	let start = day ? new Date(day.day) : startOfDay(now)
	if (!day && repeat === 'weekdays') while (isWeekend(start)) start = addDays(start, 1)
	const repeatDay =
		(repeat === 'monthly' || repeat === 'yearly') && day?.repeatDay ? day.repeatDay : undefined
	const out = (due: number, allDay: boolean): Parsed =>
		repeat
			? { title, due, allDay, repeat, ...(repeatDay ? { repeatDay } : {}) }
			: { title, due, allDay }
	if (!time) return out(start.getTime(), true)

	start.setHours(time.h, time.m, 0, 0)
	if (!day && start.getTime() <= now)
		start = new Date(
			nextOccurrence(start.getTime(), repeat ?? 'daily', addDays(startOfDay(now), 1).getTime()),
		)
	return out(start.getTime(), false)
}
