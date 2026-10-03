export type UiEvent =
	| { type: 'palette'; text?: string }
	| { type: 'settings'; section?: string }
	| { type: 'help' }
	| { type: 'note'; id?: string; text?: string }
	| { type: 'shortcut'; id?: string; url?: string; title?: string }
	| { type: 'task'; id: string }

const target = new EventTarget()

export function emit(e: UiEvent): void {
	target.dispatchEvent(new CustomEvent('ui', { detail: e }))
}

export function on(fn: (e: UiEvent) => void): () => void {
	const h = (ev: Event) => fn((ev as CustomEvent<UiEvent>).detail)
	target.addEventListener('ui', h)
	return () => target.removeEventListener('ui', h)
}
