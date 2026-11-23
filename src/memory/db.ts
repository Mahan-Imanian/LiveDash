import type { PageMeta } from './rank'
import {
	bestPassage,
	HEADING,
	hash,
	isQuotable,
	type Passage,
	sentences,
	uniqueTokens,
} from './text'

/**
 * The on-device memory: one IndexedDB database shared by the service worker
 * (which writes) and the new tab (which reads). `pages` holds each page's
 * readable text; `terms` maps each word to the pages that contain it.
 */

export interface Page extends PageMeta {
	paras: string[]
	bytes: number
	sig: number
}

interface Term {
	t: string
	ids: number[]
}

const NAME = 'livedash-memory'
const VISITS_KEPT = 30
const MAX_PARAS_CHARS = 120_000

let dbp: Promise<IDBDatabase> | null = null

export function openDb(): Promise<IDBDatabase> {
	if (dbp) return dbp
	dbp = new Promise((resolve, reject) => {
		const req = indexedDB.open(NAME, 1)
		req.onupgradeneeded = () => {
			const db = req.result
			const pages = db.createObjectStore('pages', { keyPath: 'id', autoIncrement: true })
			pages.createIndex('url', 'url', { unique: true })
			pages.createIndex('site', 'site')
			pages.createIndex('last', 'last')
			db.createObjectStore('terms', { keyPath: 't' })
		}
		req.onsuccess = () => {
			req.result.onversionchange = () => {
				req.result.close()
				dbp = null
			}
			resolve(req.result)
		}
		req.onerror = () => {
			dbp = null
			reject(req.error)
		}
	})
	return dbp
}

const done = (tx: IDBTransaction) =>
	new Promise<void>((resolve, reject) => {
		tx.oncomplete = () => resolve()
		tx.onerror = () => reject(tx.error)
		tx.onabort = () => reject(tx.error)
	})

const got = <T>(r: IDBRequest<T>) =>
	new Promise<T>((resolve, reject) => {
		r.onsuccess = () => resolve(r.result)
		r.onerror = () => reject(r.error)
	})

function addPostings(terms: IDBObjectStore, id: number, words: string[]) {
	for (const t of words) {
		const r = terms.get(t)
		r.onsuccess = () => {
			const row = r.result as Term | undefined
			if (!row) terms.put({ t, ids: [id] })
			else if (!row.ids.includes(id)) {
				row.ids.push(id)
				terms.put(row)
			}
		}
	}
}

function dropPostings(terms: IDBObjectStore, id: number, words: string[]) {
	for (const t of words) {
		const r = terms.get(t)
		r.onsuccess = () => {
			const row = r.result as Term | undefined
			if (!row) return
			const ids = row.ids.filter((x) => x !== id)
			if (ids.length) terms.put({ t, ids })
			else terms.delete(t)
		}
	}
}

export interface Capture {
	url: string
	site: string
	title: string
	paras: string[]
	at: number
}

function trimParas(paras: string[]): string[] {
	const out: string[] = []
	let n = 0
	for (const p of paras) {
		n += p.length
		if (n > MAX_PARAS_CHARS) break
		out.push(p)
	}
	return out
}

/** Stores or refreshes a page. Same text means only the visit is recorded. */
export async function savePage(c: Capture): Promise<void> {
	const db = await openDb()
	const tx = db.transaction(['pages', 'terms'], 'readwrite')
	const pages = tx.objectStore('pages')
	const terms = tx.objectStore('terms')
	const paras = trimParas(c.paras)
	const sig = hash(c.title + paras.join('\n'))
	const old = (await got(pages.index('url').get(c.url))) as Page | undefined
	const visits = [...(old?.visits ?? []), c.at].slice(-VISITS_KEPT)
	if (old && old.sig === sig) {
		pages.put({ ...old, last: c.at, visits })
		return done(tx)
	}
	const bytes = paras.reduce((n, p) => n + p.length * 2, 0) + c.title.length * 2
	const row: Omit<Page, 'id'> & { id?: number } = {
		...(old ? { id: old.id } : {}),
		url: c.url,
		site: c.site,
		title: c.title,
		first: old?.first ?? c.at,
		last: c.at,
		visits,
		readMs: old?.readMs ?? 0,
		paras,
		bytes,
		sig,
	}
	const id = (await got(pages.put(row))) as number
	const fresh = uniqueTokens(paras, c.title)
	if (old) {
		const before = new Set(uniqueTokens(old.paras, old.title))
		const after = new Set(fresh)
		dropPostings(
			terms,
			id,
			[...before].filter((t) => !after.has(t)),
		)
		addPostings(
			terms,
			id,
			fresh.filter((t) => !before.has(t)),
		)
	} else addPostings(terms, id, fresh)
	return done(tx)
}

