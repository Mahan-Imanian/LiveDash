import { type FormEvent, useEffect, useRef, useState } from 'react'
import { browser } from 'wxt/browser'
import { CORE_PERMS, requestCore } from '@/lib/browser'
import { hasPermission, removePermission, requestPermission } from '@/lib/chrome'
import { ENGINES, fill } from '@/lib/engines'
import { formatRelative } from '@/lib/format'
import { eraseAll, exportData, importData } from '@/store/data'
import { modeMs } from '@/store/focus-logic'
import { getState, update, useStore } from '@/store/store'
import type { EngineId } from '@/store/types'
import { Setting, Switch } from '@/ui/controls'
import { Glyph } from '@/ui/Glyph'
import { toast } from '@/ui/toast'
import { connectCalendar, disconnectCalendar, refreshCalendar } from '../calendar'

const SECTIONS = [
	{ id: 'search', name: 'Search' },
	{ id: 'browser', name: 'Browser access' },
	{ id: 'integrations', name: 'Calendar' },
	{ id: 'focus', name: 'Focus' },
	{ id: 'keys', name: 'Keyboard' },
	{ id: 'data', name: 'Data & privacy' },
	{ id: 'about', name: 'About' },
] as const

type SectionId = (typeof SECTIONS)[number]['id']

export function Settings({ section }: { section?: string }) {
	const [sec, setSec] = useState<SectionId>(
		(SECTIONS.find((s) => s.id === section)?.id as SectionId) ?? 'search',
	)
	useEffect(() => {
		const found = SECTIONS.find((s) => s.id === section)
		if (found) setSec(found.id)
	}, [section])

	return (
		<div className="st">
			<nav className="st-nav" aria-label="Settings sections">
				{SECTIONS.map((s) => (
					<button
						key={s.id}
						type="button"
						className="st-tab"
						aria-current={sec === s.id ? 'page' : undefined}
						onClick={() => setSec(s.id)}
					>
						{s.name}
					</button>
				))}
			</nav>
			<div className="st-body">
				{sec === 'search' && <SearchSection />}
				{sec === 'browser' && <BrowserSection />}
				{sec === 'integrations' && <CalendarSection />}
				{sec === 'focus' && <FocusSection />}
				{sec === 'keys' && <KeysSection />}
				{sec === 'data' && <DataSection />}
				{sec === 'about' && <AboutSection />}
			</div>
		</div>
	)
}

