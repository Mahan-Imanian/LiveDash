import { score } from './fuzzy.ts'

export interface Source {
	url: string
	title: string
	visits?: number
	typed?: number
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
	return { key: host + path, host, path }
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

export function frecency(visits: number, typed: number, lastVisit: number, now: number): number {
	const age = Math.max(0, now - lastVisit) / DAY
	return Math.log2(2 + visits + 2 * typed) * 0.5 ** (age / 14)
}

export function hourWeight(hist: number[] | undefined, hour: number): number {
	if (!hist) return 1
	const total = hist.reduce((a, b) => a + b, 0)
	if (total < 6) return 1
	const near = hist[(hour + 23) % 24] + hist[hour] + hist[(hour + 1) % 24]
	return 0.6 + Math.min(1.6, (near / total) * 4)
}

export function launchWeight(key: string, launches: Launch[], now: number, q = ''): number {
	let w = 0
	const ql = q.toLowerCase()
	for (const l of launches) {
		if (l.k !== key) continue
		const decay = 0.5 ** ((now - l.t) / (21 * DAY))
		w += decay
		if (ql && l.q && (l.q.startsWith(ql) || ql.startsWith(l.q))) w += 4 * decay
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
	const f = frecency(d.visits, 0, d.lastVisit || ctx.now - 30 * DAY, ctx.now)
	const h = hourWeight(ctx.hours?.[d.key], new Date(ctx.now).getHours())
	return f * h + launchWeight(d.key, ctx.launches, ctx.now) * 1.5
}

export function rankHome(dests: Dest[], ctx: RankCtx, limit = 9): Dest[] {
	const hidden = new Set(ctx.hidden)
	const pins = dests
		.filter((d) => d.pinned !== undefined)
		.sort((a, b) => (a.pinned ?? 0) - (b.pinned ?? 0))
	const rest = dests
		.filter(
			(d) =>
				d.pinned === undefined &&
				!hidden.has(d.key) &&
				(d.visits > 1 || launchWeight(d.key, ctx.launches, ctx.now) > 0),
		)
		.map((d) => ({ ...d, score: base(d, ctx) }))
		.sort((a, b) => b.score - a.score)
	const perHost = new Map<string, number>()
	for (const p of pins) perHost.set(p.host, (perHost.get(p.host) ?? 0) + 1)
	const out = [...pins]
	for (const d of rest) {
		if (out.length >= limit) break
		const n = perHost.get(d.host) ?? 0
		if (n >= 1) continue
		perHost.set(d.host, n + 1)
		out.push(d)
	}
	return out.slice(0, Math.max(limit, pins.length))
}

export function rankQuery(q: string, dests: Dest[], ctx: RankCtx, limit = 8): Dest[] {
	const query = q.trim().toLowerCase()
	if (!query) return []
	const hidden = new Set(ctx.hidden)
	const scored: Dest[] = []
	for (const d of dests) {
		if (hidden.has(d.key) && d.pinned === undefined && d.tabId === undefined) continue
		const text = Math.max(
			score(query, d.title),
			score(query, d.host) + 4,
			score(query, d.host.split('.')[0]) + 6,
			score(query, d.key) - 10,
		)
		if (text < 45) continue
		const learned = launchWeight(d.key, ctx.launches, ctx.now, query)
		const usage =
			Math.log2(2 + d.visits) * 3 +
			(d.pinned !== undefined ? 10 : 0) +
			(d.tabId !== undefined ? 6 : 0)
		scored.push({ ...d, score: text + usage + learned * 12 })
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
