import {
	type KeyboardEvent,
	useEffect,
	useId,
	useLayoutEffect,
	useMemo,
	useRef,
	useState,
} from 'react'
import { bookmarkSources } from '@/lib/browser'
import { on } from '@/lib/bus'
import { isPopup } from '@/lib/chrome'
import { ENGINES, engineName } from '@/lib/engines'
import { type Dest, merge } from '@/lib/rank'
import { update, useStore } from '@/store/store'
import { Favicon } from '@/ui/controls'
import { Glyph } from '@/ui/Glyph'
import { openMenu } from '@/ui/Menu'
import { useLive } from '../snapshot'
import { buildCommands, buildQuery, type Mods, type Page, type Row } from './model'

interface Props {
	page?: Page | null
	alwaysOpen?: boolean
	onActive?: (active: boolean) => void
	onDone?: (message: string) => void
}

const isMac = /Mac|iPhone|iPad/.test(navigator.platform)
export const MOD = isMac ? '⌘' : 'Ctrl'

export function Search({ page = null, alwaysOpen = false, onActive, onDone }: Props) {
	const state = useStore((s) => s)
	const { access, snap } = useLive()
	const [query, setQuery] = useState('')
	const [command, setCommand] = useState(false)
	const [sel, setSel] = useState(0)
	const [extra, setExtra] = useState<Dest[]>([])
	const [now] = useState(() => Date.now())
	const inputRef = useRef<HTMLInputElement>(null)
	const listRef = useRef<HTMLDivElement>(null)
	const [cursor, setCursor] = useState<{ y: number; h: number } | null>(null)
	const listId = useId()

	const active = command || query.trim().length > 0 || alwaysOpen
	useEffect(() => onActive?.(active), [active, onActive])

	useEffect(
		() =>
			on((e) => {
				if (e.type !== 'prompt') return
				if (e.text !== undefined) setQuery(e.text)
				if (e.text === '>') {
					setQuery('')
					setCommand(true)
				}
				inputRef.current?.focus()
			}),
		[],
	)

	useEffect(() => {
		if (!access?.bookmarks || query.trim().length < 2 || command) {
			setExtra([])
			return
		}
		let alive = true
		const t = setTimeout(async () => {
			const found = await bookmarkSources(query, access)
			if (alive) setExtra(merge(found))
		}, 60)
		return () => {
			alive = false
			clearTimeout(t)
		}
	}, [query, access, command])

	const built = useMemo(() => {
		if (command)
			return {
				rows: buildCommands(state, snap, page, query.trim()),
				chip: undefined,
				mode: 'command' as const,
			}
		if (!query.trim() && alwaysOpen)
			return {
				rows: buildCommands(state, snap, page, '')
					.filter((r) => r.id.startsWith('c:page-') || r.id === 'c:focus')
					.map((r) => ({ ...r, cat: 'top' as const })),
				chip: undefined,
				mode: 'command' as const,
			}
		if (!query.trim()) return { rows: [] as Row[], chip: undefined, mode: 'search' as const }
		return buildQuery(query, state, snap, extra, page, now)
	}, [query, command, state, snap, extra, page, now, alwaysOpen])
	const rows = built.rows
	const idx = Math.min(sel, Math.max(0, rows.length - 1))
	const selected = rows[idx]

	const groups = useMemo(() => {
		const out: { cat: string; rows: { row: Row; index: number }[] }[] = []
		rows.forEach((row, index) => {
			const cat =
				row.cat === 'top'
					? alwaysOpen && !query.trim() && !command
						? page
							? 'This page'
							: 'Quick actions'
						: command
							? 'Commands'
							: 'Top hit'
					: row.cat
			const last = out[out.length - 1]
			if (last && last.cat === cat) last.rows.push({ row, index })
			else out.push({ cat, rows: [{ row, index }] })
		})
		return out
	}, [rows, command, page, query, alwaysOpen])

	useLayoutEffect(() => {
		const el = listRef.current?.querySelector<HTMLElement>('.result[aria-selected="true"]')
		const next = el ? { y: el.offsetTop, h: el.offsetHeight } : null
		setCursor((prev) => (prev?.y === next?.y && prev?.h === next?.h ? prev : next))
		el?.scrollIntoView({ block: 'nearest' })
	})

	function reset() {
		setQuery('')
		setCommand(false)
		setSel(0)
	}

	async function run(row: Row | undefined, mods: Mods) {
		if (!row) return
		let target = row
		if (mods.web) target = rows.find((r) => r.id === 'i:search') ?? row
		else if (mods.later) target = rows.find((r) => r.id === 'i:later') ?? row
		const result = await target.run(mods)
		if (result === '') return
		if (typeof result === 'string' && result && onDone) return onDone(result)
		reset()
		if (!isPopup()) inputRef.current?.blur()
	}

	function showActions(row: Row, anchor: HTMLElement | { clientX: number; clientY: number }) {
		const items = [
			{
				label: row.verb,
				glyph: 'go' as const,
				hint: '↵',
				run: () => run(row, { newTab: false, later: false, web: false }),
			},
			...(row.actions ?? []),
		]
		openMenu(anchor, items, `Actions for ${row.title}`)
	}

	function onKeyDown(e: KeyboardEvent<HTMLInputElement>) {
		const n = rows.length
		if (e.key === 'ArrowDown' || (e.ctrlKey && e.key === 'n')) {
			e.preventDefault()
			if (n) setSel((s) => (Math.min(s, n - 1) + 1) % n)
		} else if (e.key === 'ArrowUp' || (e.ctrlKey && e.key === 'p')) {
			e.preventDefault()
			if (n) setSel((s) => (Math.min(s, n - 1) - 1 + n) % n)
		} else if (
			e.key === 'ArrowRight' &&
			selected &&
			e.currentTarget.selectionStart === e.currentTarget.value.length &&
			active
		) {
			e.preventDefault()
			const el = listRef.current?.querySelector<HTMLElement>('.result[aria-selected="true"]')
			if (el) showActions(selected, el)
		} else if (e.key === 'Enter') {
			if (e.nativeEvent.isComposing) return
			e.preventDefault()
			if (!active) return
			run(selected, { newTab: e.altKey, later: e.shiftKey, web: e.ctrlKey || e.metaKey })
		} else if (e.key === 'Escape') {
			if (active) {
				e.preventDefault()
				e.stopPropagation()
				reset()
			} else if (isPopup()) window.close()
			else e.currentTarget.blur()
		} else if (e.key === 'Backspace' && !query && command) {
			e.preventDefault()
			setCommand(false)
		} else if (e.key === '>' && !query && !command) {
			e.preventDefault()
			setCommand(true)
			setSel(0)
		}
	}

	const engine = state.settings.engine
	const optionId = (i: number) => `${listId}-${i}`

	return (
		<div className={`search${active ? ' search--active' : ''}`}>
			<div className="search-field">
				<button
					type="button"
					className="search-engine"
					aria-label={`Search engine: ${engineName(engine)}. Change`}
					onClick={(e) =>
						openMenu(
							e.currentTarget,
							ENGINES.filter((x) => x.id !== 'custom' || state.settings.customEngine).map((x) => ({
								label: x.name,
								glyph: x.id === engine ? 'check' : undefined,
								run: () => update('settings', (s) => ({ ...s, engine: x.id })),
							})),
							'Search engine',
						)
					}
				>
					{command ? (
						<span className="search-mode">Commands</span>
					) : (
						<Glyph name="search" size={18} />
					)}
				</button>
				<input
					ref={inputRef}
					className="search-input"
					type="text"
					role="combobox"
					aria-label={
						command
							? 'Run a command'
							: 'Search the web, your tabs, history, bookmarks and shortcuts'
					}
					aria-expanded={active && rows.length > 0}
					aria-controls={listId}
					aria-activedescendant={active && selected ? optionId(idx) : undefined}
					aria-autocomplete="list"
					placeholder={
						command
							? 'Type a command…'
							: page
								? 'Search, or do something with this page'
								: 'Search, or type a site, a task, a command'
					}
					autoComplete="off"
					spellCheck={false}
					autoFocus
					value={query}
					onChange={(e) => {
						setQuery(e.target.value)
						setSel(0)
					}}
					onKeyDown={onKeyDown}
				/>
				{built.chip && <span className="search-chip">{built.chip}</span>}
				{!active && !isPopup() && (
					<span className="search-keys" aria-hidden="true">
						<kbd>/</kbd>
					</span>
				)}
			</div>

			{active && (
				<div
					className="results"
					id={listId}
					role="listbox"
					aria-label={command ? 'Commands' : 'Results'}
					ref={listRef}
				>
					{cursor && rows.length > 0 && (
						<div
							className="results-cursor"
							aria-hidden="true"
							style={{ transform: `translateY(${cursor.y}px)`, height: cursor.h }}
						/>
					)}
					{rows.length === 0 && (
						<p className="results-empty">
							No commands match “{query}”. Press Backspace to search instead.
						</p>
					)}
					{groups.map((g, gi) => (
						<div
							role="group"
							aria-labelledby={`${listId}-g${gi}`}
							className="result-group"
							key={`${gi}-${g.cat}`}
						>
							<p className="kicker result-kicker" id={`${listId}-g${gi}`}>
								{g.cat}
							</p>
							{g.rows.map(({ row, index }) => (
								<div
									key={row.id}
									id={optionId(index)}
									role="option"
									aria-selected={index === idx}
									aria-label={[row.verb, row.title, row.sub, row.meta].filter(Boolean).join(', ')}
									className={`result${row.cat === 'top' ? ' result--top' : ''}`}
									style={{ '--i': index } as React.CSSProperties}
									onMouseMove={() => index !== idx && setSel(index)}
									onMouseDown={(e) => e.preventDefault()}
									onClick={(e) =>
										run(row, {
											newTab: e.ctrlKey || e.metaKey || e.altKey,
											later: false,
											web: false,
										})
									}
									onAuxClick={(e) =>
										e.button === 1 && run(row, { newTab: true, later: false, web: false })
									}
									onContextMenu={(e) => {
										e.preventDefault()
										setSel(index)
										showActions(row, e)
									}}
								>
									<span className="result-icon" aria-hidden="true">
										{'favicon' in row.icon ? (
											<Favicon url={row.icon.favicon} label={row.icon.label} />
										) : (
											<Glyph name={row.icon.glyph} />
										)}
									</span>
									<span className="result-text">
										<span className="result-title">{row.title}</span>
										{row.sub && <span className="result-sub">{row.sub}</span>}
									</span>
									{row.meta && (
										<span className={`result-meta${row.tone ? ` result-meta--${row.tone}` : ''}`}>
											{row.meta}
										</span>
									)}
									{row.key && !row.meta && (
										<span className="result-meta" aria-hidden="true">
											<kbd>{row.key}</kbd>
										</span>
									)}
									<span className="result-verb" aria-hidden="true">
										{row.verb} <kbd>↵</kbd>
									</span>
								</div>
							))}
						</div>
					))}
					<p className="results-foot" aria-hidden="true">
						<span>
							<kbd>↑</kbd>
							<kbd>↓</kbd> move
						</span>
						<span>
							<kbd>↵</kbd> {selected?.verb.toLowerCase() ?? 'run'}
						</span>
						{selected?.actions && (
							<span>
								<kbd>→</kbd> more
							</span>
						)}
						{!command && (
							<>
								<span>
									<kbd>alt</kbd>
									<kbd>↵</kbd> new tab
								</span>
								{selected?.id !== 'i:later' && (
									<span>
										<kbd>⇧</kbd>
										<kbd>↵</kbd> add as task
									</span>
								)}
								{selected?.id !== 'i:search' && (
									<span>
										<kbd>{MOD}</kbd>
										<kbd>↵</kbd> search web
									</span>
								)}
							</>
						)}
						<span>
							<kbd>esc</kbd> {command ? 'close' : 'clear'}
						</span>
					</p>
				</div>
			)}
		</div>
	)
}
