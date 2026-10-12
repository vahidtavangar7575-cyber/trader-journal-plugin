import assert from 'node:assert/strict';
import test from 'node:test';
import { calculatePositionSize } from '../src/positionSizing/calculator';
import { findInstrumentProfile } from '../src/positionSizing/instruments';

void test('sizes EURUSD using 100k standard-lot contract', () => {
	const profile = findInstrumentProfile('EURUSD');
	assert.ok(profile);
	const result = calculatePositionSize({
		profile,
		entryPrice: 1.105,
		stopLoss: 1.102,
		equity: 10000,
		riskPct: 0.3,
		quoteToAccountRate: 1,
	});
	assert.ok(result);
	assert.equal(result.distanceUnits, 30);
	assert.equal(result.pipValuePerLotAccount, 10);
	assert.equal(result.recommendedVolume, 0.1);
	assert.equal(result.actualRiskAmountAtRoundedVolume, 30);
	assert.match(profile.officialReferenceFa, /125/);
});

void test('sizes XAUUSD from dollar distance and 100 oz reference contract', () => {
	const profile = findInstrumentProfile('GOLD');
	assert.ok(profile);
	const result = calculatePositionSize({
		profile,
		entryPrice: 2650,
		stopLoss: 2645,
		equity: 10000,
		riskPct: 0.5,
		quoteToAccountRate: 1,
	});
	assert.ok(result);
	assert.equal(result.distanceUnits, 500);
	assert.equal(result.lossPerLotAccount, 500);
	assert.equal(result.recommendedVolume, 0.1);
	assert.match(profile.officialReferenceFa, /۱۰۰/);
});

void test('converts DAX point value from EUR to USD before sizing', () => {
	const profile = findInstrumentProfile('GER40');
	assert.ok(profile);
	const result = calculatePositionSize({
		profile,
		entryPrice: 20000,
		stopLoss: 19950,
		equity: 10000,
		riskPct: 0.3,
		quoteToAccountRate: 1.1,
	});
	assert.ok(result);
	assert.equal(result.lossPerLotAccount, 55);
	assert.equal(result.recommendedVolume, 0.54);
	assert.ok(result.actualRiskAmountAtRoundedVolume <= 30);
});

void test('uses a broker contract override instead of silently using the reference default', () => {
	const profile = findInstrumentProfile('US30');
	assert.ok(profile);
	const result = calculatePositionSize({
		profile,
		entryPrice: 45000,
		stopLoss: 44950,
		equity: 10000,
		riskPct: 0.3,
		quoteToAccountRate: 1,
		contractSizeOverride: 5,
	});
	assert.ok(result);
	assert.equal(result.lossPerLotAccount, 250);
	assert.equal(result.recommendedVolume, 0.12);
	assert.ok(result.actualRiskAmountAtRoundedVolume <= 30);
});

void test('supports focused aliases for indices, oil and bitcoin', () => {
	assert.equal(findInstrumentProfile('DJ30')?.id, 'US30');
	assert.equal(findInstrumentProfile('NASDAQ')?.id, 'NAS100');
	assert.equal(findInstrumentProfile('WTI')?.id, 'USOIL');
	assert.equal(findInstrumentProfile('BTC')?.id, 'BTCUSD');
});

void test('keeps official references for all focused markets', () => {
	for (const symbol of ['EURUSD', 'XAUUSD', 'US30', 'DAX40', 'NAS100', 'USOIL', 'BTCUSD']) {
		const profile = findInstrumentProfile(symbol);
		assert.ok(profile);
		assert.ok(profile.officialReferenceFa.length > 20);
		assert.match(profile.officialSourceFa, /2026-10/);
	}
});
