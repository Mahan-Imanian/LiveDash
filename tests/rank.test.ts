import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
	frecency,
	HOUR_WEIGHT_FLOOR,
	HOUR_WEIGHT_MAX_BOOST,
	hourWeight,
	isJunk,
	LAUNCH_HALF_LIFE_DAYS,
	launchWeight,
	merge,
	normalize,
	QUERY_PINNED_BONUS_POINTS,
	rankHome,
	rankQuery,
	VISIT_HALF_LIFE_DAYS,
} from '../src/lib/rank.ts'

const now = new Date(2026, 9, 5, 9, 0).getTime()
const DAY = 86_400_000
const ago = (h: number) => now - h * 3_600_000
const ctx = { now, launches: [], hidden: [] as string[] }

test('visit weight halves every VISIT_HALF_LIFE_DAYS', () => {
	const fresh = frecency(10, now, now)
	assert.ok(Math.abs(frecency(10, now - VISIT_HALF_LIFE_DAYS * DAY, now) - fresh / 2) < 1e-9)
	assert.ok(Math.abs(frecency(10, now - 2 * VISIT_HALF_LIFE_DAYS * DAY, now) - fresh / 4) < 1e-9)
	assert.equal(frecency(10, now + DAY, now), fresh)
})

test('launch weight halves every LAUNCH_HALF_LIFE_DAYS', () => {
	const launch = (days: number, q = '') => ({ k: 'a.com', q, t: now - days * DAY })
	assert.equal(launchWeight('a.com', [launch(0)], now), 1)
	assert.ok(Math.abs(launchWeight('a.com', [launch(LAUNCH_HALF_LIFE_DAYS)], now) - 0.5) < 1e-9)
	assert.equal(launchWeight('b.com', [launch(0)], now), 0)
	assert.equal(launchWeight('a.com', [launch(0, 'ab')], now, 'a'), 5)
	assert.equal(launchWeight('a.com', [launch(0, 'xy')], now, 'a'), 1)
})

test('hour weight stays within its bounds', () => {
	const flat = Array(24).fill(1)
	const peak = Array(24).fill(0)
	peak[9] = 30
	assert.equal(hourWeight(undefined, 9), 1)
	assert.equal(hourWeight([5, ...Array(23).fill(0)], 0), 1)
	assert.equal(hourWeight(peak, 9), HOUR_WEIGHT_FLOOR + HOUR_WEIGHT_MAX_BOOST)
	assert.equal(hourWeight(peak, 15), HOUR_WEIGHT_FLOOR)
	assert.ok(hourWeight(flat, 3) > HOUR_WEIGHT_FLOOR && hourWeight(flat, 3) < 1.2)
})

test('home: at equal frequency the more recent site ranks first', () => {
	const d = merge([
		{ url: 'https://old.com/', title: 'Old', visits: 20, lastVisit: ago(30 * 24) },
		{ url: 'https://new.com/', title: 'New', visits: 20, lastVisit: ago(24) },
	])
	assert.deepEqual(
		rankHome(d, ctx).map((x) => x.host),
		['new.com', 'old.com'],
	)
})

test('home: a little use yesterday outranks heavy use three weeks ago', () => {
	const d = merge([
		{ url: 'https://heavy.com/', title: 'Heavy', visits: 120, lastVisit: ago(21 * 24) },
		{ url: 'https://light.com/', title: 'Light', visits: 8, lastVisit: ago(24) },
	])
	assert.equal(rankHome(d, ctx)[0].host, 'light.com')
})

test('home: one-visit pages and hidden sites are left out', () => {
	const d = merge([
		{ url: 'https://once.com/', title: 'Once', visits: 1, lastVisit: ago(1) },
		{ url: 'https://twice.com/', title: 'Twice', visits: 2, lastVisit: ago(1) },
		{ url: 'https://hidden.com/', title: 'Hidden', visits: 50, lastVisit: ago(1) },
	])
	assert.deepEqual(
		rankHome(d, { ...ctx, hidden: ['hidden.com'] }).map((x) => x.host),
		['twice.com'],
	)
	const launched = { ...ctx, launches: [{ k: 'once.com', q: '', t: ago(1) }] }
	assert.ok(rankHome(d, launched).some((x) => x.host === 'once.com'))
})

test('query: an open tab beats a bookmark with the same match', () => {
	for (const visits of [0, 3]) {
		const d = merge([
			{ url: 'https://docs.a.com/guide', title: 'Style guide', bookmark: true, visits },
			{ url: 'https://wiki.b.com/guide', title: 'Style guide', tabId: 3, windowId: 1 },
		])
		assert.equal(rankQuery('style', d, ctx)[0].host, 'wiki.b.com', `bookmark visits ${visits}`)
	}
})

test(`query: a pin outweighs at most ${QUERY_PINNED_BONUS_POINTS} points of text match`, () => {
	const unpinned = { url: 'https://x.com/', title: 'Notes' }
	const close = merge([unpinned, { url: 'https://y.com/', title: 'Notes app', pinned: 0 }])
	assert.equal(rankQuery('note', close, ctx)[0].host, 'y.com')
	const far = merge([unpinned, { url: 'https://y.com/', title: 'Field notebook', pinned: 0 }])
	assert.equal(rankQuery('note', far, ctx)[0].host, 'x.com')
})

