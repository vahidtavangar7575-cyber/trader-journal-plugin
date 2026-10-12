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

void test('keeps only positive broker contract-size overrides', () => {
	const settings = normalizeSettings({
		instrumentContractOverrides: {
			XAUUSD: 100,
			GER40: 1,
			BROKEN: -2,
			ZERO: 0,
		},
	});
	assert.deepEqual(settings.instrumentContractOverrides, { XAUUSD: 100, GER40: 1 });
});