function SearchSection() {
	const s = useStore((x) => x.settings)
	const [key, setKey] = useState('')
	const [name, setName] = useState('')
	const [url, setUrl] = useState('')
	const [err, setErr] = useState<string | null>(null)

	function addKeyword(e: FormEvent) {
		e.preventDefault()
		const k = key.trim().toLowerCase()
		if (!k || /\s/.test(k)) return setErr('The keyword must be one word, like “yt”.')
		if (!fill(url.trim(), 'test'))
			return setErr(
				'The address needs %s where the search text goes, like https://example.com/search?q=%s',
			)
		if (s.keywords.some((x) => x.key === k)) return setErr(`“${k}” is already used.`)
		update('settings', (x) => ({
			...x,
			keywords: [...x.keywords, { key: k, name: name.trim() || k, url: url.trim() }],
		}))
		setKey('')
		setName('')
		setUrl('')
		setErr(null)
		toast(`Type “${k} something” to search ${name.trim() || k}`, { tone: 'success' })
	}

	return (
		<>
			<h3 className="st-title">Search</h3>
			<Setting
				label="Search engine"
				desc="Chrome default uses the engine you chose in Chrome’s own settings."
			>
				<select
					className="select"
					value={s.engine}
					onChange={(e) =>
						update('settings', (x) => ({ ...x, engine: e.target.value as EngineId }))
					}
				>
					{ENGINES.map((e) => (
						<option key={e.id} value={e.id}>
							{e.name}
						</option>
					))}
				</select>
			</Setting>
			{s.engine === 'custom' && (
				<Setting label="Custom engine" desc="Use %s where the search text goes.">
					<input
						className="line-input line-input--mono"
						defaultValue={s.customEngine}
						placeholder="https://example.com/?q=%s"
						onBlur={(e) => {
							if (fill(e.target.value.trim(), 'x'))
								update('settings', (x) => ({ ...x, customEngine: e.target.value.trim() }))
							else
								toast('That address needs %s, for example https://example.com/?q=%s', {
									tone: 'error',
								})
						}}
					/>
				</Setting>
			)}
			<Setting
				label="Switch to tabs that are already open"
				desc="Going somewhere that’s already open jumps to that tab and closes this one."
			>
				<Switch
					label="Switch to open tabs"
					checked={s.switchTabs}
					onChange={(v) => update('settings', (x) => ({ ...x, switchTabs: v }))}
				/>
			</Setting>
			<Setting
				label="Start typing right away"
				desc="Chrome keeps the cursor in the address bar on new tabs. With this on, LiveDash takes it — the address bar then shows LiveDash’s address."
			>
				<Switch
					label="Start typing right away"
					checked={s.typeOnOpen}
					onChange={(v) => update('settings', (x) => ({ ...x, typeOnOpen: v }))}
				/>
			</Setting>

			<h4 className="kicker st-sub">Site keywords</h4>
			<p className="fine">
				Type a keyword, a space and your search to go straight to that site’s results — like “yt
				jazz piano”.
			</p>
			<ul className="kw-list">
				{s.keywords.map((k) => (
					<li key={k.key}>
						<kbd>{k.key}</kbd>
						<span className="kw-name">{k.name}</span>
						<span className="kw-url">{k.url}</span>
						<button
							type="button"
							className="icon-btn"
							aria-label={`Remove keyword ${k.key}`}
							onClick={() =>
								update('settings', (x) => ({
									...x,
									keywords: x.keywords.filter((y) => y.key !== k.key),
								}))
							}
						>
							<Glyph name="close" size={14} />
						</button>
					</li>
				))}
			</ul>
			<form className="kw-form" onSubmit={addKeyword}>
				<input
					className="line-input"
					aria-label="Keyword"
					placeholder="kw"
					value={key}
					onChange={(e) => setKey(e.target.value)}
				/>
				<input
					className="line-input"
					aria-label="Name"
					placeholder="Name"
					value={name}
					onChange={(e) => setName(e.target.value)}
				/>
				<input
					className="line-input line-input--mono"
					aria-label="Search address with %s"
					placeholder="https://site.com/search?q=%s"
					value={url}
					onChange={(e) => setUrl(e.target.value)}
				/>
				<button type="submit" className="btn btn--quiet">
					Add
				</button>
			</form>
			{err && (
				<p className="field-error" role="alert">
					{err}
				</p>
			)}
		</>
	)
}

function usePerms() {
	const [p, setP] = useState<Record<string, boolean>>({})
	useEffect(() => {
		const read = async () => {
			const names = [
				'history',
				'tabs',
				'sessions',
				'bookmarks',
				'topSites',
				'tabGroups',
				'notifications',
			]
			const vals = await Promise.all(names.map((n) => hasPermission({ permissions: [n] })))
			setP(Object.fromEntries(names.map((n, i) => [n, vals[i]])))
		}
		read()
		browser.permissions.onAdded.addListener(read)
		browser.permissions.onRemoved.addListener(read)
		return () => {
			browser.permissions.onAdded.removeListener(read)
			browser.permissions.onRemoved.removeListener(read)
		}
	}, [])
	return p
}

