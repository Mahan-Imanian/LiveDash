import assert from 'node:assert/strict'
import { test } from 'node:test'
import { luminance, PHOTOS, pickPhoto, scrimFor } from '../src/app/photos.ts'

const contrast = (l: number) => 1.05 / (l + 0.05)

test('the veil makes white text reach 4.5:1 over the brightest pixels', () => {
	for (const bright of [0.05, 0.2, 0.5, 0.9]) {
		const lums = Array.from({ length: 100 }, (_, i) => (i < 90 ? 0.02 : bright))
		const a = scrimFor(lums)
		const l = lums.sort((x, y) => x - y)[90] * (1 - a)
		if (a < 0.85) assert.ok(contrast(l) >= 4.5 - 0.05, `alpha ${a} for ${bright}`)
	}
	assert.equal(scrimFor([0.001]), 0.12)
})

test('a dark photo still gets a light veil, never none', () => {
	assert.ok(scrimFor([luminance(20, 30, 60)]) >= 0.12)
})

test('rotation changes by calendar day and a fixed choice sticks', () => {
	const a = pickPhoto('rotate', new Date(2026, 10, 23, 1).getTime())
	const b = pickPhoto('rotate', new Date(2026, 10, 23, 23).getTime())
	const c = pickPhoto('rotate', new Date(2026, 10, 24, 1).getTime())
	assert.equal(a.id, b.id)
	assert.notEqual(a.id, c.id)
	assert.equal(pickPhoto('lake', 0).id, 'lake')
	assert.equal(PHOTOS.length, 6)
})
