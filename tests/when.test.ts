import assert from 'node:assert/strict'
import { test } from 'node:test'
import { nextOccurrence, parseWhen } from '../src/lib/when.ts'

const now = new Date(2026, 9, 5, 9, 0).getTime()
const at = (y: number, m: number, d: number, h = 0, mi = 0) => new Date(y, m, d, h, mi).getTime()

test('day words', () => {
	assert.deepEqual(parseWhen('Buy groceries tomorrow', now), {
		title: 'Buy groceries',
		due: at(2026, 9, 6),
		allDay: true,
	})
	assert.deepEqual(parseWhen('Pay rent today', now), {
		title: 'Pay rent',
		due: at(2026, 9, 5),
		allDay: true,
	})
	assert.deepEqual(parseWhen('Call mum tonight', now), {
		title: 'Call mum',
		due: at(2026, 9, 5, 20),
		allDay: false,
	})
})

test('weekday and time', () => {
	assert.deepEqual(parseWhen('Finish report Friday 5pm', now), {
		title: 'Finish report',
		due: at(2026, 9, 9, 17),
		allDay: false,
	})
	assert.deepEqual(parseWhen('Gym on wed at 7:30am', now), {
		title: 'Gym',
		due: at(2026, 9, 7, 7, 30),
		allDay: false,
	})
	assert.equal(parseWhen('Plan next friday', now).due, at(2026, 9, 16))
	assert.equal(parseWhen('Standup monday', now).due, at(2026, 9, 5))
})

test('time only rolls to the next occurrence', () => {
	assert.deepEqual(parseWhen('Call John at 14:00', now), {
		title: 'Call John',
		due: at(2026, 9, 5, 14),
		allDay: false,
	})
	assert.equal(parseWhen('Alarm 8:00', now).due, at(2026, 9, 6, 8))
	assert.equal(parseWhen('Lunch at noon', now).due, at(2026, 9, 5, 12))
	assert.equal(parseWhen('Meet at 3', now).due, at(2026, 9, 5, 15))
})

test('dates', () => {
	assert.equal(parseWhen('Dentist oct 12 10am', now).due, at(2026, 9, 12, 10))
	assert.equal(parseWhen('Trip 3rd of March', now).due, at(2027, 2, 3))
	assert.equal(parseWhen('Taxes 2027-04-15', now).due, at(2027, 3, 15))
	assert.equal(parseWhen('in 3 days review', now).due, at(2026, 9, 8))
	assert.equal(parseWhen('Stretch in 30 min', now).due, at(2026, 9, 5, 9, 30))
	assert.equal(parseWhen('Clean up next week', now).due, at(2026, 9, 12))
})

test('leaves plain text alone', () => {
	for (const s of [
		'Read SAT prep book',
		'Water the plants',
		'Ship v2.0 release',
		'I may call',
		'Version 3.50 notes',
	]) {
		assert.deepEqual(parseWhen(s, now), { title: s, due: null, allDay: false })
	}
})

test('drops reminder lead-ins', () => {
	assert.equal(parseWhen('remind me to call mom tomorrow 5pm', now).title, 'call mom')
	assert.equal(parseWhen("Don't forget to pay rent", now).title, 'pay rent')
	assert.equal(parseWhen('remind me to', now).title, 'remind me to')
})

test('repeating tasks', () => {
	assert.deepEqual(parseWhen('Water plants every day', now), {
		title: 'Water plants',
		due: at(2026, 9, 5),
		allDay: true,
		repeat: 'daily',
	})
	assert.deepEqual(parseWhen('Standup notes every monday 9:30am', now), {
		title: 'Standup notes',
		due: at(2026, 9, 5, 9, 30),
		allDay: false,
		repeat: 'weekly',
	})
	assert.equal(parseWhen('Pay rent monthly on the 1st of november', now).repeat, 'monthly')
	assert.equal(parseWhen('Journal daily at 8am', now).due, at(2026, 9, 6, 8))
	assert.equal(nextOccurrence(at(2026, 9, 9), 'weekdays', now), at(2026, 9, 12))
	assert.equal(nextOccurrence(at(2026, 8, 1), 'weekly', now), at(2026, 9, 6))
	assert.equal(nextOccurrence(at(2026, 0, 31), 'monthly', at(2026, 0, 31)), at(2026, 1, 28))
	assert.equal(nextOccurrence(at(2028, 1, 29), 'yearly', at(2028, 1, 29)), at(2029, 1, 28))
})

test('day of the month', () => {
	assert.deepEqual(parseWhen('pay rent every month on the 1st', now), {
		title: 'pay rent',
		due: at(2026, 10, 1),
		allDay: true,
		repeat: 'monthly',
	})
	assert.equal(parseWhen('dentist on the 5th at 3pm', now).due, at(2026, 9, 5, 15))
	assert.equal(parseWhen('invoice the 31st', at(2026, 10, 2)).due, at(2026, 10, 30))
	assert.equal(parseWhen('meet on the 3rd floor', now).due, null)
})
