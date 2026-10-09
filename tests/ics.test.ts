import assert from 'node:assert/strict'
import { test } from 'node:test'
import { parseIcs } from '../src/lib/ics.ts'

process.env.TZ = 'UTC'

const DAY = 86_400_000
const cal = (...events: string[][]) =>
	`BEGIN:VCALENDAR\r\nVERSION:2.0\r\n${events
		.map((e) => ['BEGIN:VEVENT', ...e, 'END:VEVENT'].join('\r\n'))
		.join('\r\n')}\r\nEND:VCALENDAR\r\n`
const iso = (t: number) => new Date(t).toISOString()
const starts = (text: string, from: number, to: number) =>
	parseIcs(text, from, to).map((e) => iso(e.start))

const Y2026 = Date.UTC(2026, 0, 1)
const Y2034 = Date.UTC(2034, 0, 1)

test('impossible dates and times are skipped', () => {
	const bad = [
		'DTSTART;VALUE=DATE:20260231',
		'DTSTART;VALUE=DATE:20260229',
		'DTSTART;VALUE=DATE:20261301',
		'DTSTART;VALUE=DATE:20261000',
		'DTSTART:20260431T100000Z',
		'DTSTART:20261010T250000Z',
		'DTSTART:20261010T240000Z',
		'DTSTART:20261010T106000Z',
		'DTSTART:20261010T100061Z',
		'DTSTART:2026-10-10',
		'DTSTART:',
	]
	const text = cal(...bad.map((d, i) => [`UID:${i}`, 'SUMMARY:Bad', d]))
	assert.deepEqual(parseIcs(text, Y2026, Y2034), [])
})

test('boundary dates and times are kept', () => {
	const text = cal(
		['UID:a', 'SUMMARY:Leap', 'DTSTART;VALUE=DATE:20280229'],
		['UID:b', 'SUMMARY:Last minute', 'DTSTART:20261231T235959Z'],
		['UID:c', 'SUMMARY:Leap second', 'DTSTART:20261231T235960Z'],
		['UID:d', 'SUMMARY:Midnight', 'DTSTART:20261010T000000Z'],
	)
	assert.deepEqual(
		parseIcs(text, Y2026, Y2034).map((e) => `${e.title}@${iso(e.start)}`),
		[
			'Midnight@2026-10-10T00:00:00.000Z',
			'Last minute@2026-12-31T23:59:59.000Z',
			'Leap second@2026-12-31T23:59:59.000Z',
			'Leap@2028-02-29T00:00:00.000Z',
		],
	)
})

test('DATE, floating, UTC and TZID values', () => {
	const text = cal(
		['UID:a', 'SUMMARY:All day', 'DTSTART;VALUE=DATE:20261006'],
		['UID:b', 'SUMMARY:Floating', 'DTSTART:20261006T090000'],
		['UID:c', 'SUMMARY:UTC', 'DTSTART:20261006T090000Z'],
		['UID:d', 'SUMMARY:New York', 'DTSTART;TZID=America/New_York:20261006T090000'],
		['UID:e', 'SUMMARY:Quoted zone', 'DTSTART;TZID="America/New_York":20261006T100000'],
		['UID:f', 'SUMMARY:Unknown zone', 'DTSTART;TZID=Mars/Base:20261006T110000'],
	)
	const events = parseIcs(text, Y2026, Y2034)
	const by = Object.fromEntries(events.map((e) => [e.title, e]))
	assert.equal(by['All day'].allDay, true)
	assert.equal(by['All day'].start, Date.UTC(2026, 9, 6))
	assert.equal(by['All day'].end, Date.UTC(2026, 9, 7))
	assert.equal(by.Floating.start, Date.UTC(2026, 9, 6, 9))
	assert.equal(by.UTC.start, Date.UTC(2026, 9, 6, 9))
	assert.equal(by['New York'].start, Date.UTC(2026, 9, 6, 13))
	assert.equal(by['Quoted zone'].start, Date.UTC(2026, 9, 6, 14))
	assert.equal(by['Unknown zone'].start, Date.UTC(2026, 9, 6, 11))
})

test('folded lines, LF endings and text escapes', () => {
	const text = [
		'BEGIN:VCALENDAR',
		'BEGIN:VEVENT',
		'UID:a',
		'SUMMARY:Quarterly plan',
		' ning, round 2',
		'LOCATION:Room 1\\, east wing\\; floor 3',
		'DESCRIPTION:Join: https://meet.google.com/',
		'\tabc-defg-hij',
		'DTSTART:20261006T090000Z',
		'END:VEVENT',
		'BEGIN:VEVENT',
		'UID:b',
		'SUMMARY:12" pizza',
		'DTSTART:20261007T090000Z',
		'END:VEVENT',
		'BEGIN:VEVENT',
		'UID:c',
		'SUMMARY:Path C:\\\\new\\nline',
		'DTSTART:20261008T090000Z',
		'END:VEVENT',
		'END:VCALENDAR',
	].join('\n')
	const [a, b, c] = parseIcs(text, Y2026, Y2034)
	assert.equal(a.title, 'Quarterly planning, round 2')
	assert.equal(a.location, 'Room 1, east wing; floor 3')
	assert.equal(a.link, 'https://meet.google.com/abc-defg-hij')
	assert.equal(b.title, '12" pizza')
	assert.equal(c.title, 'Path C:\\new line')
})

