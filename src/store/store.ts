import { useSyncExternalStore } from 'react'
import { browser } from 'wxt/browser'
import { defaultSettings, defaults, PREFIX } from './defaults'
import type { Settings, State } from './types'

export { defaults, PREFIX, todayKey } from './defaults'

type Key = keyof State
const LOCAL: Key[] = ['tasks', 'notes', 'shortcuts', 'focus', 'calendar', 'weather', 'ui']

let state: State = defaults()
const listeners = new Set<() => void>()
const errorListeners = new Set<(message: string) => void>()

function emit() {
	for (const l of listeners) l()
}

function mergeSettings(raw: unknown): Settings {
	const s = (raw ?? {}) as Partial<Settings>
	return {
		...defaultSettings,
		...s,
		panels: { ...defaultSettings.panels, ...s.panels },
		focus: { ...defaultSettings.focus, ...s.focus },
	}
}

function hydrate(key: Key, value: unknown): State[Key] {
	const base = defaults()
	if (value === undefined || value === null) return base[key]
	if (key === 'settings') return mergeSettings(value)
	if (Array.isArray(base[key])) return Array.isArray(value) ? (value as State[Key]) : base[key]
	return { ...(base[key] as object), ...(value as object) } as State[Key]
}

export async function loadStore(): Promise<State> {
	const [local, sync] = await Promise.all([
		browser.storage.local.get(LOCAL.map((k) => PREFIX + k)),
		browser.storage.sync.get(`${PREFIX}settings`).catch(() => ({}) as Record<string, unknown>),
	])
	const next = defaults()
	for (const k of LOCAL)
		(next as unknown as Record<Key, unknown>)[k] = hydrate(k, local[PREFIX + k])
	next.settings = mergeSettings(sync[`${PREFIX}settings`])
	state = next
	browser.storage.onChanged.addListener((changes, area) => {
		let changed = false
		for (const [full, change] of Object.entries(changes)) {
			if (!full.startsWith(PREFIX)) continue
			const key = full.slice(PREFIX.length) as Key
			if (!(key in state)) continue
			if ((key === 'settings') !== (area === 'sync')) continue
			const value = hydrate(key, change.newValue)
			if (JSON.stringify(value) === JSON.stringify(state[key])) continue
			state = { ...state, [key]: value }
			changed = true
		}
		if (changed) emit()
	})
	return state
}

export function getState(): State {
	return state
}

export function subscribe(l: () => void): () => void {
	listeners.add(l)
	return () => listeners.delete(l)
}

export function onStoreError(l: (message: string) => void): () => void {
	errorListeners.add(l)
	return () => errorListeners.delete(l)
}

export function useStore<T>(select: (s: State) => T): T {
	return useSyncExternalStore(subscribe, () => select(state))
}

export function update<K extends Key>(key: K, fn: (prev: State[K]) => State[K]): State[K] {
	const next = fn(state[key])
	if (next === state[key]) return next
	state = { ...state, [key]: next }
	emit()
	const area = key === 'settings' ? browser.storage.sync : browser.storage.local
	area.set({ [PREFIX + key]: next }).catch((err: unknown) => {
		const message =
			err instanceof Error && /quota/i.test(err.message)
				? 'Storage is full. Remove large images or old notes, then try again.'
				: 'Could not save your last change. It will be lost when this tab closes.'
		for (const l of errorListeners) l(message)
	})
	return next
}

export function uid(): string {
	return crypto.randomUUID()
}
