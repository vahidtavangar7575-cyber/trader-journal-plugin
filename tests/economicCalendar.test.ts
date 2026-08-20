import assert from 'node:assert/strict';
import test from 'node:test';
import { getWeekKey } from '../src/economicCalendar/api';
import {
	filterEconomicCalendarEvents,
	groupEconomicEventsByDate,
} from '../src/economicCalendar/calendar';
import type { EconomicCalendarEvent } from '../src/economicCalendar/types';

const events: EconomicCalendarEvent[] = [
	createEvent('2026-08-20T09:59:00.000Z', 'USD', 'High'),
	createEvent('2026-08-20T10:01:00.000Z', 'USD', 'High'),
	createEvent('2026-08-20T10:02:00.000Z', 'EUR', 'Medium'),
];

void test('filters out elapsed events and applies country and impact settings', () => {
	const filtered = filterEconomicCalendarEvents(
		events,
		['USD'],
		['High'],
		Date.parse('2026-08-20T10:00:00.000Z'),
	);
	assert.deepEqual(filtered.map((event) => event.date), ['2026-08-20T10:01:00.000Z']);
});

void test('showAll bypasses time, country, and impact filters', () => {
	assert.equal(filterEconomicCalendarEvents(events, ['JPY'], ['Low'], Date.now(), true).length, 3);
});

void test('groups events by the configured display time zone', () => {
	const grouped = groupEconomicEventsByDate(
		[createEvent('2026-08-20T23:30:00.000Z', 'USD', 'High')],
		'Asia/Ho_Chi_Minh',
	);
	assert.equal(grouped['2026-08-21']?.length, 1);
});

void test('changes the source week at Sunday midnight in New York', () => {
	assert.equal(getWeekKey(new Date('2026-08-23T03:59:59.000Z'), 'America/New_York'), '2026-08-16');
	assert.equal(getWeekKey(new Date('2026-08-23T04:00:00.000Z'), 'America/New_York'), '2026-08-23');
});

function createEvent(
	date: string,
	country: string,
	impact: EconomicCalendarEvent['impact'],
): EconomicCalendarEvent {
	return { title: 'Event', country, date, impact, forecast: '', previous: '' };
}
