import { browser } from 'wxt/browser'
import { parseSince, type Scope } from '@/lib/since'
import { find, readBetween } from './db'
import { pageKey } from './privacy'
import { type Hit, queryWords, rankHits, scoreHit } from './rank'

export interface Results {
	query: string
	scope: Scope | null
	words: string[]
	hits: Hit[]
	/** Open tabs by page address, so a result can switch to its tab. */
	open: Map<string, { id: number; windowId: number }>
	ms: number
}

async function openTabs(): Promise<Results['open']> {
	const map: Results['open'] = new Map()
	try {
		const tabs = await browser.tabs.query({ url: 'https://*/*' })
		for (const t of tabs)
			if (t.url && t.id !== undefined) map.set(pageKey(t.url), { id: t.id, windowId: t.windowId })
	} catch {}
	return map
}

export async function search(q: string, now = Date.now()): Promise<Results> {
	const t0 = performance.now()
	const scope = parseSince(q, now)
	const text = scope ? scope.text : q
	const words = queryWords(text)
	const open = openTabs()
	let hits: Hit[] = []
	if (!words.length && scope) {
		const pages = await readBetween(scope.start, scope.end)
		hits = pages.map((page) => ({ page, passage: null, score: page.readMs }))
	} else if (words.length) {
		const found = await find(words, scope ? { start: scope.start, end: scope.end } : null)
		hits = rankHits(found.map((f) => ({ ...f, score: scoreHit(f.page, f.passage, words, now) })))
	}
	return { query: q, scope, words, hits, open: await open, ms: performance.now() - t0 }
}
