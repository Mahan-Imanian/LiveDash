import { type KeyboardEvent, useCallback, useEffect, useRef, useState } from 'react'
import { browser } from 'wxt/browser'
import { engineUrl } from '@/lib/engines'
import { countPages, forgetAll, type Resurfaced, resurface, savePage } from '@/memory/db'
import { agoLabel } from '@/memory/rank'
import { type Results, search } from '@/memory/search'
import {
	DEFAULTS,
	loadSettings,
	type Message,
	ORIGINS,
	onSettings,
	type Settings,
	saveSettings,
} from '@/memory/settings'
import { fragmentUrl } from '@/memory/text'
import { GearIcon, SearchIcon } from './Icons'
import { Photo } from './Photo'
import { pickPhoto } from './photos'
import { ResultList, type Row, rowsFor } from './ResultList'
import { SettingsPanel } from './SettingsPanel'
import { formatClock, formatDate, useAccess, useNow } from './use'

// The test build lets the capture harness fill the index directly.
if (__LD_TEST__) Object.assign(window, { __ld: { savePage, forgetAll } })

const send = (m: Message) => browser.runtime.sendMessage(m).catch(() => null)

export async function turnOn(): Promise<boolean> {
	const granted = await browser.permissions.request({ origins: ORIGINS }).catch(() => false)
	if (!granted) return false
	await saveSettings({ remember: true })
	await send({ type: 'ld-start' })
	return true
}

export function NewTab() {
	const now = useNow()
	const access = useAccess()
	const [settings, setSettings] = useState<Settings | null>(null)
	const [count, setCount] = useState<number | null>(null)
	const [quote, setQuote] = useState<Resurfaced | null | undefined>(undefined)
	const [query, setQuery] = useState('')
	const [results, setResults] = useState<Results | null>(null)
	const [sel, setSel] = useState(0)
	const [panel, setPanel] = useState(false)
	const [toast, setToast] = useState('')
	const [announce, setAnnounce] = useState('')
	const input = useRef<HTMLInputElement>(null)
	const seq = useRef(0)

	useEffect(() => {
		loadSettings().then(setSettings)
		return onSettings(setSettings)
	}, [])

	const on = !!settings?.remember && access === true

	const refresh = useCallback(() => {
		countPages()
			.then(setCount)
			.catch(() => setCount(0))
		resurface(Date.now())
			.then(setQuote)
			.catch(() => setQuote(null))
	}, [])

	useEffect(() => {
		if (on) refresh()
	}, [on, refresh])

	useEffect(() => {
		const q = query.trim()
		if (!q) {
			setResults(null)
			return
		}
		const id = ++seq.current
		const t = setTimeout(() => {
			search(q)
				.then((r) => {
					if (id !== seq.current) return
					setResults(r)
					setSel(0)
					const n = r.hits.length
					setAnnounce(n ? `${n} ${n === 1 ? 'page' : 'pages'} matched` : 'No pages matched')
				})
				.catch(() => {
					if (id === seq.current) setResults(null)
				})
		}, 50)
		return () => clearTimeout(t)
	}, [query])

	useEffect(() => {
		if (!toast) return
		const t = setTimeout(() => setToast(''), 3200)
		return () => clearTimeout(t)
	}, [toast])

	useEffect(() => {
		const key = (e: globalThis.KeyboardEvent) => {
			if (e.key === '/' && document.activeElement !== input.current && !panel) {
				e.preventDefault()
				input.current?.focus()
			}
		}
		addEventListener('keydown', key)
		return () => removeEventListener('keydown', key)
	}, [panel])

	const closePanel = useCallback(() => {
		setPanel(false)
		input.current?.focus()
		refresh()
	}, [refresh])

	const s = settings ?? DEFAULTS
	const typing = query.trim() !== ''
	const rows: Row[] = typing ? rowsFor(query.trim(), results, on) : []

	const open = async (row: Row, newTab: boolean) => {
		const go = (url: string) =>
			newTab ? browser.tabs.create({ url, active: false }) : location.assign(url)
		if (row.kind === 'hit') {
			const tab = results?.open.get(row.hit.page.url)
			if (tab && !newTab) {
				await browser.tabs.update(tab.id, { active: true })
				await browser.windows.update(tab.windowId, { focused: true })
				return
			}
			const p = row.hit.passage
			return go(p ? fragmentUrl(row.hit.page.url, p.text) : row.hit.page.url)
		}
		if (row.kind === 'go') return go(row.url)
		const url = engineUrl(s.engine, s.customEngine, row.query)
		if (url) return go(url)
		await browser.search.query({ text: row.query, disposition: newTab ? 'NEW_TAB' : 'CURRENT_TAB' })
	}

	const forget = async (row: Row) => {
		if (row.kind !== 'hit') return
		await send({ type: 'ld-forget', scope: 'page', value: row.hit.page.url })
		setToast(`Forgot “${row.hit.page.title}”`)
		const r = await search(query.trim())
		setResults(r)
		setAnnounce(
			`Forgot ${row.hit.page.title}. ${r.hits.length} ${r.hits.length === 1 ? 'page' : 'pages'} left`,
		)
		refresh()
	}

	const onKey = (e: KeyboardEvent<HTMLInputElement>) => {
		if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
			if (!rows.length) return
			e.preventDefault()
			const d = e.key === 'ArrowDown' ? 1 : -1
			setSel((i) => (i + d + rows.length) % rows.length)
		} else if (e.key === 'Enter' && rows[sel]) {
			e.preventDefault()
			open(rows[sel], e.ctrlKey || e.metaKey)
		} else if (e.key === 'Escape') {
			setQuery('')
		} else if (e.key === 'Delete' && e.shiftKey && rows[sel]) {
			e.preventDefault()
			forget(rows[sel])
		}
	}

	const scope = results?.scope && typing ? results.scope : null
	const matched = results?.hits.length ?? 0

	return (
		<div
			className="page"
			data-state={typing ? 'typing' : 'idle'}
			data-first-run={!typing && access !== null && !on ? '' : undefined}
		>
			<Photo choice={s.photo} now={now} />
			<p className="clock">
				<time dateTime={new Date(now).toISOString()}>{formatClock(now, s.hourCycle)}</time>
				<span className="date">{formatDate(now)}</span>
			</p>

			<main className="col">
				<div className="field">
					<SearchIcon />
					<label htmlFor="q" className="sr-only">
						Search pages you've read
					</label>
					<input
						id="q"
						ref={input}
						type="text"
						autoFocus
						autoComplete="off"
						spellCheck={false}
						placeholder="What did you read?"
						value={query}
						onChange={(e) => setQuery(e.target.value)}
						onKeyDown={onKey}
						role="combobox"
						aria-expanded={typing}
						aria-controls="results"
						aria-activedescendant={typing && rows[sel] ? `r${sel}` : undefined}
					/>
					{scope && <span className="scope">{scope.label}</span>}
				</div>

				{typing ? (
					<ResultList
						rows={rows}
						sel={sel}
						words={results?.words ?? []}
						results={results}
						now={now}
						onPick={(i, newTab) => open(rows[i], newTab)}
						onHover={setSel}
						onTurnOn={() => turnOn()}
						remembering={on}
					/>
				) : (
					<Idle on={on} access={access} settings={s} count={count} quote={quote} now={now} />
				)}
			</main>

			<footer className="foot">
				<span>
					{typing
						? on
							? `${matched} ${matched === 1 ? 'page' : 'pages'}${scope ? ` read ${scope.label}` : ''} matched · on this device`
							: ''
						: photoTitle(s.photo, now)}
				</span>
				<span className="right">
					{!typing && <span>{on ? 'Remembered on this device' : 'Not remembering'}</span>}
					<button
						type="button"
						className="icon-btn"
						aria-label="Settings"
						onClick={() => setPanel(true)}
					>
						<GearIcon />
					</button>
				</span>
			</footer>

			<div className="sr-only" aria-live="polite">
				{announce}
			</div>
			{toast && (
				<div className="toast" role="status">
					{toast}
				</div>
			)}
			{panel && (
				<SettingsPanel
					settings={s}
					access={access === true}
					onClose={closePanel}
					onToast={setToast}
				/>
			)}
		</div>
	)
}

