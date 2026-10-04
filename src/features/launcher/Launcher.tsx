import {
	type KeyboardEvent,
	useCallback,
	useEffect,
	useId,
	useLayoutEffect,
	useMemo,
	useRef,
	useState,
} from 'react'
import { browser } from 'wxt/browser'
import {
	type Access,
	bookmarkSources,
	readAccess,
	requestCore,
	type Snapshot,
	snapshot,
} from '@/lib/browser'
import { emit, on } from '@/lib/bus'
import { isPopup } from '@/lib/chrome'
import { type Dest, merge } from '@/lib/rank'
import { update, useStore } from '@/store/store'
import { Favicon } from '@/ui/controls'
import { Glyph } from '@/ui/Glyph'
import { buildHome, buildQuery, type Mods, type Row } from './rows'

interface Props {
	page?: { url: string; title: string } | null
	onDone?: (message: string) => void
}

function useNow(): number {
	const [now, setNow] = useState(Date.now())
	useEffect(() => {
		const t = setInterval(() => !document.hidden && setNow(Date.now()), 30_000)
		return () => clearInterval(t)
	}, [])
	return now
}

export function Launcher({ page = null, onDone }: Props) {
	const state = useStore((s) => s)
	const now = useNow()
	const [access, setAccess] = useState<Access | null>(null)
	const [snap, setSnap] = useState<Snapshot | null>(null)
	const [query, setQuery] = useState('')
	const [sel, setSel] = useState(0)
	const [act, setAct] = useState(-1)
	const [extra, setExtra] = useState<Dest[]>([])
	const [cursor, setCursor] = useState<{ y: number; h: number } | null>(null)
	const inputRef = useRef<HTMLInputElement>(null)
	const listRef = useRef<HTMLDivElement>(null)
	const listId = useId()

	const refresh = useCallback(async () => {
		const a = await readAccess()
		setAccess(a)
		setSnap(await snapshot(a))
	}, [])

	useEffect(() => {
		refresh()
		const vis = () => !document.hidden && refresh()
		document.addEventListener('visibilitychange', vis)
		browser.permissions.onAdded.addListener(refresh)
		browser.permissions.onRemoved.addListener(refresh)
		const off = on((e) => {
			if (e.type === 'refresh') refresh()
			if (e.type === 'prompt') {
				if (e.text !== undefined) setQuery(e.text)
				inputRef.current?.focus()
			}
		})
		return () => {
			document.removeEventListener('visibilitychange', vis)
			browser.permissions.onAdded.removeListener(refresh)
			browser.permissions.onRemoved.removeListener(refresh)
			off()
		}
	}, [refresh])

	useEffect(() => {
		if (!access?.bookmarks || query.trim().length < 2) {
			setExtra([])
			return
		}
		let live = true
		const t = setTimeout(async () => {
			const found = await bookmarkSources(query, access)
			if (live) setExtra(merge(found))
		}, 70)
		return () => {
			live = false
			clearTimeout(t)
		}
	}, [query, access])

	const built = useMemo(
		() =>
			query.trim()
				? buildQuery(query, state, snap, extra, page, now)
				: buildHome(state, snap, page, now),
		[query, state, snap, extra, page, now],
	)
	const rows = built.rows
	const selected = rows[Math.min(sel, rows.length - 1)]

	const sections = useMemo(() => {
		const out: { name: string; rows: { row: Row; index: number }[] }[] = []
		if (query.trim()) return [{ name: 'results', rows: rows.map((row, index) => ({ row, index })) }]
		rows.forEach((row, index) => {
			const last = out[out.length - 1]
			if (last && last.name === row.section) last.rows.push({ row, index })
			else out.push({ name: row.section, rows: [{ row, index }] })
		})
		return out
	}, [rows, query])

	useLayoutEffect(() => {
		const el = listRef.current?.querySelector<HTMLElement>(
			'[role="option"][aria-selected="true"].row',
		)
		const next = el ? { y: el.offsetTop, h: el.offsetHeight } : null
		setCursor((prev) => (prev?.y === next?.y && prev?.h === next?.h ? prev : next))
	})

	async function run(row: Row | undefined, mods: Mods) {
		if (!row) return
		let target = row
		if (mods.web) target = rows.find((r) => r.id === 'i:search') ?? row
		else if (mods.later) target = rows.find((r) => r.id === 'i:later') ?? row
		const result = await target.run(mods)
		if (result === '') return
		if (typeof result === 'string' && result && onDone) {
			onDone(result)
			return
		}
		setQuery('')
		setSel(0)
		setAct(-1)
		refresh()
	}

	function move(delta: number) {
		const n = rows.length
		if (!n) return
		setAct(-1)
		setSel((s) => (Math.min(s, n - 1) + delta + n) % n)
	}

	function onKeyDown(e: KeyboardEvent<HTMLInputElement>) {
		const input = e.currentTarget
		const atEnd = input.selectionStart === input.value.length
		if (e.key === 'ArrowDown' || (e.ctrlKey && e.key === 'n')) {
			e.preventDefault()
			move(1)
		} else if (e.key === 'ArrowUp' || (e.ctrlKey && e.key === 'p')) {
			e.preventDefault()
			move(-1)
		} else if (e.key === 'ArrowRight' && atEnd && selected?.actions?.length) {
			e.preventDefault()
			setAct((a) => (a + 1) % selected.actions!.length)
		} else if (e.key === 'ArrowLeft' && act >= 0) {
			e.preventDefault()
			setAct((a) => a - 1)
		} else if (e.key === 'Enter') {
			if (e.nativeEvent.isComposing) return
			e.preventDefault()
			if (act >= 0 && selected?.actions?.[act]) {
				Promise.resolve(selected.actions[act].run()).then(() => {
					setAct(-1)
					refresh()
				})
				return
			}
			run(selected, { newTab: e.altKey, later: e.shiftKey, web: e.ctrlKey || e.metaKey })
		} else if (e.key === 'Escape') {
			e.preventDefault()
			if (act >= 0) setAct(-1)
			else if (query) {
				setQuery('')
				setSel(0)
			} else if (isPopup()) window.close()
		} else if (e.altKey && /^Digit[1-9]$/.test(e.code) && !query) {
			const row = rows.find((r) => r.key === e.code.slice(5))
			if (row) {
				e.preventDefault()
				run(row, { newTab: e.shiftKey, later: false, web: false })
			}
		}
	}

	const showIntro =
		access !== null && !access.history && !access.tabs && !state.ui.asked && !page && !query
	const activeId = selected
		? act >= 0
			? `${listId}-${selected.id}-a${act}`
			: `${listId}-${selected.id}`
		: undefined
	const hasHistory = (snap?.dests.length ?? 0) > state.shortcuts.length

	return (
		<>
			<div className="prompt">
				<span className="prompt-sigil" aria-hidden="true">
					›
				</span>
				<div className="prompt-field">
					<input
						ref={inputRef}
						className="prompt-input"
						type="text"
						role="combobox"
						aria-label="Go to a site, search, or save something for later"
						aria-expanded={rows.length > 0}
						aria-controls={listId}
						aria-activedescendant={activeId}
						aria-autocomplete="list"
						placeholder={page ? 'Do something with this page…' : 'Where to?'}
						autoComplete="off"
						spellCheck={false}
						autoFocus
						value={query}
						onChange={(e) => {
							setQuery(e.target.value)
							setSel(0)
							setAct(-1)
						}}
						onKeyDown={onKeyDown}
					/>
					{built.chip && (
						<span className="prompt-chip" aria-live="polite">
							{built.chip}
						</span>
					)}
				</div>
			</div>

			<div
				className="rows"
				id={listId}
				role="listbox"
				aria-label="Destinations and actions"
				ref={listRef}
			>
				{cursor && rows.length > 0 && (
					<div
						className="cursor"
						aria-hidden="true"
						style={{ transform: `translateY(${cursor.y}px)`, height: cursor.h }}
					/>
				)}

				{showIntro && (
					<div className="block">
						<div className="intro">
							<p>
								<strong>LiveDash learns where you go</strong> and puts it one keystroke away —
								ranked by how often, how recently and at what time of day you visit. If a page is
								already open, it switches to that tab instead of opening it twice.
							</p>
							<div className="intro-actions">
								<button
									type="button"
									className="btn"
									onClick={async () => {
										const ok = await requestCore()
										update('ui', (u) => ({ ...u, asked: true }))
										if (ok) refresh()
										inputRef.current?.focus()
									}}
								>
									Use my history and tabs
								</button>
								<button
									type="button"
									className="text-btn"
									onClick={() => {
										update('ui', (u) => ({ ...u, asked: true }))
										inputRef.current?.focus()
									}}
								>
									Not now
								</button>
							</div>
							<p className="intro-fine">
								Read-only and on this device. Nothing is uploaded. You can turn it off in Settings.
							</p>
						</div>
					</div>
				)}

				{sections.map((sec, si) => (
					<div
						className="block"
						role="group"
						aria-labelledby={`${listId}-s${si}`}
						key={`${si}-${sec.name}`}
					>
						{query.trim() ? (
							<h2 className="sr-only" id={`${listId}-s${si}`}>
								{sec.name}
							</h2>
						) : (
							<h2 className="block-label" id={`${listId}-s${si}`}>
								{sec.name}
							</h2>
						)}
						{sec.rows.map(({ row, index }) => {
							const isSel = index === Math.min(sel, rows.length - 1)
							return (
								<RowView
									key={row.id}
									row={row}
									index={index}
									listId={listId}
									selected={isSel}
									act={isSel ? act : -1}
									onHover={() => {
										if (!isSel) {
											setSel(index)
											setAct(-1)
										}
									}}
									onRun={(m) => run(row, m)}
									onAction={(i) => {
										Promise.resolve(row.actions?.[i]?.run()).then(() => {
											setAct(-1)
											refresh()
										})
									}}
								/>
							)
						})}
					</div>
				))}

				{!query && !showIntro && !page && rows.filter((r) => r.section === 'go').length === 0 && (
					<div className="block">
						<p className="empty-line">
							{access?.history || access?.tabs
								? hasHistory
									? 'Everything here is hidden. Hidden sites can be restored in Settings.'
									: 'Nothing to rank yet. Places you visit will start showing up here.'
								: 'Type a site name or an address to go there. What you open from here is remembered.'}
						</p>
					</div>
				)}
			</div>

			<p className="hints" aria-hidden="true">
				{query ? (
					<>
						<span>
							<b>↵</b> {selected?.verb.toLowerCase() ?? 'go'}
						</span>
						{selected?.actions && (
							<span>
								<b>→</b> more
							</span>
						)}
						<span>
							<b>alt ↵</b> new tab
						</span>
						{selected?.id !== 'i:later' && (
							<span>
								<b>⇧↵</b> save for later
							</span>
						)}
						{selected?.id !== 'i:search' && (
							<span>
								<b>ctrl ↵</b> search web
							</span>
						)}
						<span>
							<b>&gt;</b> commands
						</span>
					</>
				) : (
					<>
						<span>
							<b>type</b> to go anywhere
						</span>
						{!page && rows.some((r) => r.key) && (
							<span>
								<b>alt 1–9</b> open
							</span>
						)}
						<span>
							<b>↑↓</b> select
						</span>
						{selected?.actions && (
							<span>
								<b>→</b> more
							</span>
						)}
						<span>
							<b>&gt;</b> commands
						</span>
					</>
				)}
			</p>
		</>
	)
}

