import assert from 'node:assert/strict';
import test from 'node:test';
import { calculateFxPositionSize, parseFxPair, prepareFxPositionSizing } from '../src/risk/positionSizing';
import { calculateExitPriceFromR } from '../src/risk/realizedR';

void test('parses common forex symbols with and without slash', () => {
	assert.deepEqual(parseFxPair('EURUSD'), { base: 'EUR', quote: 'USD' });
	assert.deepEqual(parseFxPair('eur/usd'), { base: 'EUR', quote: 'USD' });
	assert.equal(parseFxPair('NQ'), null);
});

void test('calculates EURUSD lot size exactly when account currency is quote currency', () => {
	const result = calculateFxPositionSize({
		symbol: 'EURUSD',
		accountCurrency: 'USD',
		equity: 10_000,
		riskPct: 1,
		entryPrice: 1.1,
		stopLoss: 1.095,
		lotStep: 0.01,
	});
	assert.ok(result);
	assert.equal(result.stopDistancePips, 50);
	assert.equal(result.pipValuePerLot, 10);
	assert.equal(result.riskAmount, 100);
	assert.equal(result.lots, 0.2);
	assert.equal(result.actualRiskAmount, 100);
});

void test('derives quote-to-account conversion from the same pair when account currency is base', () => {
	const preparation = prepareFxPositionSizing('USDJPY', 'USD', 149.5);
	assert.equal(preparation.kind, 'ready');
	const result = calculateFxPositionSize({
		symbol: 'USDJPY',
		accountCurrency: 'USD',
		equity: 10_000,
		riskPct: 1,
		entryPrice: 150,
		stopLoss: 149.5,
		lotStep: 0.01,
	});
	assert.ok(result);
	assert.equal(result.stopDistancePips, 50);
	assert.equal(result.lots, 0.29);
	assert.ok(result.actualRiskAmount <= 100);
});

void test('uses an online cross conversion rate and rounds lot size down', () => {
	const preparation = prepareFxPositionSizing('EURGBP', 'USD', 0.855);
	assert.deepEqual(preparation, { kind: 'needs-online-rate', fromCurrency: 'GBP', toCurrency: 'USD' });
	const result = calculateFxPositionSize({
		symbol: 'EURGBP',
		accountCurrency: 'USD',
		equity: 10_000,
		riskPct: 1,
		entryPrice: 0.86,
		stopLoss: 0.855,
		conversionRate: 1.28,
		lotStep: 0.01,
	});
	assert.ok(result);
	assert.equal(result.lots, 0.15);
	assert.equal(result.actualRiskAmount, 96);
	assert.equal(result.conversionSource, 'online-cross');
});

void test('calculates an exit price from signed realized R', () => {
	assert.equal(calculateExitPriceFromR('long', '100', '99', 2), 102);
	assert.equal(calculateExitPriceFromR('long', '100', '99', -1), 99);
	assert.equal(calculateExitPriceFromR('short', '100', '101', 2), 98);
	assert.equal(calculateExitPriceFromR('short', '100', '101', -1), 101);
});
