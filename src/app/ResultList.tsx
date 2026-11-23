import { useEffect, useRef } from 'react'
import { looksLikeUrl, toUrl } from '@/lib/url'
import { type Hit, readLabel, whenLabel } from '@/memory/rank'
import type { Results } from '@/memory/search'
import { hitRanges } from '@/memory/text'
import { ArrowIcon, GlobeIcon } from './Icons'
import { Marked } from './Marked'

/** Starts a long sentence near its first match so the match stays visible. */
function around(text: string, words: string[]): string {
	const first = hitRanges(text, words)[0]
	if (!first || first[0] < 60) return text
	const cut = text.lastIndexOf(' ', first[0] - 40)
	return `…${text.slice(cut + 1)}`
}

export type Row =
	| { kind: 'hit'; hit: Hit }
	| { kind: 'go'; url: string }
	| { kind: 'web'; query: string }

export function rowsFor(q: string, results: Results | null, on: boolean): Row[] {
	const rows: Row[] = []
	const url = looksLikeUrl(q) ? toUrl(q) : null
	if (url) rows.push({ kind: 'go', url })
	if (on && results && results.query.trim() === q)
		for (const hit of results.hits) rows.push({ kind: 'hit', hit })
	rows.push({ kind: 'web', query: q })
	return rows
}

interface Props {
	rows: Row[]
	sel: number
	words: string[]
	results: Results | null
	now: number
	remembering: boolean
	onPick: (i: number, newTab: boolean) => void
	onHover: (i: number) => void
	onTurnOn: () => void
}

export function ResultList({
	rows,
	sel,
	words,
	results,
	now,
	remembering,
	onPick,
	onHover,
	onTurnOn,
}: Props) {
	const list = useRef<HTMLUListElement>(null)
	useEffect(() => {
		list.current?.querySelector(`#r${sel}`)?.scrollIntoView({ block: 'nearest' })
	}, [sel])

	const firstHit = rows.findIndex((r) => r.kind === 'hit')
	const noHits = firstHit < 0

	return (
		<div className="results">
			{remembering && results && noHits && (
				<p className="empty">
					Nothing you've read matches “{results.query.trim()}”
					{results.scope ? ` ${results.scope.label}` : ''}.
				</p>
			)}
			{!remembering && (
				<p className="empty">
					Turn on remembering to search pages you've read.{' '}
					<button type="button" className="btn ghost" onClick={onTurnOn}>
						Turn on
					</button>
				</p>
			)}
			<ul id="results" role="listbox" ref={list} aria-label="Results">
				{rows.map((row, i) => (
					<li
						key={key(row, i)}
						id={`r${i}`}
						role="option"
						aria-selected={i === sel}
						className={`row ${row.kind === 'hit' ? (i === firstHit ? 'top' : '') : row.kind}`}
						onMouseMove={() => i !== sel && onHover(i)}
						onClick={(e) => onPick(i, e.ctrlKey || e.metaKey || e.button === 1)}
						onAuxClick={(e) => e.button === 1 && onPick(i, true)}
					>
						{row.kind === 'hit' ? (
							<HitRow
								hit={row.hit}
								top={i === firstHit}
								words={words}
								open={!!results?.open.get(row.hit.page.url)}
								now={now}
							/>
						) : row.kind === 'go' ? (
							<>
								<ArrowIcon />
								<span className="title">Go to {row.url.replace(/^https?:\/\//, '')}</span>
							</>
						) : (
							<>
								<GlobeIcon />
								<span className="title">
									Search the web for <mark>{row.query}</mark>
								</span>
							</>
						)}
					</li>
				))}
			</ul>
		</div>
	)
}

function key(row: Row, i: number) {
	if (row.kind === 'hit') return `h${row.hit.page.id}`
	return `${row.kind}${i}`
}

function HitRow(props: { hit: Hit; top: boolean; words: string[]; open: boolean; now: number }) {
	const { hit, top, words, open, now } = props
	const { page, passage } = hit
	if (top) {
		const lead = passage?.text ?? page.title
		const meta = [
			passage?.heading ?? (passage ? page.title : null),
			page.site,
			readLabel(page, now),
		]
			.filter(Boolean)
			.join(' · ')
		return (
			<>
				<span className="lead">
					<Marked text={lead} words={words} />
				</span>
				<span className="meta">{meta}</span>
				<span className="aside">{open ? 'Enter to switch to it' : 'Enter to open'}</span>
			</>
		)
	}
	return (
		<>
			<span className="title">{page.title}</span>
			<span className="aside">{open ? 'Open in a tab' : `read ${whenLabel(page.last, now)}`}</span>
			{passage && (
				<span className="passage">
					<Marked text={around(passage.text, words)} words={words} />
				</span>
			)}
		</>
	)
}
