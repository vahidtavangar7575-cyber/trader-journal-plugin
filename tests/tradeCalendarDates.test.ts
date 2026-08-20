import assert from 'node:assert/strict';
import test from 'node:test';
import {
	addMonths,
	getCalendarDates,
	getMonthDates,
	getNextMinuteDelay,
	moveSelectedDateToMonth,
	parseDateKey,
} from '../src/ui/tradeCalendar/calendarDates';

void test('builds a Monday-first 42-cell month grid', () => {
	const dates = getCalendarDates('2026-08');

	assert.equal(dates.length, 42);
	assert.equal(dates[0]?.date, '2026-07-27');
	assert.equal(dates[41]?.date, '2026-09-06');
	assert.equal(dates.filter((date) => date.inMonth).length, 31);
});

void test('returns every date in a month and preserves leap days', () => {
	assert.equal(getMonthDates('2028-02').length, 29);
	assert.equal(getMonthDates('2027-02').length, 28);
});

void test('moves the selected day and clamps it to the target month', () => {
	assert.equal(moveSelectedDateToMonth('2026-01-15', '2026-02'), '2026-02-15');
	assert.equal(moveSelectedDateToMonth('2026-01-31', '2026-02'), '2026-02-28');
	assert.equal(moveSelectedDateToMonth('2028-01-31', '2028-02'), '2028-02-29');
	assert.equal(moveSelectedDateToMonth('2026-12-31', '2027-01'), '2027-01-31');
});

void test('adds months across year boundaries and rejects overflow dates', () => {
	assert.equal(addMonths('2026-12', 1), '2027-01');
	assert.equal(addMonths('2026-01', -1), '2025-12');
	assert.equal(parseDateKey('2026-02-29'), null);
	assert.equal(parseDateKey('2028-02-29')?.getDate(), 29);
});

void test('schedules the calendar clock at the next minute boundary', () => {
	assert.equal(getNextMinuteDelay(new Date('2026-08-20T10:15:30.000Z')), 30_000);
});
