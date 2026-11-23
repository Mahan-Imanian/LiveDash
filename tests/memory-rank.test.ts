import assert from 'node:assert/strict'
import { test } from 'node:test'
import { agoLabel, type PageMeta, queryWords, readLabel, scoreHit } from '../src/memory/rank.ts'

const DAY = 86_400_000
const now = new Date(2026, 10, 23, 9, 41).getTime()

const page = (over: Partial<PageMeta>): PageMeta => ({
	id: 1,
	url: 'https://a.com',
	site: 'a.com',
	title: 'Untitled',
	first: now - 10 * DAY,
	last: now - DAY,
	visits: [now - DAY],
	readMs: 60_000,
	...over,
})

test('a sentence holding every word beats a title match', () => {
	const q = ['partial', 'index']
	const inText = scoreHit(page({}), { para: 0, text: '', heading: null, hits: 2 }, q, now)
	const inTitle = scoreHit(
		page({ title: 'Partial index' }),
		{ para: 0, text: '', heading: null, hits: 0 },
		q,
		now,
	)
	assert.ok(inText > inTitle)
})

test('recent and long reads rank higher at equal text', () => {
	const p = { para: 0, text: '', heading: null, hits: 1 }
	const old = scoreHit(page({ last: now - 60 * DAY }), p, ['x'], now)
	const recent = scoreHit(page({ last: now - DAY }), p, ['x'], now)
	const long = scoreHit(page({ last: now - DAY, readMs: 20 * 60_000 }), p, ['x'], now)
	assert.ok(recent > old)
	assert.ok(long > recent)
})

test('labels read like speech', () => {
	assert.equal(
		readLabel(page({ last: now - DAY, readMs: 11 * 60_000 }), now),
		'read yesterday for 11 minutes',
	)
	assert.equal(readLabel(page({ last: now - 20 * 60_000, readMs: 0 }), now), 'read just now')
	assert.equal(agoLabel(now - 6 * DAY, now), 'You read this 6 days ago')
	assert.equal(agoLabel(now - 21 * DAY, now), 'You read this 3 weeks ago')
})

test('query words keep a lone stop word so typing never shows nothing', () => {
	assert.deepEqual(queryWords('the partial ind'), ['partial', 'ind'])
	assert.deepEqual(queryWords('the'), ['the'])
})
