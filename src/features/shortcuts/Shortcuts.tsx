import { type DragEvent, type KeyboardEvent, useEffect, useMemo, useRef, useState } from 'react'
import { importTopSites, openAll } from '@/lib/browser'
import { on } from '@/lib/bus'
import { openUrl } from '@/lib/chrome'
import { hostOf } from '@/lib/url'
import {
	addGroup,
	addShortcut,
	editShortcut,
	hideSuggestion,
	moveItem,
	removeGroup,
	removeShortcut,
	renameGroup,
} from '@/store/actions'
import { getState, update, useStore } from '@/store/store'
import type { Shortcut } from '@/store/types'
import { Favicon } from '@/ui/controls'
import { Glyph } from '@/ui/Glyph'
import { type MenuItem, openMenu } from '@/ui/Menu'
import { toast } from '@/ui/toast'
import { useLive } from '../snapshot'
import { ShortcutEditor } from './ShortcutEditor'

export function Shortcuts() {
	const shortcuts = useStore((s) => s.shortcuts)
	const groups = useStore((s) => s.groups)
	const group = useStore((s) => s.ui.group)
	const suggest = useStore((s) => s.settings.suggestShortcuts)
	const hidden = useStore((s) => s.hidden)
	const { snap, access } = useLive()
	const [editor, setEditor] = useState<{ id?: string; url?: string; title?: string } | null>(null)
	const [activeId, setActiveId] = useState<string | null>(null)
	const [drag, setDrag] = useState<{ id: string; over?: string; group?: string } | null>(null)
	const [naming, setNaming] = useState<string | null>(null)
	const gridRef = useRef<HTMLUListElement>(null)

	useEffect(
		() =>
			on((e) => {
				if (e.type === 'shortcut') setEditor({ id: e.id, url: e.url, title: e.title })
			}),
		[],
	)

	const groupExists = group === 'all' || groups.some((g) => g.id === group)
	const current = groupExists ? group : 'all'
	const visible = useMemo(
		() => (current === 'all' ? shortcuts : shortcuts.filter((s) => s.group === current)),
		[shortcuts, current],
	)
	const pinned = new Set(
		shortcuts.map((s) => hostOf(s.url) + new URL(s.url).pathname.replace(/\/$/, '')),
	)
	const suggestions =
		suggest && visible.length < 16
			? (snap?.home ?? [])
					.filter((d) => d.pinned === undefined && !pinned.has(d.key) && !hidden.includes(d.key))
					.slice(0, Math.min(6, 16 - visible.length))
			: []
	const rovingId = activeId && visible.some((s) => s.id === activeId) ? activeId : visible[0]?.id

	function focusTile(id: string | undefined) {
		if (!id) return
		setActiveId(id)
		requestAnimationFrame(() =>
			gridRef.current?.querySelector<HTMLElement>(`[data-sc="${id}"] .key`)?.focus(),
		)
	}

	function columns(): number {
		const tiles = gridRef.current?.querySelectorAll<HTMLElement>('.keycap')
		if (!tiles?.length) return 1
		const top = tiles[0].offsetTop
		let n = 0
		for (const t of tiles) if (t.offsetTop === top) n++
		return Math.max(1, n)
	}

	function reorder(id: string, toVisibleIndex: number) {
		const target = visible[Math.max(0, Math.min(visible.length - 1, toVisibleIndex))]
		if (!target) return
		update('shortcuts', (l) =>
			moveItem(
				l,
				id,
				l.findIndex((x) => x.id === target.id),
			),
		)
	}

	function menuFor(s: Shortcut): MenuItem[] {
		return [
			{ label: 'Open', glyph: 'go', hint: '↵', run: () => openUrl(s.url) },
			{ label: 'Open in new tab', glyph: 'tabs', run: () => openUrl(s.url, true) },
			{ label: 'Edit', glyph: 'edit', hint: 'E', run: () => setEditor({ id: s.id }) },
			...groups
				.filter((g) => g.id !== s.group)
				.map<MenuItem>((g) => ({
					label: `Move to ${g.name}`,
					glyph: 'folder',
					run: () => editShortcut(s.id, { group: g.id }),
				})),
			...(s.group
				? [
						{
							label: 'Remove from group',
							glyph: 'folder' as const,
							run: () => editShortcut(s.id, { group: undefined }),
						},
					]
				: []),
			{
				label: 'Copy link',
				glyph: 'link',
				run: () => navigator.clipboard.writeText(s.url).then(() => toast('Link copied')),
			},
			{
				label: 'Remove',
				glyph: 'trash',
				hint: 'Del',
				danger: true,
				run: () => removeShortcut(s.id),
			},
		]
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
			const j = Math.max(0, Math.min(visible.length - 1, i + step[e.key]!))
			if (e.altKey) {
				reorder(s.id, j)
				focusTile(s.id)
			} else focusTile(visible[j]?.id)
		} else if (e.key === 'e' || e.key === 'F2') {
			e.preventDefault()
			setEditor({ id: s.id })
		} else if (e.key === 'Delete' || e.key === 'Backspace') {
			e.preventDefault()
			removeShortcut(s.id)
			focusTile(visible[i + 1]?.id ?? visible[i - 1]?.id)
		} else if (e.key === 'ContextMenu' || (e.shiftKey && e.key === 'F10')) {
			e.preventDefault()
			openMenu(e.currentTarget as HTMLElement, menuFor(s), `Actions for ${s.title}`)
		}
	}

	function onDrop(e: DragEvent, target: Shortcut) {
		e.preventDefault()
		if (!drag || drag.id === target.id) return setDrag(null)
		reorder(
			drag.id,
			visible.findIndex((x) => x.id === target.id),
		)
		setDrag(null)
	}

	async function importMostVisited() {
		const top = await importTopSites()
		if (!top.length) {
			toast(
				'Nothing to import. Chrome hasn’t recorded any most-visited sites yet, or access wasn’t allowed.',
			)
			return
		}
		let n = 0
		for (const t of top)
			if (
				!getState().shortcuts.some((s) => s.url === t.url) &&
				addShortcut(t.url, t.title, current)
			)
				n++
		toast(
			n ? `Added ${n} ${n === 1 ? 'site' : 'sites'} from Chrome` : 'Those sites are already here',
			{ tone: n ? 'success' : 'neutral' },
		)
	}

	const groupMenu = (id: string, name: string): MenuItem[] => [
		{
			label: 'Open all as a tab group',
			glyph: 'tabs',
			run: () =>
				openAll(
					shortcuts.filter((s) => s.group === id).map((s) => s.url),
					name,
				),
		},
		{ label: 'Rename', glyph: 'edit', run: () => setNaming(id) },
		{ label: 'Delete group', glyph: 'trash', danger: true, run: () => removeGroup(id) },
	]

	const tabIds = ['all', ...groups.map((g) => g.id)]

	return (
		<section className="shortcuts" aria-labelledby="sc-title">
			<h2 className="sr-only" id="sc-title">
				Shortcuts
			</h2>
			{(groups.length > 0 || shortcuts.length > 0) && (
				<div className="groups" role="tablist" aria-label="Shortcut groups">
					{[{ id: 'all', name: 'All' }, ...groups].map((g) =>
						naming === g.id ? (
							<input
								key={g.id}
								className="group-input"
								aria-label="Group name"
								defaultValue={g.id === 'new' ? '' : g.name}
								autoFocus
								onBlur={(e) => {
									if (g.id !== 'all') renameGroup(g.id, e.target.value)
									setNaming(null)
								}}
								onKeyDown={(e) => {
									if (e.key === 'Enter') e.currentTarget.blur()
									if (e.key === 'Escape') setNaming(null)
								}}
							/>
						) : (
							<button
								key={g.id}
								type="button"
								role="tab"
								aria-selected={current === g.id}
								tabIndex={
									current === g.id || (g.id === 'all' && !tabIds.includes(current)) ? 0 : -1
								}
								className="group-tab"
								data-drop={drag?.group === g.id}
								onClick={() => update('ui', (u) => ({ ...u, group: g.id }))}
								onKeyDown={(e) => {
									const i = tabIds.indexOf(g.id)
									const n = tabIds.length
									const next = {
										ArrowRight: tabIds[(i + 1) % n],
										ArrowLeft: tabIds[(i - 1 + n) % n],
										Home: tabIds[0],
										End: tabIds[n - 1],
									}[e.key]
									if (!next) return
									e.preventDefault()
									const list = e.currentTarget.parentElement
									update('ui', (u) => ({ ...u, group: next }))
									requestAnimationFrame(() =>
										list?.querySelector<HTMLElement>('[role="tab"][aria-selected="true"]')?.focus(),
									)
								}}
								onContextMenu={(e) => {
									if (g.id === 'all') return
									e.preventDefault()
									openMenu(e, groupMenu(g.id, g.name), `Group ${g.name}`)
								}}
								onDoubleClick={() => g.id !== 'all' && setNaming(g.id)}
								onDragOver={(e) => {
									if (!drag) return
									e.preventDefault()
									if (drag.group !== g.id) setDrag({ ...drag, group: g.id })
								}}
								onDragLeave={() => drag && setDrag({ ...drag, group: undefined })}
								onDrop={(e) => {
									e.preventDefault()
									if (!drag) return
									editShortcut(drag.id, { group: g.id === 'all' ? undefined : g.id })
									toast(g.id === 'all' ? 'Removed from group' : `Moved to ${g.name}`)
									setDrag(null)
								}}
							>
								{g.name}
								{g.id !== 'all' && (
									<span className="group-count">
										{shortcuts.filter((s) => s.group === g.id).length}
									</span>
								)}
							</button>
						),
					)}
					<button
						type="button"
						className="group-tab group-tab--add"
						aria-label="New group"
						title="New group"
						onClick={() => {
							const g = addGroup(`Group ${groups.length + 1}`)
							if (g) {
								update('ui', (u) => ({ ...u, group: g.id }))
								setNaming(g.id)
							}
						}}
					>
						<Glyph name="plus" size={14} />
					</button>
					{current !== 'all' && (
						<button
							type="button"
							className="group-tab group-tab--more"
							aria-label={`More for ${groups.find((g) => g.id === current)?.name}`}
							onClick={(e) => {
								const g = groups.find((x) => x.id === current)
								if (g) openMenu(e.currentTarget, groupMenu(g.id, g.name), `Group ${g.name}`)
							}}
						>
							<Glyph name="more" size={14} />
						</button>
					)}
				</div>
			)}

			{visible.length === 0 && suggestions.length === 0 ? (
				<div className="starter">
					<p className="starter-lede">
						{current === 'all'
							? 'Pin the sites you open every day. Alt + 1–9 opens them from anywhere on this page.'
							: 'This group is empty. Drag shortcuts onto its name, or add a site.'}
					</p>
					<div className="starter-actions">
						<button type="button" className="btn" onClick={() => setEditor({})}>
							<Glyph name="plus" size={14} /> Add a site
						</button>
						<button type="button" className="btn btn--quiet" onClick={importMostVisited}>
							Bring in Chrome’s most visited
						</button>
					</div>
				</div>
			) : (
				<ul
					className="keys-grid"
					ref={gridRef}
					aria-label={
						current === 'all'
							? 'Shortcuts'
							: `Shortcuts in ${groups.find((g) => g.id === current)?.name}`
					}
				>
					{visible.map((s, i) => (
						<li
							key={s.id}
							className="keycap"
							data-sc={s.id}
							data-dragging={drag?.id === s.id}
							data-over={drag?.over === s.id}
							draggable
							onDragStart={(e) => {
								e.dataTransfer.effectAllowed = 'move'
								e.dataTransfer.setData('text/uri-list', s.url)
								setDrag({ id: s.id })
							}}
							onDragOver={(e) => {
								if (!drag || drag.id === s.id) return
								e.preventDefault()
								if (drag.over !== s.id) setDrag({ ...drag, over: s.id, group: undefined })
							}}
							onDrop={(e) => onDrop(e, s)}
							onDragEnd={() => setDrag(null)}
						>
							<a
								className="key"
								href={s.url}
								tabIndex={s.id === rovingId ? 0 : -1}
								title={`${s.title} — ${hostOf(s.url)}`}
								aria-keyshortcuts={i < 9 ? String(i + 1) : undefined}
								aria-describedby="sc-help"
								onFocus={() => setActiveId(s.id)}
								onKeyDown={(e) => onKey(e, s, i)}
								onContextMenu={(e) => {
									e.preventDefault()
									openMenu(e, menuFor(s), `Actions for ${s.title}`)
								}}
								draggable={false}
							>
								<span className="key-face">
									<Favicon url={s.url} label={s.title} icon={s.icon} />
									{i < 9 && (
										<span className="key-num" aria-hidden="true">
											{i + 1}
										</span>
									)}
								</span>
								<span className="key-label">{s.title}</span>
							</a>
							<button
								type="button"
								className="key-more"
								tabIndex={-1}
								aria-label={`Actions for ${s.title}`}
								onClick={(e) => openMenu(e.currentTarget, menuFor(s), `Actions for ${s.title}`)}
							>
								<Glyph name="more" size={14} />
							</button>
						</li>
					))}
					{suggestions.map((d) => (
						<li key={d.key} className="keycap keycap--suggest">
							<button
								type="button"
								className="key"
								title={`Add ${d.title} to shortcuts`}
								aria-label={`Add ${d.title} to shortcuts. Suggested from your history`}
								onClick={() => {
									if (addShortcut(d.url, d.title, current))
										toast(`Added ${d.title}`, { tone: 'success' })
								}}
								onKeyDown={(e) => {
									if (e.key !== 'Delete' && e.key !== 'Backspace') return
									e.preventDefault()
									hideSuggestion(d.key, d.title)
								}}
								onContextMenu={(e) => {
									e.preventDefault()
									openMenu(
										e,
										[
											{
												label: 'Add to shortcuts',
												glyph: 'plus',
												run: () => {
													if (addShortcut(d.url, d.title, current))
														toast(`Added ${d.title}`, { tone: 'success' })
												},
											},
											{ label: 'Open', glyph: 'go', run: () => openUrl(d.url, false) },
											{
												label: 'Don’t suggest this',
												glyph: 'close',
												hint: 'Del',
												run: () => hideSuggestion(d.key, d.title),
											},
										],
										`Suggestion ${d.title}`,
									)
								}}
							>
								<span className="key-face">
									<Favicon url={d.url} label={d.title} />
									<span className="key-plus" aria-hidden="true">
										<Glyph name="plus" size={10} />
									</span>
								</span>
								<span className="key-label">{d.title}</span>
							</button>
						</li>
					))}
					<li className="keycap keycap--add">
						<button
							type="button"
							className="key"
							onClick={() => setEditor({})}
							aria-label="Add a shortcut"
						>
							<span className="key-face">
								<Glyph name="plus" size={18} />
							</span>
							<span className="key-label">Add</span>
						</button>
					</li>
				</ul>
			)}
			{suggestions.length > 0 && visible.length > 0 && (
				<p className="hint-line">
					Faded keys are suggestions from your history. Click to keep one, right-click to dismiss
					it.{' '}
					<button
						type="button"
						className="text-btn"
						onClick={() => update('settings', (s) => ({ ...s, suggestShortcuts: false }))}
					>
						Stop suggesting
					</button>
				</p>
			)}
			{!access?.history && visible.length > 0 && visible.length < 4 && (
				<p className="hint-line">
					<button type="button" className="text-btn" onClick={importMostVisited}>
						Bring in Chrome’s most visited
					</button>
				</p>
			)}
			<span id="sc-help" hidden>
				Arrow keys move, E edits, Delete removes, Alt plus arrows reorders, menu key shows actions.
			</span>
			<ShortcutEditor state={editor} group={current} onClose={() => setEditor(null)} />
		</section>
	)
}