function BrowserSection() {
	const p = usePerms()
	const suggest = useStore((x) => x.settings.suggestShortcuts)
	const toggle = async (names: string[], v: boolean) => {
		const ok = v
			? await requestPermission({ permissions: names })
			: await removePermission({ permissions: names })
		if (v && !ok) toast('Chrome didn’t grant access, so nothing changed.')
	}
	return (
		<>
			<h3 className="st-title">Browser access</h3>
			<p className="fine">
				Everything here is optional, read in this browser only, and can be turned off again. Nothing
				is uploaded.
			</p>
			<Setting
				label="History, open tabs and recently closed"
				desc="Ranks where you go, finds open tabs, offers closed tabs and pages from your other devices."
			>
				<Switch
					label="History, tabs and sessions"
					checked={!!(p.history && p.tabs && p.sessions)}
					onChange={async (v) => {
						const ok = v
							? await requestCore()
							: await removePermission({ permissions: [...CORE_PERMS] })
						if (v && !ok) toast('Chrome didn’t grant access, so nothing changed.')
					}}
				/>
			</Setting>
			<Setting label="Bookmarks" desc="Browse folders and find bookmarks as you type.">
				<Switch
					label="Bookmarks"
					checked={!!p.bookmarks}
					onChange={(v) => toggle(['bookmarks'], v)}
				/>
			</Setting>
			<Setting label="Tab groups" desc="Open a shortcut group as a named Chrome tab group.">
				<Switch
					label="Tab groups"
					checked={!!p.tabGroups}
					onChange={(v) => toggle(['tabGroups'], v)}
				/>
			</Setting>
			<Setting
				label="Most-visited list"
				desc="Lets you bring in Chrome’s own most-visited sites as shortcuts."
			>
				<Switch
					label="Most-visited list"
					checked={!!p.topSites}
					onChange={(v) => toggle(['topSites'], v)}
				/>
			</Setting>
			<Setting
				label="Suggest shortcuts from history"
				desc="Shows faded keys for places you visit often but haven’t pinned."
			>
				<Switch
					label="Suggest shortcuts"
					checked={suggest}
					onChange={(v) => update('settings', (x) => ({ ...x, suggestShortcuts: v }))}
				/>
			</Setting>
		</>
	)
}

function CalendarSection() {
	const c = useStore((x) => x.calendar)
	const [url, setUrl] = useState('')
	const [busy, setBusy] = useState(false)
	const [error, setError] = useState<string | null>(null)

	async function submit(e: FormEvent) {
		e.preventDefault()
		setBusy(true)
		setError(null)
		const err = await connectCalendar(url)
		setBusy(false)
		if (err) setError(err)
		else {
			setUrl('')
			toast('Calendar connected', { tone: 'success' })
		}
	}

	return (
		<>
			<h3 className="st-title">Calendar</h3>
			<p className="fine">
				Your next meeting appears at the top with its join link, and today’s schedule sits in the
				Today column. Works with Google, Outlook, iCloud and any iCal link.
			</p>
			{c.url ? (
				<Setting
					label={new URL(c.url).hostname}
					desc={
						c.error ??
						`${c.events.length} upcoming · updated ${c.fetchedAt ? formatRelative(c.fetchedAt) : 'never'}`
					}
				>
					<span className="row-actions">
						<button type="button" className="text-btn" onClick={() => refreshCalendar(true)}>
							Refresh
						</button>
						<button
							type="button"
							className="text-btn text-btn--danger"
							onClick={() => disconnectCalendar().then(() => toast('Calendar disconnected'))}
						>
							Disconnect
						</button>
					</span>
				</Setting>
			) : (
				<form className="cz-form" onSubmit={submit}>
					<label className="sr-only" htmlFor="cal-url">
						Secret iCal address
					</label>
					<input
						id="cal-url"
						className="line-input line-input--mono"
						placeholder="https://calendar.google.com/calendar/ical/…/basic.ics"
						value={url}
						autoComplete="off"
						spellCheck={false}
						aria-invalid={!!error}
						onChange={(e) => {
							setUrl(e.target.value)
							setError(null)
						}}
					/>
					<button type="submit" className="btn" disabled={!url.trim() || busy}>
						{busy ? 'Connecting…' : 'Connect'}
					</button>
				</form>
			)}
			{error && (
				<p className="field-error" role="alert">
					{error}
				</p>
			)}
			{!c.url && (
				<p className="fine">
					In Google Calendar: Settings → your calendar → “Secret address in iCal format”. Chrome
					will ask to let LiveDash read that one site; nothing is sent anywhere else.
				</p>
			)}
		</>
	)
}

