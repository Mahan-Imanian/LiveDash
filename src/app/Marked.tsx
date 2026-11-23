import { hitRanges } from '@/memory/text'

/** Text with the query words marked. */
export function Marked({ text, words }: { text: string; words: string[] }) {
	const ranges = hitRanges(text, words)
	if (!ranges.length) return <>{text}</>
	const out: (string | React.ReactElement)[] = []
	let at = 0
	for (const [a, b] of ranges) {
		if (a > at) out.push(text.slice(at, a))
		out.push(<mark key={a}>{text.slice(a, b)}</mark>)
		at = b
	}
	if (at < text.length) out.push(text.slice(at))
	return <>{out}</>
}
