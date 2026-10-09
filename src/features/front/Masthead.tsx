import { type CSSProperties, useEffect, useRef, useState } from 'react'
import { emit } from '@/lib/bus'
import { openUrl } from '@/lib/chrome'
import { countdown, editionName, isoWeek, pickLead } from '@/lib/edition'
import {
	dayDiff,
	formatDuration,
	formatRelative,
	formatTime,
	type HourCycle,
	isOverdue,
} from '@/lib/format'
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
				className="tool tool--quiet"
				onClick={() => emit({ type: 'open', panel: 'customize', arg: 'weather' })}
			>
				<Glyph name="partly" /> Add weather
			</button>
		)
	}
	if (!w.data) {
		return (
			<button type="button" className="tool tool--quiet" onClick={() => refreshWeather(true)}>
				<Glyph name="cloud" /> {w.error ? 'Weather unavailable · retry' : 'Loading weather…'}
			</button>
		)
	}
	const d = w.data
	const stale = w.fetchedAt ? now - w.fetchedAt > 60 * 60_000 : true
	const label = `${weatherLabel(d.code)}, ${d.temp}°${d.unit.toUpperCase()} in ${w.place.name}`
	const day = new Intl.DateTimeFormat(undefined, { weekday: 'short' })
	const lo = Math.min(...d.days.map((x) => x.min))
	const hi = Math.max(...d.days.map((x) => x.max))
	const span = Math.max(1, hi - lo)

	return (
		<div className="weather" ref={ref}>
			<button
				type="button"
				className="tool"
				aria-expanded={open}
				aria-label={`${label}. Show forecast`}
				onClick={() => setOpen((v) => !v)}
			>
				<Glyph name={sky(d.code, d.isDay)} />
				<span className="tool-temp">{d.temp}°</span>
				<span className="tool-place">{w.place.name}</span>
				{stale && <span className="tool-stale">{w.error === 'Offline' ? 'offline' : 'old'}</span>}
			</button>
			{open && (
				<div className="popover wx" role="dialog" aria-label={`Forecast for ${w.place.name}`}>
					<p className="wx-place">
						{w.place.name}
						{w.place.region && <span>{w.place.region}</span>}
					</p>
					<p className="wx-now">
						<span className="wx-temp">{d.temp}°</span>
						<span className="wx-sky">
							<Glyph name={sky(d.code, d.isDay)} size={20} />
							{weatherLabel(d.code)}
						</span>
					</p>
					<ol className="wx-hours">
						{d.hourly
							.filter((_, i) => i % 3 === 0)
							.map((h) => (
								<li key={h.t}>
									<span>{formatTime(h.t, cycle)}</span>
									<Glyph name={sky(h.code)} />
									<span className="wx-h-temp">{h.temp}°</span>
								</li>
							))}
					</ol>
					<ol className="wx-days">
						{d.days.map((x, i) => (
							<li key={x.date}>
								<span className="wx-day">
									{i === 0 ? 'Today' : day.format(new Date(`${x.date}T12:00`))}
								</span>
								<Glyph name={sky(x.code)} />
								<span className="wx-rain">{x.rain ? `${x.rain}%` : ''}</span>
								<span className="wx-range">
									<span className="wx-lo">{x.min}°</span>
									<span
										className="wx-bar"
										style={
											{
												'--from': (x.min - lo) / span,
												'--to': (x.max - lo) / span,
											} as CSSProperties
										}
									/>
									<span className="wx-hi">{x.max}°</span>
								</span>
							</li>
						))}
					</ol>
					<p className="wx-foot">
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

function Clock({ cycle }: { cycle: HourCycle }) {
	const [t, setT] = useState(Date.now())
	useEffect(() => {
		let id = 0
		const tick = () => {
			setT(Date.now())
			id = window.setTimeout(tick, 1000 - (Date.now() % 1000) + 5)
		}
		const vis = () => {
			clearTimeout(id)
			if (!document.hidden) tick()
		}
		tick()
		document.addEventListener('visibilitychange', vis)
		return () => {
			clearTimeout(id)
			document.removeEventListener('visibilitychange', vis)
		}
	}, [])
	const opts: Intl.DateTimeFormatOptions = { hour: 'numeric', minute: '2-digit', second: '2-digit' }
	if (cycle !== 'auto') opts.hourCycle = cycle
	const parts = new Intl.DateTimeFormat(undefined, opts).formatToParts(t)
	return (
		<p className="clock">
			<time dateTime={new Date(t).toISOString()}>
				{parts.map((p, i) => {
					const key = `${p.type}${i}`
					if (p.type === 'second' || (p.type === 'literal' && parts[i + 1]?.type === 'second'))
						return (
							<span key={key} className="clock-sec" aria-hidden="true">
								{p.value}
							</span>
						)
					if (p.type === 'dayPeriod')
						return (
							<span key={key} className="clock-period">
								{p.value}
							</span>
						)
					return p.value
				})}
			</time>
		</p>
	)
}

function LeadStory({ now }: { now: number }) {
	const events = useStore((s) => s.calendar.events)
	const hasCal = useStore((s) => !!s.calendar.url)
	const tasks = useStore((s) => s.tasks)
	const cycle = useStore((s) => s.settings.hourCycle)
	const lead = pickLead(events, now)

	if (lead) {
		const e = lead.event
		const hot = lead.live || lead.minutes <= 10
		return (
			<section className="lead" data-hot={hot} aria-labelledby="lead-title" aria-live="polite">
				<p className="lead-label">
					<span className="lead-dot" aria-hidden="true" />
					{lead.live ? 'Happening now' : 'Next up'}
				</p>
				<h2 className="lead-title" id="lead-title">
					{e.title}
				</h2>
				<p className="lead-when">
					<span className="lead-count">
						{lead.live ? `${countdown(lead.minutes)} left` : `in ${countdown(lead.minutes)}`}
					</span>
					<span className="lead-range">
						{formatTime(e.start, cycle)} – {formatTime(e.end, cycle)}
					</span>
				</p>
				{(e.link || lead.following) && (
					<div className="lead-foot">
						{e.link && (
							<button type="button" className="btn btn--sm" onClick={() => openUrl(e.link!)}>
								<Glyph name="join" size={14} /> Join
							</button>
						)}
						{lead.following && (
							<p className="lead-then">
								Then <span>{lead.following.title}</span> at{' '}
								{formatTime(lead.following.start, cycle)}
							</p>
						)}
					</div>
				)}
			</section>
		)
	}

	const open = tasks.filter((t) => !t.done)
	const late = open.filter((t) => isOverdue(t.due, t.allDay, now)).length
	const today = open.filter(
		(t) => t.due !== null && !isOverdue(t.due, t.allDay, now) && dayDiff(t.due, now) === 0,
	).length

	return (
		<section className="lead lead--quiet" aria-labelledby="lead-title">
			<p className="lead-label">
				<span className="lead-dot" aria-hidden="true" />
				Today
			</p>
			<h2 className="lead-title" id="lead-title">
				{today + late > 0
					? `${today + late} ${today + late === 1 ? 'thing' : 'things'} due`
					: 'Nothing on the calendar'}
			</h2>
			<p className="lead-when">
				{today + late > 0
					? late > 0
						? `${late} overdue · ${today} today`
						: 'All due today'
					: 'The rest of the day is yours.'}
			</p>
			<div className="lead-foot">
				{today + late > 0 ? (
					<button
						type="button"
						className="text-btn"
						onClick={() => emit({ type: 'open', panel: 'tasks' })}
					>
						Open tasks
					</button>
				) : (
					!hasCal && (
						<button
							type="button"
							className="text-btn"
							onClick={() => emit({ type: 'open', panel: 'settings', arg: 'integrations' })}
						>
							Connect a calendar
						</button>
					)
				)}
			</div>
		</section>
	)
}

export function Masthead({ now }: { now: number }) {
	const focus = useStore((s) => s.focus)
	const cycle = useStore((s) => s.settings.hourCycle)
	const dateStyle = useStore((s) => s.settings.dateStyle)
	const showWeather = useStore((s) => s.settings.modules.weather)

	const date = new Intl.DateTimeFormat(
		undefined,
		dateStyle === 'long'
			? { weekday: 'long', day: 'numeric', month: 'long' }
			: { weekday: 'short', day: 'numeric', month: 'short' },
	).format(now)

	return (
		<header className="masthead">
			<div className="edition">
				<p className="edition-name">
					<span className="nameplate">LiveDash</span>
					<span className="edition-meta">
						{editionName(now)} · Week {isoWeek(now)}
					</span>
				</p>
				<div className="edition-tools">
					{focus.status !== 'idle' && (
						<span className="edition-focus">
							<button
								type="button"
								className="tool"
								onClick={() => emit({ type: 'focus-mode', on: true })}
								aria-label="Open focus mode"
							>
								<Glyph name="focus" />
								<span className="tool-timer">{formatDuration(remainingMs(focus, now))}</span>
								{focus.status === 'paused' && <span className="tool-stale">paused</span>}
							</button>
							<button
								type="button"
								className="text-btn"
								onClick={() =>
									update('focus', (f) => (f.status === 'running' ? pause(f) : start(f)))
								}
							>
								{focus.status === 'running' ? 'Pause' : 'Resume'}
							</button>
						</span>
					)}
					{showWeather && <Weather now={now} />}
					<nav className="tools" aria-label="Tools">
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
				</div>
			</div>
			<div className="mast-main">
				<div className="mast-headline">
					<h1 className="mast-date" style={{ '--len': date.length } as CSSProperties}>
						{date}
					</h1>
					<Clock cycle={cycle} />
				</div>
				<LeadStory now={now} />
			</div>
		</header>
	)
}
