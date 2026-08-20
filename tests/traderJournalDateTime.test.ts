import assert from 'node:assert/strict';
import test from 'node:test';
import { getDateTimeDatePart, syncClosedAtDate } from '../src/ui/traderJournal/dateTime';

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
