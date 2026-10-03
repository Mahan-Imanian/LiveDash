import type { FocusState, Settings, State } from './types'

export const PREFIX = 'ld.'

export function todayKey(t = Date.now()): string {
	const d = new Date(t)
	return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`
}

export const defaultFocus = (): FocusState => ({
	mode: 'focus',
	status: 'idle',
	endsAt: null,
	remaining: 25 * 60_000,
	day: todayKey(),
	sessions: 0,
	lastCompletedAt: null,
})

export const defaultSettings: Settings = {
	theme: 'auto',
	accent: 'ember',
	hourCycle: 'auto',
	showSeconds: false,
	panels: { shortcuts: true, notes: true, focus: true },
	weatherUnit: 'auto',
	focus: { focus: 25, short: 5, long: 15, sound: true, notify: false },
}

export const defaults = (): State => ({
	tasks: [],
	notes: [],
	shortcuts: [],
	focus: defaultFocus(),
	calendar: { url: null, events: [], fetchedAt: null, error: null },
	weather: { place: null, data: null, fetchedAt: null, error: null },
	ui: { welcomed: false, migrated: false, completedOpen: false },
	settings: defaultSettings,
})
