import { useSyncExternalStore } from 'react'

export interface Toast {
	id: number
	message: string
	tone: 'neutral' | 'success' | 'error'
	action?: { label: string; run: () => void }
	undo?: () => void
}

let current: Toast | null = null
let seq = 0
const listeners = new Set<() => void>()

function emit() {
	for (const l of listeners) l()
}

export function toast(message: string, opts: Omit<Partial<Toast>, 'id' | 'message'> = {}): void {
	current = {
		id: ++seq,
		message,
		tone: opts.tone ?? 'neutral',
		action: opts.action,
		undo: opts.undo,
	}
	emit()
}

export function dismissToast(id?: number): void {
	if (!current || (id !== undefined && current.id !== id)) return
	current = null
	emit()
}

export function runUndo(): boolean {
	const undo = current?.undo
	if (!undo) return false
	undo()
	current = { id: ++seq, message: 'Restored', tone: 'neutral' }
	emit()
	return true
}

export function useToast(): Toast | null {
	return useSyncExternalStore(
		(l) => {
			listeners.add(l)
			return () => listeners.delete(l)
		},
		() => current,
	)
}
