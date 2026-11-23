import type { Passage } from './text.ts'
import { fold, tokenize } from './text.ts'

export interface PageMeta {
	id: number
	url: string
	site: string
	title: string
	first: number
	last: number
	/** The most recent visit times, newest last. */
	visits: number[]
	readMs: number
}

export interface Hit {
	page: PageMeta
	passage: Passage | null
	score: number
}

const DAY = 86_400_000

/**
 * Orders pages for a query. The words of the sentence matter most, then the
 * title, then how recently and how long the page was read.
 */
export function scoreHit(
	page: PageMeta,
	passage: Passage | null,
	q: string[],
	now: number,
): number {
	if (!q.length) return 0
	const coverage = passage ? passage.hits / q.length : 0
	const title = tokenize(page.title, true)
	const titleHits = q.filter((w, i) =>
		title.some((t) => (i === q.length - 1 ? t.startsWith(w) : t === w)),
	).length
	const ageDays = Math.max(0, (now - page.last) / DAY)
	const recency = 15 * 0.5 ** (ageDays / 14)
	const visits = Math.min(8, Math.log2(1 + page.visits.length) * 3)
	const reading = Math.min(10, Math.log2(1 + page.readMs / 60_000) * 4)
	return coverage * 60 + (titleHits / q.length) * 20 + recency + visits + reading
}

export function rankHits(hits: Hit[], limit = 20): Hit[] {
	return [...hits].sort((a, b) => b.score - a.score || b.page.last - a.page.last).slice(0, limit)
}

/** "read Tuesday for 11 minutes", "read 2 weeks ago", "read just now". */
export function readLabel(page: PageMeta, now: number, withTime = true): string {
	const when = whenLabel(page.last, now)
	const mins = Math.round(page.readMs / 60_000)
	return withTime && mins >= 2 ? `read ${when} for ${mins} minutes` : `read ${when}`
}

export function whenLabel(t: number, now: number): string {
	const start = (x: number) => {
		const d = new Date(x)
		d.setHours(0, 0, 0, 0)
		return d.getTime()
	}
	const days = Math.round((start(now) - start(t)) / DAY)
	if (now - t < 60 * 60_000) return 'just now'
	if (days <= 0) return 'today'
	if (days === 1) return 'yesterday'
	if (days < 7) return new Intl.DateTimeFormat('en', { weekday: 'long' }).format(t)
	if (days < 14) return 'last week'
	if (days < 45) return `${Math.round(days / 7)} weeks ago`
	const sameYear = new Date(t).getFullYear() === new Date(now).getFullYear()
	return `on ${new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric', ...(sameYear ? {} : { year: 'numeric' }) }).format(t)}`
}

/** "You read this 6 days ago" for the resurfaced sentence. */
export function agoLabel(t: number, now: number): string {
	const days = Math.round((now - t) / DAY)
	if (days <= 0) return 'You read this today'
	if (days === 1) return 'You read this yesterday'
	if (days < 14) return `You read this ${days} days ago`
	if (days < 60) return `You read this ${Math.round(days / 7)} weeks ago`
	return `You read this ${Math.round(days / 30)} months ago`
}

/** The query split into words the index understands, keeping the last as typed. */
export function queryWords(q: string): string[] {
	const words = tokenize(q)
	if (!words.length) {
		const raw = fold(q).match(/[\p{L}\p{N}]+/gu)
		return raw ? raw.slice(-1) : []
	}
	return words
}
