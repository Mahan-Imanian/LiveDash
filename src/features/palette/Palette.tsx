import { Search } from 'lucide-react'
import { type KeyboardEvent, useEffect, useId, useMemo, useRef, useState } from 'react'
import { browser } from 'wxt/browser'
import { on } from '@/lib/bus'
import { hasPermission } from '@/lib/chrome'
import { useStore } from '@/store/store'
import { buildItems, type Ctx, ENTER_ICON, type Item, type Mods } from './items'

interface Props {
	inline?: boolean
	page?: Ctx['page']
	onDone?: (message: string) => void
}

const isMac = /Mac|iPhone|iPad/.test(navigator.platform)
export const MOD = isMac ? '⌘' : 'Ctrl'

export function Palette({ inline = false, page = null, onDone }: Props) {
	const state = useStore((s) => s)
	const [query, setQuery] = useState('')
	const [open, setOpen] = useState(inline)
	const [active, setActive] = useState(0)
	const [bookmarks, setBookmarks] = useState<Ctx['bookmarks']>([])
	const [perms, setPerms] = useState({ bookmarks: false, topSites: false })
	const inputRef = useRef<HTMLInputElement>(null)
	const rootRef = useRef<HTMLDivElement>(null)
	const listRef = useRef<HTMLDivElement>(null)
	const listId = useId()

	useEffect(() => {
		Promise.all([
			hasPermission({ permissions: ['bookmarks'] }),
			hasPermission({ permissions: ['topSites'] }),
		]).then(([b, t]) => setPerms({ bookmarks: b, topSites: t }))
		const sync = () =>
			Promise.all([
				hasPermission({ permissions: ['bookmarks'] }),
				hasPermission({ permissions: ['topSites'] }),
			]).then(([b, t]) => setPerms({ bookmarks: b, topSites: t }))
		browser.permissions.onAdded.addListener(sync)
		browser.permissions.onRemoved.addListener(sync)
		return () => {
			browser.permissions.onAdded.removeListener(sync)
			browser.permissions.onRemoved.removeListener(sync)
		}
	}, [])

	useEffect(
		() =>
			on((e) => {
				if (e.type !== 'palette') return
				if (e.text !== undefined) setQuery(e.text)
				setOpen(true)
				inputRef.current?.focus()
				if (e.text)
					requestAnimationFrame(() =>
						inputRef.current?.setSelectionRange(e.text!.length, e.text!.length),
					)
			}),
		[],
	)

	useEffect(() => {
		const q = query.trim()
		if (!perms.bookmarks || q.length < 2) {
			setBookmarks([])
			return
		}
		let live = true
		const t = setTimeout(() => {
			browser.bookmarks
				.search(q)
				.then((r) => {
					if (live)
						setBookmarks(
							r
								.filter((b) => b.url)
								.slice(0, 6)
								.map((b) => ({ id: b.id, title: b.title, url: b.url! })),
						)
				})
				.catch(() => setBookmarks([]))
		}, 80)
		return () => {
			live = false
			clearTimeout(t)
		}
	}, [query, perms.bookmarks])

	const items = useMemo(
		() =>
			buildItems(query, state, {
				page,
				bookmarks,
				canBookmarks: perms.bookmarks,
				canTopSites: perms.topSites,
			}),
		[query, state, page, bookmarks, perms],
	)

	function step(delta: number) {
		const n = items.length
		setOpen(true)
		setActive((a) => (n ? (a + delta + n) % n : 0))
		requestAnimationFrame(() =>
			listRef.current
				?.querySelector<HTMLElement>('[aria-selected="true"]')
				?.scrollIntoView({ block: 'nearest' }),
		)
	}

	const groups = useMemo(() => {
		const out: { name: string; items: { item: Item; index: number }[] }[] = []
		items.forEach((item, index) => {
			const last = out[out.length - 1]
			if (last && last.name === item.group) last.items.push({ item, index })
			else out.push({ name: item.group, items: [{ item, index }] })
		})
		return out
	}, [items])

	async function run(item: Item | undefined, mods: Mods) {
		if (!item) return
		let target = item
		if (mods.search) target = items.find((i) => i.id === 'intent:search') ?? item
		else if (mods.note) target = items.find((i) => i.id === 'intent:note') ?? item
		const result = await target.run(mods)
		if (result === '') return
		setQuery('')
		if (typeof result === 'string' && onDone) {
			onDone(result)
			return
		}
		if (!inline) {
			setOpen(false)
			if (document.activeElement === inputRef.current) inputRef.current?.blur()
		}
	}

	function onKeyDown(e: KeyboardEvent<HTMLInputElement>) {
		if (e.key === 'ArrowDown' || (e.key === 'n' && e.ctrlKey)) {
			e.preventDefault()
			step(1)
		} else if (e.key === 'ArrowUp' || (e.key === 'p' && e.ctrlKey)) {
			e.preventDefault()
			step(-1)
		} else if (e.key === 'Enter') {
			e.preventDefault()
			if (e.nativeEvent.isComposing) return
			if (!query.trim() && !open) {
				setOpen(true)
				return
			}
			run(items[active], { search: e.ctrlKey || e.metaKey, note: e.shiftKey, newTab: e.altKey })
		} else if (e.key === 'Escape') {
			e.preventDefault()
			if (query) setQuery('')
			else if (inline) window.close()
			else {
				setOpen(false)
				inputRef.current?.blur()
			}
		}
	}

	const showList = open && items.length > 0
	const current = items[active]
	const optionId = (i: number) => `${listId}-o${i}`

	return (
		<div
			className={`palette${inline ? ' palette--inline' : ''}`}
			data-open={showList && !inline}
			ref={rootRef}
			onBlur={(e) => {
				if (!inline && !rootRef.current?.contains(e.relatedTarget as Node)) setOpen(false)
			}}
		>
			<div className="palette-field">
				<Search size={20} aria-hidden="true" />
				<input
					ref={inputRef}
					className="palette-input"
					type="text"
					role="combobox"
					aria-label="Add a task, write a note, search, or open a site"
					aria-expanded={showList}
					aria-controls={listId}
					aria-autocomplete="list"
					aria-activedescendant={showList && current ? optionId(active) : undefined}
					placeholder={
						inline
							? 'Add a task, save a note, search…'
							: 'Add a task, write a note, search, or open a site…'
					}
					autoComplete="off"
					spellCheck={false}
					autoFocus={inline}
					value={query}
					onChange={(e) => {
						setQuery(e.target.value)
						setActive(0)
						setOpen(true)
					}}
					onFocus={() => setOpen(true)}
					onKeyDown={onKeyDown}
				/>
				{!inline && !query && (
					<span className="palette-hint" aria-hidden="true">
						<kbd>{MOD}</kbd>
						<kbd>K</kbd>
					</span>
				)}
			</div>
			<div
				className="palette-list"
				id={listId}
				role="listbox"
				aria-label="Results"
				ref={listRef}
				hidden={!showList}
			>
				{groups.map((g, gi) => (
					<div
						className="palette-group"
						role="group"
						aria-labelledby={g.name ? `${listId}-g${gi}` : undefined}
						aria-label={g.name ? undefined : 'Suggested'}
						key={`${gi}-${g.name}`}
					>
						{g.name && (
							<div className="palette-group-label" id={`${listId}-g${gi}`}>
								{g.name}
							</div>
						)}
						{g.items.map(({ item, index }) => (
							<div
								key={item.id}
								id={optionId(index)}
								role="option"
								aria-selected={index === active}
								aria-label={item.chip ? `${item.label}, ${item.chip}` : item.label}
								className="palette-option"
								onMouseMove={() => index !== active && setActive(index)}
								onMouseDown={(e) => e.preventDefault()}
								onClick={(e) =>
									run(item, {
										search: false,
										note: false,
										newTab: e.ctrlKey || e.metaKey || e.button === 1,
									})
								}
							>
								<span className="palette-option-icon" aria-hidden="true">
									{item.icon}
								</span>
								<span className="palette-option-text">
									<span className="palette-option-title">{item.title}</span>
									{item.sub && <span className="palette-option-sub">{item.sub}</span>}
								</span>
								{item.chip && <span className="palette-option-chip">{item.chip}</span>}
								<span className="palette-option-kbd" aria-hidden="true">
									<kbd>{ENTER_ICON}</kbd>
								</span>
							</div>
						))}
					</div>
				))}
				<div className="palette-footer" aria-hidden="true">
					<span>
						<kbd>↑</kbd>
						<kbd>↓</kbd> Move
					</span>
					<span>
						<kbd>{ENTER_ICON}</kbd> {current?.action ?? 'Run'}
					</span>
					{query.trim() && (
						<>
							<span>
								<kbd>⇧</kbd>
								<kbd>{ENTER_ICON}</kbd> Note
							</span>
							<span>
								<kbd>{MOD}</kbd>
								<kbd>{ENTER_ICON}</kbd> Search web
							</span>
						</>
					)}
					<span>
						<kbd>Esc</kbd> {query ? 'Clear' : 'Close'}
					</span>
				</div>
			</div>
		</div>
	)
}