test('malformed input does not throw and drops only what is broken', () => {
	const text = [
		'BEGIN:VCALENDAR',
		'BEGIN:VEVENT',
		'SUMMARY:No start',
		'END:VEVENT',
		'garbage line without colon',
		'BEGIN:VEVENT',
		'UID:ok',
		'SUMMARY:Fine',
		'DTSTART:20261006T090000Z',
		'DTEND:20261006T080000Z',
		'BEGIN:VALARM',
		'TRIGGER:-PT15M',
		'END:VALARM',
		'END:VEVENT',
		'BEGIN:VEVENT',
		'UID:cut',
		'SUMMARY:Never closed',
		'DTSTART:20261007T090000Z',
	].join('\r\n')
	const events = parseIcs(text, Y2026, Y2034)
	assert.deepEqual(
		events.map((e) => [e.title, e.end - e.start]),
		[['Fine', 0]],
	)
	assert.deepEqual(parseIcs('', Y2026, Y2034), [])
	assert.deepEqual(parseIcs('not a calendar', Y2026, Y2034), [])
})

test('monthly and yearly repeats skip months without that day', () => {
	const monthly = cal([
		'UID:m',
		'SUMMARY:Month end',
		'DTSTART;VALUE=DATE:20260131',
		'RRULE:FREQ=MONTHLY;COUNT=4',
	])
	assert.deepEqual(starts(monthly, Y2026, Y2034), [
		'2026-01-31T00:00:00.000Z',
		'2026-03-31T00:00:00.000Z',
		'2026-05-31T00:00:00.000Z',
		'2026-07-31T00:00:00.000Z',
	])
	const yearly = cal([
		'UID:y',
		'SUMMARY:Leap day',
		'DTSTART;VALUE=DATE:20280229',
		'RRULE:FREQ=YEARLY',
	])
	assert.deepEqual(starts(yearly, Y2026, Y2034), [
		'2028-02-29T00:00:00.000Z',
		'2032-02-29T00:00:00.000Z',
	])
})

test('monthly BYDAY and BYMONTHDAY', () => {
	const from = Date.UTC(2026, 9, 1)
	const to = Date.UTC(2027, 0, 31)
	const second = cal([
		'UID:a',
		'SUMMARY:Second Tuesday',
		'DTSTART:20261013T150000Z',
		'RRULE:FREQ=MONTHLY;BYDAY=2TU',
	])
	assert.deepEqual(starts(second, from, to), [
		'2026-10-13T15:00:00.000Z',
		'2026-11-10T15:00:00.000Z',
		'2026-12-08T15:00:00.000Z',
		'2027-01-12T15:00:00.000Z',
	])
	const last = cal([
		'UID:b',
		'SUMMARY:Last Friday',
		'DTSTART:20261030T150000Z',
		'RRULE:FREQ=MONTHLY;BYDAY=-1FR;COUNT=3',
	])
	assert.deepEqual(starts(last, from, to), [
		'2026-10-30T15:00:00.000Z',
		'2026-11-27T15:00:00.000Z',
		'2026-12-25T15:00:00.000Z',
	])
	const lastDay = cal([
		'UID:c',
		'SUMMARY:Last day',
		'DTSTART;VALUE=DATE:20261031',
		'RRULE:FREQ=MONTHLY;BYMONTHDAY=-1;UNTIL=20261231',
	])
	assert.deepEqual(starts(lastDay, from, to), [
		'2026-10-31T00:00:00.000Z',
		'2026-11-30T00:00:00.000Z',
		'2026-12-31T00:00:00.000Z',
	])
	const outlook = cal([
		'UID:d',
		'SUMMARY:Anniversary',
		'DTSTART;VALUE=DATE:20201015',
		'RRULE:FREQ=YEARLY;BYMONTH=10;BYMONTHDAY=15',
	])
	assert.deepEqual(starts(outlook, from, to), ['2026-10-15T00:00:00.000Z'])
})

test('rules that are not understood show only the first occurrence', () => {
	const from = Date.UTC(2026, 9, 1)
	const to = Date.UTC(2026, 11, 31)
	for (const rule of [
		'FREQ=MONTHLY;BYSETPOS=-1;BYDAY=MO,TU,WE,TH,FR',
		'FREQ=HOURLY;INTERVAL=2',
		'FREQ=WEEKLY;INTERVAL=x',
		'FREQ=WEEKLY;INTERVAL=0',
		'FREQ=DAILY;COUNT=abc',
		'FREQ=DAILY;COUNT=0',
		'FREQ=YEARLY;BYMONTH=3',
	]) {
		const text = cal(['UID:x', 'SUMMARY:Odd', 'DTSTART:20261006T090000Z', `RRULE:${rule}`])
		assert.deepEqual(starts(text, from, to), ['2026-10-06T09:00:00.000Z'], rule)
	}
})

test('all-day EXDATE removes that day', () => {
	const text = cal([
		'UID:x',
		'SUMMARY:Daily',
		'DTSTART;VALUE=DATE:20261005',
		'RRULE:FREQ=DAILY;COUNT=3',
		'EXDATE;VALUE=DATE:20261006',
	])
	assert.deepEqual(starts(text, Y2026, Y2034), [
		'2026-10-05T00:00:00.000Z',
		'2026-10-07T00:00:00.000Z',
	])
	assert.equal(parseIcs(text, Y2026, Y2034)[0].end - parseIcs(text, Y2026, Y2034)[0].start, DAY)
})