test('normalize collapses www, trailing slash, query and hash', () => {
	assert.equal(
		normalize('https://www.GitHub.com/vercel/next.js/?tab=readme#x')?.key,
		'github.com/vercel/next.js',
	)
	assert.equal(normalize('chrome://settings'), null)
})

test('junk filter drops search results and auth flows', () => {
	assert.ok(isJunk('https://www.google.com/search?q=x'))
	assert.ok(isJunk('https://app.example.com/login?next=/'))
	assert.ok(isJunk('https://x.com/cb?code=abc&state=1'))
	assert.ok(!isJunk('https://linear.app/team/issue/ENG-1'))
})

test('merge keeps one entry per page and remembers the open tab', () => {
	const d = merge([
		{ url: 'https://github.com/', title: 'GitHub', visits: 40, lastVisit: ago(1) },
		{ url: 'https://github.com', title: 'GitHub', tabId: 7, windowId: 1 },
	])
	assert.equal(d.length, 1)
	assert.equal(d[0].tabId, 7)
	assert.equal(d[0].visits, 40)
})

test('merge drops error pages from history but keeps open tabs', () => {
	const d = merge([
		{ url: 'https://web.dev/x', title: 'Error 403 (Forbidden)!!1', visits: 3, lastVisit: ago(1) },
		{ url: 'https://stackoverflow.com/q', title: 'Forbidden', visits: 3, lastVisit: ago(1) },
		{ url: 'https://a.com/404', title: '404 Not Found', tabId: 3, windowId: 1 },
		{ url: 'https://b.com/', title: '404 ways to cook', visits: 1, lastVisit: ago(1) },
	])
	assert.deepEqual(
		d.map((x) => x.host),
		['a.com', 'b.com'],
	)
})

test('home ranking: pins first in order, then frequent and recent, one per site', () => {
	const d = merge([
		{ url: 'https://mail.google.com/mail/u/0/', title: 'Mail', visits: 90, lastVisit: ago(2) },
		{ url: 'https://news.ycombinator.com/', title: 'HN', visits: 5, lastVisit: ago(400) },
		{ url: 'https://linear.app/', title: 'Linear', visits: 30, lastVisit: ago(1) },
		{ url: 'https://linear.app/team', title: 'Linear team', visits: 25, lastVisit: ago(1) },
		{ url: 'https://example.org/', title: 'Pinned', pinned: 0 },
	])
	const top = rankHome(d, ctx).map((x) => x.host)
	assert.deepEqual(top.slice(0, 1), ['example.org'])
	assert.equal(top.filter((h) => h === 'linear.app').length, 1)
	assert.ok(top.indexOf('mail.google.com') < top.indexOf('news.ycombinator.com'))
})

test('time of day lifts sites you open at this hour', () => {
	const hist = Array(24).fill(0)
	hist[9] = 20
	assert.ok(hourWeight(hist, 9) > hourWeight(hist, 15))
	const d = merge([
		{ url: 'https://a.com/', title: 'A', visits: 20, lastVisit: ago(5) },
		{ url: 'https://b.com/', title: 'B', visits: 20, lastVisit: ago(5) },
	])
	const top = rankHome(d, { ...ctx, hours: { 'b.com': hist } }).map((x) => x.host)
	assert.equal(top[0], 'b.com')
})

test('query ranking learns which result you pick for which letters', () => {
	const d = merge([
		{ url: 'https://github.com/', title: 'GitHub', visits: 50, lastVisit: ago(1) },
		{ url: 'https://gitlab.com/', title: 'GitLab', visits: 3, lastVisit: ago(50) },
	])
	assert.equal(rankQuery('git', d, ctx)[0].host, 'github.com')
	const learned = {
		...ctx,
		launches: [1, 2, 3].map((i) => ({ k: 'gitlab.com', q: 'git', t: ago(i) })),
	}
	assert.equal(rankQuery('git', d, learned)[0].host, 'gitlab.com')
	assert.equal(rankQuery('zzz', d, ctx).length, 0)
})

test('titles lose site-name noise', async () => {
	const { cleanTitle } = await import('../src/lib/rank.ts')
	assert.equal(
		cleanTitle(
			'GitHub - vercel/next.js: The React Framework · GitHub',
			'github.com',
			'/vercel/next.js',
		),
		'vercel/next.js: The React Framework',
	)
	assert.equal(
		cleanTitle('Typography - Wikipedia', 'en.wikipedia.org', '/wiki/Typography'),
		'Typography',
	)
	assert.equal(
		cleanTitle(
			'useSyncExternalStore – React',
			'react.dev',
			'/reference/react/useSyncExternalStore',
		),
		'useSyncExternalStore',
	)
	assert.equal(
		cleanTitle('Linear – The system for product development', 'linear.app', ''),
		'Linear',
	)
	assert.equal(
		cleanTitle('Figma: The collaborative canvas for design, code, and AI', 'figma.com', ''),
		'Figma',
	)
	assert.equal(cleanTitle('Hacker News', 'news.ycombinator.com', ''), 'Hacker News')
	assert.equal(cleanTitle('', 'example.org', '/a'), 'example.org')
	assert.equal(
		cleanTitle('https://www.google.com/search?q=focus+40', 'google.com', '/search'),
		'google.com',
	)
})