function photoTitle(choice: string, now: number): string {
	return pickPhoto(choice, now).title
}

function Idle(props: {
	on: boolean
	access: boolean | null
	settings: Settings
	count: number | null
	quote: Resurfaced | null | undefined
	now: number
}) {
	const { on, access, settings, count, quote, now } = props
	if (access === null || (on && (count === null || quote === undefined)))
		return <div className="idle" aria-hidden="true" />
	if (!on) {
		const revoked = settings.remember && !access
		return (
			<div className="idle">
				<p className="quote">Find any page you've read by a sentence you remember.</p>
				<p className="source">
					{revoked
						? 'Remembering stopped because site access was removed.'
						: 'Pages are kept on this device and never uploaded.'}
				</p>
				<div className="cta">
					<button type="button" className="btn" onClick={() => turnOn()}>
						Turn on remembering
					</button>
					<span className="note">
						Chrome will ask to let LiveDash read sites. Banking, health, mail and sign-in pages are
						never kept, and you can pause any site.
					</span>
				</div>
			</div>
		)
	}
	if (quote && settings.resurface) {
		const p = quote.page
		return (
			<div className="idle">
				<a className="quote" href={fragmentUrl(p.url, quote.text)}>
					{quote.text}
				</a>
				<p className="source">
					<span className="ago">{agoLabel(p.last, now)}</span>
					<span className="sep" aria-hidden="true">
						·
					</span>
					<span className="sr-only">, on </span>
					<span className="site">{p.site}</span>
				</p>
			</div>
		)
	}
	return (
		<div className="idle">
			<p className="quote">Pages you read from now on can be found by what they said.</p>
			<p className="source">
				{count
					? `${count.toLocaleString()} ${count === 1 ? 'page' : 'pages'} remembered so far`
					: 'Read something, then come back and type a phrase from it.'}
			</p>
		</div>
	)
}
