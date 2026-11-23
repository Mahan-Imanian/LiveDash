import assert from 'node:assert/strict'
import { test } from 'node:test'
import { cleanTitle, neverKeep, pageKey } from '../src/memory/privacy.ts'
import {
	bestPassage,
	fragmentUrl,
	HEADING,
	hitRanges,
	isQuotable,
	sentences,
	tokenize,
} from '../src/memory/text.ts'

test('tokens are folded and skip stop words', () => {
	assert.deepEqual(tokenize('The Café ate 3 crêpes'), ['cafe', 'ate', '3', 'crepes'])
	assert.deepEqual(tokenize('a b of'), [])
})

test('sentences survive abbreviations and decimals', () => {
	assert.deepEqual(sentences('The U.S. Army left. Then rain.'), [
		'The U.S. Army left.',
		'Then rain.',
	])
	assert.deepEqual(sentences('Use e.g. a partial index. It is 3.5 times smaller! Done'), [
		'Use e.g. a partial index.',
		'It is 3.5 times smaller!',
		'Done',
	])
})

test('the best passage holds the most query words and its heading', () => {
	const paras = [
		`${HEADING}Indexing only some rows`,
		'Indexes cost space. A partial index only covers the rows that satisfy its WHERE clause.',
		'An index is a sorted copy of some columns.',
	]
	const p = bestPassage(paras, ['partial', 'ind'])
	assert.equal(p?.text, 'A partial index only covers the rows that satisfy its WHERE clause.')
	assert.equal(p?.heading, 'Indexing only some rows')
	assert.equal(p?.hits, 2)
	assert.equal(bestPassage(paras, ['nothing']), null)
})

test('hit ranges merge adjacent words', () => {
	assert.deepEqual(hitRanges('A partial index only', ['partial', 'ind']), [[2, 15]])
	assert.deepEqual(hitRanges('Index, then partial', ['partial', 'index']), [
		[0, 5],
		[12, 19],
	])
})

test('fragment links quote short sentences whole and long ones by their ends', () => {
	assert.equal(
		fragmentUrl('https://a.com/x#top', 'A well-known fact.'),
		'https://a.com/x#:~:text=A%20well%2Dknown%20fact.',
	)
	const long = fragmentUrl(
		'https://a.com',
		'one two three four five six seven eight nine ten eleven',
	)
	assert.equal(
		long,
		'https://a.com#:~:text=one%20two%20three%20four%20five,seven%20eight%20nine%20ten%20eleven',
	)
})

test('quotable sentences are whole thoughts', () => {
	assert.ok(
		isQuotable(
			'A partial index only covers the rows that satisfy its WHERE clause, so it stays small.',
		),
	)
	assert.ok(!isQuotable('Subscribe to our newsletter for the latest updates on everything we do.'))
	assert.ok(!isQuotable('short.'))
})

test('sensitive and private pages are never kept', () => {
	assert.equal(neverKeep('https://use-the-index-luke.com/sql/where'), null)
	assert.equal(neverKeep('http://example.com'), 'not-web')
	assert.equal(neverKeep('https://mail.google.com/mail/u/0'), 'sensitive-site')
	assert.equal(neverKeep('https://online.chase.com/x'), 'sensitive-site')
	assert.equal(neverKeep('https://my-bank.co.uk/home'), 'sensitive-site')
	assert.equal(neverKeep('https://github.com/login'), 'private-page')
	assert.equal(neverKeep('https://news.ycombinator.com/item?id=1', ['ycombinator.com']), 'paused')
	assert.equal(neverKeep('https://wise-words.blog/otherwise'), null)
})

test('page keys drop fragments and tracking parameters', () => {
	assert.equal(pageKey('https://a.com/p?id=3&utm_source=x&fbclid=y#sec'), 'https://a.com/p?id=3')
})

test('titles lose a trailing site name only when it names the site', () => {
	assert.equal(cleanTitle('Partial index - Wikipedia', 'en.wikipedia.org'), 'Partial index')
	assert.equal(cleanTitle('Pricing | Figma', 'figma.com'), 'Pricing')
	assert.equal(cleanTitle('Rust - a language', 'blog.example.com'), 'Rust - a language')
})