function FocusSection() {
	const f = useStore((x) => x.settings.focus)
	const [canNotify, setCanNotify] = useState(false)
	useEffect(() => {
		hasPermission({ permissions: ['notifications'] }).then(setCanNotify)
	}, [])
	const setLen = (key: 'focus' | 'short' | 'long', raw: string) => {
		const n = Math.round(Number(raw))
		if (!Number.isFinite(n) || n < 1 || n > 180) return
		update('settings', (x) => ({ ...x, focus: { ...x.focus, [key]: n } }))
		const st = getState()
		if (st.focus.status === 'idle' && st.focus.mode === key)
			update('focus', (fs) => ({ ...fs, remaining: modeMs(key, getState().settings) }))
	}
	return (
		<>
			<h3 className="st-title">Focus</h3>
			{(['focus', 'short', 'long'] as const).map((k) => (
				<Setting
					key={k}
					label={{ focus: 'Focus length', short: 'Short break', long: 'Long break' }[k]}
				>
					<span className="row-actions">
						<input
							type="number"
							className="num"
							min={1}
							max={180}
							defaultValue={f[k]}
							aria-label={`${k} minutes`}
							onBlur={(e) => setLen(k, e.target.value)}
							onKeyDown={(e) => e.key === 'Enter' && setLen(k, e.currentTarget.value)}
						/>
						<span className="fine">min</span>
					</span>
				</Setting>
			))}
			<Setting label="Chime when a session ends">
				<Switch
					label="Chime"
					checked={f.sound}
					onChange={(v) => update('settings', (x) => ({ ...x, focus: { ...x.focus, sound: v } }))}
				/>
			</Setting>
			<Setting
				label="Desktop notification"
				desc="Arrives even when no LiveDash tab is open. Chrome asks once."
			>
				<Switch
					label="Desktop notification"
					checked={f.notify && canNotify}
					onChange={async (v) => {
						if (v) {
							const ok = await requestPermission({ permissions: ['notifications'] })
							setCanNotify(ok)
							if (!ok) return toast('Notifications weren’t allowed, so nothing changed.')
						} else {
							await removePermission({ permissions: ['notifications'] })
							setCanNotify(false)
						}
						update('settings', (x) => ({ ...x, focus: { ...x.focus, notify: v } }))
					}}
				/>
			</Setting>
		</>
	)
}

const KEYS: [string, string[][]][] = [
	['Search, from anywhere on the page', [['/']]],
	['Commands', [['>']]],
	['Open shortcut 1–9', [['Alt', '1…9']]],
	['Open result in a new tab', [['Alt', '↵']]],
	['Add what you typed as a task', [['⇧', '↵']]],
	['Search the web for what you typed', [['Ctrl', '↵']]],
	['More actions for a result or shortcut', [['→'], ['right-click']]],
	['Focus mode', [['F']]],
	['Bookmarks · Tasks · Notes', [['B'], ['T'], ['N']]],
	['Customize · Settings', [['C'], [',']]],
	['Undo', [['Ctrl', 'Z']]],
	['Quick capture on any web page', [['Alt', 'Shift', 'L']]],
]

function KeysSection() {
	return (
		<>
			<h3 className="st-title">Keyboard</h3>
			<p className="fine">
				Single-letter keys work when the cursor isn’t in a text box — press Esc first.
			</p>
			<dl className="keys">
				{KEYS.map(([label, combos]) => (
					<div key={label} className="keys-row">
						<dt>{label}</dt>
						<dd>
							{combos.map((c, i) => (
								<span key={c.join('+')} className="keys-combo">
									{i > 0 && <span className="fine">or</span>}
									{c.map((k) => (
										<kbd key={k}>{k}</kbd>
									))}
								</span>
							))}
						</dd>
					</div>
				))}
			</dl>
			<p className="fine">
				<button
					type="button"
					className="text-btn"
					onClick={() => browser.tabs.create({ url: 'chrome://extensions/shortcuts' })}
				>
					Change the quick-capture shortcut
				</button>
			</p>
		</>
	)
}

