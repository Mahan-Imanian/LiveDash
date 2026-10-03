import {
	Cloud,
	CloudDrizzle,
	CloudFog,
	CloudLightning,
	CloudRain,
	CloudSnow,
	CloudSun,
	Moon,
	Sun,
} from 'lucide-react'
import { type ReactNode, useEffect, useState } from 'react'
import { emit } from '@/lib/bus'
import type { HourCycle } from '@/lib/format'
import { dayDiff, formatRelative, formatTime } from '@/lib/format'
import { useStore } from '@/store/store'
import { refreshWeather, weatherLabel } from './services'

function useClock(seconds: boolean): number {
	const [now, setNow] = useState(Date.now())
	useEffect(() => {
		let timer = 0
		const schedule = () => {
			const t = Date.now()
			setNow(t)
			const unit = seconds ? 1000 : 60_000
			timer = window.setTimeout(schedule, unit - (t % unit) + 5)
		}
		const vis = () => {
			clearTimeout(timer)
			if (!document.hidden) schedule()
		}
		schedule()
		document.addEventListener('visibilitychange', vis)
		return () => {
			clearTimeout(timer)
			document.removeEventListener('visibilitychange', vis)
		}
	}, [seconds])
	return now
}

function Clock({ cycle, seconds }: { cycle: HourCycle; seconds: boolean }) {
	const now = useClock(seconds)
	const opts: Intl.DateTimeFormatOptions = { hour: 'numeric', minute: '2-digit' }
	if (cycle !== 'auto') opts.hourCycle = cycle
	const parts = new Intl.DateTimeFormat(undefined, opts).formatToParts(now)
	const main = parts
		.filter((p) => p.type !== 'dayPeriod')
		.map((p) => p.value)
		.join('')
		.trim()
	const period = parts.find((p) => p.type === 'dayPeriod')?.value
	const sec = String(new Date(now).getSeconds()).padStart(2, '0')
	return (
		<h1 className="clock">
			<time dateTime={new Date(now).toISOString()}>
				{main}
				{seconds && (
					<span className="clock-sec" aria-hidden="true">
						{sec}
					</span>
				)}
				{period && (
					<span className="clock-period" aria-hidden="true">
						{period}
					</span>
				)}
			</time>
		</h1>
	)
}

function WeatherIcon({ code, isDay }: { code: number; isDay: boolean }) {
	const p = { size: 18, 'aria-hidden': true } as const
	if (code === 0) return isDay ? <Sun {...p} /> : <Moon {...p} />
	if (code <= 2) return <CloudSun {...p} />
	if (code === 3) return <Cloud {...p} />
	if (code <= 48) return <CloudFog {...p} />
	if (code <= 57) return <CloudDrizzle {...p} />
	if (code <= 67 || (code >= 80 && code <= 82)) return <CloudRain {...p} />
	if (code <= 86) return <CloudSnow {...p} />
	return <CloudLightning {...p} />
}

function Weather({ now }: { now: number }) {
	const w = useStore((s) => s.weather)
	if (!w.place) return null
	if (!w.data) {
		return (
			<span className="dateline-item dateline-muted">
				{w.error ? (
					<button type="button" className="dateline-btn" onClick={() => refreshWeather(true)}>
						Weather unavailable · Retry
					</button>
				) : (
					<span aria-live="polite">Loading weather…</span>
				)}
			</span>
		)
	}
	const d = w.data
	const age = w.fetchedAt ? now - w.fetchedAt : 0
	const stale = age > 60 * 60_000
	const desc = `${weatherLabel(d.code)}, ${d.temp}°${d.unit.toUpperCase()} in ${w.place.name}. High ${d.max}°, low ${d.min}°. Updated ${w.fetchedAt ? formatRelative(w.fetchedAt, now) : ''}.`
	return (
		<span className="dateline-item" title={desc}>
			<WeatherIcon code={d.code} isDay={d.isDay} />
			<span className="sr-only">{desc}</span>
			<span aria-hidden="true">
				{d.temp}° {w.place.name}
			</span>
			{stale && (
				<button
					type="button"
					className="dateline-btn dateline-muted"
					onClick={() => refreshWeather(true)}
					title="Refresh weather"
				>
					{w.error === 'Offline' ? 'offline, ' : ''}
					updated {formatRelative(w.fetchedAt!, now)}
				</button>
			)}
		</span>
	)
}

function NextEvent({ now, cycle }: { now: number; cycle: HourCycle }) {
	const events = useStore((s) => s.calendar.events)
	const current = events.find((e) => !e.allDay && e.start <= now && e.end > now)
	if (current) {
		return (
			<span className="dateline-item">
				<span className="now-dot" aria-hidden="true" />
				<span>
					{current.title} · until {formatTime(current.end, cycle)}
				</span>
			</span>
		)
	}
	const next = events.find((e) => !e.allDay && e.start > now && dayDiff(e.start, now) <= 1)
	if (!next) return null
	const soon = next.start - now < 3 * 3600_000
	return (
		<span className="dateline-item">
			<span>
				{next.title} · {dayDiff(next.start, now) === 1 ? 'tomorrow ' : ''}
				{formatTime(next.start, cycle)}
				{soon && <span className="dateline-muted"> ({formatRelative(next.start, now)})</span>}
			</span>
		</span>
	)
}

export function Hero({
	now,
	children,
	showSetupHint,
}: {
	now: number
	children: ReactNode
	showSetupHint: boolean
}) {
	const settings = useStore((s) => s.settings)
	const hasCalendar = useStore((s) => !!s.calendar.url)
	const hasWeather = useStore((s) => !!s.weather.place)
	const date = new Intl.DateTimeFormat(undefined, {
		weekday: 'long',
		month: 'long',
		day: 'numeric',
	}).format(now)
	return (
		<section className="hero" aria-label="Now">
			<Clock cycle={settings.hourCycle} seconds={settings.showSeconds} />
			<p className="dateline">
				<span className="dateline-item">{date}</span>
				<Weather now={now} />
				<NextEvent now={now} cycle={settings.hourCycle} />
				{showSetupHint && !hasCalendar && !hasWeather && (
					<span className="dateline-item">
						<button
							type="button"
							className="dateline-btn dateline-muted"
							onClick={() => emit({ type: 'settings', section: 'calendar' })}
						>
							Add weather or your calendar
						</button>
					</span>
				)}
			</p>
			{children}
		</section>
	)
}
