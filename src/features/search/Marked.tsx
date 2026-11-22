/** A title with its matched characters wrapped in <mark>, for highlighting. */
export function Marked({ text, ranges }: { text: string; ranges?: [number, number][] }) {
	if (!ranges?.length) return <>{text}</>
	const out: (string | { s: string; k: number })[] = []
	let at = 0
	for (const [a, b] of ranges) {
		if (a > at) out.push(text.slice(at, a))
		out.push({ s: text.slice(a, b), k: a })
		at = b
	}
	if (at < text.length) out.push(text.slice(at))
	return <>{out.map((p) => (typeof p === 'string' ? p : <mark key={`m${p.k}`}>{p.s}</mark>))}</>
}
