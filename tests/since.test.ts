import assert from 'node:assert/strict'
import { test } from 'node:test'
import { parseSince, type ScopeEvent } from '../src/lib/since.ts'

// Monday, October 5, 2026, 9:00 local time.
const now = new Date(2026, 9, 5, 9, 0).getTime()
const at = (m: number, d: number, h = 0) => new Date(2026, m, d, h).getTime()

function window(q: string, events: ScopeEvent[] = []) {
	const s = parseSince(q, now, events)
	return s && { text: s.text, phrase: s.phrase, start: s.start, end: s.end, label: s.label }
}

test('a time phrase at the end or the start narrows the search', () => {
	assert.deepEqual(window('figma yesterday'), {
		text: 'figma',
		phrase: 'yesterday',
		start: at(9, 4),
		end: at(9, 5),
		label: 'yesterday',
	})
	assert.deepEqual(window('Yesterday afternoon github'), {
		text: 'github',
		phrase: 'Yesterday afternoon',
		start: at(9, 4, 12),
		end: at(9, 4, 17),
		label: 'yesterday afternoon',
	})
	assert.deepEqual(window('last night'), {
		text: '',
		phrase: 'last night',
		start: at(9, 4, 18),
		end: at(9, 5, 4),
		label: 'last night',
	})
})

test('parts of today end at the current time', () => {
	assert.deepEqual(window('docs this morning'), {
		text: 'docs',
		phrase: 'this morning',
		start: at(9, 5, 5),
		end: now,
		label: 'this morning',
	})
	assert.equal(window('this afternoon'), null, 'the afternoon has not started at 9:00')
	assert.equal(window('earlier today')?.start, at(9, 5))
})

test('days ago, weekdays and weeks', () => {
	assert.deepEqual(window('3 days ago')?.start, at(9, 2))
	assert.deepEqual(window('on friday')?.start, at(9, 2))
	assert.deepEqual(window('notes on monday')?.label, 'today')
	assert.deepEqual(window('last monday')?.start, at(8, 28))
	assert.deepEqual([window('last week')?.start, window('last week')?.end], [at(8, 28), at(9, 5)])
	assert.deepEqual([window('this week')?.start, window('this week')?.end], [at(9, 5), now])
})

test('during an event uses its time, and only once it has started', () => {
	const events = [
		{ title: 'Design review', start: at(9, 5, 8), end: at(9, 5, 8) + 45 * 60_000 },
		{ title: 'Planning', start: at(9, 5, 14), end: at(9, 5, 15) },
	]
	assert.deepEqual(window('figma during design review', events), {
		text: 'figma',
		phrase: 'during design review',
		start: at(9, 5, 8),
		end: at(9, 5, 8) + 45 * 60_000,
		label: 'during Design review',
	})
	assert.equal(window('during planning', events), null)
	assert.equal(window('during lunch', events), null)
})

test('task phrases and future words are left to the task parser', () => {
	for (const q of [
		'call mom friday 6pm',
		'pay rent today',
		'call mum tonight',
		'friday',
		'tomorrow',
	])
		assert.equal(window(q), null, q)
})

test('impossible and partial phrases are not parsed', () => {
	for (const q of [
		'0 days ago',
		'99 days ago',
		'yesterdays',
		'last',
		'week',
		'during',
		'on funday',
	])
		assert.equal(window(q), null, q)
	assert.equal(window(''), null)
})
