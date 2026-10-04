import { type FormEvent, useEffect, useRef, useState } from 'react'
import { browser } from 'wxt/browser'
import { type Access, CORE_PERMS, readAccess, requestCore } from '@/lib/browser'
import { removePermission, requestPermission } from '@/lib/chrome'
import { formatRelative } from '@/lib/format'
import { removeShortcut } from '@/store/actions'
import { eraseAll, exportData, importData } from '@/store/data'
import { modeMs } from '@/store/focus-logic'
import { getState, update, useStore } from '@/store/store'
import type { Accent, Settings as S } from '@/store/types'
import { Segmented, Setting, Switch } from '@/ui/controls'
import { toast } from '@/ui/toast'
import { connectCalendar, disconnectCalendar, refreshCalendar } from './calendar'

const ACCENTS: { value: Accent; label: string; color: string }[] = [
	{ value: 'ember', label: 'Ember', color: '#b33a17' },
	{ value: 'cobalt', label: 'Cobalt', color: '#2c55d6' },
	{ value: 'moss', label: 'Moss', color: '#18764a' },
	{ value: 'iris', label: 'Iris', color: '#6a45d8' },
	{ value: 'graphite', label: 'Graphite', color: '#2b2e33' },
]

function set<K extends keyof S>(key: K, value: S[K]) {
	update('settings', (s) => ({ ...s, [key]: value }))
}

function Block({ label, children }: { label: string; children: React.ReactNode }) {
	return (
		<section className="block" aria-label={label}>
			<h2 className="block-label">{label}</h2>
			{children}
		</section>
	)
}

export function Settings() {
	const s = useStore((x) => x.settings)
	const [access, setAccess] = useState<Access | null>(null)

	useEffect(() => {
		const read = () => readAccess().then(setAccess)
		read()
		browser.permissions.onAdded.addListener(read)
		browser.permissions.onRemoved.addListener(read)
		return () => {
			browser.permissions.onAdded.removeListener(read)
			browser.permissions.onRemoved.removeListener(read)
		}
	}, [])

	const learning = !!access && access.history && access.tabs && access.sessions

	return (
		<>
			<h1 className="sr-only">Settings</h1>
			<Block label="how it works">
				<Setting
					label="Learn from my history and tabs"
					desc="Ranks where you go by frequency, recency and time of day, finds open tabs and recently closed ones. Read-only, never leaves this device."
				>
					<Switch
						label="Learn from my history and tabs"
						checked={learning}
						onChange={async (v) => {
							const ok = v
								? await requestCore()
								: await removePermission({ permissions: [...CORE_PERMS] })
							if (!ok && v) toast('Chrome didn’t grant access, so nothing changed.')
						}}
					/>
				</Setting>
				<Setting
					label="Switch to tabs that are already open"
					desc="Going somewhere you already have open jumps to that tab and closes this one."
				>
					<Switch
						label="Switch to open tabs"
						checked={s.switchTabs}
						onChange={(v) => set('switchTabs', v)}
					/>
				</Setting>
				<Setting
					label="Start typing right away"
					desc="Chrome keeps the cursor in the address bar on new tabs. With this on, LiveDash takes it, and the address bar shows LiveDash’s address."
				>
					<Switch
						label="Start typing right away"
						checked={s.typeOnOpen}
						onChange={(v) => set('typeOnOpen', v)}
					/>
				</Setting>
				<Setting label="Include bookmarks" desc="Bookmarks show up when you type.">
					<Switch
						label="Include bookmarks"
						checked={!!access?.bookmarks}
						onChange={async (v) => {
							const ok = v
								? await requestPermission({ permissions: ['bookmarks'] })
								: await removePermission({ permissions: ['bookmarks'] })
							if (!ok && v) toast('Chrome didn’t grant access, so nothing changed.')
						}}
					/>
				</Setting>
				<Setting label="Quick capture from any page" desc="Alt+Shift+L by default.">
					<button
						type="button"
						className="text-btn"
						onClick={() => browser.tabs.create({ url: 'chrome://extensions/shortcuts' })}
					>
						change
					</button>
				</Setting>
			</Block>

			<Block label="looks">
				<Setting label="Theme">
					<Segmented
						label="Theme"
						value={s.theme}
						onChange={(v) => set('theme', v)}
						options={[
							{ value: 'auto', label: 'system' },
							{ value: 'light', label: 'light' },
							{ value: 'dark', label: 'dark' },
						]}
					/>
				</Setting>
				<Setting label="Accent">
					<div className="swatches" role="radiogroup" aria-label="Accent">
						{ACCENTS.map((a) => (
							<button
								key={a.value}
								type="button"
								role="radio"
								className="swatch"
								style={{ background: a.color }}
								aria-checked={s.accent === a.value}
								aria-label={a.label}
								title={a.label}
								onClick={() => set('accent', a.value)}
							/>
						))}
					</div>
				</Setting>
				<Setting label="Clock">
					<Segmented
						label="Clock"
						value={s.hourCycle}
						onChange={(v) => set('hourCycle', v)}
						options={[
							{ value: 'auto', label: 'auto' },
							{ value: 'h12', label: '12h' },
							{ value: 'h23', label: '24h' },
						]}
					/>
				</Setting>
			</Block>

			<Pinned />
			<Hidden />
			<Calendar />
			<Focus />
			<Data />

			<Block label="privacy">
				<div className="prose">
					<p>
						LiveDash has no account, no server, no analytics and no remote code. Everything it
						learns about where you go is computed and stored in this browser. The only network
						request it can make is fetching a calendar link you add yourself.
					</p>
					<p>
						LiveDash began as a fork of{' '}
						<a
							className="text-btn"
							href="https://github.com/widgetify-app/widgetify-extension"
							target="_blank"
							rel="noreferrer"
						>
							Widgetify
						</a>{' '}
						(MIT, © 2025 widgetify) and has since been rewritten. Version{' '}
						{browser.runtime.getManifest().version} ·{' '}
						<a
							className="text-btn"
							href="https://github.com/Mahan-Imanian/LiveDash"
							target="_blank"
							rel="noreferrer"
						>
							source
						</a>
					</p>
				</div>
			</Block>
		</>
	)
}

