import assert from 'node:assert/strict';
import test from 'node:test';
import { upsertLinkedTradeRef } from '../src/plans/linkedTrades';

void test('updates the path and label of an existing linked trade', () => {
	const result = upsertLinkedTradeRef(
		[{ trade_id: 'trade-1', file_path: 'old.md', label: 'Old label' }],
		{ trade_id: 'trade-1', file_path: 'new.md', label: 'NQ / 09:30 / long / Breakout' },
	);

	assert.equal(result.changed, true);
	assert.deepEqual(result.linkedTrades, [{
		trade_id: 'trade-1',
		file_path: 'new.md',
		label: 'NQ / 09:30 / long / Breakout',
	}]);
});

void test('does not rewrite a plan when its linked trade is unchanged', () => {
	const existing = [{ trade_id: 'trade-1', file_path: 'trade.md', label: 'Trade' }];
	const result = upsertLinkedTradeRef(existing, existing[0] ?? {});

	assert.equal(result.changed, false);
	assert.equal(result.linkedTrades, existing);
});
