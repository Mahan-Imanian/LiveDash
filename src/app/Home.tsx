import { useEffect, useRef, useState } from 'react'
import { refreshCalendar } from '@/features/calendar'
import { Later } from '@/features/later/Later'
import { Launcher } from '@/features/launcher/Launcher'
import { Settings } from '@/features/Settings'
import { Top } from '@/features/Top'
import { emit, on, type View } from '@/lib/bus'
import { finishIfDue } from '@/store/focus-run'
import { Boundary } from '@/ui/controls'
import { ToastHost } from '@/ui/ToastHost'
import { runUndo } from '@/ui/toast'

const KEYS: [string, string[][]][] = [
	['Go to the highlighted place', [['↵']]],
	['Open places 1–9', [['alt', '1…9']]],
	['Open in a new tab', [['alt', '↵']]],
	['Save what you typed for later', [['⇧', '↵']]],
	['Search the web for what you typed', [['ctrl', '↵']]],
	['More actions for the highlighted row', [['→']]],
	['Commands', [['>']]],
	['Back to the bar from anywhere', [['esc'], ['/']]],
	['Undo', [['ctrl', 'z']]],
	['In Later: mark done, edit, delete, reorder', [['space'], ['e'], ['del'], ['alt', '↑↓']]],
	['Quick capture on any web page', [['alt', 'shift', 'l']]],
]

function typing(el: EventTarget | null): boolean {
	const e = el as HTMLElement | null
	return !!e && (e.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(e.tagName))
}

export function Home() {
	const [view, setView] = useState<View>('go')
	const [note, setNote] = useState<string | undefined>()
	const viewRef = useRef(view)
	viewRef.current = view

	useEffect(() => {
		finishIfDue()
		refreshCalendar()
		const vis = () => !document.hidden && refreshCalendar()
		document.addEventListener('visibilitychange', vis)
		const off = on((e) => {
			if (e.type === 'view') {
				setNote(e.note)
				setView(e.view)
			}
		})
		function onKey(e: KeyboardEvent) {
			if (e.defaultPrevented) return
			const mod = e.ctrlKey || e.metaKey
			if (mod && e.key.toLowerCase() === 'z' && !e.shiftKey && !typing(e.target)) {
				if (runUndo()) e.preventDefault()
				return
			}
			if (mod && e.key.toLowerCase() === 'k') {
				e.preventDefault()
				setView('go')
				emit({ type: 'prompt' })
				return
			}
			if (e.key === 'Escape' && viewRef.current !== 'go') {
				e.preventDefault()
				setView('go')
				return
			}
			if (e.key === '/' && !typing(e.target)) {
				e.preventDefault()
				setView('go')
				emit({ type: 'prompt' })
			}
		}
		window.addEventListener('keydown', onKey)
		return () => {
			document.removeEventListener('visibilitychange', vis)
			window.removeEventListener('keydown', onKey)
			off()
		}
	}, [])

	return (
		<div className="canvas">
			<header className="top">
				<Top
					view={view}
					onView={(v) => {
						setNote(undefined)
						setView(v)
					}}
				/>
			</header>
			<main className="stage" key={view}>
				<Boundary name={view === 'go' ? 'The launcher' : view === 'later' ? 'Later' : 'This page'}>
					{view === 'go' && <Launcher />}
					{view === 'later' && <Later openNote={note} />}
					{view === 'settings' && <Settings />}
					{view === 'keys' && (
						<section className="block" aria-label="Keyboard shortcuts">
							<h1 className="block-label">keys</h1>
							<dl className="keys">
								{KEYS.map(([label, combos]) => (
									<div key={label} style={{ display: 'contents' }}>
										<dt>{label}</dt>
										<dd>
											{combos.map((c, i) => (
												<span
													key={c.join('+')}
													style={{ display: 'inline-flex', gap: 4, alignItems: 'center' }}
												>
													{i > 0 && <span className="setting-desc">/</span>}
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
					)}
				</Boundary>
			</main>
			<ToastHost />
		</div>
	)
}