function Pinned() {
	const pins = useStore((x) => x.shortcuts)
	return (
		<Block label="pinned">
			{pins.length === 0 ? (
				<p className="empty-line">
					Pin anything from the list with → then “Pin”. Pinned places keep their number.
				</p>
			) : (
				pins.map((p, i) => (
					<Setting key={p.id} label={`${i + 1}  ${p.title}`} desc={p.url}>
						<span className="form-row">
							{i > 0 && (
								<button
									type="button"
									className="text-btn"
									aria-label={`Move ${p.title} up`}
									onClick={() =>
										update('shortcuts', (l) => {
											const n = [...l]
											;[n[i - 1], n[i]] = [n[i], n[i - 1]]
											return n
										})
									}
								>
									up
								</button>
							)}
							<button
								type="button"
								className="text-btn"
								aria-label={`Unpin ${p.title}`}
								onClick={() => removeShortcut(p.id)}
							>
								unpin
							</button>
						</span>
					</Setting>
				))
			)}
		</Block>
	)
}

function Hidden() {
	const hidden = useStore((x) => x.hidden)
	if (!hidden.length) return null
	return (
		<Block label="never suggested">
			{hidden.map((k) => (
				<Setting key={k} label={k}>
					<button
						type="button"
						className="text-btn"
						onClick={() => update('hidden', (l) => l.filter((x) => x !== k))}
					>
						allow again
					</button>
				</Setting>
			))}
		</Block>
	)
}

