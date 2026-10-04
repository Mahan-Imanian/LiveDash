import type { Daily } from '@/store/types'
import { hasPermission, requestPermission } from './chrome'

export const DAILY_ORIGINS = ['https://en.wikipedia.org/*', 'https://upload.wikimedia.org/*']

interface Featured {
	image?: {
		title: string
		thumbnail?: { source: string; width: number; height: number }
		image?: { source: string; width: number; height: number }
		file_page: string
		artist?: { text?: string }
		credit?: { text?: string }
		license?: { type?: string }
		description?: { text?: string }
	}
}

export function ymd(d: Date): string {
	return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}`
}

function sized(src: string, width: number): string {
	return src.replace(/\/(\d+)px-([^/]+)$/, `/${width}px-$2`)
}

async function toDataUrl(url: string): Promise<string> {
	const res = await fetch(url, { credentials: 'omit' })
	if (!res.ok) throw new Error(`Image download failed (${res.status})`)
	const blob = await res.blob()
	return await new Promise<string>((resolve, reject) => {
		const r = new FileReader()
		r.onload = () => resolve(String(r.result))
		r.onerror = () => reject(new Error('Could not read the image'))
		r.readAsDataURL(blob)
	})
}

export async function ensureDailyAccess(): Promise<boolean> {
	return (
		(await hasPermission({ origins: DAILY_ORIGINS })) ||
		requestPermission({ origins: DAILY_ORIGINS })
	)
}

export async function fetchDaily(now = new Date()): Promise<Daily> {
	if (!(await hasPermission({ origins: DAILY_ORIGINS })))
		throw new Error('Access to Wikipedia was turned off.')
	for (let back = 0; back < 7; back++) {
		const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - back)
		let res: Response
		try {
			res = await fetch(`https://en.wikipedia.org/api/rest_v1/feed/featured/${ymd(d)}`, {
				credentials: 'omit',
				headers: { 'Api-User-Agent': 'LiveDash new tab (github.com/Mahan-Imanian/LiveDash)' },
			})
		} catch {
			throw new Error('Couldn’t reach Wikipedia. You may be offline.')
		}
		if (!res.ok) continue
		const data = (await res.json()) as Featured
		const img = data.image
		const thumb = img?.thumbnail
		if (!img || !thumb || thumb.width <= thumb.height) continue
		const src = await toDataUrl(sized(thumb.source, 1920))
		return {
			date: ymd(now),
			src,
			title: img.description?.text?.trim() || img.title.replace(/^File:/, '').replace(/\.\w+$/, ''),
			credit: img.artist?.text?.trim() || img.credit?.text?.trim() || 'Wikimedia Commons',
			license: img.license?.type || 'see source',
			page: img.file_page,
		}
	}
	throw new Error('No landscape picture of the day this week.')
}
