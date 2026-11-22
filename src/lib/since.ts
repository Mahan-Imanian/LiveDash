/**
 * Time phrases in a search: "figma yesterday", "docs this morning",
 * "last week", "on monday", "3 days ago", "during design review".
 *
 * Only past-looking phrases are recognised. Words like "today", "tonight" or a
 * bare weekday stay with the task parser (`when.ts`), so "call mom friday 6pm"
 * is still a task. The phrase may come first or last in the query.
 */

export interface Scope {
	/** The query with the time phrase removed. */
	text: string
	/** The phrase as typed, for highlighting in the field. */
	phrase: string
	start: number
	end: number
	/** A short human label: "yesterday", "this morning", "last week". */
	label: string
	/** The calendar dates the window covers, for the preview line. */
	detail: string
}

export interface ScopeEvent {
	title: string
	start: number
	end: number
}

const DAYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']

function startOfDay(t: number): number {
	const d = new Date(t)
	d.setHours(0, 0, 0, 0)
	return d.getTime()
}

/** The same wall-clock hour `days` calendar days from `dayStart`, DST-safe. */
function at(dayStart: number, days: number, hour = 0): number {
	const d = new Date(dayStart)
	d.setDate(d.getDate() + days)
	d.setHours(hour, 0, 0, 0)
	return d.getTime()
}

function dayLabel(t: number): string {
	return new Intl.DateTimeFormat(undefined, {
		weekday: 'long',
		month: 'long',
		day: 'numeric',
	}).format(t)
}

function rangeLabel(a: number, b: number): string {
	const f = new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' })
	return `${f.format(a)} – ${f.format(b - 1)}`
}

type Rule = {
	re: RegExp
	make: (
		m: RegExpMatchArray,
		now: number,
		today: number,
		events: ScopeEvent[],
	) => Omit<Scope, 'text' | 'phrase'> | null
}

const PARTS: Record<string, [number, number]> = {
	morning: [5, 12],
	afternoon: [12, 17],
	evening: [17, 24],
}

const RULES: Rule[] = [
	{
		re: /^yesterday(?:\s+(morning|afternoon|evening))?$/,
		make: (m, _now, today) => {
			const [a, b] = m[1] ? PARTS[m[1]] : [0, 24]
			return {
				start: at(today, -1, a),
				end: at(today, -1, b),
				label: m[1] ? `yesterday ${m[1]}` : 'yesterday',
				detail: dayLabel(at(today, -1)),
			}
		},
	},
	{
		re: /^last night$/,
		make: (_m, _now, today) => ({
			start: at(today, -1, 18),
			end: at(today, 0, 4),
			label: 'last night',
			detail: dayLabel(at(today, -1)),
		}),
	},
	{
		re: /^this (morning|afternoon)$/,
		make: (m, now, today) => {
			const [a, b] = PARTS[m[1]]
			const start = at(today, 0, a)
			if (start > now) return null
			return {
				start,
				end: Math.min(now, at(today, 0, b)),
				label: `this ${m[1]}`,
				detail: dayLabel(today),
			}
		},
	},
	{
		re: /^earlier today$/,
		make: (_m, now, today) => ({
			start: today,
			end: now,
			label: 'earlier today',
			detail: dayLabel(today),
		}),
	},
	{
		re: /^(\d{1,2}) days? ago$/,
		make: (m, _now, today) => {
			const n = Number(m[1])
			if (n < 1 || n > 60) return null
			return {
				start: at(today, -n),
				end: at(today, -n + 1),
				label: `${n} day${n === 1 ? '' : 's'} ago`,
				detail: dayLabel(at(today, -n)),
			}
		},
	},
	{
		re: /^(this|last) week$/,
		make: (m, now, today) => {
			const dow = (new Date(today).getDay() + 6) % 7
			const monday = at(today, -dow)
			if (m[1] === 'this')
				return { start: monday, end: now, label: 'this week', detail: rangeLabel(monday, now + 1) }
			const prev = at(monday, -7)
			return { start: prev, end: monday, label: 'last week', detail: rangeLabel(prev, monday) }
		},
	},
	{
		re: new RegExp(`^(on|last) (${DAYS.join('|')})$`),
		make: (m, _now, today) => {
			const want = DAYS.indexOf(m[2])
			const dow = new Date(today).getDay()
			let back = (dow - want + 7) % 7
			if (back === 0 && m[1] === 'last') back = 7
			const day = at(today, -back)
			return {
				start: day,
				end: at(today, -back + 1),
				label: back === 0 ? 'today' : `${m[1]} ${m[2][0].toUpperCase()}${m[2].slice(1)}`,
				detail: dayLabel(day),
			}
		},
	},
	{
		re: /^during (.{2,})$/,
		make: (m, now, _today, events) => {
			const want = m[1].trim().toLowerCase()
			const ev = events
				.filter((e) => e.start <= now && e.title.toLowerCase().includes(want))
				.sort((a, b) => b.start - a.start)[0]
			if (!ev) return null
			return {
				start: ev.start,
				end: Math.min(ev.end, now),
				label: `during ${ev.title}`,
				detail: dayLabel(ev.start),
			}
		},
	},
]

/** Phrase lengths to try, longest first, so "yesterday morning" beats "yesterday". */
const MAX_WORDS = 6

export function parseSince(input: string, now: number, events: ScopeEvent[] = []): Scope | null {
	const raw = input.trim().replace(/\s+/g, ' ')
	if (!raw) return null
	const words = raw.split(' ')
	const today = startOfDay(now)
	for (let n = Math.min(MAX_WORDS, words.length); n >= 1; n--) {
		for (const fromEnd of [true, false]) {
			const phraseWords = fromEnd ? words.slice(-n) : words.slice(0, n)
			const phrase = phraseWords.join(' ')
			const lower = phrase.toLowerCase()
			for (const rule of RULES) {
				const m = lower.match(rule.re)
				if (!m) continue
				const made = rule.make(m, now, today, events)
				if (!made || made.end <= made.start) continue
				const text = (fromEnd ? words.slice(0, -n) : words.slice(n)).join(' ')
				return { ...made, text, phrase }
			}
		}
	}
	return null
}
