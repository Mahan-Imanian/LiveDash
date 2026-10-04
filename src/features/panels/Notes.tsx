import { useEffect, useRef, useState } from 'react'
import { formatRelative } from '@/lib/format'
import { addNote, noteTitle, removeNote, saveNote, togglePinNote } from '@/store/actions'
import { getState, useStore } from '@/store/store'
import { Glyph } from '@/ui/Glyph'

export function Notes({ openId }: { openId?: string }) {
	const notes = useStore((s) => s.notes)
	const [current, setCurrent] = useState<string | null>(openId ?? null)
	const [q, setQ] = useState('')
	const now = Date.now()

	useEffect(() => {
		if (openId) setCurrent(openId)
	}, [openId])

	const note = current ? notes.find((n) => n.id === current) : undefined
	if (note) {
		return (
			<Editor
				key={note.id}
				id={note.id}
				initial={note.text}
				pinned={!!note.pinned}
				onClose={() => {
					const n = getState().notes.find((x) => x.id === note.id)
					if (n && !n.text.trim()) removeNote(n.id)
					setCurrent(null)
				}}
			/>
		)
	}

	const list = [...notes]
		.filter((n) => !q.trim() || n.text.toLowerCase().includes(q.trim().toLowerCase()))
		.sort((a, b) => Number(!!b.pinned) - Number(!!a.pinned) || b.updatedAt - a.updatedAt)

	return (
		<div className="notes">
			<div className="panel-search">
				<Glyph name="search" />
				<label className="sr-only" htmlFor="note-search">
					Search notes
				</label>
				<input
					id="note-search"
					autoFocus
					className="line-input"
					placeholder="Search notes"
					value={q}
					onChange={(e) => setQ(e.target.value)}
					autoComplete="off"
				/>
				<button type="button" className="btn btn--quiet" onClick={() => setCurrent(addNote().id)}>
					<Glyph name="plus" size={14} /> New
				</button>
			</div>
			{notes.length === 0 ? (
				<div className="panel-empty">
					<p className="lede">
						Notes save as you type and stay on this browser. The first line becomes the title.
					</p>
					<button type="button" className="btn" onClick={() => setCurrent(addNote().id)}>
						Write the first note
					</button>
				</div>
			) : list.length === 0 ? (
				<p className="panel-hint">No notes contain “{q}”.</p>
			) : (
				<ul className="note-list">
					{list.map((n) => {
						const rest = n.text.trim().split('\n').slice(1).join(' ').trim()
						return (
							<li key={n.id}>
								<button type="button" className="note-row" onClick={() => setCurrent(n.id)}>
									<span className="note-title">
										{n.pinned && <Glyph name="pin" size={12} />} {noteTitle(n)}
									</span>
									<span className="note-sub">
										{formatRelative(n.updatedAt, now)}
										{rest ? ` · ${rest.slice(0, 140)}` : ''}
									</span>
								</button>
							</li>
						)
					})}
				</ul>
			)}
		</div>
	)
}

function Editor({
	id,
	initial,
	pinned,
	onClose,
}: {
	id: string
	initial: string
	pinned: boolean
	onClose: () => void
}) {
	const [text, setText] = useState(initial)
	const [status, setStatus] = useState<'saved' | 'saving'>('saved')
	const timer = useRef(0)
	const latest = useRef(text)
	latest.current = text

	useEffect(
		() => () => {
			clearTimeout(timer.current)
			saveNote(id, latest.current)
		},
		[id],
	)

	const flush = () => {
		clearTimeout(timer.current)
		saveNote(id, latest.current)
		setStatus('saved')
	}

	return (
		<div className="note-editor">
			<div className="note-bar">
				<button
					type="button"
					className="text-btn"
					onClick={() => {
						flush()
						onClose()
					}}
				>
					<Glyph name="back" size={12} /> All notes
				</button>
				<span className="spacer" />
				<span className="fine" aria-live="polite">
					{status === 'saving' ? 'Saving…' : 'Saved on this device'}
				</span>
				<button
					type="button"
					className="text-btn"
					aria-pressed={pinned}
					onClick={() => togglePinNote(id)}
				>
					{pinned ? 'Unpin' : 'Pin'}
				</button>
				<button
					type="button"
					className="text-btn text-btn--danger"
					onClick={() => {
						clearTimeout(timer.current)
						removeNote(id)
						onClose()
					}}
				>
					Delete
				</button>
			</div>
			<label className="sr-only" htmlFor={`note-${id}`}>
				Note. The first line is the title.
			</label>
			<textarea
				id={`note-${id}`}
				className="note-text"
				value={text}
				autoFocus
				placeholder="Start writing. The first line becomes the title."
				onFocus={(e) => {
					const end = e.currentTarget.value.length
					e.currentTarget.setSelectionRange(end, end)
				}}
				onBlur={flush}
				onChange={(e) => {
					setText(e.target.value)
					setStatus('saving')
					clearTimeout(timer.current)
					timer.current = window.setTimeout(() => {
						saveNote(id, e.target.value)
						setStatus('saved')
					}, 400)
				}}
				onKeyDown={(e) => {
					if (e.key === 'Escape') {
						e.preventDefault()
						e.stopPropagation()
						flush()
						onClose()
					}
				}}
			/>
		</div>
	)
}
