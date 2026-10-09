import { type FormEvent, useEffect, useRef, useState } from 'react'
import { ensureDailyAccess, fetchDaily, ymd } from '@/lib/daily'
import { getState, update, useStore } from '@/store/store'
import type { Accent, Background, Modules, Place, Settings } from '@/store/types'
import { Segmented, Switch } from '@/ui/controls'
import { Glyph } from '@/ui/Glyph'
import { toast } from '@/ui/toast'
import { ensureWeatherAccess, locateMe, searchPlaces, setPlace, turnOffWeather } from '../weather'

export const TONES: { id: string; name: string }[] = [
	{ id: 'sand', name: 'Paper' },
	{ id: 'stone', name: 'Stone' },
	{ id: 'sage', name: 'Sage' },
	{ id: 'mist', name: 'Mist' },
	{ id: 'clay', name: 'Clay' },
	{ id: 'night', name: 'Night' },
]

const ACCENTS: { value: Accent; label: string; color: string }[] = [
	{ value: 'ember', label: 'Ember', color: '#b33a17' },
	{ value: 'cobalt', label: 'Cobalt', color: '#2c55d6' },
	{ value: 'moss', label: 'Moss', color: '#18764a' },
	{ value: 'iris', label: 'Iris', color: '#6a45d8' },
	{ value: 'graphite', label: 'Graphite', color: '#2b2e33' },
]

function set<K extends keyof Settings>(key: K, value: Settings[K]) {
	update('settings', (s) => ({ ...s, [key]: value }))
}

function setBg(patch: Partial<Background>) {
	update('settings', (s) => ({ ...s, background: { ...s.background, ...patch } }))
}

async function resizePhoto(file: File): Promise<string> {
	const bitmap = await createImageBitmap(file)
	const scale = Math.min(1, 2560 / bitmap.width)
	const c = document.createElement('canvas')
	c.width = Math.round(bitmap.width * scale)
	c.height = Math.round(bitmap.height * scale)
	c.getContext('2d')!.drawImage(bitmap, 0, 0, c.width, c.height)
	return c.toDataURL('image/jpeg', 0.82)
}

export async function refreshDaily(force = false): Promise<void> {
	const s = getState()
	if (s.settings.background.kind !== 'daily') return
	if (!force && s.daily?.date === ymd(new Date())) return
	try {
		const d = await fetchDaily()
		update('daily', () => d)
	} catch (e) {
		if (force) toast((e as Error).message, { tone: 'error' })
	}
}

function Section({
	title,
	children,
	id,
}: {
	title: string
	children: React.ReactNode
	id?: string
}) {
	return (
		<section className="cz-section" aria-labelledby={`cz-${title}`} id={id}>
			<h3 className="cz-head" id={`cz-${title}`}>
				{title}
			</h3>
			{children}
		</section>
	)
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
	return (
		<div className="cz-row">
			<span className="cz-label">{label}</span>
			{children}
		</div>
	)
}

