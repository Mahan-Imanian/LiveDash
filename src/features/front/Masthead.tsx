import { useEffect, useRef, useState } from 'react'
import { emit } from '@/lib/bus'
import { openUrl } from '@/lib/chrome'
import { formatDuration, formatRelative, formatTime } from '@/lib/format'
import { pause, remainingMs, start } from '@/store/focus-logic'
import { update, useStore } from '@/store/store'
import { Glyph } from '@/ui/Glyph'
import { refreshWeather, sky, weatherLabel } from '../weather'

function Weather({ now }: { now: number }) {
	const w = useStore((s) => s.weather)
	const cycle = useStore((s) => s.settings.hourCycle)
	const [open, setOpen] = useState(false)
	const ref = useRef<HTMLDivElement>(null)

	useEffect(() => {
		if (!open) return
		const down = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setOpen(false)
		const key = (e: KeyboardEvent) => {
			if (e.key !== 'Escape') return
			e.stopPropagation()
			setOpen(false)
		}
		window.addEventListener('mousedown', down)
		window.addEventListener('keydown', key, true)
		return () => {
			window.removeEventListener('mousedown', down)
			window.removeEventListener('keydown', key, true)
		}
	}, [open])

	if (!w.place) {
		return (
			<button
				type="button"
				className="mast-btn mast-btn--quiet"
				onClick={() => emit({ type: 'open', panel: 'customize', arg: 'weather' })}
			>
				<Glyph name="partly" /> Add weather
			</button>
		)
	}
	if (!w.data) {
		return (
			<button
				type="button"
				className="mast-btn mast-btn--quiet"
				onClick={() => refreshWeather(true)}
			>
				<Glyph name="cloud" /> {w.error ? 'Weather unavailable · retry' : 'Loading weather…'}
			</button>
		)
	}
	const d = w.data
	const stale = w.fetchedAt ? now - w.fetchedAt > 60 * 60_000 : true
	const label = `${weatherLabel(d.code)}, ${d.temp}°${d.unit.toUpperCase()} in ${w.place.name}`
	const day = new Intl.DateTimeFormat(undefined, { weekday: 'short' })

	return (
		<div className="weather" ref={ref}>
			<button
				type="button"
				className="mast-btn"
				aria-expanded={open}
				aria-label={`${label}. Show forecast`}
				onClick={() => setOpen((v) => !v)}
			>
				<Glyph name={sky(d.code, d.isDay)} />
				<span className="mast-temp">{d.temp}°</span>
				<span className="mast-place">{w.place.name}</span>
				{stale && <span className="mast-stale">{w.error === 'Offline' ? 'offline' : 'old'}</span>}
			</button>
			{open && (
				<div className="popover" role="dialog" aria-label={`Forecast for ${w.place.name}`}>
					<p className="kicker">
						{w.place.name}
						{w.place.region ? `, ${w.place.region}` : ''}
					</p>
					<p className="pop-now">
						<span className="pop-temp">{d.temp}°</span> {weatherLabel(d.code)}
					</p>
					<ol className="pop-hours">
						{d.hourly
							.filter((_, i) => i % 3 === 0)
							.map((h) => (
								<li key={h.t}>
									<span>{formatTime(h.t, cycle)}</span>
									<Glyph name={sky(h.code)} />
									<span>{h.temp}°</span>
								</li>
							))}
					</ol>
					<ol className="pop-days">
						{d.days.map((x, i) => (
							<li key={x.date}>
								<span className="pop-day">
									{i === 0 ? 'Today' : day.format(new Date(`${x.date}T12:00`))}
								</span>
								<Glyph name={sky(x.code)} />
								<span className="pop-rain">{x.rain ? `${x.rain}%` : ''}</span>
								<span className="pop-range">
									{x.min}° <span className="pop-bar" /> {x.max}°
								</span>
							</li>
						))}
					</ol>
					<p className="pop-foot">
						{w.error ? `${w.error}. ` : ''}Updated{' '}
						{w.fetchedAt ? formatRelative(w.fetchedAt, now) : 'never'} · Open-Meteo{' '}
						<button type="button" className="text-btn" onClick={() => refreshWeather(true)}>
							Refresh
						</button>{' '}
						<button
							type="button"
							className="text-btn"
							onClick={() => emit({ type: 'open', panel: 'customize', arg: 'weather' })}
						>
							Change place
						</button>
					</p>
				</div>
			)}
		</div>
	)
}