export async function addReading(url: string, ms: number): Promise<void> {
	if (ms <= 0) return
	const db = await openDb()
	const tx = db.transaction('pages', 'readwrite')
	const pages = tx.objectStore('pages')
	const old = (await got(pages.index('url').get(url))) as Page | undefined
	if (old) pages.put({ ...old, readMs: old.readMs + Math.min(ms, 30 * 60_000) })
	return done(tx)
}

async function removeWhere(pick: (p: Page) => boolean): Promise<number> {
	const db = await openDb()
	const tx = db.transaction(['pages', 'terms'], 'readwrite')
	const pages = tx.objectStore('pages')
	const terms = tx.objectStore('terms')
	const all = (await got(pages.getAll())) as Page[]
	let n = 0
	for (const p of all) {
		if (!pick(p)) continue
		dropPostings(terms, p.id, uniqueTokens(p.paras, p.title))
		pages.delete(p.id)
		n++
	}
	await done(tx)
	return n
}

export const forgetPage = (url: string) => removeWhere((p) => p.url === url)
export const forgetSite = (site: string) =>
	removeWhere((p) => p.site === site || p.site.endsWith(`.${site}`))
export const forgetSince = (t: number) => removeWhere((p) => p.first >= t)

export async function forgetAll(): Promise<void> {
	const db = await openDb()
	db.close()
	dbp = null
	await new Promise<void>((resolve, reject) => {
		const r = indexedDB.deleteDatabase(NAME)
		r.onsuccess = () => resolve()
		r.onerror = () => reject(r.error)
		r.onblocked = () => resolve()
	})
}

export interface Stats {
	pages: number
	bytes: number
	sites: number
	since: number | null
}

export async function stats(): Promise<Stats> {
	const db = await openDb()
	const tx = db.transaction('pages', 'readonly')
	const pages = tx.objectStore('pages')
	let n = 0
	let bytes = 0
	let since: number | null = null
	const sites = new Set<string>()
	await new Promise<void>((resolve, reject) => {
		const cur = pages.openCursor()
		cur.onsuccess = () => {
			const c = cur.result
			if (!c) return resolve()
			const p = c.value as Page
			n++
			bytes += p.bytes
			sites.add(p.site)
			since = since === null ? p.first : Math.min(since, p.first)
			c.continue()
		}
		cur.onerror = () => reject(cur.error)
	})
	// The word index roughly matches the text in size.
	return { pages: n, bytes: Math.round(bytes * 1.6), sites: sites.size, since }
}

/** Ids of pages containing every word; the last word may be a prefix. */
async function candidates(db: IDBDatabase, words: string[]): Promise<Set<number> | null> {
	const tx = db.transaction('terms', 'readonly')
	const terms = tx.objectStore('terms')
	let acc = null as Set<number> | null
	for (let i = 0; i < words.length; i++) {
		const w = words[i]
		const ids = new Set<number>()
		if (i === words.length - 1) {
			const rows = (await got(terms.getAll(IDBKeyRange.bound(w, `${w}￿`), 400))) as Term[]
			for (const r of rows) for (const id of r.ids) ids.add(id)
		} else {
			const row = (await got(terms.get(w))) as Term | undefined
			for (const id of row?.ids ?? []) ids.add(id)
		}
		acc = acc ? new Set([...acc].filter((x) => ids.has(x))) : ids
		if (!acc.size) return acc
	}
	return acc
}

