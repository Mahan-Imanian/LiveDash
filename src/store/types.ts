import type { HourCycle } from '@/lib/format'
import type { CalEvent } from '@/lib/ics'
import type { Dest, Launch } from '@/lib/rank'
import type { Repeat } from '@/lib/when'

export interface Task {
	id: string
	title: string
	due: number | null
	allDay: boolean
	done: boolean
	doneAt: number | null
	createdAt: number
	order: number
	url?: string
	repeat?: Repeat
}

export interface Note {
	id: string
	text: string
	createdAt: number
	updatedAt: number
	pinned?: boolean
}

export type ShortcutIcon =
	| { kind: 'site' }
	| { kind: 'letter'; color: string }
	| { kind: 'image'; data: string }

export interface Shortcut {
	id: string
	url: string
	title: string
	group?: string
	icon?: ShortcutIcon
}

export interface Group {
	id: string
	name: string
}

export type FocusMode = 'focus' | 'short' | 'long'

export interface FocusState {
	mode: FocusMode
	status: 'idle' | 'running' | 'paused'
	endsAt: number | null
	remaining: number
	day: string
	sessions: number
	lastCompletedAt: number | null
	intent?: string
}

export interface CalendarState {
	url: string | null
	events: CalEvent[]
	fetchedAt: number | null
	error: string | null
}

export interface Closed {
	id: string
	kind: 'tab' | 'window'
	title: string
	url?: string
	count: number
	at: number
}

export interface Cache {
	home: Dest[]
	closed: Closed[]
	at: number
}

export interface Place {
	name: string
	region?: string
	lat: number
	lon: number
}

export interface Forecast {
	temp: number
	code: number
	isDay: boolean
	unit: 'c' | 'f'
	days: { date: string; max: number; min: number; code: number; rain: number }[]
	hourly: { t: number; temp: number; code: number }[]
}

export interface WeatherState {
	place: Place | null
	data: Forecast | null
	fetchedAt: number | null
	error: string | null
}

export interface Daily {
	date: string
	src: string
	title: string
	credit: string
	license: string
	page: string
}

export interface Background {
	kind: 'paper' | 'tone' | 'photo' | 'daily'
	tone: string
	dim: number
}

export type Accent = 'ember' | 'cobalt' | 'moss' | 'iris' | 'graphite'

export type EngineId =
	| 'default'
	| 'google'
	| 'duckduckgo'
	| 'bing'
	| 'brave'
	| 'kagi'
	| 'ecosia'
	| 'startpage'
	| 'custom'

export interface Keyword {
	key: string
	name: string
	url: string
}

export interface Modules {
	shortcuts: boolean
	pickup: boolean
	today: boolean
	notes: boolean
	weather: boolean
}

export interface Settings {
	theme: 'auto' | 'light' | 'dark'
	accent: Accent
	hourCycle: HourCycle
	dateStyle: 'long' | 'short'
	density: 'comfortable' | 'compact'
	headline: 'serif' | 'sans'
	background: Background
	modules: Modules
	engine: EngineId
	customEngine: string
	keywords: Keyword[]
	typeOnOpen: boolean
	switchTabs: boolean
	suggestShortcuts: boolean
	weatherUnit: 'auto' | 'c' | 'f'
	focus: { focus: number; short: number; long: number; sound: boolean; notify: boolean }
}

export interface Ui {
	welcomed: boolean
	migrated: boolean
	completedOpen: boolean
	asked: boolean
	group: string
	tips: string[]
}

export interface State {
	tasks: Task[]
	notes: Note[]
	shortcuts: Shortcut[]
	groups: Group[]
	focus: FocusState
	calendar: CalendarState
	weather: WeatherState
	daily: Daily | null
	photo: string | null
	launches: Launch[]
	hidden: string[]
	hours: { at: number; data: Record<string, number[]> }
	cache: Cache
	ui: Ui
	settings: Settings
}