export function Masthead({ now }: { now: number }) {
	const focus = useStore((s) => s.focus)
	const events = useStore((s) => s.calendar.events)
	const cycle = useStore((s) => s.settings.hourCycle)
	const dateStyle = useStore((s) => s.settings.dateStyle)
	const showWeather = useStore((s) => s.settings.modules.weather)

	const date = new Intl.DateTimeFormat(
		undefined,
		dateStyle === 'long'
			? { weekday: 'long', day: 'numeric', month: 'long' }
			: { weekday: 'short', day: 'numeric', month: 'short' },
	).format(now)
	const current = events.find((e) => !e.allDay && e.start <= now && e.end > now)
	const next = !current
		? events.find((e) => !e.allDay && e.start > now && e.start - now < 3 * 3_600_000)
		: undefined
	const ev = current ?? next
	const mins = next ? Math.max(1, Math.round((next.start - now) / 60_000)) : 0

	return (
		<header className="masthead">
			<div className="mast-left">
				<p className="mast-date">{date}</p>
				<p className="mast-time">
					<time dateTime={new Date(now).toISOString()}>{formatTime(now, cycle)}</time>
				</p>
			</div>
			<div className="mast-center" aria-live="polite">
				{ev && (
					<span className={`mast-event${current || mins <= 10 ? ' mast-event--hot' : ''}`}>
						<span className="mast-event-title">{ev.title}</span>
						<span className="mast-event-when">
							{current
								? `until ${formatTime(current.end, cycle)}`
								: mins < 60
									? `in ${mins} min`
									: `at ${formatTime(ev.start, cycle)}`}
						</span>
						{ev.link && (
							<button
								type="button"
								className="text-btn text-btn--accent"
								onClick={() => openUrl(ev.link!)}
							>
								Join
							</button>
						)}
					</span>
				)}
				{focus.status !== 'idle' && (
					<span className="mast-focus">
						<button
							type="button"
							className="mast-btn"
							onClick={() => emit({ type: 'focus-mode', on: true })}
							aria-label="Open focus mode"
						>
							<Glyph name="focus" />
							<span className="mast-timer">{formatDuration(remainingMs(focus, now))}</span>
							{focus.status === 'paused' && <span className="mast-stale">paused</span>}
						</button>
						<button
							type="button"
							className="text-btn"
							onClick={() => update('focus', (f) => (f.status === 'running' ? pause(f) : start(f)))}
						>
							{focus.status === 'running' ? 'Pause' : 'Resume'}
						</button>
					</span>
				)}
			</div>
			<nav className="mast-right" aria-label="Tools">
				{showWeather && <Weather now={now} />}
				<button
					type="button"
					className="icon-btn"
					aria-label="Focus mode (F)"
					title="Focus mode  F"
					onClick={() => emit({ type: 'focus-mode', on: true })}
				>
					<Glyph name="focus" />
				</button>
				<button
					type="button"
					className="icon-btn"
					aria-label="Bookmarks (B)"
					title="Bookmarks  B"
					onClick={() => emit({ type: 'open', panel: 'bookmarks' })}
				>
					<Glyph name="bookmark" />
				</button>
				<button
					type="button"
					className="icon-btn"
					aria-label="Customize (C)"
					title="Customize  C"
					onClick={() => emit({ type: 'open', panel: 'customize' })}
				>
					<Glyph name="brush" />
				</button>
				<button
					type="button"
					className="icon-btn"
					aria-label="Settings (,)"
					title="Settings  ,"
					onClick={() => emit({ type: 'open', panel: 'settings' })}
				>
					<Glyph name="gear" />
				</button>
			</nav>
		</header>
	)
}
