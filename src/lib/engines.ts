import type { EngineId, Keyword } from '@/store/types'

export interface Engine {
	id: EngineId
	name: string
	url: string
}

export const ENGINES: Engine[] = [
	{ id: 'default', name: 'Chrome default', url: '' },
	{ id: 'google', name: 'Google', url: 'https://www.google.com/search?q=%s' },
	{ id: 'duckduckgo', name: 'DuckDuckGo', url: 'https://duckduckgo.com/?q=%s' },
	{ id: 'bing', name: 'Bing', url: 'https://www.bing.com/search?q=%s' },
	{ id: 'brave', name: 'Brave Search', url: 'https://search.brave.com/search?q=%s' },
	{ id: 'kagi', name: 'Kagi', url: 'https://kagi.com/search?q=%s' },
	{ id: 'ecosia', name: 'Ecosia', url: 'https://www.ecosia.org/search?q=%s' },
	{ id: 'startpage', name: 'Startpage', url: 'https://www.startpage.com/do/search?query=%s' },
	{ id: 'custom', name: 'Custom', url: '' },
]

export function engineName(id: EngineId): string {
	return ENGINES.find((e) => e.id === id)?.name ?? 'Search'
}

export function fill(template: string, q: string): string | null {
	if (!template.includes('%s')) return null
	const url = template.replace(/%s/g, encodeURIComponent(q))
	return /^https?:\/\//i.test(url) ? url : null
}

export function engineUrl(id: EngineId, custom: string, q: string): string | null {
	if (id === 'default') return null
	if (id === 'custom') return fill(custom, q)
	return fill(ENGINES.find((e) => e.id === id)?.url ?? '', q)
}

export function matchKeyword(
	text: string,
	keywords: Keyword[],
): { kw: Keyword; query: string } | null {
	const m = /^(\S+)\s+(.+)$/.exec(text.trim())
	if (!m) return null
	const kw = keywords.find((k) => k.key.toLowerCase() === m[1].toLowerCase())
	return kw ? { kw, query: m[2] } : null
}
