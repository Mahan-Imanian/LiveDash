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
	return v
		.replace(/\\n/gi, ' ')
		.replace(/\\([,;\\])/g, '$1')
		.trim()
}

function parseLine(line: string): [string, Prop] | null {
	const colon = line.search(/:(?=(?:[^"]*"[^"]*")*[^"]*$)/)
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

export function parseDate(prop: Prop): { t: number; allDay: boolean } | null {
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
	if (h === undefined || prop.params.VALUE === 'DATE') {
		return { t: new Date(y, mo - 1, d).getTime(), allDay: true }
	}
	const wall = Date.UTC(y, mo - 1, d, h, mi ?? 0, s ?? 0)
	if (z) return { t: wall, allDay: false }
	const tz = prop.params.TZID
	if (tz) {
		try {
			const guess = wall - zoneOffset(wall, tz)
			return { t: wall - zoneOffset(guess, tz), allDay: false }
		} catch {
			return { t: new Date(y, mo - 1, d, h, mi ?? 0, s ?? 0).getTime(), allDay: false }
		}
	}
	return { t: new Date(y, mo - 1, d, h, mi ?? 0, s ?? 0).getTime(), allDay: false }
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

function expand(
	start: number,
	allDay: boolean,
	rule: Record<string, string>,
	until: number,
	exclude: Set<number>,
): number[] {
	const freq = rule.FREQ
	const interval = Math.max(1, Number(rule.INTERVAL || 1))
	const count = rule.COUNT ? Number(rule.COUNT) : Number.POSITIVE_INFINITY
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

	const step: Record<string, (d: Date, k: number) => void> = {
		DAILY: (d, k) => d.setDate(d.getDate() + k),
		WEEKLY: (d, k) => d.setDate(d.getDate() + 7 * k),
		MONTHLY: (d, k) => d.setMonth(d.getMonth() + k),
		YEARLY: (d, k) => d.setFullYear(d.getFullYear() + k),
	}
	const f = step[freq]
	if (!f) return [start]
	for (let i = 0; i < 20000 && n < count; i++) {
		const t = shift(start, allDay, (d) => f(d, i * interval))
		if (t > stop) break
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
