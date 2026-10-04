import { useEffect, useRef, useState } from 'react'
import { browser } from 'wxt/browser'
import { hasPermission, openUrl, requestPermission } from '@/lib/chrome'
import { hostOf } from '@/lib/url'
import { addShortcut } from '@/store/actions'
import { Favicon } from '@/ui/controls'
import { Glyph } from '@/ui/Glyph'
import { openMenu } from '@/ui/Menu'
import { toast } from '@/ui/toast'

interface Node {
	id: string
	title: string
	url?: string
	children?: Node[]
}

export function Bookmarks() {
	const [allowed, setAllowed] = useState<boolean | null>(null)
	const [path, setPath] = useState<Node[]>([])
	const [items, setItems] = useState<Node[]>([])
	const [q, setQ] = useState('')
	const [found, setFound] = useState<Node[] | null>(null)
	const listRef = useRef<HTMLUListElement>(null)

	useEffect(() => {
		hasPermission({ permissions: ['bookmarks'] }).then(setAllowed)
	}, [])

	useEffect(() => {
		if (!allowed) return
		const folder = path[path.length - 1]
		const load = folder
			? browser.bookmarks.getChildren(folder.id)
			: browser.bookmarks.getTree().then((t) => {
					const [bar, ...rest] = (t[0]?.children ?? []) as Node[]
					return [...(bar?.children ?? []), ...rest.filter((f) => f.children?.length)]
				})
		load.then((list) => setItems(list as Node[])).catch(() => setItems([]))
	}, [allowed, path])

	useEffect(() => {
		if (!allowed || q.trim().length < 2) {
			setFound(null)
			return
		}
		const t = setTimeout(() => {
			browser.bookmarks
				.search(q)
				.then((r) => setFound((r as Node[]).slice(0, 60)))
				.catch(() => setFound([]))
		}, 80)
		return () => clearTimeout(t)
	}, [q, allowed])

	if (allowed === null) return null
	if (!allowed) {
		return (
			<div className="panel-empty">
				<p className="lede">
					Browse your Chrome bookmarks without leaving this page — folders, search, and one key to
					open.
				</p>
				<button
					type="button"
					className="btn"
					onClick={async () => setAllowed(await requestPermission({ permissions: ['bookmarks'] }))}
				>
					Allow access to bookmarks
				</button>
				<p className="fine">Read-only. Nothing leaves this browser.</p>
			</div>
		)
	}

	const shown = found ?? items

	function move(e: React.KeyboardEvent, i: number) {
		const els = listRef.current?.querySelectorAll<HTMLElement>('.bm-row')
		if (!els) return
		if (e.key === 'ArrowDown') {
			e.preventDefault()
			els[Math.min(els.length - 1, i + 1)]?.focus()
		} else if (e.key === 'ArrowUp') {
			e.preventDefault()
			if (i === 0) document.getElementById('bm-search')?.focus()
			else els[i - 1]?.focus()
		} else if ((e.key === 'Backspace' || e.key === 'ArrowLeft') && path.length && !found) {
			e.preventDefault()
			setPath((p) => p.slice(0, -1))
		}
	}

	return (
		<div className="bm">
			<label className="sr-only" htmlFor="bm-search">
				Search bookmarks
			</label>
			<div className="panel-search">
				<Glyph name="search" />
				<input
					id="bm-search"
					autoFocus
					className="line-input"
					placeholder="Search bookmarks"
					value={q}
					autoComplete="off"
					onChange={(e) => setQ(e.target.value)}
					onKeyDown={(e) => {
						if (e.key === 'ArrowDown') {
							e.preventDefault()
							listRef.current?.querySelector<HTMLElement>('.bm-row')?.focus()
						}
					}}
				/>
			</div>
			{!found && (
				<nav className="crumbs" aria-label="Folder path">
					<button type="button" className="text-btn" onClick={() => setPath([])}>
						All bookmarks
					</button>
					{path.map((f, i) => (
						<span key={f.id}>
							<Glyph name="chevron" size={12} />
							<button
								type="button"
								className="text-btn"
								aria-current={i === path.length - 1 ? 'page' : undefined}
								onClick={() => setPath((p) => p.slice(0, i + 1))}
							>
								{f.title || 'Untitled'}
							</button>
						</span>
					))}
				</nav>
			)}
			{shown.length === 0 ? (
				<p className="fine">{found ? `No bookmarks match “${q}”.` : 'This folder is empty.'}</p>
			) : (
				<ul className="bm-list" ref={listRef}>
					{shown.map((n, i) => (
						<li key={n.id}>
							{n.url ? (
								<a
									className="bm-row"
									href={n.url}
									onKeyDown={(e) => move(e, i)}
									onContextMenu={(e) => {
										e.preventDefault()
										const url = n.url!
										openMenu(
											e,
											[
												{ label: 'Open in new tab', glyph: 'tabs', run: () => openUrl(url, true) },
												{
													label: 'Add to shortcuts',
													glyph: 'pin',
													run: () =>
														addShortcut(url, n.title) &&
														toast(`Added ${n.title || hostOf(url)}`, { tone: 'success' }),
												},
												{
													label: 'Copy link',
													glyph: 'link',
													run: () =>
														navigator.clipboard.writeText(url).then(() => toast('Link copied')),
												},
											],
											`Actions for ${n.title}`,
										)
									}}
								>
									<Favicon url={n.url} label={n.title || hostOf(n.url)} />
									<span className="bm-title">{n.title || hostOf(n.url)}</span>
									<span className="bm-host">{hostOf(n.url)}</span>
								</a>
							) : (
								<button
									type="button"
									className="bm-row bm-row--folder"
									onClick={() => {
										setQ('')
										setPath((p) => [...p, n])
										requestAnimationFrame(() =>
											listRef.current?.querySelector<HTMLElement>('.bm-row')?.focus(),
										)
									}}
									onKeyDown={(e) => {
										if (e.key === 'ArrowRight') {
											e.preventDefault()
											setPath((p) => [...p, n])
										} else move(e, i)
									}}
								>
									<Glyph name="folder" />
									<span className="bm-title">{n.title || 'Untitled folder'}</span>
									<Glyph name="chevron" size={12} />
								</button>
							)}
						</li>
					))}
				</ul>
			)}
		</div>
	)
}
