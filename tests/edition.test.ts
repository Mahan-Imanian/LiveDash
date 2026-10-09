import assert from 'node:assert/strict'
import { test } from 'node:test'
import { countdown, editionName, isoWeek, pickLead } from '../src/lib/edition.ts'

const at = (h: number, m = 0, d = 9) => new Date(2026, 9, d, h, m).getTime()
const ev = (title: string, start: number, end: number, allDay = false) => ({
	title,
	start,
	end,
	allDay,
})

test('lead: meeting in progress wins and names what follows', () => {
	const events = [
		ev('Offsite', at(0), at(0, 0, 10), true),
		ev('Standup', at(9), at(9, 30)),
		ev('Review', at(11), at(12)),
	]
	const lead = pickLead(events, at(9, 10))
	assert.equal(lead?.event.title, 'Standup')
	assert.equal(lead?.live, true)
	assert.equal(lead?.minutes, 20)
	assert.equal(lead?.following?.title, 'Review')
})

test('lead: next meeting later today, with countdown', () => {
	const events = [ev('Review', at(15), at(16)), ev('Dinner', at(19), at(21))]
	const lead = pickLead(events, at(9))
	assert.equal(lead?.event.title, 'Review')
	assert.equal(lead?.live, false)
	assert.equal(lead?.minutes, 360)
	assert.equal(lead?.following?.title, 'Dinner')
})

test('lead: what follows never overlaps the next meeting and stays today', () => {
	const events = [
		ev('Review', at(15), at(16)),
		ev('Overlap', at(15, 30), at(17)),
		ev('Tomorrow', at(9, 0, 10), at(10, 0, 10)),
	]
	assert.equal(pickLead(events, at(14))?.following, undefined)
	assert.equal(pickLead(events.slice(0, 2), at(15, 10))?.following?.title, 'Overlap')
})

test('lead: tomorrow only counts when it is within three hours', () => {
	assert.equal(pickLead([ev('Early call', at(9, 0, 10), at(10, 0, 10))], at(14)), null)
	assert.equal(pickLead([ev('Late call', at(0, 30, 10), at(1, 0, 10))], at(23))?.minutes, 90)
})

test('lead: ignores all-day and finished events', () => {
	const events = [ev('Holiday', at(0), at(0, 0, 10), true), ev('Done', at(7), at(8))]
	assert.equal(pickLead(events, at(9)), null)
})

test('iso week numbers', () => {
	assert.equal(isoWeek(new Date(2026, 0, 1).getTime()), 1)
	assert.equal(isoWeek(new Date(2026, 9, 9).getTime()), 41)
	assert.equal(isoWeek(new Date(2027, 0, 1).getTime()), 53)
	assert.equal(isoWeek(new Date(2024, 11, 30).getTime()), 1)
})

test('edition follows the hour', () => {
	assert.equal(editionName(at(6)), 'Morning edition')
	assert.equal(editionName(at(13)), 'Afternoon edition')
	assert.equal(editionName(at(18)), 'Evening edition')
	assert.equal(editionName(at(23)), 'Late edition')
	assert.equal(editionName(at(2)), 'Late edition')
})

test('countdown wording', () => {
	assert.equal(countdown(14), '14 min')
	assert.equal(countdown(60), '1 h')
	assert.equal(countdown(135), '2 h 15 min')
})
