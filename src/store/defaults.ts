import type { Parsed } from '@/lib/when'
import type { FocusState, Settings, State, Task } from './types'

export const PREFIX = 'ld.'

export function newTask(p: Parsed, tasks: Task[], url?: string): Task {
	return {
		id: crypto.randomUUID(),
		title: p.title,
		due: p.due,
		allDay: p.allDay,
		done: false,
		doneAt: null,
		createdAt: Date.now(),
		order: tasks.reduce((m, t) => Math.max(m, t.order), 0) + 1,
		url,
		repeat: p.repeat,
		repeatDay: p.repeatDay,
	}
}

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
	dateStyle: 'long',
	density: 'comfortable',
	headline: 'serif',
	background: { kind: 'paper', tone: 'sand', dim: 35 },
	modules: { shortcuts: true, pickup: true, today: true, notes: true, weather: true },
	engine: 'default',
	customEngine: '',
	keywords: [
		{ key: 'yt', name: 'YouTube', url: 'https://www.youtube.com/results?search_query=%s' },
		{ key: 'w', name: 'Wikipedia', url: 'https://en.wikipedia.org/wiki/Special:Search?search=%s' },
		{ key: 'gh', name: 'GitHub', url: 'https://github.com/search?q=%s' },
		{ key: 'maps', name: 'Maps', url: 'https://www.google.com/maps/search/%s' },
		{ key: 'tr', name: 'Translate', url: 'https://translate.google.com/?sl=auto&text=%s' },
	],
	typeOnOpen: true,
	switchTabs: true,
	suggestShortcuts: true,
	weatherUnit: 'auto',
	focus: { focus: 25, short: 5, long: 15, sound: true, notify: false },
}

export function mergeSettings(raw: unknown): Settings {
	const s = (raw ?? {}) as Partial<Settings>
	return {
		...defaultSettings,
		...s,
		focus: { ...defaultSettings.focus, ...s.focus },
		background: { ...defaultSettings.background, ...s.background },
		modules: { ...defaultSettings.modules, ...s.modules },
		keywords: Array.isArray(s.keywords) ? s.keywords : defaultSettings.keywords,
	}
}

export const defaults = (): State => ({
	tasks: [],
	notes: [],
	shortcuts: [],
	groups: [],
	focus: defaultFocus(),
	calendar: { url: null, events: [], fetchedAt: null, error: null },
	weather: { place: null, data: null, fetchedAt: null, error: null },
	daily: null,
	photo: null,
	launches: [],
	hidden: [],
	hours: { at: 0, data: {} },
	cache: { home: [], closed: [], at: 0 },
	ui: {
		welcomed: false,
		migrated: false,
		completedOpen: false,
		asked: false,
		group: 'all',
		tips: [],
	},
	settings: defaultSettings,
})
