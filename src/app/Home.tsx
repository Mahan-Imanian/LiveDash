import { lazy, Suspense, useCallback, useEffect, useState } from 'react'
import { refreshCalendar } from '@/features/calendar'
import { Masthead } from '@/features/front/Masthead'
import { NotesCol } from '@/features/front/NotesCol'
import { PickUp } from '@/features/front/PickUp'
import { Today } from '@/features/front/Today'
import { Search } from '@/features/search/Search'
import { Shortcuts } from '@/features/shortcuts/Shortcuts'
import { refreshWeather } from '@/features/weather'
import { emit, on, type Panel } from '@/lib/bus'
import { openUrl } from '@/lib/chrome'
import { finishIfDue } from '@/store/focus-run'
import { getState, useStore } from '@/store/store'
import { Boundary } from '@/ui/controls'
import { Drawer } from '@/ui/Drawer'
import { MenuHost } from '@/ui/Menu'
import { ToastHost } from '@/ui/ToastHost'
import { runUndo } from '@/ui/toast'

const Bookmarks = lazy(() =>
	import('@/features/panels/Bookmarks').then((m) => ({ default: m.Bookmarks })),
)
const Tasks = lazy(() => import('@/features/panels/Tasks').then((m) => ({ default: m.Tasks })))
const Notes = lazy(() => import('@/features/panels/Notes').then((m) => ({ default: m.Notes })))
const Customize = lazy(() =>
	import('@/features/panels/Customize').then((m) => ({ default: m.Customize })),
)
const Settings = lazy(() =>
	import('@/features/panels/Settings').then((m) => ({ default: m.Settings })),
)
const FocusMode = lazy(() => import('@/features/Focus').then((m) => ({ default: m.FocusMode })))

const TITLES: Record<Panel, { title: string; kicker: string; width: 'narrow' | 'wide' }> = {
	bookmarks: { title: 'Bookmarks', kicker: 'Browse', width: 'narrow' },
	tasks: { title: 'Tasks', kicker: 'Later', width: 'narrow' },
	notes: { title: 'Notes', kicker: 'Later', width: 'wide' },
	customize: { title: 'Customize', kicker: 'This page', width: 'narrow' },
	settings: { title: 'Settings', kicker: 'LiveDash', width: 'wide' },
}

function typing(el: EventTarget | null): boolean {
	const e = el as HTMLElement | null
	return !!e && (e.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(e.tagName))
}

function useMinute(): number {
	const [now, setNow] = useState(Date.now())
	useEffect(() => {
		let t = 0
		const tick = () => {
			setNow(Date.now())
			t = window.setTimeout(tick, 60_000 - (Date.now() % 60_000) + 10)
		}
		const vis = () => {
			clearTimeout(t)
			if (!document.hidden) tick()
		}
		tick()
		document.addEventListener('visibilitychange', vis)
		return () => {
			clearTimeout(t)
			document.removeEventListener('visibilitychange', vis)
		}
	}, [])
	return now
}

function Backdrop() {
	const bg = useStore((s) => s.settings.background)
	const photo = useStore((s) => s.photo)
	const daily = useStore((s) => s.daily)
	const src = bg.kind === 'photo' ? photo : bg.kind === 'daily' ? daily?.src : null
	useEffect(() => {
		const root = document.documentElement
		if (src) root.dataset.photo = ''
		else delete root.dataset.photo
		if (bg.kind === 'tone') root.dataset.tone = bg.tone
		else delete root.dataset.tone
	}, [src, bg.kind, bg.tone])
	if (!src) return null
	return (
		<div className="backdrop" aria-hidden="true">
			<img src={src} alt="" />
			<span className="backdrop-dim" style={{ opacity: bg.dim / 100 }} />
		</div>
	)
}

function Credit() {
	const bg = useStore((s) => s.settings.background.kind)
	const daily = useStore((s) => s.daily)
	if (bg !== 'daily' || !daily) return null
	return (
		<p className="credit">
			<a href={daily.page} target="_blank" rel="noreferrer" title={daily.title}>
				{daily.title.length > 70 ? `${daily.title.slice(0, 70)}…` : daily.title}
			</a>{' '}
			· {daily.credit} · {daily.license}
		</p>
	)
}

