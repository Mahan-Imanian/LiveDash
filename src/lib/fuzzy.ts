/**
 * Which characters of `text` matched `query`, as [start, end) ranges, using the
 * same tiers as `score`: prefix, word prefix, every token, initials, substring,
 * then scattered letters. Empty when nothing in the text matched (for example a
 * page that matched on its address only).
 */
export function matchRanges(query: string, text: string): [number, number][] {
	const q = query.trim().toLowerCase()
	const t = text.toLowerCase()
	if (!q || !t) return []
	if (t.startsWith(q)) return [[0, q.length]]
	const starts: number[] = []
	for (let i = 0; i < t.length; i++) if (i === 0 || /[\s\-_./:]/.test(t[i - 1])) starts.push(i)
	const wordAt = (tk: string) => starts.find((s) => t.startsWith(tk, s))
	const w = wordAt(q)
	if (w !== undefined) return [[w, w + q.length]]
	const tokens = q.split(/\s+/).filter(Boolean)
	if (tokens.length > 1) {
		const hits = tokens.map((tk) => [wordAt(tk), tk.length] as const)
		if (hits.every(([s]) => s !== undefined))
			return merge(hits.map(([s, n]) => [s as number, (s as number) + n]))
	}
	if (q.length >= 2 && starts.length >= q.length) {
		const initials = starts.map((s) => t[s]).join('')
		if (initials.startsWith(q)) return merge(starts.slice(0, q.length).map((s) => [s, s + 1]))
	}
	const at = t.indexOf(q)
	if (at >= 0) return [[at, at + q.length]]
	const out: [number, number][] = []
	let ti = 0
	for (const ch of q) {
		if (/\s/.test(ch)) continue
		const found = t.indexOf(ch, ti)
		if (found < 0) return []
		out.push([found, found + 1])
		ti = found + 1
	}
	return merge(out)
}

function merge(ranges: [number, number][]): [number, number][] {
	const sorted = [...ranges].sort((a, b) => a[0] - b[0])
	const out: [number, number][] = []
	for (const r of sorted) {
		const last = out[out.length - 1]
		if (last && r[0] <= last[1]) last[1] = Math.max(last[1], r[1])
		else out.push([r[0], r[1]])
	}
	return out
}

export function score(query: string, text: string): number {
	const q = query.trim().toLowerCase()
	const t = text.toLowerCase()
	if (!q) return 0
	if (t === q) return 100
	if (t.startsWith(q)) return 90 - Math.min(20, t.length - q.length) / 2
	const words = t.split(/[\s\-_./:]+/)
	if (words.some((w) => w.startsWith(q))) return 75
	const tokens = q.split(/\s+/).filter(Boolean)
	if (tokens.length > 1 && tokens.every((tk) => words.some((w) => w.startsWith(tk)))) return 78
	const initials = words
		.filter(Boolean)
		.map((w) => w[0])
		.join('')
	if (q.length >= 2 && initials.startsWith(q)) return 72
	const at = t.indexOf(q)
	if (at >= 0) return 60 - Math.min(20, at)
	let ti = 0
	let gaps = 0
	for (const ch of q) {
		const found = t.indexOf(ch, ti)
		if (found < 0) return 0
		gaps += found - ti
		ti = found + 1
	}
	if (q.length <= 4 && t.startsWith(q[0]) && gaps <= (q.length === 2 ? 3 : 1)) return 50
	return Math.max(1, 40 - gaps)
}
