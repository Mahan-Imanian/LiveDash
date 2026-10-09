import { score } from './fuzzy.ts'

export interface Source {
	url: string
	title: string
	visits?: number
	lastVisit?: number
	tabId?: number
	windowId?: number
	pinned?: number
	bookmark?: boolean
}

export interface Dest {
	key: string
	url: string
	title: string
	host: string
	path: string
	visits: number
	lastVisit: number
	tabId?: number
	windowId?: number
	pinned?: number
	bookmark?: boolean
	score: number
}

export interface Launch {
	k: string
	q: string
	t: number
}

export interface RankCtx {
	now: number
	launches: Launch[]
	hidden: string[]
	hours?: Record<string, number[]>
}

const DAY = 86_400_000

export const VISIT_HALF_LIFE_DAYS = 14
const UNKNOWN_VISIT_AGE_DAYS = 30
const HOUR_MIN_SAMPLE_VISITS = 6
export const HOUR_WEIGHT_FLOOR = 0.6
export const HOUR_WEIGHT_MAX_BOOST = 1.6
const HOUR_SHARE_GAIN = 4
export const LAUNCH_HALF_LIFE_DAYS = 21
const LAUNCH_SAME_QUERY_MULTIPLIER = 4
const HOME_LAUNCH_WEIGHT = 1.5
const HOME_MIN_VISITS = 2
const HOME_PER_HOST = 1
const HOME_LIMIT = 9
const QUERY_LIMIT = 9
const QUERY_MIN_TEXT_POINTS = 45
const QUERY_HOST_BONUS_POINTS = 4
const QUERY_SITE_NAME_BONUS_POINTS = 6
const QUERY_KEY_PENALTY_POINTS = 10
const QUERY_VISIT_POINTS_PER_DOUBLING = 3
export const QUERY_PINNED_BONUS_POINTS = 10
const QUERY_OPEN_TAB_BONUS_POINTS = 6
const QUERY_LAUNCH_POINTS = 12
export const TOP_HIT_MIN_TEXT_POINTS = 70
export const COMMAND_MIN_POINTS = 62
export const COMMAND_TOP_HIT_MIN_POINTS = 75
export const COMMAND_KEYWORD_PENALTY_POINTS = 12
export const ITEM_MIN_TEXT_POINTS = 55

const TRACKING_PARAM =
	/^(?:utm_\w+|fbclid|gclid|dclid|gbraid|wbraid|msclkid|mc_cid|mc_eid|igshid|yclid|_ga|_gl|si|ref_src)$/i

const JUNK = [
	/^https?:\/\/(www\.)?google\.[a-z.]+\/(search|url|webhp)/i,
	/^https?:\/\/(www\.)?bing\.com\/search/i,
	/^https?:\/\/(html\.)?duckduckgo\.com\/(\?|html)/i,
	/^https?:\/\/search\.(yahoo|brave)\./i,
	/^https?:\/\/accounts\.google\.com\//i,
	/^https?:\/\/[^/]+\/(login|logout|signin|sign-in|signup|oauth2?|auth|callback|sso)(\/|\?|$)/i,
	/[?&](code|state|token|access_token)=/i,
]

export function normalize(raw: string): { key: string; host: string; path: string } | null {
	let u: URL
	try {
		u = new URL(raw)
	} catch {
		return null
	}
	if (u.protocol !== 'https:' && u.protocol !== 'http:') return null
	const host = u.hostname.toLowerCase().replace(/^www\./, '')
	const path = u.pathname.replace(/\/+$/, '')
	for (const k of [...u.searchParams.keys()]) if (TRACKING_PARAM.test(k)) u.searchParams.delete(k)
	const query = u.searchParams.size ? `?${u.searchParams}` : ''
	return { key: host + path + query, host, path }
}

const SEP = /\s+[-–—|·•»]\s+/

