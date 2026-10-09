import assert from 'node:assert/strict'
import { test } from 'node:test'
import { nextOccurrence, parseWhen } from '../src/lib/when.ts'

process.env.TZ = 'America/New_York'

const at = (y: number, m: number, d: number, h = 0, mi = 0) => new Date(y, m, d, h, mi).getTime()

test('the zone switch took effect', () => {
	assert.equal(new Date(2026, 2, 8, 12).getTimezoneOffset(), 240)
	assert.equal(new Date(2026, 2, 7, 12).getTimezoneOffset(), 300)
})

test('relative days count calendar days across a DST change', () => {
	assert.equal(parseWhen('Call in 1 day', at(2026, 2, 7, 23, 30)).due, at(2026, 2, 8))
	assert.equal(parseWhen('Call in 1 week', at(2026, 2, 7, 23, 30)).due, at(2026, 2, 14))
	assert.equal(parseWhen('Call in 1 day', at(2026, 9, 31, 23, 30)).due, at(2026, 10, 1))
})

test('relative hours stay absolute across a DST change', () => {
	assert.equal(parseWhen('Call in 2 hours', at(2026, 2, 8, 1, 30)).due, at(2026, 2, 8, 4, 30))
})

test('a past time rolls to the next calendar day before a short day', () => {
	assert.equal(parseWhen('Alarm 8:00', at(2026, 2, 7, 23, 30)).due, at(2026, 2, 8, 8))
	assert.equal(parseWhen('Alarm 8:00', at(2026, 9, 31, 23, 30)).due, at(2026, 10, 1, 8))
})

test('a weekday repeat started on a long weekend lands on Monday midnight', () => {
	assert.equal(parseWhen('Standup weekdays', at(2026, 9, 31, 10)).due, at(2026, 10, 2))
})

test('daily repeats keep the wall-clock time across a DST change', () => {
	assert.equal(nextOccurrence(at(2026, 2, 7, 9), 'daily', at(2026, 2, 7)), at(2026, 2, 8, 9))
	assert.equal(nextOccurrence(at(2026, 9, 31, 9), 'daily', at(2026, 9, 31)), at(2026, 10, 1, 9))
})
