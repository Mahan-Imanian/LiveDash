import { CalendarDays, Download, ExternalLink, RefreshCw, Upload } from 'lucide-react'
import { type FormEvent, useEffect, useRef, useState } from 'react'
import { browser } from 'wxt/browser'
import { hasPermission, removePermission, requestPermission } from '@/lib/chrome'
import { formatRelative } from '@/lib/format'
import { eraseAll, exportData, importData } from '@/store/data'
import { modeMs } from '@/store/focus-logic'
import { getState, update, useStore } from '@/store/store'
import type { Accent, Place, Settings as S } from '@/store/types'
import { Segmented, Setting, Switch } from '@/ui/controls'
import { Dialog } from '@/ui/Dialog'
import { toast } from '@/ui/toast'
import {
	connectCalendar,
	disconnectCalendar,
	disconnectWeather,
	ensureWeatherPermission,
	refreshCalendar,
	refreshWeather,
	searchPlaces,
} from '../services'

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

export function SettingsDialog({
	open,
	section,
	onClose,
}: {
	open: boolean
	section?: string
	onClose: () => void
}) {
	const s = useStore((x) => x.settings)
	const bodyRef = useRef<HTMLDivElement>(null)

	useEffect(() => {
		if (!open || !section) return
		requestAnimationFrame(() => {
			const el = document.getElementById(`settings-${section}`)
			el?.scrollIntoView({ block: 'start' })
			el?.querySelector<HTMLElement>('input, button')?.focus()
		})
	}, [open, section])

	return (
		<Dialog open={open} onClose={onClose} title="Settings" variant="sheet">
			<div ref={bodyRef}>
				<section className="settings-section" aria-labelledby="st-appearance">
					<h3 id="st-appearance">Appearance</h3>
					<Setting label="Theme" id="st-theme">
						<Segmented
							label="Theme"
							value={s.theme}
							onChange={(v) => set('theme', v)}
							options={[
								{ value: 'auto', label: 'System' },
								{ value: 'light', label: 'Light' },
								{ value: 'dark', label: 'Dark' },
							]}
						/>
					</Setting>
					<Setting label="Accent">
						<div className="icon-picker" role="radiogroup" aria-label="Accent color">
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
							label="Clock format"
							value={s.hourCycle}
							onChange={(v) => set('hourCycle', v)}
							options={[
								{ value: 'auto', label: 'Auto' },
								{ value: 'h12', label: '12-hour' },
								{ value: 'h23', label: '24-hour' },
							]}
						/>
					</Setting>
					<Setting label="Show seconds">
						<Switch
							label="Show seconds"
							checked={s.showSeconds}
							onChange={(v) => set('showSeconds', v)}
						/>
					</Setting>
				</section>

				<section className="settings-section" aria-labelledby="st-home">
					<h3 id="st-home">Home</h3>
					{(['shortcuts', 'focus', 'notes'] as const).map((k) => (
						<Setting
							key={k}
							label={{ shortcuts: 'Shortcuts', focus: 'Focus timer', notes: 'Notes' }[k]}
						>
							<Switch
								label={`Show ${k}`}
								checked={s.panels[k]}
								onChange={(v) =>
									update('settings', (x) => ({ ...x, panels: { ...x.panels, [k]: v } }))
								}
							/>
						</Setting>
					))}
				</section>

				<FocusSection />
				<CalendarSection />
				<WeatherSection />
				<PrivacySection />
				<DataSection />

				<section className="settings-section prose" aria-labelledby="st-about">
					<h3 id="st-about">About</h3>
					<p>
						LiveDash {browser.runtime.getManifest().version}. Open source under the MIT License.
						LiveDash grew out of a fork of{' '}
						<a
							href="https://github.com/widgetify-app/widgetify-extension"
							target="_blank"
							rel="noreferrer"
						>
							Widgetify
						</a>{' '}
						(MIT, © 2025 widgetify) and has since been rebuilt from scratch.
					</p>
					<p>
						<a href="https://github.com/Mahan-Imanian/LiveDash" target="_blank" rel="noreferrer">
							Source code and issues <ExternalLink size={12} aria-hidden="true" />
						</a>
					</p>
				</section>
			</div>
		</Dialog>
	)
}