export function Home() {
	const now = useMinute()
	const modules = useStore((s) => s.settings.modules)
	const density = useStore((s) => s.settings.density)
	const headline = useStore((s) => s.settings.headline)
	const [searching, setSearching] = useState(false)
	const [panel, setPanel] = useState<{ name: Panel; arg?: string } | null>(null)
	const [focusMode, setFocusMode] = useState(false)

	useEffect(() => {
		document.documentElement.dataset.density = density
		document.documentElement.dataset.headline = headline
	}, [density, headline])

	useEffect(() => {
		finishIfDue()
		refreshCalendar()
		refreshWeather()
		import('@/features/panels/Customize').then((m) => m.refreshDaily())
		const vis = () => {
			if (document.hidden) return
			refreshCalendar()
			refreshWeather()
		}
		document.addEventListener('visibilitychange', vis)
		const off = on((e) => {
			if (e.type === 'open') setPanel({ name: e.panel, arg: e.arg })
			if (e.type === 'focus-mode') setFocusMode(e.on)
		})
		function onKey(e: KeyboardEvent) {
			if (e.defaultPrevented || document.querySelector('dialog[open], .focus, .menu')) return
			const mod = e.ctrlKey || e.metaKey
			if (mod && e.key.toLowerCase() === 'z' && !e.shiftKey && !typing(e.target)) {
				if (runUndo()) e.preventDefault()
				return
			}
			if (e.altKey && !mod && /^Digit[1-9]$/.test(e.code)) {
				const s = getState()
				const list =
					s.ui.group === 'all' ? s.shortcuts : s.shortcuts.filter((x) => x.group === s.ui.group)
				const target = list[Number(e.code.slice(5)) - 1]
				if (target) {
					e.preventDefault()
					openUrl(target.url, e.shiftKey)
				}
				return
			}
			if (mod || e.altKey || typing(e.target)) return
			const map: Record<string, () => void> = {
				'/': () => emit({ type: 'prompt' }),
				'>': () => emit({ type: 'prompt', text: '>' }),
				f: () => setFocusMode(true),
				b: () => setPanel({ name: 'bookmarks' }),
				t: () => setPanel({ name: 'tasks' }),
				n: () => setPanel({ name: 'notes' }),
				c: () => setPanel({ name: 'customize' }),
				',': () => setPanel({ name: 'settings' }),
				'?': () => setPanel({ name: 'settings', arg: 'keys' }),
			}
			const fn = map[e.key.toLowerCase()] ?? map[e.key]
			if (fn) {
				e.preventDefault()
				fn()
			}
		}
		window.addEventListener('keydown', onKey)
		return () => {
			document.removeEventListener('visibilitychange', vis)
			window.removeEventListener('keydown', onKey)
			off()
		}
	}, [])

	const onActive = useCallback((a: boolean) => setSearching(a), [])
	const cols = [
		modules.pickup && 'pickup',
		modules.today && 'today',
		modules.notes && 'notes',
	].filter(Boolean) as string[]
	const meta = panel ? TITLES[panel.name] : null

	return (
		<div className="page">
			<Backdrop />
			<Masthead now={now} />
			<main className="front" data-searching={searching}>
				<section className="hero" aria-label="Search">
					<Search onActive={onActive} />
				</section>
				<div className="below" inert={searching}>
					{modules.shortcuts && (
						<Boundary name="Shortcuts">
							<Shortcuts />
						</Boundary>
					)}
					{cols.length > 0 && (
						<div className="columns" data-count={cols.length}>
							{modules.pickup && (
								<Boundary name="Pick up">
									<PickUp />
								</Boundary>
							)}
							{modules.today && (
								<Boundary name="Today">
									<Today now={now} />
								</Boundary>
							)}
							{modules.notes && (
								<Boundary name="Notes">
									<NotesCol now={now} />
								</Boundary>
							)}
						</div>
					)}
				</div>
			</main>
			<Credit />
			<Drawer
				open={!!panel}
				onClose={() => setPanel(null)}
				title={meta?.title ?? ''}
				kicker={meta?.kicker}
				width={meta?.width}
			>
				<Suspense fallback={<p className="fine">Loading…</p>}>
					<Boundary name={meta?.title ?? 'This panel'}>
						{panel?.name === 'bookmarks' && <Bookmarks />}
						{panel?.name === 'tasks' && <Tasks />}
						{panel?.name === 'notes' && <Notes openId={panel.arg} />}
						{panel?.name === 'customize' && <Customize focus={panel.arg} />}
						{panel?.name === 'settings' && <Settings section={panel.arg} />}
					</Boundary>
				</Suspense>
			</Drawer>
			{focusMode && (
				<Suspense fallback={null}>
					<FocusMode onClose={() => setFocusMode(false)} />
				</Suspense>
			)}
			<MenuHost />
			<ToastHost />
		</div>
	)
}
