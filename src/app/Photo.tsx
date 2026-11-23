import { useEffect, useRef, useState } from 'react'
import { luminance, photoUrl, pickPhoto, scrimFor } from './photos'

/**
 * The background photo. Once it decodes, the pixels behind the text are sampled
 * and the veil is set so white text keeps at least 4.5:1 against them.
 */
export function Photo({ choice, now }: { choice: string; now: number }) {
	const photo = pickPhoto(choice, now)
	const img = useRef<HTMLImageElement>(null)
	const [ready, setReady] = useState(false)

	useEffect(() => {
		document.documentElement.style.setProperty('--tint', photo.tint)
		try {
			localStorage.setItem('ld-tint', photo.tint)
		} catch {}
	}, [photo.tint])

	const measure = () => {
		const el = img.current
		if (!el) return
		const w = 96
		const h = 64
		const c = document.createElement('canvas')
		c.width = w
		c.height = h
		const x = c.getContext('2d', { willReadFrequently: true })
		if (!x) return
		x.drawImage(el, 0, 0, w, h)
		// The text column: from the search field to below the sentence.
		const d = x.getImageData(
			Math.round(w * 0.05),
			Math.round(h * 0.12),
			Math.round(w * 0.9),
			Math.round(h * 0.42),
		).data
		const lums: number[] = []
		for (let i = 0; i < d.length; i += 4) lums.push(luminance(d[i], d[i + 1], d[i + 2]))
		document.documentElement.style.setProperty('--scrim', String(scrimFor(lums)))
		setReady(true)
	}

	return (
		<div className="photo">
			<img
				ref={img}
				key={photo.id}
				src={photoUrl(photo)}
				alt=""
				decoding="async"
				className={ready ? 'ready' : ''}
				onLoad={measure}
			/>
		</div>
	)
}