function DataSection() {
	const fileRef = useRef<HTMLInputElement>(null)
	const [confirm, setConfirm] = useState(false)
	return (
		<>
			<h3 className="st-title">Data & privacy</h3>
			<p className="fine">
				LiveDash has no account, no server, no analytics and no remote code. Everything it stores
				lives in this browser. It only goes online for things you turn on: weather, the picture of
				the day, and your calendar link.
			</p>
			<Setting label="Export" desc="Shortcuts, groups, tasks, notes and settings as a JSON file.">
				<button type="button" className="text-btn" onClick={exportData}>
					Download
				</button>
			</Setting>
			<Setting label="Import" desc="Adds items from a backup. Nothing is overwritten.">
				<button type="button" className="text-btn" onClick={() => fileRef.current?.click()}>
					Choose file
				</button>
				<input
					ref={fileRef}
					type="file"
					accept="application/json,.json"
					className="sr-only"
					tabIndex={-1}
					aria-hidden="true"
					onChange={(e) => {
						const f = e.target.files?.[0]
						if (f) importData(f)
						e.target.value = ''
					}}
				/>
			</Setting>
			<Setting
				label="Forget what LiveDash learned"
				desc="Clears launch history and time-of-day patterns. Your shortcuts, tasks and notes stay."
			>
				<button
					type="button"
					className="text-btn"
					onClick={() => {
						update('launches', () => [])
						update('hours', () => ({ at: 0, data: {} }))
						toast('Learned patterns cleared')
					}}
				>
					Forget
				</button>
			</Setting>
			<Hidden />
			<Setting
				label="Erase everything"
				desc="Removes all LiveDash data from this browser. This can’t be undone."
			>
				{confirm ? (
					<span className="row-actions">
						<button type="button" className="text-btn" onClick={() => setConfirm(false)}>
							Keep
						</button>
						<button
							type="button"
							className="text-btn text-btn--danger"
							onClick={() => {
								eraseAll()
								setConfirm(false)
							}}
						>
							Erase now
						</button>
					</span>
				) : (
					<button
						type="button"
						className="text-btn text-btn--danger"
						onClick={() => setConfirm(true)}
					>
						Erase…
					</button>
				)}
			</Setting>
		</>
	)
}

function Hidden() {
	const hidden = useStore((x) => x.hidden)
	if (!hidden.length) return null
	return (
		<Setting label="Never suggested" desc={hidden.join(', ')}>
			<button type="button" className="text-btn" onClick={() => update('hidden', () => [])}>
				Allow all again
			</button>
		</Setting>
	)
}

function AboutSection() {
	return (
		<>
			<h3 className="st-title">About</h3>
			<p className="lede">
				LiveDash {browser.runtime.getManifest().version} — the front page of your browser.
			</p>
			<p className="fine">
				Open source under the MIT License. LiveDash began as a fork of{' '}
				<a
					className="text-btn"
					href="https://github.com/widgetify-app/widgetify-extension"
					target="_blank"
					rel="noreferrer"
				>
					Widgetify
				</a>{' '}
				(MIT, © 2025 widgetify) and has since been rewritten. Weather by Open-Meteo. Picture of the
				day from Wikipedia and Wikimedia Commons, credited on the page.
			</p>
			<p className="fine">
				<a
					className="text-btn"
					href="https://github.com/Mahan-Imanian/LiveDash"
					target="_blank"
					rel="noreferrer"
				>
					Source code and issues
				</a>
			</p>
		</>
	)
}
