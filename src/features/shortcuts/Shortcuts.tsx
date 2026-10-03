import { Plus, Settings2, Sparkles, X } from 'lucide-react'
import { type DragEvent, type KeyboardEvent, useEffect, useRef, useState } from 'react'
import { browser } from 'wxt/browser'
import { on } from '@/lib/bus'
import { faviconUrl, hasPermission, requestPermission } from '@/lib/chrome'
import { hostOf, toUrl } from '@/lib/url'
import { addShortcut, moveItem, removeShortcut } from '@/store/actions'
import { update, useStore } from '@/store/store'
import type { Shortcut } from '@/store/types'
import { SiteIcon } from '@/ui/controls'
import { toast } from '@/ui/toast'
import { ShortcutDialog } from './ShortcutDialog'

interface Suggestion {
	url: string
	title: string
}

export function Shortcuts() {
	const shortcuts = useStore((s) => s.shortcuts)
	const [dialog, setDialog] = useState<{ id?: string; url?: string; title?: string } | null>(null)
	const [suggestions, setSuggestions] = useState<Suggestion[] | null>(null)
	const [activeId, setActiveId] = useState<string | null>(null)
	const [drag, setDrag] = useState<{ id: string; over?: string } | null>(null)
	const gridRef = useRef<HTMLUListElement>(null)

	async function suggest() {
		const granted =
			(await hasPermission({ permissions: ['topSites'] })) ||
			(await requestPermission({ permissions: ['topSites'] }))
		if (!granted) {
			toast(
				'No problem — suggestions need access to your most-visited sites list. You can add sites by hand instead.',
			)
			return
		}
		const top = await browser.topSites.get()
		const pinned = new Set(shortcuts.map((s) => s.url))
		const list = top
			.map((t) => ({ url: toUrl(t.url) ?? '', title: t.title || hostOf(t.url) }))
			.filter((t) => t.url && !pinned.has(t.url))
			.slice(0, 8)
		setSuggestions(list)
		if (!list.length) toast('Chrome doesn’t have any most-visited sites to suggest yet.')
	}

	const suggestRef = useRef(suggest)
	suggestRef.current = suggest

	useEffect(
		() =>
			on((e) => {
				if (e.type !== 'shortcut') return
				if (e.url === 'suggest') suggestRef.current()
				else setDialog({ id: e.id, url: e.url, title: e.title })
			}),
		[],
	)

	const rovingId =
		activeId && shortcuts.some((s) => s.id === activeId) ? activeId : shortcuts[0]?.id

	function focusTile(id: string | undefined) {
		if (!id) return
		setActiveId(id)
		requestAnimationFrame(() =>
			gridRef.current?.querySelector<HTMLElement>(`[data-sc="${id}"] a`)?.focus(),
		)
	}

	function columns(): number {
		const tiles = gridRef.current?.querySelectorAll<HTMLElement>('.tile-wrap')
		if (!tiles?.length) return 1
		const top = tiles[0]!.offsetTop
		let n = 0
		for (const t of tiles) if (t.offsetTop === top) n++
		return Math.max(1, n)
	}

	function onKey(e: KeyboardEvent, s: Shortcut, i: number) {
		const cols = columns()
		const step: Record<string, number> = {
			ArrowLeft: -1,
			ArrowRight: 1,
			ArrowUp: -cols,
			ArrowDown: cols,
		}
		if (e.key in step) {
			e.preventDefault()
			const j = Math.max(0, Math.min(shortcuts.length - 1, i + step[e.key]!))
			if (e.altKey) {
				update('shortcuts', (l) => moveItem(l, s.id, j))
				focusTile(s.id)
			} else focusTile(shortcuts[j]?.id)
		} else if (e.key === 'e' || e.key === 'F2') {
			e.preventDefault()
			setDialog({ id: s.id })
		} else if (e.key === 'Delete' || e.key === 'Backspace') {
			e.preventDefault()
			removeShortcut(s.id)
			focusTile(shortcuts[i + 1]?.id ?? shortcuts[i - 1]?.id)
		} else if (e.key === 'Home') {
			e.preventDefault()
			focusTile(shortcuts[0]?.id)
		} else if (e.key === 'End') {
			e.preventDefault()
			focusTile(shortcuts[shortcuts.length - 1]?.id)
		}
	}

	function onDrop(e: DragEvent, target: Shortcut) {
		e.preventDefault()
		if (!drag || drag.id === target.id) return setDrag(null)
		const to = shortcuts.findIndex((s) => s.id === target.id)
		update('shortcuts', (l) => moveItem(l, drag.id, to))
		setDrag(null)
	}

	return (
		<section aria-labelledby="sc-title">
			<div className="section-head">
				<h2 className="section-title" id="sc-title">
					Shortcuts
				</h2>
				<div className="section-actions">
					<button
						type="button"
						className="icon-btn"
						aria-label="Suggest from most-visited sites"
						title="Suggest from most-visited sites"
						onClick={suggest}
					>
						<Sparkles size={16} />
					</button>
					<button
						type="button"
						className="icon-btn"
						aria-label="Add a shortcut"
						title="Add a shortcut"
						onClick={() => setDialog({})}
					>
						<Plus size={16} />
					</button>
				</div>
			</div>

			{shortcuts.length === 0 && !suggestions && (
				<div className="empty">
					<p>
						Pin the sites you open every day. Open them with a click, or press 1–9 on this page.
					</p>
					<div className="empty-actions">
						<button type="button" className="btn btn--sm" onClick={suggest}>
							<Sparkles size={14} aria-hidden="true" /> Suggest from my most-visited
						</button>
						<button type="button" className="btn btn--sm btn--ghost" onClick={() => setDialog({})}>
							<Plus size={14} aria-hidden="true" /> Add a site
						</button>
					</div>
				</div>
			)}

			{shortcuts.length > 0 && (
				<ul className="tiles" ref={gridRef} aria-label="Pinned sites" aria-describedby="sc-keys">
					{shortcuts.map((s, i) => (
						<li
							key={s.id}
							className="tile-wrap"
							data-sc={s.id}
							data-dragging={drag?.id === s.id}
							data-drop={drag?.over === s.id}
							draggable
							onDragStart={(e) => {
								e.dataTransfer.effectAllowed = 'move'
								setDrag({ id: s.id })
							}}
							onDragOver={(e) => {
								if (!drag || drag.id === s.id) return
								e.preventDefault()
								if (drag.over !== s.id) setDrag({ ...drag, over: s.id })
							}}
							onDrop={(e) => onDrop(e, s)}
							onDragEnd={() => setDrag(null)}
						>
							<a
								className="tile"
								href={s.url}
								tabIndex={s.id === rovingId ? 0 : -1}
								title={`${s.title} — ${hostOf(s.url)}${i < 9 ? ` (press ${i + 1})` : ''}`}
								onFocus={() => setActiveId(s.id)}
								onKeyDown={(e) => onKey(e, s, i)}
								draggable={false}
							>
								<span className="tile-icon">
									<SiteIcon s={s} />
								</span>
								<span className="tile-label">{s.title}</span>
							</a>
							<button
								type="button"
								className="icon-btn tile-edit"
								tabIndex={-1}
								aria-label={`Edit ${s.title}`}
								onClick={() => setDialog({ id: s.id })}
							>
								<Settings2 size={13} />
							</button>
						</li>
					))}
					<li className="tile-wrap">
						<button type="button" className="tile tile--add" onClick={() => setDialog({})}>
							<span className="tile-icon">
								<Plus size={18} aria-hidden="true" />
							</span>
							<span className="tile-label">Add</span>
						</button>
					</li>
				</ul>
			)}
			<span id="sc-keys" hidden>
				Arrow keys to move between sites, E to edit, Delete to unpin, Alt plus arrow keys to
				reorder.
			</span>

			{suggestions && suggestions.length > 0 && (
				<div className="suggest">
					<div className="suggest-head">
						<span>From your most-visited sites</span>
						<button
							type="button"
							className="icon-btn"
							style={{ marginLeft: 'auto' }}
							aria-label="Hide suggestions"
							onClick={() => setSuggestions(null)}
						>
							<X size={14} />
						</button>
					</div>
					<div className="suggest-list">
						{suggestions.map((sg) => (
							<button
								type="button"
								key={sg.url}
								className="suggest-item"
								aria-label={`Pin ${sg.title}`}
								onClick={() => {
									if (addShortcut(sg.url, sg.title)) {
										setSuggestions((l) => {
											const next = (l ?? []).filter((x) => x.url !== sg.url)
											return next.length ? next : null
										})
									}
								}}
							>
								<img src={faviconUrl(sg.url, 32)} alt="" />
								<span>{sg.title}</span>
								<Plus size={13} aria-hidden="true" />
							</button>
						))}
					</div>
				</div>
			)}

			<ShortcutDialog state={dialog} onClose={() => setDialog(null)} />
		</section>
	)
}