function RowView({
	row,
	index,
	listId,
	selected,
	act,
	onHover,
	onRun,
	onAction,
}: {
	row: Row
	index: number
	listId: string
	selected: boolean
	act: number
	onHover: () => void
	onRun: (m: Mods) => void
	onAction: (i: number) => void
}) {
	const label = [row.verb, row.title, row.host, row.text, row.meta].filter(Boolean).join(', ')
	return (
		<>
			<div
				id={`${listId}-${row.id}`}
				role="option"
				aria-selected={selected}
				aria-label={label}
				className="row"
				style={{ '--i': index } as React.CSSProperties}
				onMouseMove={onHover}
				onMouseDown={(e) => e.preventDefault()}
				onClick={(e) =>
					onRun({ newTab: e.ctrlKey || e.metaKey || e.altKey, later: false, web: false })
				}
				onAuxClick={(e) => e.button === 1 && onRun({ newTab: true, later: false, web: false })}
			>
				<span className="row-key" aria-hidden="true">
					{row.key ?? (selected ? '↵' : '')}
				</span>
				<span className="row-icon" aria-hidden="true">
					{'favicon' in row.icon ? (
						<Favicon url={row.icon.favicon} label={row.title} />
					) : (
						<Glyph name={row.icon.glyph} />
					)}
				</span>
				<span className="row-title">{row.title}</span>
				<span className="row-where" aria-hidden="true">
					{row.host && <b>{row.host}</b>}
					{row.path}
					{row.text}
				</span>
				<span className={`row-meta${row.tone ? ` row-meta--${row.tone}` : ''}`} aria-hidden="true">
					{row.meta}
				</span>
			</div>
			{selected && act >= 0 && row.actions && (
				<div className="actions" role="presentation">
					{row.actions.map((a, i) => (
						<span
							key={a.label}
							id={`${listId}-${row.id}-a${i}`}
							role="option"
							aria-selected={i === act}
							className="action"
							onMouseDown={(e) => e.preventDefault()}
							onClick={() => onAction(i)}
						>
							{a.label}
						</span>
					))}
				</div>
			)}
		</>
	)
}

export function focusPrompt(text?: string) {
	emit({ type: 'prompt', text })
}