function FocusSection() {
	const f = useStore((x) => x.settings.focus)
	const [canNotify, setCanNotify] = useState(false)
	useEffect(() => {
		hasPermission({ permissions: ['notifications'] }).then(setCanNotify)
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
		<section className="settings-section" aria-labelledby="st-focus" id="settings-focus">
			<h3 id="st-focus">Focus timer</h3>
			{(['focus', 'short', 'long'] as const).map((k) => (
				<Setting
					key={k}
					label={{ focus: 'Focus length', short: 'Short break', long: 'Long break' }[k]}
				>
					<span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
						<input
							type="number"
							className="number-input"
							min={1}
							max={180}
							defaultValue={f[k]}
							aria-label={`${k} length in minutes`}
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
			<Setting
				label="Desktop notification"
				desc="Works even when no LiveDash tab is open. Chrome will ask for permission."
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
		</section>
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
		<section className="settings-section" aria-labelledby="st-cal" id="settings-calendar">
			<h3 id="st-cal">Calendar</h3>
			{c.url ? (
				<>
					<Setting label="Connected" desc={new URL(c.url).hostname}>
						<span style={{ display: 'inline-flex', gap: 4 }}>
							<button type="button" className="btn btn--sm" onClick={() => refreshCalendar(true)}>
								<RefreshCw size={14} aria-hidden="true" /> Refresh
							</button>
							<button
								type="button"
								className="btn btn--sm btn--danger"
								onClick={() => disconnectCalendar().then(() => toast('Calendar disconnected'))}
							>
								Disconnect
							</button>
						</span>
					</Setting>
					<p
						className="status-line"
						data-tone={c.error ? 'error' : 'ok'}
						role={c.error ? 'alert' : undefined}
					>
						{c.error ??
							`${c.events.length} upcoming ${c.events.length === 1 ? 'event' : 'events'} · updated ${c.fetchedAt ? formatRelative(c.fetchedAt) : 'never'}`}
					</p>
				</>
			) : (
				<form onSubmit={submit} className="field">
					<label className="field-label" htmlFor="cal-url">
						Secret iCal address
					</label>
					<p className="setting-desc" style={{ margin: 0 }} id="cal-help">
						Shows your next event under the clock. In Google Calendar: Settings → your calendar →
						“Secret address in iCal format”. Outlook and iCloud have similar “publish” links. Chrome
						will ask to let LiveDash read that one site; nothing is sent anywhere else.
					</p>
					<span style={{ display: 'flex', gap: 8 }}>
						<input
							id="cal-url"
							className="text-input"
							placeholder="https://calendar.google.com/calendar/ical/…/basic.ics"
							value={url}
							autoComplete="off"
							spellCheck={false}
							aria-describedby={`cal-help${error ? ' cal-err' : ''}`}
							aria-invalid={!!error}
							onChange={(e) => {
								setUrl(e.target.value)
								setError(null)
							}}
						/>
						<button type="submit" className="btn btn--primary" disabled={!url.trim() || busy}>
							<CalendarDays size={16} aria-hidden="true" />
							{busy ? 'Connecting…' : 'Connect'}
						</button>
					</span>
					{error && (
						<span className="input-error" id="cal-err" role="alert">
							{error}
						</span>
					)}
				</form>
			)}
		</section>
	)
}

function WeatherSection() {
	const w = useStore((x) => x.weather)
	const unit = useStore((x) => x.settings.weatherUnit)
	const [q, setQ] = useState('')
	const [results, setResults] = useState<Place[] | null>(null)
	const [busy, setBusy] = useState(false)
	const [error, setError] = useState<string | null>(null)

	async function search(e: FormEvent) {
		e.preventDefault()
		if (!q.trim()) return
		setError(null)
		if (!(await ensureWeatherPermission())) {
			setError('Weather needs permission to contact open-meteo.com. Nothing was changed.')
			return
		}
		setBusy(true)
		try {
			const r = await searchPlaces(q.trim())
			setResults(r)
			if (!r.length) setError('No places found. Try a nearby city.')
		} catch {
			setError('Couldn’t search places. You may be offline.')
		} finally {
			setBusy(false)
		}
	}

	return (
		<section className="settings-section" aria-labelledby="st-weather" id="settings-weather">
			<h3 id="st-weather">Weather</h3>
			{w.place && (
				<>
					<Setting label={w.place.name} desc={w.place.region}>
						<span style={{ display: 'inline-flex', gap: 4 }}>
							<button type="button" className="btn btn--sm" onClick={() => refreshWeather(true)}>
								<RefreshCw size={14} aria-hidden="true" /> Refresh
							</button>
							<button
								type="button"
								className="btn btn--sm btn--danger"
								onClick={() => disconnectWeather().then(() => toast('Weather turned off'))}
							>
								Turn off
							</button>
						</span>
					</Setting>
					<p className="status-line" data-tone={w.error ? 'error' : undefined}>
						{w.error
							? `${w.error}. Showing data from ${w.fetchedAt ? formatRelative(w.fetchedAt) : 'never'}.`
							: w.fetchedAt
								? `Updated ${formatRelative(w.fetchedAt)} · data by Open-Meteo`
								: 'Loading…'}
					</p>
					<Setting label="Units">
						<Segmented
							label="Temperature units"
							value={unit}
							onChange={(v) => {
								update('settings', (x) => ({ ...x, weatherUnit: v }))
								setTimeout(() => refreshWeather(true))
							}}
							options={[
								{ value: 'auto', label: 'Auto' },
								{ value: 'c', label: '°C' },
								{ value: 'f', label: '°F' },
							]}
						/>
					</Setting>
				</>
			)}
			<form onSubmit={search} className="field" style={{ marginTop: w.place ? 16 : 0 }}>
				<label className="field-label" htmlFor="wx-q">
					{w.place ? 'Change location' : 'Location'}
				</label>
				{!w.place && (
					<p className="setting-desc" style={{ margin: 0 }}>
						Forecasts come from Open-Meteo, a free service with no account. Only the city you pick
						is sent.
					</p>
				)}
				<span style={{ display: 'flex', gap: 8 }}>
					<input
						id="wx-q"
						className="text-input"
						placeholder="City name"
						value={q}
						onChange={(e) => setQ(e.target.value)}
						autoComplete="off"
					/>
					<button type="submit" className="btn" disabled={!q.trim() || busy}>
						{busy ? 'Searching…' : 'Search'}
					</button>
				</span>
				{error && (
					<span className="input-error" role="alert">
						{error}
					</span>
				)}
				{results && results.length > 0 && (
					<ul className="place-results" aria-label="Places">
						{results.map((p) => (
							<li key={`${p.lat},${p.lon}`}>
								<button
									type="button"
									onClick={() => {
										update('weather', () => ({
											place: p,
											data: null,
											fetchedAt: null,
											error: null,
										}))
										setResults(null)
										setQ('')
										refreshWeather(true)
										toast(`Weather set to ${p.name}`, { tone: 'success' })
									}}
								>
									{p.name}
									{p.region && <span className="setting-desc"> · {p.region}</span>}
								</button>
							</li>
						))}
					</ul>
				)}
			</form>
		</section>
	)
}

function PrivacySection() {
	const [perms, setPerms] = useState<{ bookmarks: boolean; topSites: boolean }>({
		bookmarks: false,
		topSites: false,
	})
	useEffect(() => {
		const read = () =>
			Promise.all([
				hasPermission({ permissions: ['bookmarks'] }),
				hasPermission({ permissions: ['topSites'] }),
			]).then(([bookmarks, topSites]) => setPerms({ bookmarks, topSites }))
		read()
		browser.permissions.onAdded.addListener(read)
		browser.permissions.onRemoved.addListener(read)
		return () => {
			browser.permissions.onAdded.removeListener(read)
			browser.permissions.onRemoved.removeListener(read)
		}
	}, [])

	async function toggle(p: 'bookmarks' | 'topSites', v: boolean) {
		const ok = v
			? await requestPermission({ permissions: [p] })
			: await removePermission({ permissions: [p] })
		if (!ok && v) toast('Permission wasn’t granted, so nothing changed.')
	}

	return (
		<section className="settings-section" aria-labelledby="st-privacy" id="settings-privacy">
			<h3 id="st-privacy">Privacy</h3>
			<div className="prose">
				<p>
					Your tasks, notes and shortcuts are stored only in this browser. LiveDash has no account,
					no analytics and no tracking. It only makes network requests for features you turn on:
					weather (Open-Meteo) and your calendar link.
				</p>
			</div>
			<Setting
				label="Search Chrome bookmarks"
				desc="Lets the command bar find your bookmarks. Read-only."
			>
				<Switch
					label="Search Chrome bookmarks"
					checked={perms.bookmarks}
					onChange={(v) => toggle('bookmarks', v)}
				/>
			</Setting>
			<Setting
				label="Most-visited suggestions"
				desc="Lets LiveDash suggest shortcuts from Chrome’s most-visited sites list."
			>
				<Switch
					label="Most-visited suggestions"
					checked={perms.topSites}
					onChange={(v) => toggle('topSites', v)}
				/>
			</Setting>
			<Setting label="Quick capture shortcut" desc="Default: Alt+Shift+L on any page.">
				<button
					type="button"
					className="btn btn--sm"
					onClick={() => browser.tabs.create({ url: 'chrome://extensions/shortcuts' })}
				>
					Change
				</button>
			</Setting>
		</section>
	)
}

function DataSection() {
	const fileRef = useRef<HTMLInputElement>(null)
	const [confirming, setConfirming] = useState(false)
	return (
		<section className="settings-section" aria-labelledby="st-data" id="settings-data">
			<h3 id="st-data">Your data</h3>
			<Setting label="Back up" desc="Download tasks, notes, shortcuts and settings as a JSON file.">
				<button type="button" className="btn btn--sm" onClick={exportData}>
					<Download size={14} aria-hidden="true" /> Export
				</button>
			</Setting>
			<Setting label="Restore" desc="Adds items from a backup. Nothing is overwritten.">
				<button type="button" className="btn btn--sm" onClick={() => fileRef.current?.click()}>
					<Upload size={14} aria-hidden="true" /> Import
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
				label="Erase everything"
				desc="Removes all LiveDash data from this browser. This can’t be undone."
			>
				{confirming ? (
					<span style={{ display: 'inline-flex', gap: 4 }}>
						<button
							type="button"
							className="btn btn--sm btn--ghost"
							onClick={() => setConfirming(false)}
						>
							Keep
						</button>
						<button
							type="button"
							className="btn btn--sm btn--danger"
							onClick={() => {
								eraseAll()
								setConfirming(false)
							}}
						>
							Erase now
						</button>
					</span>
				) : (
					<button
						type="button"
						className="btn btn--sm btn--danger"
						onClick={() => setConfirming(true)}
					>
						Erase…
					</button>
				)}
			</Setting>
		</section>
	)
}