export function Customize({ focus }: { focus?: string }) {
	const s = useStore((x) => x.settings)
	const daily = useStore((x) => x.daily)
	const photo = useStore((x) => x.photo)
	const fileRef = useRef<HTMLInputElement>(null)
	const [busy, setBusy] = useState(false)

	useEffect(() => {
		if (!focus) return
		requestAnimationFrame(() => {
			const el = document.getElementById(`cz-${focus}`)
			el?.scrollIntoView({ block: 'start' })
			el?.querySelector<HTMLElement>('input, button')?.focus()
		})
	}, [focus])

	const mod = (k: keyof Modules, v: boolean) =>
		update('settings', (x) => ({ ...x, modules: { ...x.modules, [k]: v } }))

	return (
		<div className="cz">
			<Section title="Theme">
				<div className="themes" role="radiogroup" aria-label="Theme">
					{(['auto', 'light', 'dark'] as const).map((t) => (
						<button
							key={t}
							type="button"
							role="radio"
							aria-checked={s.theme === t}
							className={`theme-card theme-card--${t}`}
							onClick={() => set('theme', t)}
						>
							<span className="theme-swatch" aria-hidden="true">
								<span />
								<span />
								<span />
							</span>
							{t === 'auto' ? 'System' : t === 'light' ? 'Light' : 'Dark'}
						</button>
					))}
				</div>
				<Row label="Accent">
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
				</Row>
			</Section>

			<Section title="Background">
				<div className="bgs" role="radiogroup" aria-label="Background">
					{TONES.map((t) => (
						<button
							key={t.id}
							type="button"
							role="radio"
							aria-checked={
								(s.background.kind === 'paper' && t.id === 'sand') ||
								(s.background.kind === 'tone' && s.background.tone === t.id)
							}
							className="bg-card"
							data-tone={t.id}
							onClick={() =>
								setBg(
									t.id === 'sand' ? { kind: 'paper', tone: 'sand' } : { kind: 'tone', tone: t.id },
								)
							}
						>
							<span className="bg-swatch" aria-hidden="true" />
							{t.name}
						</button>
					))}
					<button
						type="button"
						role="radio"
						aria-checked={s.background.kind === 'daily'}
						className="bg-card"
						disabled={busy}
						onClick={async () => {
							if (!(await ensureDailyAccess()))
								return toast('Wikipedia access wasn’t allowed, so nothing changed.')
							setBusy(true)
							setBg({ kind: 'daily' })
							await refreshDaily(true)
							setBusy(false)
						}}
					>
						<span
							className="bg-swatch bg-swatch--photo"
							aria-hidden="true"
							style={daily ? { backgroundImage: `url(${daily.src})` } : undefined}
						/>
						{busy ? 'Loading…' : 'Picture of the day'}
					</button>
					<button
						type="button"
						role="radio"
						aria-checked={s.background.kind === 'photo'}
						className="bg-card"
						onClick={() => (photo ? setBg({ kind: 'photo' }) : fileRef.current?.click())}
					>
						<span
							className="bg-swatch bg-swatch--photo"
							aria-hidden="true"
							style={photo ? { backgroundImage: `url(${photo})` } : undefined}
						>
							{!photo && <Glyph name="plus" />}
						</span>
						Your photo
					</button>
				</div>
				<input
					ref={fileRef}
					type="file"
					accept="image/*"
					className="sr-only"
					tabIndex={-1}
					aria-hidden="true"
					onChange={async (e) => {
						const f = e.target.files?.[0]
						e.target.value = ''
						if (!f) return
						try {
							update('photo', () => null)
							const data = await resizePhoto(f)
							update('photo', () => data)
							setBg({ kind: 'photo' })
						} catch {
							toast('That image couldn’t be used. Try a JPG or PNG.', { tone: 'error' })
						}
					}}
				/>
				{(s.background.kind === 'photo' || s.background.kind === 'daily') && (
					<>
						<Row label="Dim">
							<input
								type="range"
								className="range"
								min={0}
								max={80}
								step={5}
								value={s.background.dim}
								aria-label="Dim the picture"
								onChange={(e) => setBg({ dim: Number(e.target.value) })}
							/>
						</Row>
						{s.background.kind === 'photo' && (
							<p className="fine">
								<button type="button" className="text-btn" onClick={() => fileRef.current?.click()}>
									Choose another photo
								</button>
							</p>
						)}
						{s.background.kind === 'daily' && daily && (
							<p className="fine">
								“{daily.title.slice(0, 120)}” — {daily.credit}, {daily.license}.{' '}
								<a className="text-btn" href={daily.page} target="_blank" rel="noreferrer">
									Source
								</a>
							</p>
						)}
					</>
				)}
			</Section>

			<Section title="Layout">
				<Row label="Density">
					<Segmented
						label="Density"
						value={s.density}
						onChange={(v) => set('density', v)}
						options={[
							{ value: 'comfortable', label: 'Comfortable' },
							{ value: 'compact', label: 'Compact' },
						]}
					/>
				</Row>
				<Row label="Headlines">
					<Segmented
						label="Headline typeface"
						value={s.headline}
						onChange={(v) => set('headline', v)}
						options={[
							{ value: 'serif', label: 'Serif' },
							{ value: 'sans', label: 'Sans' },
						]}
					/>
				</Row>
				{(
					[
						['shortcuts', 'Shortcuts'],
						['pickup', 'Pick up'],
						['today', 'Today'],
						['notes', 'Notes'],
						['weather', 'Weather'],
					] as [keyof Modules, string][]
				).map(([k, label]) => (
					<Row key={k} label={label}>
						<Switch label={`Show ${label}`} checked={s.modules[k]} onChange={(v) => mod(k, v)} />
					</Row>
				))}
			</Section>

			<Section title="Clock">
				<Row label="Time">
					<Segmented
						label="Clock"
						value={s.hourCycle}
						onChange={(v) => set('hourCycle', v)}
						options={[
							{ value: 'auto', label: 'Auto' },
							{ value: 'h12', label: '12h' },
							{ value: 'h23', label: '24h' },
						]}
					/>
				</Row>
				<Row label="Date">
					<Segmented
						label="Date style"
						value={s.dateStyle}
						onChange={(v) => set('dateStyle', v)}
						options={[
							{ value: 'long', label: 'Long' },
							{ value: 'short', label: 'Short' },
						]}
					/>
				</Row>
			</Section>

			<WeatherSection />
		</div>
	)
}

