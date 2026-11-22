import assert from 'node:assert/strict'
import { test } from 'node:test'

process.env.TZ = 'America/New_York'

const { parseSince } = await import('../src/lib/since.ts')

test('yesterday spans the short day after clocks go forward', () => {
	// Daylight saving began at 2:00 on Sunday, March 8, 2026 in New York.
	const now = new Date(2026, 2, 9, 10).getTime()
	const s = parseSince('yesterday', now)
	assert.ok(s)
	assert.equal(s.start, new Date(2026, 2, 8).getTime())
	assert.equal(s.end, new Date(2026, 2, 9).getTime())
	assert.equal((s.end - s.start) / 3_600_000, 23)
})

test('last night crosses the long night when clocks go back', () => {
	// Daylight saving ended at 2:00 on Sunday, November 1, 2026 in New York.
	const now = new Date(2026, 10, 1, 9).getTime()
	const s = parseSince('last night', now)
	assert.ok(s)
	assert.equal(s.start, new Date(2026, 9, 31, 18).getTime())
	assert.equal(s.end, new Date(2026, 10, 1, 4).getTime())
	assert.equal((s.end - s.start) / 3_600_000, 11)
})
