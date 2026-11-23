import { browser } from 'wxt/browser'
import type { EngineId } from '@/lib/engines'

export interface Settings {
	/** The user turned remembering on. Access to sites is the separate permission. */
	remember: boolean
	/** Sites never remembered, by host ("example.com" also covers its subdomains). */
	paused: string[]
	/** Show a sentence from something read before on the empty new tab. */
	resurface: boolean
	/** Photo id, or "rotate" for a different one each day. */
	photo: string
	hourCycle: 'auto' | 'h12' | 'h23'
	engine: EngineId
	customEngine: string
}

export const DEFAULTS: Settings = {
	remember: false,
	paused: [],
	resurface: true,
	photo: 'rotate',
	hourCycle: 'auto',
	engine: 'default',
	customEngine: '',
}

export const KEY = 'ld.memory.settings'
export const ORIGINS = ['https://*/*']

export function merge(raw: unknown): Settings {
	const r = (raw && typeof raw === 'object' ? raw : {}) as Partial<Settings>
	return {
		...DEFAULTS,
		...r,
		paused: Array.isArray(r.paused) ? r.paused.filter((s) => typeof s === 'string') : [],
	}
}

export async function loadSettings(): Promise<Settings> {
	try {
		const r = await browser.storage.sync.get(KEY)
		return merge(r[KEY])
	} catch {
		return { ...DEFAULTS }
	}
}

export async function saveSettings(patch: Partial<Settings>): Promise<Settings> {
	const next = { ...(await loadSettings()), ...patch }
	await browser.storage.sync.set({ [KEY]: next })
	return next
}

export function onSettings(fn: (s: Settings) => void): () => void {
	const h = (changes: Record<string, { newValue?: unknown }>, area: string) => {
		if (area === 'sync' && changes[KEY]) fn(merge(changes[KEY].newValue))
	}
	browser.storage.onChanged.addListener(h)
	return () => browser.storage.onChanged.removeListener(h)
}

export type Message =
	| { type: 'ld-page'; url: string; title: string; paras: string[] }
	| { type: 'ld-read'; url: string; ms: number }
	| { type: 'ld-start' }
	| { type: 'ld-forget'; scope: 'page' | 'site' | 'hour' | 'day' | 'all'; value?: string }
