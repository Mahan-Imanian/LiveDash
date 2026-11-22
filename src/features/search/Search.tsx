import {
	type KeyboardEvent,
	useEffect,
	useId,
	useLayoutEffect,
	useMemo,
	useRef,
	useState,
} from 'react'
import { bookmarkSources, historyBetween } from '@/lib/browser'
import { on } from '@/lib/bus'
import { isPopup } from '@/lib/chrome'
import { ENGINES, engineName } from '@/lib/engines'
import { type Dest, merge } from '@/lib/rank'
import { parseSince } from '@/lib/since'
import { update, useStore } from '@/store/store'
import { Favicon } from '@/ui/controls'
import { Glyph } from '@/ui/Glyph'
import { openMenu } from '@/ui/Menu'
import { useLive } from '../snapshot'
import { Marked } from './Marked'
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
	const [scopedDests, setScopedDests] = useState<Dest[] | null>(null)
	const [announce, setAnnounce] = useState('')
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

	const events = state.calendar.events
	const scope = useMemo(
		() => (command || !access?.history ? null : parseSince(query, Date.now(), events)),
		[query, command, access, events],
	)
	useEffect(() => {
		if (!scope || !access) {
			setScopedDests(null)
			return
		}
		let alive = true
		const t = setTimeout(async () => {
			const found = await historyBetween(scope.text, scope.start, scope.end, access).catch(() => [])
			if (alive) setScopedDests(merge(found))
		}, 60)
		return () => {
			alive = false
			clearTimeout(t)
		}
	}, [scope, access])

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
		return buildQuery(
			query,
			state,
			snap,
			extra,
			page,
			now,
			scope && scopedDests ? { scope, dests: scopedDests } : undefined,
		)
	}, [query, command, state, snap, extra, page, now, alwaysOpen, scope, scopedDests])
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
							: row.id === 'i:search'
								? 'Leave LiveDash'
								: 'Top hit'
					: row.cat === 'Web'
						? 'Leave LiveDash'
						: row.cat === 'Visited'
							? `Visited ${scope?.label ?? ''}`.trim()
							: row.cat
			const last = out[out.length - 1]
			if (last && last.cat === cat) last.rows.push({ row, index })
			else out.push({ cat, rows: [{ row, index }] })
		})
		return out
	}, [rows, command, page, query, alwaysOpen, scope])

	useLayoutEffect(() => {
		listRef.current
			?.querySelector<HTMLElement>('.result[aria-selected="true"]')
			?.scrollIntoView({ block: 'nearest' })
	})

	// One polite announcement once typing settles: how many results and the top hit.
	const topRow = rows[0]
	useEffect(() => {
		if (!active || (!query.trim() && !command)) {
			setAnnounce('')
			return
		}
		const t = setTimeout(() => {
			if (!topRow) return setAnnounce(command ? 'No commands match' : '')
			const n = rows.length
			setAnnounce(
				`${n} ${command ? (n === 1 ? 'command' : 'commands') : n === 1 ? 'result' : 'results'}. ${topRow.verb}: ${topRow.title}`,
			)
		}, 450)
		return () => clearTimeout(t)
	}, [active, query, command, rows.length, topRow])

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
				{!active && !isPopup() && (
					<span className="search-keys" aria-hidden="true">
						<span className="search-key search-key--idle">
							<kbd>/</kbd> to search
						</span>
						<span className="search-key">
							<kbd>&gt;</kbd> for commands
						</span>
						<span className="search-key search-key--idle">
							<kbd>?</kbd> all keys
						</span>
					</span>
				)}
			</div>
			{built.preview && !command && (
				<p className="search-preview">
					{built.preview.kind === 'task' ? (
						<>
							New task “{built.preview.title}”, due <b>{built.preview.due}</b>. <kbd>↵</kbd> adds
							it, <kbd>{MOD}</kbd> <kbd>↵</kbd> searches the web instead.
						</>
					) : (
						<>
							Pages from <b>{built.preview.label}</b> ({built.preview.detail})
							{built.preview.text ? <> matching “{built.preview.text}”</> : null}.
						</>
					)}
				</p>
			)}
			<p className="sr-only" aria-live="polite" aria-atomic="true">
				{announce}
			</p>
			{active && (
				<div
					className="results"
					id={listId}
					role="listbox"
					aria-label={command ? 'Commands' : 'Results'}
					ref={listRef}
				>
					{rows.length === 0 && (
						<p className="results-empty">
							{command
								? `No commands match “${query}”. Press Backspace to search instead.`
								: `Nothing matches “${query}”.`}
						</p>
					)}
					{groups.map((g, gi) => (
						<div
							role="group"
							aria-labelledby={`${listId}-g${gi}`}
							className={`result-group${g.cat === 'Leave LiveDash' ? ' result-group--leave' : ''}`}
							key={`${gi}-${g.cat}`}
						>
							<p className="result-source" id={`${listId}-g${gi}`}>
								{g.cat}
							</p>
							<div className="result-rows">
								{g.rows.map(({ row, index }) => (
									<div
										key={row.id}
										id={optionId(index)}
										role="option"
										aria-selected={index === idx}
										aria-label={[
											row.verb,
											row.title,
											row.sub,
											row.meta,
											index === idx ? row.why : '',
										]
											.filter(Boolean)
											.join(', ')}
										className={`result${row.cat === 'top' ? ' result--top' : ''}`}
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
											<span className="result-title" dir="auto">
												<Marked text={row.title} ranges={row.match} />
											</span>
											{row.sub && (
												<span className="result-sub" dir="auto">
													{row.sub}
												</span>
											)}
											{row.why && index === idx && (
												<span className="result-why">Ranked first: {row.why}</span>
											)}
										</span>
										<span className="result-end" aria-hidden="true">
											{row.meta && (
												<span
													className={`result-meta${row.tone ? ` result-meta--${row.tone}` : ''}`}
												>
													{row.meta}
												</span>
											)}
											{row.key && !row.meta && (
												<span className="result-meta">
													<kbd>{row.key}</kbd>
												</span>
											)}
											<span className="result-verb">
												{row.verb} <kbd>↵</kbd>
											</span>
										</span>
									</div>
								))}
							</div>
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
