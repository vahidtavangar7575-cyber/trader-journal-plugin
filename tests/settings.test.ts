import assert from 'node:assert/strict';
import test from 'node:test';
import { normalizeSettings } from '../src/settings';

void test('keeps a valid persisted daily commitment date', () => {
	const settings = normalizeSettings({ lastCommitmentDate: '2026-10-10' });
	assert.equal(settings.lastCommitmentDate, '2026-10-10');
});

void test('drops malformed persisted commitment dates', () => {
	assert.equal(normalizeSettings({ lastCommitmentDate: '10/10/2026' }).lastCommitmentDate, '');
	assert.equal(normalizeSettings({ lastCommitmentDate: 'today' }).lastCommitmentDate, '');
});

void test('legacy disabled accounts are migrated to always-selectable accounts', () => {
	const settings = normalizeSettings({
		accounts: [{
			id: 'bt-1',
			name: 'Faraz 3Y',
			type: 'backtest',
			currency: 'USD',
			initialBalance: 10000,
			currentBalance: 10400,
			enabled: false,
			createdAt: '2026-10-01T00:00:00.000Z',
			updatedAt: '2026-10-01T00:00:00.000Z',
		}],
	});
	assert.equal(settings.accounts.length, 1);
	assert.equal(settings.accounts[0]?.enabled, true);
});

void test('legacy selected account migrates to the matching per-workflow default', () => {
	const backtest = normalizeSettings({
		accounts: [{ id: 'bt', name: 'Backtest', type: 'backtest', currency: 'USD', initialBalance: 10000, currentBalance: 10000, enabled: false, createdAt: '2026-10-01T00:00:00.000Z', updatedAt: '2026-10-01T00:00:00.000Z' }],
		lastSelectedAccountId: 'bt',
	});
	assert.equal(backtest.lastBacktestAccountId, 'bt');
	assert.equal(backtest.lastTradingAccountId, '');

	const trading = normalizeSettings({
		accounts: [{ id: 'demo', name: 'Demo 100K', type: 'demo', currency: 'USD', initialBalance: 100000, currentBalance: 100000, enabled: false, createdAt: '2026-10-01T00:00:00.000Z', updatedAt: '2026-10-01T00:00:00.000Z' }],
		lastSelectedAccountId: 'demo',
	});
	assert.equal(trading.lastTradingAccountId, 'demo');
	assert.equal(trading.lastBacktestAccountId, '');
});

void test('explicit backtest and trading defaults remain independent', () => {
	const settings = normalizeSettings({
		accounts: [
			{ id: 'bt', name: 'Backtest', type: 'backtest', currency: 'USD', initialBalance: 10000, currentBalance: 10000, enabled: true, createdAt: '2026-10-01T00:00:00.000Z', updatedAt: '2026-10-01T00:00:00.000Z' },
			{ id: 'prop', name: 'Prop', type: 'prop', currency: 'USD', initialBalance: 5000, currentBalance: 5000, enabled: true, createdAt: '2026-10-01T00:00:00.000Z', updatedAt: '2026-10-01T00:00:00.000Z' },
		],
		lastBacktestAccountId: 'bt',
		lastTradingAccountId: 'prop',
	});
	assert.equal(settings.lastBacktestAccountId, 'bt');
	assert.equal(settings.lastTradingAccountId, 'prop');
});
