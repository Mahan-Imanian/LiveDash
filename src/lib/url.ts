const TLD = /\.[a-z]{2,}(?::\d+)?(?:[/?#]|$)/i

export function looksLikeUrl(input: string): boolean {
	const s = input.trim()
	if (!s || /\s/.test(s)) return false
	if (/^https?:\/\//i.test(s)) return true
	if (/^localhost(?::\d+)?(?:\/|$)/i.test(s)) return true
	return TLD.test(s) && !s.startsWith('.')
}

export function toUrl(input: string): string | null {
	const s = input.trim()
	if (!s) return null
	const withScheme = /^[a-z][a-z0-9+.-]*:\/\//i.test(s) ? s : `https://${s}`
	try {
		const u = new URL(withScheme)
		if (u.protocol !== 'https:' && u.protocol !== 'http:') return null
		if (!u.hostname.includes('.') && u.hostname !== 'localhost') return null
		return u.href
	} catch {
		return null
	}
}

export function hostOf(url: string): string {
	try {
		return new URL(url).hostname.replace(/^www\./, '')
	} catch {
		return url
	}
}

export function titleFromUrl(url: string): string {
	const host = hostOf(url)
	const name = host.split('.').slice(-2, -1)[0] || host
	return name.charAt(0).toUpperCase() + name.slice(1)
}
