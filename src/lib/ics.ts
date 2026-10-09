import { dateOf, daysInMonth } from './format.ts'

export interface CalEvent {
	title: string
	start: number
	end: number
	allDay: boolean
	location?: string
	link?: string
}

const MEETING =
	/https:\/\/[^\s"<>\\]*(?:meet\.google\.com|zoom\.us|teams\.microsoft\.com|teams\.live\.com|whereby\.com|webex\.com|around\.co|meet\.jit\.si)[^\s"<>\\]*/i

interface Prop {
	value: string
	params: Record<string, string>
}

type Raw = Record<string, Prop[]>

const DAY = 86_400_000
const BYDAY: Record<string, number> = { SU: 0, MO: 1, TU: 2, WE: 3, TH: 4, FR: 5, SA: 6 }

function unfold(text: string): string[] {
	return text.replace(/\r?\n[ \t]/g, '').split(/\r?\n/)
}

function unescapeText(v: string): string {
	return v.replace(/\\([nN,;\\])/g, (_, c: string) => (c === 'n' || c === 'N' ? ' ' : c)).trim()
}

function valueStart(line: string): number {
	let quoted = false
	for (let i = 0; i < line.length; i++) {
		if (line[i] === '"') quoted = !quoted
		else if (line[i] === ':' && !quoted) return i
	}
	return -1
}

function parseLine(line: string): [string, Prop] | null {
	const colon = valueStart(line)
	if (colon < 0) return null
	const head = line.slice(0, colon).split(';')
	const params: Record<string, string> = {}
	for (const p of head.slice(1)) {
		const eq = p.indexOf('=')
		if (eq > 0) params[p.slice(0, eq).toUpperCase()] = p.slice(eq + 1).replace(/^"|"$/g, '')
	}
	return [head[0]!.toUpperCase(), { value: line.slice(colon + 1), params }]
}

function zoneOffset(utc: number, tz: string): number {
	const f = new Intl.DateTimeFormat('en-US', {
		timeZone: tz,
		hourCycle: 'h23',
		year: 'numeric',
		month: '2-digit',
		day: '2-digit',
		hour: '2-digit',
		minute: '2-digit',
		second: '2-digit',
	})
	const parts = Object.fromEntries(f.formatToParts(utc).map((p) => [p.type, p.value]))
	const n = (k: string) => Number(parts[k])
	const asUtc = Date.UTC(
		n('year'),
		n('month') - 1,
		n('day'),
		n('hour') % 24,
		n('minute'),
		n('second'),
	)
	return asUtc - utc
}

function parseDate(prop: Prop): { t: number; allDay: boolean } | null {
	const v = prop.value.trim()
	const m = /^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2})(\d{2})?(Z)?)?$/.exec(v)
	if (!m) return null
	const [y, mo, d, h, mi, s] = m
		.slice(1, 7)
		.map((x) => (x === undefined ? undefined : Number(x))) as [
		number,
		number,
		number,
		number?,
		number?,
		number?,
	]
	const z = m[7]
	const day = dateOf(y, mo - 1, d)
	if (!day) return null
	if (h === undefined || prop.params.VALUE === 'DATE') return { t: day.getTime(), allDay: true }
	if (h > 23 || (mi ?? 0) > 59 || (s ?? 0) > 60) return null
	const sec = Math.min(s ?? 0, 59)
	const local = () => {
		day.setHours(h, mi ?? 0, sec)
		return { t: day.getTime(), allDay: false }
	}
	const wall = Date.UTC(y, mo - 1, d, h, mi ?? 0, sec)
	if (z) return { t: wall, allDay: false }
	const tz = prop.params.TZID
	if (!tz) return local()
	try {
		const guess = wall - zoneOffset(wall, tz)
		return { t: wall - zoneOffset(guess, tz), allDay: false }
	} catch {
		return local()
	}
}

function parseDuration(v: string): number {
	const m = /^([+-])?P(?:(\d+)W)?(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?)?$/.exec(v.trim())
	if (!m) return 0
	const ms =
		((+(m[2] ?? 0) * 7 + +(m[3] ?? 0)) * 24 * 3600 +
			+(m[4] ?? 0) * 3600 +
			+(m[5] ?? 0) * 60 +
			+(m[6] ?? 0)) *
		1000
	return m[1] === '-' ? -ms : ms
}

function rrule(v: string): Record<string, string> {
	return Object.fromEntries(
		v.split(';').map((kv) => {
			const [k, val] = kv.split('=')
			return [k.toUpperCase(), val ?? '']
		}),
	)
}

