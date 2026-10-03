let ctx: AudioContext | null = null

export function chime(): void {
	try {
		ctx ??= new AudioContext()
		const t = ctx.currentTime
		for (const [i, f] of [660, 880].entries()) {
			const o = ctx.createOscillator()
			const g = ctx.createGain()
			o.type = 'sine'
			o.frequency.value = f
			g.gain.setValueAtTime(0.0001, t + i * 0.18)
			g.gain.exponentialRampToValueAtTime(0.18, t + i * 0.18 + 0.02)
			g.gain.exponentialRampToValueAtTime(0.0001, t + i * 0.18 + 0.9)
			o.connect(g).connect(ctx.destination)
			o.start(t + i * 0.18)
			o.stop(t + i * 0.18 + 1)
		}
	} catch {}
}
