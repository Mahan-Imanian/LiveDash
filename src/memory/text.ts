/** Pure text helpers shared by the page reader, the index and the search. */

const STOP = new Set(
	'a an and are as at be but by for from has have in into is it its of on or that the their them then there these this those to was were will with you your we our i me my he she they his her not no so if do does did can could would should than'.split(
		' ',
	),
)

/** Lower-case, accent-free, so "Café" and "cafe" meet. */
export function fold(s: string): string {
	return s
		.normalize('NFKD')
		.replace(/\p{M}+/gu, '')
		.toLowerCase()
}

/** Words as the index stores them: folded, two or more characters, no stop words. */
export function tokenize(s: string, keepStop = false): string[] {
	const out: string[] = []
	for (const m of fold(s).matchAll(/[\p{L}\p{N}]+/gu)) {
		const w = m[0]
		if (w.length < 2 && !/\d/.test(w)) continue
		if (!keepStop && STOP.has(w)) continue
		out.push(w.length > 40 ? w.slice(0, 40) : w)
	}
	return out
}

export function uniqueTokens(paras: string[], title: string): string[] {
	const set = new Set<string>(tokenize(title))
	for (const p of paras) for (const t of tokenize(p)) set.add(t)
	return [...set]
}

/** Splits a paragraph into sentences without breaking on "e.g.", "3.5" or "U.S.". */
export function sentences(p: string): string[] {
	const out: string[] = []
	for (const piece of p.split(/(?<=[.!?]["”)]?)\s+(?=["“(]?[A-Z0-9])/)) {
		const s = piece.trim()
		if (!s) continue
		const prev = out[out.length - 1]
		const lastWord = prev?.split(/\s+/).pop() ?? ''
		const abbrev =
			/^(?:e\.g|i\.e|etc|vs|mr|mrs|ms|dr|st|fig|no)\.$/i.test(lastWord) ||
			/(?:^|\s)(?:[A-Z]\.)+$/.test(prev ?? '')
		if (prev && abbrev) out[out.length - 1] = `${prev} ${s}`
		else out.push(s)
	}
	return out
}

export interface Passage {
	/** Index of the paragraph the sentence came from. */
	para: number
	text: string
	/** The nearest heading above it, if the page had one. */
	heading: string | null
	/** How many query words it holds, 0 when nothing matched. */
	hits: number
}

/** Headings are stored as paragraphs that start with this marker. */
export const HEADING = '\u0001'

/**
 * The single sentence of a page that best answers the query: the most distinct
 * query words, then words in order, then the earliest. The last query word may
 * be a prefix, since it's often still being typed.
 */
export function bestPassage(paras: string[], query: string[]): Passage | null {
	if (!query.length) return null
	let best: (Passage & { score: number }) | null = null
	let heading: string | null = null
	paras.forEach((p, i) => {
		if (p.startsWith(HEADING)) {
			heading = p.slice(1)
			return
		}
		for (const s of sentences(p)) {
			const words = tokenize(s, true)
			let hits = 0
			let order = 0
			let exact = 0
			let lastAt = -1
			let adjacent = 0
			query.forEach((q, qi) => {
				const prefix = qi === query.length - 1
				const at = prefix ? words.findIndex((w) => w.startsWith(q)) : words.indexOf(q)
				if (at < 0) return
				hits++
				if (words[at] === q) exact++
				if (at > lastAt) order++
				if (lastAt >= 0 && at === lastAt + 1) adjacent++
				lastAt = at
			})
			if (!hits) continue
			const lengthFit = s.length > 400 ? -1 : s.length < 30 ? -0.5 : 0
			const score = hits * 10 + adjacent * 3 + exact + order + lengthFit
			if (!best || score > best.score) best = { para: i, text: s, heading, hits, score }
		}
	})
	if (!best) return null
	const { score: _drop, ...passage } = best as Passage & { score: number }
	return passage
}

/** Character ranges in `text` that match the query words, for highlighting. */
export function hitRanges(text: string, query: string[]): [number, number][] {
	if (!query.length) return []
	const out: [number, number][] = []
	for (const m of text.matchAll(/[\p{L}\p{N}]+/gu)) {
		const w = fold(m[0])
		const ok = query.some((q, i) => (i === query.length - 1 ? w.startsWith(q) : w === q))
		if (!ok) continue
		const start = m.index ?? 0
		const prev = out[out.length - 1]
		const gap = prev ? text.slice(prev[1], start) : ''
		if (prev && /^\s+$/.test(gap)) prev[1] = start + m[0].length
		else out.push([start, start + m[0].length])
	}
	return out
}

/**
 * A link that opens the page scrolled to the sentence and highlights it
 * (Chrome's text fragments). Long sentences use a start,end pair.
 */
export function fragmentUrl(url: string, sentence: string): string {
	const base = url.split('#')[0]
	const clean = sentence.replace(/\s+/g, ' ').trim()
	const enc = (s: string) => encodeURIComponent(s).replace(/-/g, '%2D')
	const words = clean.split(' ')
	const text =
		words.length > 10
			? `${enc(words.slice(0, 5).join(' '))},${enc(words.slice(-5).join(' '))}`
			: enc(clean)
	return `${base}#:~:text=${text}`
}

/** A sentence worth showing on its own: a whole thought, not chrome or code. */
export function isQuotable(s: string): boolean {
	if (s.length < 70 || s.length > 150) return false
	if (!/^[A-Z“"]/.test(s) || !/[.!?”"]$/.test(s)) return false
	if (/https?:|www\.|@|\{|\}|=>|;\s*$|\|/.test(s)) return false
	if (/\b(cookie|subscribe|sign up|newsletter|click here|privacy policy|all rights)\b/i.test(s))
		return false
	const digits = (s.match(/\d/g) ?? []).length
	return digits / s.length < 0.08
}

/** Small deterministic hash, used to pick the same item for a while. */
export function hash(s: string): number {
	let h = 2166136261
	for (let i = 0; i < s.length; i++) {
		h ^= s.charCodeAt(i)
		h = Math.imul(h, 16777619)
	}
	return h >>> 0
}