export interface Found {
	page: Page
	passage: Passage | null
}

/**
 * Pages holding every query word, newest first, optionally limited to a time
 * window. If no page holds them all, pages holding all but one are tried.
 */
export async function find(
	words: string[],
	window: { start: number; end: number } | null,
	limit = 200,
): Promise<Found[]> {
	if (!words.length) return []
	const db = await openDb()
	let ids = await candidates(db, words)
	if (ids && !ids.size && words.length > 2) {
		const sets = await Promise.all(
			words.map((_, skip) =>
				candidates(
					db,
					words.filter((__, i) => i !== skip),
				),
			),
		)
		ids = new Set(sets.flatMap((s) => [...(s ?? [])]))
	}
	if (!ids?.size) return []
	// Ids grow with first visit, so the highest ids are the newest pages.
	const pick = [...ids].sort((a, b) => b - a).slice(0, window ? 2000 : 400)
	const tx = db.transaction('pages', 'readonly')
	const pages = tx.objectStore('pages')
	const rows = (await Promise.all(pick.map((id) => got(pages.get(id))))) as (Page | undefined)[]
	return rows
		.filter((p): p is Page => !!p)
		.filter((p) => !window || p.visits.some((v) => v >= window.start && v < window.end))
		.sort((a, b) => b.last - a.last)
		.slice(0, limit)
		.map((page) => ({ page, passage: bestPassage(page.paras, words) }))
}

export async function countPages(): Promise<number> {
	const db = await openDb()
	return got(db.transaction('pages', 'readonly').objectStore('pages').count())
}

/** Walks pages by last visit, newest first, until `take` says stop. */
async function walk(
	range: IDBKeyRange,
	take: (p: Page) => boolean | undefined,
	skipFirst = 0,
): Promise<void> {
	const db = await openDb()
	const tx = db.transaction('pages', 'readonly')
	await new Promise<void>((resolve, reject) => {
		const cur = tx.objectStore('pages').index('last').openCursor(range, 'prev')
		let skipped = skipFirst === 0
		cur.onsuccess = () => {
			const c = cur.result
			if (!c) return resolve()
			if (!skipped) {
				skipped = true
				c.advance(skipFirst)
				return
			}
			if (take(c.value as Page) === false) return resolve()
			c.continue()
		}
		cur.onerror = () => reject(cur.error)
	})
}

/** Pages visited in a window, for a query that is only a time phrase. */
export async function readBetween(start: number, end: number, limit = 30): Promise<Page[]> {
	const out: Page[] = []
	let seen = 0
	await walk(IDBKeyRange.lowerBound(start), (p) => {
		if (p.visits.some((v) => v >= start && v < end)) out.push(p)
		return ++seen < 600
	})
	return out.sort((a, b) => b.readMs - a.readMs).slice(0, limit)
}

export interface Resurfaced {
	page: Page
	text: string
}

/**
 * A sentence from something read properly two days to two months ago. The same
 * one stays for about an hour so the page doesn't flicker between opens.
 */
export async function resurface(now: number): Promise<Resurfaced | null> {
	const db = await openDb()
	const range = IDBKeyRange.bound(now - 60 * 86_400_000, now - 2 * 86_400_000)
	const total = await got(
		db.transaction('pages', 'readonly').objectStore('pages').index('last').count(range),
	)
	if (!total) return null
	const seed = hash(String(Math.floor(now / 3_600_000)))
	let found: Resurfaced | null = null
	let looked = 0
	const tryPage = (page: Page) => {
		looked++
		if (page.readMs < 60_000) return looked < 80
		const pool = page.paras
			.filter((p) => !p.startsWith(HEADING))
			.flatMap((p) => sentences(p))
			.filter(isQuotable)
		if (pool.length) {
			found = { page, text: pool[seed % pool.length] }
			return false
		}
		return looked < 80
	}
	const start = seed % total
	await walk(range, tryPage, start)
	if (!found && start > 0) await walk(range, tryPage)
	return found
}
