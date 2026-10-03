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
	return Math.max(1, 40 - gaps)
}
