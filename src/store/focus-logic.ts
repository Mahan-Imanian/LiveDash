import { todayKey } from './defaults'
import type { FocusMode, FocusState, Settings } from './types'

export const MODE_LABEL: Record<FocusMode, string> = {
	focus: 'Focus',
	short: 'Short break',
	long: 'Long break',
}

export function modeMs(mode: FocusMode, s: Settings): number {
	return s.focus[mode] * 60_000
}

export function remainingMs(f: FocusState, now = Date.now()): number {
	if (f.status === 'running' && f.endsAt) return Math.max(0, f.endsAt - now)
	return f.remaining
}

function rollDay(f: FocusState, now: number): FocusState {
	const day = todayKey(now)
	return f.day === day ? f : { ...f, day, sessions: 0 }
}

export function start(f: FocusState, now = Date.now()): FocusState {
	if (f.status === 'running') return f
	return { ...rollDay(f, now), status: 'running', endsAt: now + f.remaining }
}

export function pause(f: FocusState, now = Date.now()): FocusState {
	if (f.status !== 'running' || !f.endsAt) return f
	return { ...f, status: 'paused', endsAt: null, remaining: Math.max(0, f.endsAt - now) }
}

export function reset(f: FocusState, s: Settings): FocusState {
	return { ...f, status: 'idle', endsAt: null, remaining: modeMs(f.mode, s) }
}

export function setMode(f: FocusState, mode: FocusMode, s: Settings): FocusState {
	return { ...f, mode, status: 'idle', endsAt: null, remaining: modeMs(mode, s) }
}

export function nextMode(f: FocusState): FocusMode {
	if (f.mode !== 'focus') return 'focus'
	return f.sessions > 0 && f.sessions % 4 === 0 ? 'long' : 'short'
}

export function settle(
	f: FocusState,
	s: Settings,
	now = Date.now(),
): { state: FocusState; finished: FocusMode | null } {
	if (f.status !== 'running' || !f.endsAt || f.endsAt > now)
		return { state: rollDay(f, now), finished: null }
	const finished = f.mode
	const counted = rollDay(f, f.endsAt)
	const sessions = finished === 'focus' ? counted.sessions + 1 : counted.sessions
	const done = { ...counted, sessions, lastCompletedAt: f.endsAt }
	const mode = nextMode(done)
	return {
		state: { ...done, mode, status: 'idle', endsAt: null, remaining: modeMs(mode, s) },
		finished,
	}
}
