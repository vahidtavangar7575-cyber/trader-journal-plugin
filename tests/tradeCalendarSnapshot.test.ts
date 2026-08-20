import assert from 'node:assert/strict';
import test from 'node:test';
import type { JournalCalendarSnapshot, JournalCalendarTrade } from '../src/trades/journalIndex';
import { filterSnapshotByJournalType } from '../src/ui/tradeCalendar/calendarSnapshot';

void test('filters calendar snapshots without mixing live and backtest counts', () => {
	const liveTrade = { journalType: 'live' } as JournalCalendarTrade;
	const backtestTrade = { journalType: 'backtest' } as JournalCalendarTrade;
	const snapshot: JournalCalendarSnapshot = {
		daysByDate: {
			'2026-08-20': {
				date: '2026-08-20',
				backtestCount: 1,
				liveCount: 1,
				trades: [liveTrade, backtestTrade],
			},
		},
		dayDates: ['2026-08-20'],
		tradeCount: 2,
	};

	const liveSnapshot = filterSnapshotByJournalType(snapshot, 'live');
	assert.equal(liveSnapshot.tradeCount, 1);
	assert.equal(liveSnapshot.daysByDate['2026-08-20']?.liveCount, 1);
	assert.equal(liveSnapshot.daysByDate['2026-08-20']?.backtestCount, 0);
});
