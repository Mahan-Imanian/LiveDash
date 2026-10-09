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

test('impossible dates are not parsed and stay in the title', () => {
	for (const s of [
		'Taxes 2026-02-31',
		'Taxes 2026-04-31',
		'Taxes 2026-13-01',
		'Taxes 2026-00-10',
		'Taxes 2026-01-00',
		'Taxes 2027-02-29',
		'Trip feb 30',
		'Trip 31st of april',
		'Trip apr 31, 2027',
		'Trip feb 29, 2027',
		'Read the 32nd',
	]) {
		assert.deepEqual(parseWhen(s, now), { title: s, due: null, allDay: false }, s)
	}
})

test('impossible times are not parsed and stay in the title', () => {
	for (const s of ['Call 25:00', 'Call 24:00', 'Call 12:60', 'Call at 13pm', 'Call at 0am']) {
		assert.deepEqual(parseWhen(s, now), { title: s, due: null, allDay: false }, s)
	}
	assert.deepEqual(parseWhen('Call tomorrow 13pm', now), {
		title: 'Call 13pm',
		due: at(2026, 9, 6),
		allDay: true,
	})
	assert.deepEqual(parseWhen('Read the 45th at 5pm', now), {
		title: 'Read the 45th',
		due: at(2026, 9, 5, 17),
		allDay: false,
	})
})

test('boundary dates and times', () => {
	assert.equal(parseWhen('Leap 2028-02-29', now).due, at(2028, 1, 29))
	assert.equal(parseWhen('Leap 2000-02-29', now).due, at(2000, 1, 29))
	assert.equal(parseWhen('Leap 2100-02-29', now).due, null)
	assert.equal(parseWhen('Leap feb 29, 2028', now).due, at(2028, 1, 29))
	assert.equal(parseWhen('Leap feb 29', now).due, at(2028, 1, 29))
	assert.equal(parseWhen('Leap feb 29', at(2028, 2, 1)).due, at(2032, 1, 29))
	assert.equal(parseWhen('Eve dec 31', now).due, at(2026, 11, 31))
	assert.equal(parseWhen('Eve 2026-12-31 23:59', now).due, at(2026, 11, 31, 23, 59))
	assert.equal(parseWhen('Start jan 1', now).due, at(2027, 0, 1))
	assert.equal(parseWhen('Late 0:00', now).due, at(2026, 9, 6))
	assert.equal(parseWhen('Late at 23:59', now).due, at(2026, 9, 5, 23, 59))
	assert.equal(parseWhen('Late 12am', now).due, at(2026, 9, 6))
	assert.equal(parseWhen('Late 12pm', now).due, at(2026, 9, 5, 12))
	assert.equal(parseWhen('Old 0026-03-01', now).due, new Date(2026, 2, 1).setFullYear(26))
})

test('monthly and yearly repeats keep their day of the month', () => {
	const feb = nextOccurrence(at(2026, 0, 31), 'monthly', at(2026, 0, 31))
	assert.equal(feb, at(2026, 1, 28))
	assert.equal(nextOccurrence(feb, 'monthly', feb, 31), at(2026, 2, 31))
	assert.equal(nextOccurrence(at(2026, 3, 30), 'monthly', at(2026, 3, 30), 31), at(2026, 4, 31))
	assert.equal(nextOccurrence(at(2029, 1, 28), 'yearly', at(2029, 1, 28), 29), at(2030, 1, 28))
	assert.equal(nextOccurrence(at(2031, 1, 28), 'yearly', at(2031, 1, 28), 29), at(2032, 1, 29))
	const clamped = parseWhen('invoice every month on the 31st', at(2026, 10, 2))
	assert.deepEqual(clamped, {
		title: 'invoice',
		due: at(2026, 10, 30),
		allDay: true,
		repeat: 'monthly',
		repeatDay: 31,
	})
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
