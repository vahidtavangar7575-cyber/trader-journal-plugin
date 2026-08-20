import assert from 'node:assert/strict';
import test from 'node:test';
import { extractTrades } from '../src/trades/parser';
import { renderTradeBlock, replaceTradeBlockById } from '../src/trades/tradeBlocks';
import type { TradeEntry } from '../src/trades/types';

void test('replaces an existing trade block by stable id without appending a duplicate', () => {
	const firstTrade = createTrade('trade-1', 'Initial note');
	const secondTrade = createTrade('trade-2', 'Other trade');
	const content = `## Trades\n\n${renderTradeBlock(firstTrade)}\n\n${renderTradeBlock(secondTrade)}\n`;
	const updatedTrade = createTrade('trade-1', 'Updated note');

	const result = replaceTradeBlockById(content, updatedTrade);
	const trades = extractTrades(result.content).trades;

	assert.equal(result.replaced, true);
	assert.equal(trades.length, 2);
	assert.deepEqual(trades.map((trade) => trade.id), ['trade-1', 'trade-2']);
	assert.equal(trades[0]?.notes, 'Updated note');
});

void test('does not mutate journal content when the stable id is absent', () => {
	const content = renderTradeBlock(createTrade('trade-1', 'Initial note'));
	const result = replaceTradeBlockById(content, createTrade('missing', 'Updated note'));

	assert.equal(result.replaced, false);
	assert.equal(result.content, content);
});

function createTrade(id: string, notes: string): TradeEntry {
	return {
		schemaVersion: 1,
		id,
		journal_type: 'backtest',
		symbol: 'NQ',
		notes,
	};
}
