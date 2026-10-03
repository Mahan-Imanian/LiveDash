import { Settings as Gear, Keyboard, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Focus, finishIfDue } from '@/features/focus/Focus'
import { Hero } from '@/features/Hero'
import { Notes } from '@/features/notes/Notes'
import { MOD, Palette } from '@/features/palette/Palette'
import { refreshCalendar, refreshWeather } from '@/features/services'
import { SettingsDialog } from '@/features/settings/Settings'
import { Shortcuts } from '@/features/shortcuts/Shortcuts'
import { Today } from '@/features/tasks/Today'
import { emit, on } from '@/lib/bus'
import { pause, start } from '@/store/focus-logic'
import { getState, update, useStore } from '@/store/store'
import { PanelBoundary } from '@/ui/controls'
import { Dialog } from '@/ui/Dialog'
import { Mark } from '@/ui/Mark'
import { ToastHost } from '@/ui/ToastHost'
import { runUndo } from '@/ui/toast'

function typingTarget(el: EventTarget | null): boolean {
	const e = el as HTMLElement | null
	if (!e) return false
	return e.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(e.tagName)
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
			if (!document.hidden) {
				tick()
				refreshCalendar()
				refreshWeather()
			}
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

export function Home() {
	const now = useMinute()
	const panels = useStore((s) => s.settings.panels)
	const welcomed = useStore((s) => s.ui.welcomed)
	const [settings, setSettings] = useState<{ open: boolean; section?: string }>({ open: false })
	const [help, setHelp] = useState(false)

	useEffect(() => {
		finishIfDue()
		refreshCalendar()
		refreshWeather()
		const hash = new URLSearchParams(location.hash.slice(1))
		const note = hash.get('note')
		if (note) emit({ type: 'note', id: note })
		if (hash.has('capture')) emit({ type: 'palette' })
		if (location.hash) history.replaceState(null, '', location.pathname)
	}, [])

	useEffect(
		() =>
			on((e) => {
				if (e.type === 'settings') setSettings({ open: true, section: e.section })
				if (e.type === 'help') setHelp(true)
			}),
		[],
	)

	useEffect(() => {
		function onKey(e: KeyboardEvent) {
			if (e.defaultPrevented) return
			const mod = e.ctrlKey || e.metaKey
			if (mod && e.key.toLowerCase() === 'k') {
				e.preventDefault()
				emit({ type: 'palette' })
				return
			}
			if (mod && e.key.toLowerCase() === 'z' && !e.shiftKey && !typingTarget(e.target)) {
				if (runUndo()) e.preventDefault()
				return
			}
			if (mod || e.altKey || typingTarget(e.target) || document.querySelector('dialog[open]'))
				return
			const k = e.key
			if (k === '/') {
				e.preventDefault()
				emit({ type: 'palette' })
			} else if (k === '?') {
				e.preventDefault()
				setHelp(true)
			} else if (k === ',') {
				e.preventDefault()
				setSettings({ open: true })
			} else if ((k === 'n' || k === 'N') && getState().settings.panels.notes) {
				e.preventDefault()
				emit({ type: 'note' })
			} else if ((k === 'f' || k === 'F') && getState().settings.panels.focus) {
				e.preventDefault()
				update('focus', (f) => (f.status === 'running' ? pause(f) : start(f)))
			} else if (
				/^[1-9]$/.test(k) &&
				!(e.target as HTMLElement)?.closest?.('[role="radiogroup"]')
			) {
				const s = getState().shortcuts[Number(k) - 1]
				if (s) {
					e.preventDefault()
					location.assign(s.url)
				}
			}
		}
		window.addEventListener('keydown', onKey)
		return () => window.removeEventListener('keydown', onKey)
	}, [])

	const side = panels.shortcuts || panels.focus || panels.notes

	return (
		<div className="app">
			<header className="topbar">
				<span className="brand">
					<Mark />
					LiveDash
				</span>
				<nav className="topbar-actions" aria-label="App">
					<button
						type="button"
						className="icon-btn icon-btn--md"
						aria-label="Keyboard shortcuts"
						title="Keyboard shortcuts (?)"
						onClick={() => setHelp(true)}
					>
						<Keyboard size={18} />
					</button>
					<button
						type="button"
						className="icon-btn icon-btn--md"
						aria-label="Settings"
						title="Settings (,)"
						onClick={() => setSettings({ open: true })}
					>
						<Gear size={18} />
					</button>
				</nav>
			</header>

			<main className="home">
				<Hero now={now} showSetupHint={!welcomed}>
					<Palette />
					{!welcomed && (
						<div className="welcome" role="note">
							<span>
								Type anything above and press Enter. Dates like “Friday 5pm” are understood.
								Everything stays on this device. Press <kbd>Alt</kbd>
								<kbd>Shift</kbd>
								<kbd>L</kbd> on any page to capture without leaving it.
							</span>
							<button
								type="button"
								className="icon-btn"
								aria-label="Dismiss tip"
								onClick={() => update('ui', (u) => ({ ...u, welcomed: true }))}
							>
								<X size={14} />
							</button>
						</div>
					)}
				</Hero>

				<div
					className="columns"
					style={side ? undefined : { gridTemplateColumns: 'minmax(0, 1fr)', maxWidth: 720 }}
				>
					<div className="column">
						<PanelBoundary name="Tasks">
							<Today now={now} />
						</PanelBoundary>
					</div>
					{side && (
						<div className="column">
							{panels.shortcuts && (
								<PanelBoundary name="Shortcuts">
									<Shortcuts />
								</PanelBoundary>
							)}
							{panels.focus && (
								<PanelBoundary name="Focus timer">
									<Focus />
								</PanelBoundary>
							)}
							{panels.notes && (
								<PanelBoundary name="Notes">
									<Notes />
								</PanelBoundary>
							)}
						</div>
					)}
				</div>
			</main>

			<ToastHost />
			<SettingsDialog
				open={settings.open}
				section={settings.section}
				onClose={() => setSettings({ open: false })}
			/>
			<Dialog open={help} onClose={() => setHelp(false)} title="Keyboard shortcuts">
				<div className="keys">
					<KeyGroup
						title="Anywhere on this page"
						rows={[
							['Command bar', [MOD, 'K'], ['/']],
							['New note', ['N']],
							['Start or pause focus', ['F']],
							['Open shortcut 1–9', ['1…9']],
							['Undo', [MOD, 'Z']],
							['Settings', [',']],
							['This list', ['?']],
						]}
					/>
					<KeyGroup
						title="Command bar"
						rows={[
							['Run the highlighted action', ['↵']],
							['Save as a note instead', ['⇧', '↵']],
							['Search the web instead', [MOD, '↵']],
							['Open in a background tab', ['Alt', '↵']],
						]}
					/>
					<KeyGroup
						title="Tasks and shortcuts"
						rows={[
							['Move between items', ['↑', '↓']],
							['Complete task', ['Space']],
							['Edit', ['↵'], ['E']],
							['Delete or unpin', ['Del']],
							['Reorder', ['Alt', '↑'], ['Alt', '↓']],
						]}
					/>
					<KeyGroup title="Any web page" rows={[['Quick capture', ['Alt', 'Shift', 'L']]]} />
				</div>
			</Dialog>
		</div>
	)
}

function KeyGroup({ title, rows }: { title: string; rows: [string, ...string[][]][] }) {
	return (
		<section>
			<h3>{title}</h3>
			<dl>
				{rows.map(([label, ...combos]) => (
					<div key={label} style={{ display: 'contents' }}>
						<dt>{label}</dt>
						<dd>
							{combos.map((c, i) => (
								<span
									key={c.join('+')}
									style={{ display: 'inline-flex', gap: 4, alignItems: 'center' }}
								>
									{i > 0 && <span className="setting-desc">or</span>}
									{c.map((k) => (
										<kbd key={k}>{k}</kbd>
									))}
								</span>
							))}
						</dd>
					</div>
				))}
			</dl>
		</section>
	)
}
