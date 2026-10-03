export interface Parsed {
	title: string
	due: number | null
	allDay: boolean
}

const DAY = 86_400_000

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
	const d = new Date(t)
	d.setHours(0, 0, 0, 0)
	return d
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
		if (h < 1 || h > 12 || m > 59) return null
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
		if (h > 23) return null
		if (h >= 1 && h <= 7) h += 12
		return { h, m: 0 }
	}
	return null
}

function parseDay(
	text: string,
	now: number,
	hits: Hit[],
): { day: Date; time?: { h: number; m: number } } | null {
	const today = startOfDay(now)

	const rel = take(
		text,
		/(?:^|\s)in\s+(\d{1,3}|an?|one|two|three)\s+(minutes?|mins?|m|hours?|hrs?|h|days?|d|weeks?|w)(?=\s|$|[,.!?])/i,
		hits,
	)
	if (rel) {
		const words: Record<string, number> = { a: 1, an: 1, one: 1, two: 2, three: 3 }
		const n = Number.isNaN(Number(rel[1])) ? words[rel[1].toLowerCase()] : Number(rel[1])
		const ms = n * UNITS[rel[2].toLowerCase()]
		const at = new Date(now + ms)
		if (ms < DAY)
			return { day: startOfDay(at.getTime()), time: { h: at.getHours(), m: at.getMinutes() } }
		return { day: startOfDay(at.getTime()) }
	}

	const iso = take(text, /(?:^|\s)(?:on\s+)?(\d{4})-(\d{2})-(\d{2})(?=\s|$|[,.!?])/i, hits)
	if (iso) {
		const d = new Date(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3]))
		return Number.isNaN(d.getTime()) ? null : { day: d }
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
		const year = dateHit[3] ? Number(dateHit[3]) : today.getFullYear()
		let d = new Date(year, month, date)
		if (d.getMonth() !== month) return null
		if (!dateHit[3] && d < today) d = new Date(year + 1, month, date)
		return { day: d }
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

export function parseWhen(input: string, now = Date.now()): Parsed {
	const text = input.trim()
	const hits: Hit[] = []
	const day = parseDay(text, now, hits)
	const masked = hits.length
		? hits.reduce(
				(s, h) => s.slice(0, h.start) + ' '.repeat(h.end - h.start) + s.slice(h.end),
				text,
			)
		: text
	const timeHits: Hit[] = []
	const time = day?.time ?? parseTime(masked, timeHits)
	hits.push(...timeHits)

	if (!day && !time) return { title: text, due: null, allDay: false }

	const title = strip(text, hits) || text
	if (day && !time) return { title, due: day.day.getTime(), allDay: true }

	const base = day ? new Date(day.day) : startOfDay(now)
	base.setHours(time!.h, time!.m, 0, 0)
	if (!day && base.getTime() <= now) base.setDate(base.getDate() + 1)
	return { title, due: base.getTime(), allDay: false }
}
