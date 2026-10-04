import { type FormEvent, useEffect, useRef, useState } from 'react'
import { titleFromUrl, toUrl } from '@/lib/url'
import { addShortcut, editShortcut, removeShortcut } from '@/store/actions'
import { getState, useStore } from '@/store/store'
import type { ShortcutIcon } from '@/store/types'
import { Favicon, LETTER_COLORS } from '@/ui/controls'
import { Drawer } from '@/ui/Drawer'
import { Glyph } from '@/ui/Glyph'
import { toast } from '@/ui/toast'

async function resizeImage(file: File): Promise<string> {
	const bitmap = await createImageBitmap(file)
	const size = 96
	const canvas = document.createElement('canvas')
	canvas.width = size
	canvas.height = size
	const ctx = canvas.getContext('2d')!
	const scale = Math.max(size / bitmap.width, size / bitmap.height)
	ctx.drawImage(
		bitmap,
		(size - bitmap.width * scale) / 2,
		(size - bitmap.height * scale) / 2,
		bitmap.width * scale,
		bitmap.height * scale,
	)
	return canvas.toDataURL('image/webp', 0.9)
}

export function ShortcutEditor({
	state,
	group,
	onClose,
}: {
	state: { id?: string; url?: string; title?: string } | null
	group: string
	onClose: () => void
}) {
	const groups = useStore((s) => s.groups)
	const editing = state?.id ? getState().shortcuts.find((s) => s.id === state.id) : undefined
	const [url, setUrl] = useState('')
	const [title, setTitle] = useState('')
	const [target, setTarget] = useState('all')
	const [icon, setIcon] = useState<ShortcutIcon>({ kind: 'site' })
	const [error, setError] = useState<string | null>(null)
	const fileRef = useRef<HTMLInputElement>(null)

	useEffect(() => {
		if (!state) return
		setUrl(editing?.url ?? state.url ?? '')
		setTitle(editing?.title ?? state.title ?? '')
		setTarget(editing ? (editing.group ?? 'all') : group)
		setIcon(editing?.icon ?? { kind: 'site' })
		setError(null)
	}, [state, editing, group])

	const normalized = toUrl(url)
	const name = title.trim() || (normalized ? titleFromUrl(normalized) : '')

	function submit(e: FormEvent) {
		e.preventDefault()
		if (!normalized) return setError('Enter a web address, like example.com')
		const g = target === 'all' ? undefined : target
		if (editing) {
			if (editShortcut(editing.id, { url: normalized, title: name, group: g, icon })) {
				toast(`Saved ${name}`, { tone: 'success' })
				onClose()
			}
			return
		}
		const s = addShortcut(normalized, name, target)
		if (s) {
			if (icon.kind !== 'site') editShortcut(s.id, { icon })
			toast(`Added ${name}`, { tone: 'success' })
			onClose()
		}
	}

	return (
		<Drawer
			open={!!state}
			onClose={onClose}
			title={editing ? 'Edit shortcut' : 'Add a shortcut'}
			kicker="Shortcuts"
			center
			initialFocus="#sc-url"
		>
			<form className="form" onSubmit={submit} noValidate>
				<label className="field">
					<span className="field-label">Address</span>
					<input
						id="sc-url"
						className="line-input"
						inputMode="url"
						placeholder="example.com"
						autoComplete="off"
						spellCheck={false}
						value={url}
						aria-invalid={!!error}
						aria-describedby={error ? 'sc-err' : undefined}
						onChange={(e) => {
							setUrl(e.target.value)
							setError(null)
						}}
					/>
					{error && (
						<span className="field-error" id="sc-err" role="alert">
							{error}
						</span>
					)}
				</label>
				<label className="field">
					<span className="field-label">Name</span>
					<input
						className="line-input"
						placeholder={normalized ? titleFromUrl(normalized) : 'Optional'}
						value={title}
						onChange={(e) => setTitle(e.target.value)}
					/>
				</label>
				{groups.length > 0 && (
					<label className="field">
						<span className="field-label">Group</span>
						<select className="select" value={target} onChange={(e) => setTarget(e.target.value)}>
							<option value="all">No group</option>
							{groups.map((g) => (
								<option key={g.id} value={g.id}>
									{g.name}
								</option>
							))}
						</select>
					</label>
				)}
				<fieldset className="field">
					<legend className="field-label">Icon</legend>
					<div className="icon-row" role="radiogroup" aria-label="Icon">
						<button
							type="button"
							role="radio"
							className="icon-choice"
							aria-checked={icon.kind === 'site'}
							aria-label="Site icon"
							onClick={() => setIcon({ kind: 'site' })}
						>
							{normalized ? (
								<Favicon url={normalized} label={name || '?'} />
							) : (
								<Glyph name="search" />
							)}
						</button>
						{LETTER_COLORS.map((c) => (
							<button
								type="button"
								role="radio"
								key={c}
								className="icon-choice"
								aria-checked={icon.kind === 'letter' && icon.color === c}
								aria-label={`Letter on colour ${c}`}
								onClick={() => setIcon({ kind: 'letter', color: c })}
							>
								<span className="fav fav--letter" style={{ background: c }}>
									{(name || '?')[0].toUpperCase()}
								</span>
							</button>
						))}
						<button
							type="button"
							role="radio"
							className="icon-choice"
							aria-checked={icon.kind === 'image'}
							aria-label="Upload an image"
							title="Upload an image"
							onClick={() => fileRef.current?.click()}
						>
							{icon.kind === 'image' ? (
								<img className="fav fav--image" src={icon.data} alt="" />
							) : (
								<Glyph name="plus" />
							)}
						</button>
						<input
							ref={fileRef}
							type="file"
							accept="image/*"
							className="sr-only"
							tabIndex={-1}
							aria-hidden="true"
							onChange={async (e) => {
								const f = e.target.files?.[0]
								e.target.value = ''
								if (!f) return
								try {
									setIcon({ kind: 'image', data: await resizeImage(f) })
								} catch {
									toast('That image couldn’t be read. Try a PNG or JPG.', { tone: 'error' })
								}
							}}
						/>
					</div>
				</fieldset>
				<div className="form-actions">
					{editing && (
						<button
							type="button"
							className="text-btn text-btn--danger"
							onClick={() => {
								removeShortcut(editing.id)
								onClose()
							}}
						>
							Remove
						</button>
					)}
					<span className="spacer" />
					<button type="button" className="btn btn--quiet" onClick={onClose}>
						Cancel
					</button>
					<button type="submit" className="btn">
						{editing ? 'Save' : 'Add'}
					</button>
				</div>
			</form>
		</Drawer>
	)
}
