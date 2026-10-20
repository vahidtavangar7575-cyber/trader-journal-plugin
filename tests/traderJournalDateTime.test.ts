import assert from 'node:assert/strict';
import test from 'node:test';
import {
	combineDateTimeInput,
	getDateTimeDatePart,
	getTodayDateInput,
	getYesterdayDateInput,
	normalizeDateInput,
	normalizeTimeInput,
	syncClosedAtDate,
} from '../src/ui/traderJournal/dateTime';

void test('keeps backtest opened and closed dates synchronized by default', () => {
	assert.equal(
		syncClosedAtDate('2026-08-21T09:30', '2026-08-20T09:30', '2026-08-20T10:15'),
		'2026-08-21T10:15',
	);
});

void test('preserves a manually selected different close date', () => {
	assert.equal(
		syncClosedAtDate('2026-08-21T23:30', '2026-08-20T23:30', '2026-08-22T00:15'),
		'2026-08-22T00:15',
	);
	assert.equal(getDateTimeDatePart('invalid'), '');
});

void test('accepts both ISO and Windows-style journal dates', () => {
	assert.equal(normalizeDateInput('2026-10-20'), '2026-10-20');
	assert.equal(normalizeDateInput('10/20/2026'), '2026-10-20');
	assert.equal(normalizeDateInput('۱۰/۲۰/۲۰۲۶'), '2026-10-20');
	assert.equal(normalizeDateInput('2026/02/29'), '');
	assert.equal(normalizeDateInput('2028/02/29'), '2028-02-29');
});

void test('normalizes journal times and combines only valid date-time values', () => {
	assert.equal(normalizeTimeInput('9:05'), '09:05');
	assert.equal(normalizeTimeInput('۱۴:۳۰'), '14:30');
	assert.equal(normalizeTimeInput('2530'), '');
	assert.equal(combineDateTimeInput('10/20/2026', '14:30'), '2026-10-20T14:30');
	assert.equal(combineDateTimeInput('13/20/2026', '14:30'), '');
});

void test('today and yesterday helpers remain calendar-safe', () => {
	const now = new Date(2026, 9, 20, 15, 30);
	assert.equal(getTodayDateInput(now), '2026-10-20');
	assert.equal(getYesterdayDateInput(now), '2026-10-19');
});
