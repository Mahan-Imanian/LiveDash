import assert from 'node:assert/strict'
import { test } from 'node:test'
import { matchRanges, score } from '../src/lib/fuzzy.ts'

test('match ranges follow the same tiers as the score', () => {
	assert.deepEqual(matchRanges('next', 'Next.js'), [[0, 4]])
	assert.deepEqual(matchRanges('redirect', 'Next.js middleware redirect loop'), [[19, 27]])
	assert.deepEqual(matchRanges('mid loop', 'Next.js middleware redirect loop'), [
		[8, 11],
		[28, 32],
	])
	assert.deepEqual(matchRanges('hn', 'Hacker News'), [
		[0, 1],
		[7, 8],
	])
	assert.deepEqual(matchRanges('ware', 'Next.js middleware'), [[14, 18]])
})

test('scattered letters are marked one by one, and adjacent ones merge', () => {
	assert.deepEqual(matchRanges('gthb', 'GitHub'), [
		[0, 1],
		[2, 4],
		[5, 6],
	])
})

test('no ranges when the text does not match', () => {
	assert.deepEqual(matchRanges('figma', 'Deployments – web – Vercel'), [])
	assert.deepEqual(matchRanges('', 'anything'), [])
	assert.deepEqual(matchRanges('x', ''), [])
})

test('every scored match has ranges, every unscored one has none', () => {
	const titles = [
		'Next.js',
		'GitHub - vercel/next.js',
		'Inbox (3) - Gmail',
		'صحافة - ويكيبيديا',
		'🔥 Which serif? 📚',
	]
	for (const q of ['next', 'gh', 'inbox', 'صحافة', 'serif', 'zzz'])
		for (const t of titles)
			assert.equal(score(q, t) > 0, matchRanges(q, t).length > 0, `${q} in ${t}`)
})