function shift(t: number, allDay: boolean, f: (d: Date) => void): number {
	const d = new Date(t)
	f(d)
	return allDay ? new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime() : d.getTime()
}

const WEEKDAY = /^(SU|MO|TU|WE|TH|FR|SA)$/
const NTH_WEEKDAY = /^([+-]?[1-5])?(SU|MO|TU|WE|TH|FR|SA)$/

function understood(freq: string, rule: Record<string, string>, start: Date): boolean {
	const by = Object.keys(rule).filter((k) => k.startsWith('BY'))
	const days = rule.BYDAY?.split(',') ?? []
	const monthDays = rule.BYMONTHDAY?.split(',').map(Number) ?? []
	if (freq === 'DAILY') return by.every((k) => k === 'BYDAY') && days.every((d) => WEEKDAY.test(d))
	if (freq === 'WEEKLY') return by.every((k) => k === 'BYDAY')
	if (freq === 'MONTHLY')
		return (
			by.length <= 1 &&
			by.every((k) => k === 'BYDAY' || k === 'BYMONTHDAY') &&
			days.every((d) => NTH_WEEKDAY.test(d)) &&
			monthDays.every((d) => Number.isInteger(d) && d !== 0 && Math.abs(d) <= 31)
		)
	if (freq === 'YEARLY')
		return (
			by.every((k) => k === 'BYMONTH' || k === 'BYMONTHDAY') &&
			(!rule.BYMONTH || Number(rule.BYMONTH) === start.getMonth() + 1) &&
			(!rule.BYMONTHDAY || Number(rule.BYMONTHDAY) === start.getDate())
		)
	return false
}

function daysOfMonth(y: number, m: number, rule: Record<string, string>, dom: number): number[] {
	const last = daysInMonth(y, m)
	if (rule.BYMONTHDAY)
		return rule.BYMONTHDAY.split(',')
			.map((v) => (Number(v) < 0 ? last + 1 + Number(v) : Number(v)))
			.filter((v) => v >= 1 && v <= last)
			.sort((a, b) => a - b)
	if (rule.BYDAY) {
		const first = new Date(y, m, 1).getDay()
		const out = new Set<number>()
		for (const part of rule.BYDAY.split(',')) {
			const [, nth, wd] = NTH_WEEKDAY.exec(part)!
			const all: number[] = []
			for (let d = 1 + ((BYDAY[wd] - first + 7) % 7); d <= last; d += 7) all.push(d)
			const k = Number(nth ?? 0)
			const picked = k === 0 ? all : [all[k > 0 ? k - 1 : all.length + k]]
			for (const d of picked) if (d !== undefined) out.add(d)
		}
		return [...out].sort((a, b) => a - b)
	}
	return dom <= last ? [dom] : []
}

function expand(
	start: number,
	allDay: boolean,
	rule: Record<string, string>,
	until: number,
	exclude: Set<number>,
): number[] {
	const freq = rule.FREQ
	const interval = Number(rule.INTERVAL || 1)
	const count = rule.COUNT ? Number(rule.COUNT) : Number.POSITIVE_INFINITY
	const s = new Date(start)
	if (!Number.isInteger(interval) || interval < 1 || !(count >= 1) || !understood(freq, rule, s))
		return [start]
	const ruleUntil = rule.UNTIL ? (parseDate({ value: rule.UNTIL, params: {} })?.t ?? until) : until
	const stop = Math.min(until, ruleUntil + (allDay ? DAY - 1 : 0))
	const out: number[] = []
	let n = 0
	const push = (t: number) => {
		n++
		if (!exclude.has(t)) out.push(t)
	}

	if (freq === 'WEEKLY' && rule.BYDAY) {
		const days = rule.BYDAY.split(',')
			.map((d) => BYDAY[d.replace(/^[+-]?\d+/, '')])
			.filter((d) => d !== undefined)
			.sort()
		const weekStart = shift(start, allDay, (d) => d.setDate(d.getDate() - d.getDay()))
		for (let w = 0; w < 5000 && n < count; w++) {
			for (const dow of days) {
				const t = shift(weekStart, allDay, (d) => {
					const src = new Date(start)
					d.setDate(d.getDate() + w * 7 * interval + dow)
					if (!allDay) d.setHours(src.getHours(), src.getMinutes(), src.getSeconds(), 0)
				})
				if (t < start) continue
				if (t > stop || n >= count) return out
				push(t)
			}
		}
		return out
	}

	if (freq === 'MONTHLY' || freq === 'YEARLY') {
		const months = freq === 'YEARLY' ? 12 * interval : interval
		const byRule = freq === 'MONTHLY' ? rule : {}
		for (let i = 0; i < 1200 && n < count; i++) {
			const month = new Date(s.getFullYear(), s.getMonth() + i * months, 1)
			const y = month.getFullYear()
			const m = month.getMonth()
			for (const day of daysOfMonth(y, m, byRule, s.getDate())) {
				const t = new Date(y, m, day, s.getHours(), s.getMinutes(), s.getSeconds()).getTime()
				if (t < start) continue
				if (t > stop || n >= count) return out
				push(t)
			}
		}
		return out
	}

	const weekdays = rule.BYDAY ? new Set(rule.BYDAY.split(',').map((d) => BYDAY[d])) : null
	const days = freq === 'WEEKLY' ? 7 * interval : interval
	for (let i = 0; i < 20000 && n < count; i++) {
		const t = shift(start, allDay, (d) => d.setDate(d.getDate() + i * days))
		if (t > stop) break
		if (weekdays && !weekdays.has(new Date(t).getDay())) continue
		push(t)
	}
	return out
}

