export type View = 'go' | 'later' | 'settings' | 'keys'

export type UiEvent =
	| { type: 'view'; view: View; note?: string }
	| { type: 'refresh' }
	| { type: 'prompt'; text?: string }

const target = new EventTarget()

export function emit(e: UiEvent): void {
	target.dispatchEvent(new CustomEvent('ui', { detail: e }))
}

export function on(fn: (e: UiEvent) => void): () => void {
	const h = (ev: Event) => fn((ev as CustomEvent<UiEvent>).detail)
	target.addEventListener('ui', h)
	return () => target.removeEventListener('ui', h)
}