function WeatherSection() {
	const w = useStore((x) => x.weather)
	const unit = useStore((x) => x.settings.weatherUnit)
	const [q, setQ] = useState('')
	const [results, setResults] = useState<Place[] | null>(null)
	const [error, setError] = useState<string | null>(null)
	const [busy, setBusy] = useState(false)

	async function search(e: FormEvent) {
		e.preventDefault()
		if (!q.trim()) return
		setError(null)
		if (!(await ensureWeatherAccess()))
			return setError('Weather needs permission to contact open-meteo.com. Nothing changed.')
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
		<Section title="Weather" id="cz-weather">
			{w.place && (
				<Row label={w.place.name + (w.place.region ? `, ${w.place.region}` : '')}>
					<button
						type="button"
						className="text-btn text-btn--danger"
						onClick={() => turnOffWeather().then(() => toast('Weather turned off'))}
					>
						Turn off
					</button>
				</Row>
			)}
			<form className="cz-form" onSubmit={search}>
				<label className="sr-only" htmlFor="wx-q">
					City
				</label>
				<input
					id="wx-q"
					className="line-input"
					placeholder={w.place ? 'Change city' : 'City'}
					value={q}
					onChange={(e) => setQ(e.target.value)}
					autoComplete="off"
				/>
				<button type="submit" className="btn btn--quiet" disabled={!q.trim() || busy}>
					{busy ? 'Searching…' : 'Search'}
				</button>
				<button
					type="button"
					className="text-btn"
					onClick={async () => {
						setError(null)
						if (!(await ensureWeatherAccess()))
							return setError('Weather needs permission to contact open-meteo.com.')
						try {
							setPlace(await locateMe())
							toast('Weather set to your location', { tone: 'success' })
						} catch (err) {
							setError((err as Error).message)
						}
					}}
				>
					Use my location
				</button>
			</form>
			{error && (
				<p className="field-error" role="alert">
					{error}
				</p>
			)}
			{results && results.length > 0 && (
				<ul className="places">
					{results.map((p) => (
						<li key={`${p.lat},${p.lon}`}>
							<button
								type="button"
								onClick={() => {
									setPlace(p)
									setResults(null)
									setQ('')
									toast(`Weather set to ${p.name}`, { tone: 'success' })
								}}
							>
								{p.name}
								{p.region && <span className="fine"> · {p.region}</span>}
							</button>
						</li>
					))}
				</ul>
			)}
			<Row label="Units">
				<Segmented
					label="Temperature units"
					value={unit}
					onChange={(v) => update('settings', (x) => ({ ...x, weatherUnit: v }))}
					options={[
						{ value: 'auto', label: 'Auto' },
						{ value: 'c', label: '°C' },
						{ value: 'f', label: '°F' },
					]}
				/>
			</Row>
			<p className="fine">Forecasts by Open-Meteo. Only the place you choose is sent.</p>
		</Section>
	)
}
