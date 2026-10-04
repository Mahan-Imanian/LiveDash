import type { HourCycle } from '@/lib/format'
import type { CalEvent } from '@/lib/ics'
import type { Dest, Launch } from '@/lib/rank'

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
}

export interface Note {
	id: string
	text: string
	createdAt: number
	updatedAt: number
}

export interface Shortcut {
	id: string
	url: string
	title: string
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

export type Accent = 'ember' | 'cobalt' | 'moss' | 'iris' | 'graphite'

export interface Settings {
	theme: 'auto' | 'light' | 'dark'
	accent: Accent
	hourCycle: HourCycle
	typeOnOpen: boolean
	switchTabs: boolean
	focus: { focus: number; short: number; long: number; sound: boolean; notify: boolean }
}

export interface Ui {
	welcomed: boolean
	migrated: boolean
	completedOpen: boolean
	asked: boolean
}

export interface State {
	tasks: Task[]
	notes: Note[]
	shortcuts: Shortcut[]
	focus: FocusState
	calendar: CalendarState
	launches: Launch[]
	hidden: string[]
	hours: { at: number; data: Record<string, number[]> }
	cache: Cache
	ui: Ui
	settings: Settings
}
