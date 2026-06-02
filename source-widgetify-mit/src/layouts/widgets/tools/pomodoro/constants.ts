import type { TimerMode } from './types'

export const modeLabels: Record<TimerMode, string> = {
	work: 'Work',
	'short-break': 'DashLive',
}

export const modeFullLabels: Record<TimerMode, string> = {
	work: 'DashLiveWork',
	'short-break': 'Break DashLive',
}
