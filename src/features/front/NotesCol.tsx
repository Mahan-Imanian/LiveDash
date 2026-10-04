import { useState } from 'react'
import { emit } from '@/lib/bus'
import { formatRelative } from '@/lib/format'
import { addNote, noteTitle } from '@/store/actions'
import { useStore } from '@/store/store'
import { Glyph } from '@/ui/Glyph'
import { toast } from '@/ui/toast'

export function NotesCol({ now }: { now: number }) {
	const notes = useStore((s) => s.notes)
	const [text, setText] = useState('')
	const list = [...notes]
		.sort((a, b) => Number(!!b.pinned) - Number(!!a.pinned) || b.updatedAt - a.updatedAt)
		.slice(0, 4)

	return (
		<section className="col" aria-labelledby="nt-title">
			<h2 className="kicker" id="nt-title">
				Notes
			</h2>
			<form
				className="quick"
				onSubmit={(e) => {
					e.preventDefault()
					if (!text.trim()) return
					addNote(text.trim())
					setText('')
					toast('Note saved', { tone: 'success' })
				}}
			>
				<label className="sr-only" htmlFor="quick-note">
					Jot something down
				</label>
				<Glyph name="note" size={14} />
				<input
					id="quick-note"
					className="quick-input"
					placeholder="Jot something down"
					value={text}
					autoComplete="off"
					onChange={(e) => setText(e.target.value)}
				/>
			</form>
			{list.length > 0 && (
				<ul className="col-list">
					{list.map((n) => {
						const rest = n.text.trim().split('\n').slice(1).join(' ').trim()
						return (
							<li key={n.id}>
								<button
									type="button"
									className="col-item col-item--note"
									onClick={() => emit({ type: 'open', panel: 'notes', arg: n.id })}
								>
									<span className="col-text">
										<span className="col-title">
											{n.pinned && <Glyph name="pin" size={12} />} {noteTitle(n)}
										</span>
										<span className="col-meta">
											{formatRelative(n.updatedAt, now)}
											{rest ? ` · ${rest.slice(0, 90)}` : ''}
										</span>
									</span>
								</button>
							</li>
						)
					})}
				</ul>
			)}
			{notes.length > 0 && (
				<p className="col-foot">
					<button
						type="button"
						className="text-btn"
						onClick={() => emit({ type: 'open', panel: 'notes' })}
					>
						All notes · {notes.length}
					</button>
				</p>
			)}
		</section>
	)
}
