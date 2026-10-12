import assert from 'node:assert/strict';
import test from 'node:test';
import type TraderJournalPlugin from '../src/main';
import { createInitialTradeForm } from '../src/ui/traderJournal/form';

void test('a legacy disabled saved account is still selected for live trading', () => {
	const plugin = {
		settings: {
			accounts: [
				{
					id: 'demo-100k',
					name: 'Demo 100K',
					type: 'demo',
					currency: 'USD',
					initialBalance: 100000,
					currentBalance: 98750,
					enabled: false,
					createdAt: '2026-10-01T00:00:00.000Z',
					updatedAt: '2026-10-01T00:00:00.000Z',
				},
			],
			lastSelectedAccountId: 'demo-100k',
			symbols: ['EURUSD'],
			timeframes: ['1m'],
		},
	} as unknown as TraderJournalPlugin;

	const form = createInitialTradeForm(plugin, undefined, 'live');
	assert.equal(form.accountId, 'demo-100k');
	assert.equal(form.accountEquity, '98750');
});

void test('backtest and live automatically choose a compatible saved account', () => {
	const plugin = {
		settings: {
			accounts: [
				{
					id: 'bt', name: 'Faraz 3Y', type: 'backtest', currency: 'USD', initialBalance: 10000, currentBalance: 10000,
					enabled: false, createdAt: '2026-10-01T00:00:00.000Z', updatedAt: '2026-10-01T00:00:00.000Z',
				},
				{
					id: 'prop', name: 'Prop', type: 'prop', currency: 'USD', initialBalance: 5000, currentBalance: 5100,
					enabled: false, createdAt: '2026-10-01T00:00:00.000Z', updatedAt: '2026-10-01T00:00:00.000Z',
				},
			],
			lastSelectedAccountId: '',
			symbols: ['EURUSD'],
			timeframes: ['1m'],
		},
	} as unknown as TraderJournalPlugin;

	assert.equal(createInitialTradeForm(plugin, undefined, 'backtest').accountId, 'bt');
	assert.equal(createInitialTradeForm(plugin, undefined, 'live').accountId, 'prop');
});
