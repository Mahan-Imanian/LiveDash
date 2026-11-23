export interface Photo {
	id: string
	title: string
	/** Average colour, painted before the image decodes. */
	tint: string
}

/** Pictures bundled with the extension; none is fetched from the network. */
export const PHOTOS: Photo[] = [
	{ id: 'river', title: 'River city at dusk', tint: '#41465b' },
	{ id: 'lake', title: 'Mountain lake at blue hour', tint: '#1b3357' },
	{ id: 'harbour', title: 'Harbour lights after sunset', tint: '#24283b' },
	{ id: 'dunes', title: 'Dunes at last light', tint: '#4b2a30' },
	{ id: 'village', title: 'Alpine village in snow', tint: '#2a3a68' },
	{ id: 'rain', title: 'Rainy street at night', tint: '#322821' },
]

export const photoUrl = (p: Photo) => `/photos/${p.id}.jpg`

/** The chosen photo, or a different one each calendar day. */
export function pickPhoto(choice: string, now: number): Photo {
	const fixed = PHOTOS.find((p) => p.id === choice)
	if (fixed) return fixed
	const d = new Date(now)
	const day = Math.floor(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / 86_400_000)
	return PHOTOS[day % PHOTOS.length]
}

const lin = (v: number) => {
	const c = v / 255
	return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
}

export function luminance(r: number, g: number, b: number): number {
	return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b)
}

/**
 * How dark the veil over the photo must be for white text to reach `ratio`
 * against the brightest 10% of the pixels behind it. Returns an alpha for black.
 */
export function scrimFor(lums: number[], ratio = 4.5): number {
	if (!lums.length) return 0.4
	const sorted = [...lums].sort((a, b) => a - b)
	const bright = sorted[Math.floor(sorted.length * 0.9)]
	// contrast(white, L * (1 - a)) = 1.05 / (L * (1 - a) + 0.05) >= ratio
	const target = 1.05 / ratio - 0.05
	const a = 1 - target / Math.max(bright, 1e-4)
	return Math.round(Math.min(0.85, Math.max(0.12, a)) * 100) / 100
}