function Calendar() {
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
		<Block label="calendar">
			{c.url ? (
				<>
					<Setting
						label={new URL(c.url).hostname}
						desc="Your next meeting appears at the top, with a join link when there is one."
					>
						<span className="form-row">
							<button type="button" className="text-btn" onClick={() => refreshCalendar(true)}>
								refresh
							</button>
							<button
								type="button"
								className="text-btn text-btn--danger"
								onClick={() => disconnectCalendar().then(() => toast('Calendar disconnected'))}
							>
								disconnect
							</button>
						</span>
					</Setting>
					<p
						className="status"
						data-tone={c.error ? 'error' : undefined}
						role={c.error ? 'alert' : undefined}
					>
						{c.error ??
							`${c.events.length} upcoming · updated ${c.fetchedAt ? formatRelative(c.fetchedAt) : 'never'}`}
					</p>
				</>
			) : (
				<form className="form" onSubmit={submit}>
					<label className="setting-desc" htmlFor="cal-url">
						Paste a secret iCal address (Google Calendar: settings → your calendar → “Secret address
						in iCal format”). Chrome will ask to let LiveDash read that one site.
					</label>
					<span className="form-row">
						<input
							id="cal-url"
							className="url-input"
							placeholder="https://…/basic.ics"
							value={url}
							autoComplete="off"
							spellCheck={false}
							aria-invalid={!!error}
							onChange={(e) => {
								setUrl(e.target.value)
								setError(null)
							}}
						/>
						<button type="submit" className="btn btn--quiet" disabled={!url.trim() || busy}>
							{busy ? 'connecting…' : 'connect'}
						</button>
					</span>
					{error && (
						<span className="status" data-tone="error" role="alert">
							{error}
						</span>
					)}
				</form>
			)}
		</Block>
	)
}

function Focus() {
	const f = useStore((x) => x.settings.focus)
	const [canNotify, setCanNotify] = useState(false)
	useEffect(() => {
		browser.permissions.contains({ permissions: ['notifications'] }).then(setCanNotify)
	}, [])

	function setLen(key: 'focus' | 'short' | 'long', raw: string) {
		const n = Math.round(Number(raw))
		if (!Number.isFinite(n) || n < 1 || n > 180) return
		update('settings', (x) => ({ ...x, focus: { ...x.focus, [key]: n } }))
		const st = getState()
		if (st.focus.status === 'idle' && st.focus.mode === key)
			update('focus', (fs) => ({ ...fs, remaining: modeMs(key, getState().settings) }))
	}

	return (
		<Block label="focus">
			{(['focus', 'short', 'long'] as const).map((k) => (
				<Setting
					key={k}
					label={{ focus: 'Focus length', short: 'Short break', long: 'Long break' }[k]}
					desc={k === 'focus' ? 'Type “focus” or “focus 40” in the bar to start.' : undefined}
				>
					<span className="form-row">
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
						<span className="setting-desc">min</span>
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
			<Setting label="Desktop notification" desc="Arrives even if no LiveDash tab is open.">
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
		</Block>
	)
}

function Data() {
	const fileRef = useRef<HTMLInputElement>(null)
	const [confirming, setConfirming] = useState(false)
	return (
		<Block label="your data">
			<Setting label="Export" desc="Pins, saved items, notes and settings as JSON.">
				<button type="button" className="text-btn" onClick={exportData}>
					download
				</button>
			</Setting>
			<Setting label="Import" desc="Adds items from a backup. Nothing is overwritten.">
				<button type="button" className="text-btn" onClick={() => fileRef.current?.click()}>
					choose file
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
				desc="Clears launch history and time-of-day patterns. Pins and saved items stay."
			>
				<button
					type="button"
					className="text-btn"
					onClick={() => {
						update('launches', () => [])
						update('hours', () => ({ at: 0, data: {} }))
						toast('LiveDash forgot your launch patterns')
					}}
				>
					forget
				</button>
			</Setting>
			<Setting
				label="Erase everything"
				desc="Removes all LiveDash data from this browser. Can’t be undone."
			>
				{confirming ? (
					<span className="form-row">
						<button type="button" className="text-btn" onClick={() => setConfirming(false)}>
							keep
						</button>
						<button
							type="button"
							className="text-btn text-btn--danger"
							onClick={() => {
								eraseAll()
								setConfirming(false)
							}}
						>
							erase now
						</button>
					</span>
				) : (
					<button
						type="button"
						className="text-btn text-btn--danger"
						onClick={() => setConfirming(true)}
					>
						erase…
					</button>
				)}
			</Setting>
		</Block>
	)
}
