import type { HourCycle } from '@/lib/format'
import type { CalEvent } from '@/lib/ics'

export interface Task {
	id: string
	title: string
	due: number | null
	allDay: boolean
	done: boolean
	doneAt: number | null
	createdAt: number
	order: number
}

export interface Note {
	id: string
	text: string
	createdAt: number
	updatedAt: number
}

export type ShortcutIcon =
	| { kind: 'site' }
	| { kind: 'mono'; color: string }
	| { kind: 'image'; data: string }

export interface Shortcut {
	id: string
	url: string
	title: string
	icon: ShortcutIcon
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
}

export interface CalendarState {
	url: string | null
	events: CalEvent[]
	fetchedAt: number | null
	error: string | null
}

export interface Place {
	name: string
	region?: string
	lat: number
	lon: number
}

export interface WeatherData {
	temp: number
	code: number
	isDay: boolean
	max: number
	min: number
	unit: 'c' | 'f'
}

export interface WeatherState {
	place: Place | null
	data: WeatherData | null
	fetchedAt: number | null
	error: string | null
}

export type Accent = 'ember' | 'cobalt' | 'moss' | 'iris' | 'graphite'

export interface Settings {
	theme: 'auto' | 'light' | 'dark'
	accent: Accent
	hourCycle: HourCycle
	showSeconds: boolean
	panels: { shortcuts: boolean; notes: boolean; focus: boolean }
	weatherUnit: 'auto' | 'c' | 'f'
	focus: { focus: number; short: number; long: number; sound: boolean; notify: boolean }
}

export interface Ui {
	welcomed: boolean
	migrated: boolean
	completedOpen: boolean
}

export interface State {
	tasks: Task[]
	notes: Note[]
	shortcuts: Shortcut[]
	focus: FocusState
	calendar: CalendarState
	weather: WeatherState
	ui: Ui
	settings: Settings
}
