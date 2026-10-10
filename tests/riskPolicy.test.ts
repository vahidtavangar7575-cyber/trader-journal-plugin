import assert from 'node:assert/strict';
import test from 'node:test';
import type { TradingAccount } from '../src/accounts/types';
import { DEFAULT_RISK_POLICY, evaluateRiskPolicy } from '../src/risk/policy';
import type { TradeEntry, TradeResult } from '../src/trades/types';

const demoAccount: TradingAccount = {
	id: 'demo-100k',
	name: 'Demo 100K',
	type: 'demo',
	code: 'D-100K',
	currency: 'USD',
	initialBalance: 100000,
	currentBalance: 100000,
	enabled: true,
	createdAt: '2026-10-01T00:00:00.000Z',
	updatedAt: '2026-10-01T00:00:00.000Z',
};

const backtestAccount: TradingAccount = {
	...demoAccount,
	id: 'bt-1',
	name: 'Faraz Backtest',
	type: 'backtest',
	code: 'BT-3Y',
};

void test('uses 0.3 percent for the first two managed trades and respects a Khan cap', () => {
	const first = evaluateRiskPolicy({
		policy: DEFAULT_RISK_POLICY,
		account: demoAccount,
		date: '2026-10-06',
		trades: [],
	});
	assert.equal(first.tradeNumber, 1);
	assert.equal(first.recommendedRiskPct, 0.3);

	const capped = evaluateRiskPolicy({
		policy: DEFAULT_RISK_POLICY,
		account: demoAccount,
		date: '2026-10-06',
		trades: [],
		khanRiskCapPct: 0.1,
	});
	assert.equal(capped.recommendedRiskPct, 0.1);
});

void test('third trade risks one quarter of net profit from the first two trades', () => {
	const trades = [
		trade('t1', '2026-10-06T16:00:00', 'win', 2, 0.3, demoAccount.id),
		trade('t2', '2026-10-06T17:00:00', 'win', 2, 0.3, demoAccount.id),
	];
	const evaluation = evaluateRiskPolicy({
		policy: DEFAULT_RISK_POLICY,
		account: demoAccount,
		date: '2026-10-06',
		trades,
	});
	assert.equal(evaluation.tradeNumber, 3);
	assert.equal(evaluation.firstTwoPnlPct, 1.2);
	assert.equal(evaluation.recommendedRiskPct, 0.3);
});

void test('two losses trigger a strong managed-account stop without applying it to backtest', () => {
	const managedTrades = [
		trade('l1', '2026-10-06T16:00:00', 'loss', 1, 0.3, demoAccount.id),
		trade('l2', '2026-10-06T17:00:00', 'loss', 1, 0.3, demoAccount.id),
	];
	const managed = evaluateRiskPolicy({
		policy: DEFAULT_RISK_POLICY,
		account: demoAccount,
		date: '2026-10-06',
		trades: managedTrades,
	});
	assert.equal(managed.hardStop, true);
	assert.equal(managed.lossesToday, 2);
	assert.ok(managed.warnings.some((warning) => warning.includes('روز معاملاتی')));

	const backtestTrades = Array.from({ length: 5 }, (_, index) =>
		trade(`bt-${index}`, `2026-10-06T${String(10 + index).padStart(2, '0')}:00:00`, 'loss', 1, 0.3, backtestAccount.id, 'backtest'),
	);
	const backtest = evaluateRiskPolicy({
		policy: DEFAULT_RISK_POLICY,
		account: backtestAccount,
		date: '2026-10-06',
		trades: backtestTrades,
	});
	assert.equal(backtest.tradeNumber, 6);
	assert.equal(backtest.hardStop, false);
	assert.equal(backtest.recommendedRiskPct, 0.3);
	assert.deepEqual(backtest.warnings, []);
});

void test('adds one quarter of positive prior-day profit to the next day base within a week', () => {
	const trades = [
		trade('m1', '2026-10-05T16:00:00', 'win', 2, 0.3, demoAccount.id),
		trade('m2', '2026-10-05T17:00:00', 'win', 2, 0.3, demoAccount.id),
	];
	const tuesday = evaluateRiskPolicy({
		policy: DEFAULT_RISK_POLICY,
		account: demoAccount,
		date: '2026-10-06',
		trades,
	});
	assert.equal(tuesday.weekBaseRiskPct, 0.3);
	assert.equal(tuesday.dayBaseRiskPct, 0.6);
	assert.equal(tuesday.recommendedRiskPct, 0.6);
});

void test('adds one sixteenth of positive prior-week profit to the following week base', () => {
	const priorWeek = trade('w1', '2026-10-08T16:00:00', 'win', 2, 0.3, demoAccount.id);
	priorWeek.pnl_pct = 1.6;
	const nextWeek = evaluateRiskPolicy({
		policy: DEFAULT_RISK_POLICY,
		account: demoAccount,
		date: '2026-10-12',
		trades: [priorWeek],
	});
	assert.equal(nextWeek.weekBaseRiskPct, 0.4);
	assert.equal(nextWeek.dayBaseRiskPct, 0.4);
	assert.equal(nextWeek.recommendedRiskPct, 0.4);
});

function trade(
	id: string,
	openedAt: string,
	result: TradeResult,
	rr: number,
	riskPct: number,
	accountId: string,
	journalType: 'live' | 'backtest' = 'live',
): TradeEntry {
	return {
		id,
		journal_type: journalType,
		status: 'closed',
		account_id: accountId,
		opened_at: openedAt,
		result,
		rr,
		risk_pct: riskPct,
	};
}
