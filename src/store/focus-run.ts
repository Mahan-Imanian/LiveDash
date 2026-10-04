import { toast } from '@/ui/toast'
import { MODE_LABEL, settle, start } from './focus-logic'
import { getState, update } from './store'

let ctx: AudioContext | null = null

function chime(): void {
	try {
		ctx ??= new AudioContext()
		const t = ctx.currentTime
		for (const [i, f] of [660, 880].entries()) {
			const o = ctx.createOscillator()
			const g = ctx.createGain()
			o.type = 'sine'
			o.frequency.value = f
			g.gain.setValueAtTime(0.0001, t + i * 0.18)
			g.gain.exponentialRampToValueAtTime(0.16, t + i * 0.18 + 0.02)
			g.gain.exponentialRampToValueAtTime(0.0001, t + i * 0.18 + 0.9)
			o.connect(g).connect(ctx.destination)
			o.start(t + i * 0.18)
			o.stop(t + i * 0.18 + 1)
		}
	} catch {}
}

export function finishIfDue(): void {
	const s = getState()
	const { state, finished } = settle(s.focus, s.settings)
	if (state === s.focus) return
	update('focus', () => state)
	if (!finished) return
	if (s.settings.focus.sound) chime()
	const next = MODE_LABEL[state.mode].toLowerCase()
	toast(finished === 'focus' ? `Focus session done. Time for a ${next}.` : 'Break’s over.', {
		tone: 'success',
		action: { label: `Start ${next}`, run: () => update('focus', (f) => start(f)) },
	})
}

export function startFocus(minutes?: number): string {
	const mins = Math.max(1, Math.min(180, Math.round(minutes ?? getState().settings.focus.focus)))
	update('focus', (f) =>
		start({ ...f, mode: 'focus', status: 'idle', endsAt: null, remaining: mins * 60_000 }),
	)
	return `Focus for ${mins} min`
}
