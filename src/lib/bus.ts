export type Panel = 'bookmarks' | 'tasks' | 'notes' | 'customize' | 'settings'

export type UiEvent =
	| { type: 'open'; panel: Panel; arg?: string }
	| { type: 'focus-mode'; on: boolean }
	| { type: 'prompt'; text?: string }
	| { type: 'refresh' }
	| { type: 'shortcut'; id?: string; url?: string; title?: string }

const target = new EventTarget()

export function emit(e: UiEvent): void {
	target.dispatchEvent(new CustomEvent('ui', { detail: e }))
}

export function on(fn: (e: UiEvent) => void): () => void {
	const h = (ev: Event) => fn((ev as CustomEvent<UiEvent>).detail)
	target.addEventListener('ui', h)
	return () => target.removeEventListener('ui', h)
}