export function cleanTitle(raw: string, host: string, path: string): string {
	const title = raw.replace(/\s+/g, ' ').trim()
	if (!title || /^[a-z][a-z0-9+.-]*:\/\//i.test(title)) return host
	const brand = host.split('.').slice(-2, -1)[0] ?? host
	const isBrand = (seg: string) => {
		const t = seg.toLowerCase().replace(/[^a-z0-9]/g, '')
		return t.length > 0 && (t === brand || t.startsWith(brand) || brand.startsWith(t))
	}
	const parts = title
		.split(SEP)
		.map((p) => p.trim())
		.filter(Boolean)
	if (path === '') {
		const head = title.split(/:\s|\s[-–—|·]\s/)[0].trim()
		return head.length <= 40 ? head : parts[0]
	}
	const kept = parts.filter((p) => !isBrand(p))
	if (!kept.length) return parts[0]
	const first = kept[0]
	return first.length >= 3 ? first : kept.join(' · ')
}

export function isJunk(url: string): boolean {
	return JUNK.some((re) => re.test(url))
}

export function frecency(visits: number, lastVisit: number, now: number): number {
	const ageDays = Math.max(0, now - lastVisit) / DAY
	return Math.log2(2 + visits) * 0.5 ** (ageDays / VISIT_HALF_LIFE_DAYS)
}

export function hourWeight(hist: number[] | undefined, hour: number): number {
	if (!hist) return 1
	const total = hist.reduce((a, b) => a + b, 0)
	if (total < HOUR_MIN_SAMPLE_VISITS) return 1
	const near = hist[(hour + 23) % 24] + hist[hour] + hist[(hour + 1) % 24]
	return HOUR_WEIGHT_FLOOR + Math.min(HOUR_WEIGHT_MAX_BOOST, (near / total) * HOUR_SHARE_GAIN)
}

export function launchWeight(key: string, launches: Launch[], now: number, q = ''): number {
	let w = 0
	const ql = q.toLowerCase()
	for (const l of launches) {
		if (l.k !== key) continue
		const decay = 0.5 ** ((now - l.t) / (LAUNCH_HALF_LIFE_DAYS * DAY))
		w += decay
		if (ql && l.q && (l.q.startsWith(ql) || ql.startsWith(l.q)))
			w += LAUNCH_SAME_QUERY_MULTIPLIER * decay
	}
	return w
}

export function merge(sources: Source[]): Dest[] {
	const map = new Map<string, Dest>()
	for (const s of sources) {
		const n = normalize(s.url)
		if (!n) continue
		if (s.pinned === undefined && s.tabId === undefined && isJunk(s.url)) continue
		const d = map.get(n.key)
		if (!d) {
			map.set(n.key, {
				key: n.key,
				url: s.url,
				title: cleanTitle(s.title ?? '', n.host, n.path),
				host: n.host,
				path: n.path,
				visits: s.visits ?? 0,
				lastVisit: s.lastVisit ?? 0,
				tabId: s.tabId,
				windowId: s.windowId,
				pinned: s.pinned,
				bookmark: s.bookmark,
				score: 0,
			})
			continue
		}
		d.visits = Math.max(d.visits, s.visits ?? 0)
		d.lastVisit = Math.max(d.lastVisit, s.lastVisit ?? 0)
		if (s.tabId !== undefined && d.tabId === undefined) {
			d.tabId = s.tabId
			d.windowId = s.windowId
		}
		if (s.pinned !== undefined) {
			d.pinned = s.pinned
			d.url = s.url
			if (s.title) d.title = s.title.trim()
		}
		if (s.bookmark) d.bookmark = true
		if ((!d.title || d.title === d.host) && s.title) d.title = cleanTitle(s.title, n.host, n.path)
	}
	return [...map.values()].filter(
		(d) => d.pinned !== undefined || d.tabId !== undefined || !ERROR_TITLE.test(d.title),
	)
}

const ERROR_TITLE =
	/^(?:error )?[45]\d\d(?:$|\s*[^\w\s]|\s+(?:forbidden|not found|bad gateway|service unavailable|internal server error|unauthorized|gone|too many requests))|^(?:forbidden|not found|access denied|page not found|just a moment\W*)$/i

function base(d: Dest, ctx: RankCtx): number {
	const f = frecency(d.visits, d.lastVisit || ctx.now - UNKNOWN_VISIT_AGE_DAYS * DAY, ctx.now)
	const h = hourWeight(ctx.hours?.[d.key], new Date(ctx.now).getHours())
	return f * h + launchWeight(d.key, ctx.launches, ctx.now) * HOME_LAUNCH_WEIGHT
}

export function rankHome(dests: Dest[], ctx: RankCtx, limit = HOME_LIMIT): Dest[] {
	const hidden = new Set(ctx.hidden)
	const pins = dests
		.filter((d) => d.pinned !== undefined)
		.sort((a, b) => (a.pinned ?? 0) - (b.pinned ?? 0))
	const rest = dests
		.filter(
			(d) =>
				d.pinned === undefined &&
				!hidden.has(d.key) &&
				(d.visits >= HOME_MIN_VISITS || launchWeight(d.key, ctx.launches, ctx.now) > 0),
		)
		.map((d) => ({ ...d, score: base(d, ctx) }))
		.sort((a, b) => b.score - a.score)
	const perHost = new Map<string, number>()
	for (const p of pins) perHost.set(p.host, (perHost.get(p.host) ?? 0) + 1)
	const out = [...pins]
	for (const d of rest) {
		if (out.length >= limit) break
		const n = perHost.get(d.host) ?? 0
		if (n >= HOME_PER_HOST) continue
		perHost.set(d.host, n + 1)
		out.push(d)
	}
	return out.slice(0, Math.max(limit, pins.length))
}

export function rankQuery(q: string, dests: Dest[], ctx: RankCtx, limit = QUERY_LIMIT): Dest[] {
	const query = q.trim().toLowerCase()
	if (!query) return []
	const hidden = new Set(ctx.hidden)
	const scored: Dest[] = []
	for (const d of dests) {
		if (hidden.has(d.key) && d.pinned === undefined && d.tabId === undefined) continue
		const text = Math.max(
			score(query, d.title),
			score(query, d.host) + QUERY_HOST_BONUS_POINTS,
			score(query, d.host.split('.')[0]) + QUERY_SITE_NAME_BONUS_POINTS,
			score(query, d.key) - QUERY_KEY_PENALTY_POINTS,
		)
		if (text < QUERY_MIN_TEXT_POINTS) continue
		const learned = launchWeight(d.key, ctx.launches, ctx.now, query)
		const usage =
			Math.log2(2 + d.visits) * QUERY_VISIT_POINTS_PER_DOUBLING +
			(d.pinned !== undefined ? QUERY_PINNED_BONUS_POINTS : 0) +
			(d.tabId !== undefined ? QUERY_OPEN_TAB_BONUS_POINTS : 0)
		scored.push({ ...d, score: text + usage + learned * QUERY_LAUNCH_POINTS })
	}
	const seen = new Set<string>()
	return scored
		.sort((a, b) => b.score - a.score)
		.filter((d) => {
			const sig = `${d.host}|${d.title.toLowerCase()}`
			if (seen.has(sig)) return false
			seen.add(sig)
			return true
		})
		.slice(0, limit)
}
