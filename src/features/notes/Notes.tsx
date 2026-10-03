import { ChevronLeft, Plus, Trash2 } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { on } from '@/lib/bus'
import { formatRelative } from '@/lib/format'
import { addNote, noteTitle, removeNote, saveNote } from '@/store/actions'
import { getState, useStore } from '@/store/store'

const PREVIEW = 5

export function Notes() {
	const notes = useStore((s) => s.notes)
	const [openId, setOpenId] = useState<string | null>(null)
	const [all, setAll] = useState(false)
	const sectionRef = useRef<HTMLElement>(null)

	useEffect(
		() =>
			on((e) => {
				if (e.type !== 'note') return
				const id = e.id ?? addNote(e.text ?? '').id
				setOpenId(id)
				sectionRef.current?.scrollIntoView({ block: 'nearest' })
			}),
		[],
	)

	const sorted = [...notes].sort((a, b) => b.updatedAt - a.updatedAt)
	const open = openId ? notes.find((n) => n.id === openId) : undefined
	const shown = all ? sorted : sorted.slice(0, PREVIEW)

	function close(id: string) {
		const n = getState().notes.find((x) => x.id === id)
		if (n && !n.text.trim()) removeNote(id)
		setOpenId(null)
		requestAnimationFrame(
			() =>
				sectionRef.current?.querySelector<HTMLElement>(`[data-note="${id}"]`)?.focus() ??
				sectionRef.current?.querySelector<HTMLElement>('.section-actions button')?.focus(),
		)
	}

	return (
		<section aria-labelledby="notes-title" ref={sectionRef}>
			<div className="section-head">
				{open ? (
					<button
						type="button"
						className="btn btn--ghost btn--sm"
						style={{ marginLeft: -8 }}
						onClick={() => close(open.id)}
					>
						<ChevronLeft size={16} aria-hidden="true" /> Notes
					</button>
				) : (
					<>
						<h2 className="section-title" id="notes-title">
							Notes
						</h2>
						{notes.length > 0 && <span className="section-count">{notes.length}</span>}
					</>
				)}
				<div className="section-actions">
					{open ? (
						<button
							type="button"
							className="icon-btn"
							aria-label="Delete note"
							title="Delete note"
							onClick={() => {
								removeNote(open.id)
								setOpenId(null)
							}}
						>
							<Trash2 size={16} />
						</button>
					) : (
						<button
							type="button"
							className="icon-btn"
							aria-label="New note"
							title="New note (N)"
							aria-keyshortcuts="N"
							onClick={() => setOpenId(addNote().id)}
						>
							<Plus size={16} />
						</button>
					)}
				</div>
			</div>

			{open ? (
				<NoteEditor key={open.id} id={open.id} initial={open.text} onClose={() => close(open.id)} />
			) : notes.length === 0 ? (
				<div className="empty">
					<p>Jot something down — it saves as you type and stays on this device.</p>
					<div className="empty-actions">
						<button type="button" className="btn btn--sm" onClick={() => setOpenId(addNote().id)}>
							<Plus size={14} aria-hidden="true" /> New note
						</button>
					</div>
				</div>
			) : (
				<>
					<ul className="list">
						{shown.map((n) => (
							<li key={n.id}>
								<button
									type="button"
									className="note-item"
									data-note={n.id}
									onClick={() => setOpenId(n.id)}
								>
									<span className="note-item-title">{noteTitle(n)}</span>
									<span className="note-item-meta">
										{formatRelative(n.updatedAt)}
										{n.text.trim().split('\n').slice(1).join(' ').trim()
											? ` · ${n.text.trim().split('\n').slice(1).join(' ').trim().slice(0, 80)}`
											: ''}
									</span>
								</button>
							</li>
						))}
					</ul>
					{sorted.length > PREVIEW && (
						<button
							type="button"
							className="more-btn"
							onClick={() => setAll((v) => !v)}
							aria-expanded={all}
						>
							{all ? 'Show fewer' : `Show all ${sorted.length}`}
						</button>
					)}
				</>
			)}
		</section>
	)
}

function NoteEditor({
	id,
	initial,
	onClose,
}: {
	id: string
	initial: string
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

	return (
		<div className="note-editor">
			<label htmlFor={`note-${id}`} className="sr-only">
				Note text. The first line is the title.
			</label>
			<textarea
				id={`note-${id}`}
				className="note-text"
				value={text}
				autoFocus
				onFocus={(e) => {
					const end = e.currentTarget.value.length
					e.currentTarget.setSelectionRange(end, end)
				}}
				placeholder="Start writing. The first line becomes the title."
				onChange={(e) => {
					setText(e.target.value)
					setStatus('saving')
					clearTimeout(timer.current)
					timer.current = window.setTimeout(() => {
						saveNote(id, e.target.value)
						setStatus('saved')
					}, 400)
				}}
				onBlur={() => {
					clearTimeout(timer.current)
					saveNote(id, latest.current)
					setStatus('saved')
				}}
				onKeyDown={(e) => {
					if (e.key === 'Escape') {
						e.preventDefault()
						e.stopPropagation()
						clearTimeout(timer.current)
						saveNote(id, latest.current)
						onClose()
					}
				}}
			/>
			<span className="note-status" aria-live="polite">
				{status === 'saving' ? 'Saving…' : 'Saved on this device'} · Esc to close
			</span>
		</div>
	)
}
