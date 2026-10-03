import { ImagePlus } from 'lucide-react'
import { type FormEvent, useEffect, useRef, useState } from 'react'
import { faviconUrl } from '@/lib/chrome'
import { titleFromUrl, toUrl } from '@/lib/url'
import { addShortcut, editShortcut, removeShortcut } from '@/store/actions'
import { getState } from '@/store/store'
import type { ShortcutIcon } from '@/store/types'
import { MONO_COLORS, monoText } from '@/ui/controls'
import { Dialog } from '@/ui/Dialog'
import { toast } from '@/ui/toast'

interface Props {
	state: { id?: string; url?: string; title?: string } | null
	onClose: () => void
}

async function resizeImage(file: File): Promise<string> {
	const bitmap = await createImageBitmap(file)
	const size = 96
	const canvas = document.createElement('canvas')
	canvas.width = size
	canvas.height = size
	const ctx = canvas.getContext('2d')!
	const scale = Math.max(size / bitmap.width, size / bitmap.height)
	const w = bitmap.width * scale
	const h = bitmap.height * scale
	ctx.drawImage(bitmap, (size - w) / 2, (size - h) / 2, w, h)
	return canvas.toDataURL('image/webp', 0.9)
}

export function ShortcutDialog({ state, onClose }: Props) {
	const editing = state?.id ? getState().shortcuts.find((s) => s.id === state.id) : undefined
	const [url, setUrl] = useState('')
	const [title, setTitle] = useState('')
	const [icon, setIcon] = useState<ShortcutIcon>({ kind: 'site' })
	const [error, setError] = useState<string | null>(null)
	const fileRef = useRef<HTMLInputElement>(null)

	useEffect(() => {
		if (!state) return
		setUrl(editing?.url ?? state.url ?? '')
		setTitle(editing?.title ?? state.title ?? '')
		setIcon(editing?.icon ?? { kind: 'site' })
		setError(null)
	}, [state, editing])

	const normalized = toUrl(url)
	const name = title.trim() || (normalized ? titleFromUrl(normalized) : '')

	function submit(e: FormEvent) {
		e.preventDefault()
		if (!normalized) {
			setError('Enter a web address, like example.com')
			return
		}
		if (editing) {
			if (editShortcut(editing.id, { url: normalized, title: name, icon })) {
				toast(`Saved ${name}`, { tone: 'success' })
				onClose()
			}
		} else if (addShortcut(normalized, name, icon)) {
			toast(`Pinned ${name}`, { tone: 'success' })
			onClose()
		}
	}

	return (
		<Dialog
			open={!!state}
			onClose={onClose}
			title={editing ? 'Edit shortcut' : 'Add a shortcut'}
			initialFocus="#sc-url"
			footer={
				<>
					{editing && (
						<button
							type="button"
							className="btn btn--danger"
							onClick={() => {
								removeShortcut(editing.id)
								onClose()
							}}
						>
							Unpin
						</button>
					)}
					<span className="spacer" />
					<button type="button" className="btn btn--ghost" onClick={onClose}>
						Cancel
					</button>
					<button type="submit" form="sc-form" className="btn btn--primary">
						{editing ? 'Save' : 'Pin site'}
					</button>
				</>
			}
		>
			<form id="sc-form" onSubmit={submit} noValidate>
				<div className="field">
					<label className="field-label" htmlFor="sc-url">
						Web address
					</label>
					<input
						id="sc-url"
						className="text-input"
						inputMode="url"
						placeholder="example.com"
						autoComplete="off"
						spellCheck={false}
						value={url}
						aria-invalid={!!error}
						aria-describedby={error ? 'sc-url-err' : undefined}
						onChange={(e) => {
							setUrl(e.target.value)
							setError(null)
						}}
					/>
					{error && (
						<span className="input-error" id="sc-url-err">
							{error}
						</span>
					)}
				</div>
				<div className="field">
					<label className="field-label" htmlFor="sc-title">
						Name
					</label>
					<input
						id="sc-title"
						className="text-input"
						placeholder={normalized ? titleFromUrl(normalized) : 'Optional'}
						value={title}
						onChange={(e) => setTitle(e.target.value)}
					/>
				</div>
				<fieldset className="field" style={{ border: 0, padding: 0, margin: 0 }}>
					<legend className="field-label" style={{ marginBottom: 8 }}>
						Icon
					</legend>
					<div className="icon-picker" role="radiogroup" aria-label="Icon">
						<button
							type="button"
							role="radio"
							className="icon-option"
							aria-checked={icon.kind === 'site'}
							aria-label="Site icon"
							title="Site icon"
							onClick={() => setIcon({ kind: 'site' })}
						>
							{normalized ? (
								<img src={faviconUrl(normalized, 64)} alt="" />
							) : (
								<span className="setting-desc">Site</span>
							)}
						</button>
						{MONO_COLORS.map((c) => (
							<button
								type="button"
								role="radio"
								key={c}
								className="icon-option"
								aria-checked={icon.kind === 'mono' && icon.color === c}
								aria-label={`Letters on color ${c}`}
								onClick={() => setIcon({ kind: 'mono', color: c })}
							>
								<span className="mono" style={{ background: c, fontSize: 13 }}>
									{monoText(name || '?')}
								</span>
							</button>
						))}
						<button
							type="button"
							role="radio"
							className="icon-option"
							aria-label="Upload an image"
							title="Upload an image"
							aria-checked={icon.kind === 'image'}
							onClick={() => fileRef.current?.click()}
						>
							{icon.kind === 'image' ? (
								<img src={icon.data} alt="" data-kind="image" />
							) : (
								<ImagePlus size={18} aria-hidden="true" />
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
			</form>
		</Dialog>
	)
}
