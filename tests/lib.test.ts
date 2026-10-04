import assert from 'node:assert/strict'
import { test } from 'node:test'
import { score } from '../src/lib/fuzzy.ts'
import { parseIcs } from '../src/lib/ics.ts'
import { looksLikeUrl, toUrl } from '../src/lib/url.ts'

test('fuzzy ranking', () => {
	assert.ok(score('git', 'GitHub') > score('git', 'Digital Ocean'))
	assert.ok(score('gh', 'GitHub') > 0)
	assert.equal(score('xyz', 'GitHub'), 0)
	assert.ok(score('cal', 'Google Calendar') > score('cal', 'Local notes'))
})

test('url detection', () => {
	assert.ok(looksLikeUrl('github.com'))
	assert.ok(looksLikeUrl('https://x.org/a?b=1'))
	assert.ok(looksLikeUrl('localhost:3000'))
	assert.ok(!looksLikeUrl('buy milk tomorrow'))
	assert.ok(!looksLikeUrl('v2.0'))
	assert.equal(toUrl('github.com'), 'https://github.com/')
	assert.equal(toUrl('javascript:alert(1)'), null)
})

const ics = (body: string) => `BEGIN:VCALENDAR\r\nVERSION:2.0\r\n${body}\r\nEND:VCALENDAR\r\n`

test('ics: single, all-day, cancelled', () => {
	const from = Date.UTC(2026, 9, 1)
	const to = Date.UTC(2026, 9, 31)
	const events = parseIcs(
		ics(
			[
				'BEGIN:VEVENT',
				'UID:a',
				'SUMMARY:Design review, round 2',
				'DTSTART:20261006T130000Z',
				'DTEND:20261006T140000Z',
				'END:VEVENT',
				'BEGIN:VEVENT',
				'UID:b',
				'SUMMARY:Holiday',
				'DTSTART;VALUE=DATE:20261009',
				'DTEND;VALUE=DATE:20261010',
				'END:VEVENT',
				'BEGIN:VEVENT',
				'UID:c',
				'SUMMARY:Gone',
				'STATUS:CANCELLED',
				'DTSTART:20261007T130000Z',
				'END:VEVENT',
			].join('\r\n'),
		),
		from,
		to,
	)
	assert.equal(events.length, 2)
	assert.equal(events[0].title, 'Design review, round 2')
	assert.equal(events[0].start, Date.UTC(2026, 9, 6, 13))
	assert.equal(events[1].allDay, true)
})

test('ics: weekly recurrence with exdate, override and tzid', () => {
	const from = Date.UTC(2026, 9, 1)
	const to = Date.UTC(2026, 9, 20)
	const events = parseIcs(
		ics(
			[
				'BEGIN:VEVENT',
				'UID:s',
				'SUMMARY:Standup',
				'DTSTART;TZID=Europe/Berlin:20260928T093000',
				'DTEND;TZID=Europe/Berlin:20260928T094500',
				'RRULE:FREQ=WEEKLY;BYDAY=MO,WE;UNTIL=20261231T000000Z',
				'EXDATE;TZID=Europe/Berlin:20261005T093000',
				'END:VEVENT',
				'BEGIN:VEVENT',
				'UID:s',
				'RECURRENCE-ID;TZID=Europe/Berlin:20261007T093000',
				'SUMMARY:Standup (moved)',
				'DTSTART;TZID=Europe/Berlin:20261007T110000',
				'DTEND;TZID=Europe/Berlin:20261007T111500',
				'END:VEVENT',
			].join('\r\n'),
		),
		from,
		to,
	)
	const starts = events.map((e) => `${e.title}@${new Date(e.start).toISOString()}`)
	assert.deepEqual(starts, [
		'Standup (moved)@2026-10-07T09:00:00.000Z',
		'Standup@2026-10-12T07:30:00.000Z',
		'Standup@2026-10-14T07:30:00.000Z',
		'Standup@2026-10-19T07:30:00.000Z',
	])
})

test('multi-word queries match word prefixes', () => {
	assert.ok(score('theme light', 'Theme: light') >= 75)
	assert.ok(score('start focus', 'Start focus timer') >= 75)
	assert.equal(score('theme purple', 'Theme: light'), 0)
})

test('ics: finds the meeting link to join', () => {
	const from = Date.UTC(2026, 9, 1)
	const [e] = parseIcs(
		ics(
			[
				'BEGIN:VEVENT',
				'UID:m',
				'SUMMARY:Standup',
				'DTSTART:20261006T090000Z',
				'DTEND:20261006T091500Z',
				'DESCRIPTION:Join with Google Meet: https://meet.google.com/abc-defg-hij\nOr dial in',
				'END:VEVENT',
			].join('\r\n'),
		),
		from,
		from + 30 * 86_400_000,
	)
	assert.equal(e.link, 'https://meet.google.com/abc-defg-hij')
})

test('launcher abbreviations', () => {
	assert.ok(score('hn', 'Hacker News') >= 70)
	assert.ok(score('gh', 'github.com') >= 45)
	assert.ok(score('git', 'grid-template-columns') < 45)
})