export function parseIcs(text: string, from: number, to: number): CalEvent[] {
	const lines = unfold(text)
	const raws: Raw[] = []
	let cur: Raw | null = null
	let depth = 0
	for (const line of lines) {
		if (/^BEGIN:VEVENT/i.test(line)) {
			cur = {}
			depth = 0
			continue
		}
		if (!cur) continue
		if (/^BEGIN:/i.test(line)) depth++
		else if (/^END:VEVENT/i.test(line)) {
			raws.push(cur)
			cur = null
		} else if (/^END:/i.test(line)) depth--
		else if (depth === 0) {
			const p = parseLine(line)
			if (p) {
				cur[p[0]] ??= []
				cur[p[0]].push(p[1])
			}
		}
	}

	const overrides = new Map<string, Set<number>>()
	for (const r of raws) {
		const rid = r['RECURRENCE-ID']?.[0]
		const uid = r.UID?.[0]?.value
		if (rid && uid) {
			const t = parseDate(rid)?.t
			if (t !== undefined) {
				if (!overrides.has(uid)) overrides.set(uid, new Set())
				overrides.get(uid)!.add(t)
			}
		}
	}

	const out: CalEvent[] = []
	for (const r of raws) {
		if (r.STATUS?.[0]?.value.toUpperCase() === 'CANCELLED') continue
		const ds = r.DTSTART?.[0] && parseDate(r.DTSTART[0])
		if (!ds) continue
		const de = r.DTEND?.[0] && parseDate(r.DTEND[0])
		const dur = de
			? de.t - ds.t
			: r.DURATION?.[0]
				? parseDuration(r.DURATION[0].value)
				: ds.allDay
					? DAY
					: 0
		const title = unescapeText(r.SUMMARY?.[0]?.value ?? '') || 'Untitled event'
		const location = r.LOCATION?.[0] ? unescapeText(r.LOCATION[0].value) || undefined : undefined
		const link = [
			r.URL?.[0]?.value,
			r.LOCATION?.[0]?.value,
			r.DESCRIPTION?.[0]?.value,
			r['X-GOOGLE-CONFERENCE']?.[0]?.value,
		]
			.map((v) => (v ? MEETING.exec(v.replace(/\\[nN]/g, ' '))?.[0] : undefined))
			.find(Boolean)

		let starts = [ds.t]
		const rule = r.RRULE?.[0]
		if (rule && !r['RECURRENCE-ID']) {
			const exclude = new Set<number>(overrides.get(r.UID?.[0]?.value ?? '') ?? [])
			for (const ex of r.EXDATE ?? []) {
				for (const v of ex.value.split(',')) {
					const t = parseDate({ value: v, params: ex.params })?.t
					if (t !== undefined) exclude.add(t)
				}
			}
			starts = expand(ds.t, ds.allDay, rrule(rule.value), to, exclude)
		}
		for (const s of starts) {
			const e = s + Math.max(0, dur)
			if (e < from && !(ds.allDay && e === from)) continue
			if (s > to) continue
			out.push({ title, start: s, end: e, allDay: ds.allDay, location, link })
		}
	}
	return out.sort((a, b) => a.start - b.start)
}
