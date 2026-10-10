import assert from 'node:assert/strict';
import test from 'node:test';
import {
	DAILY_TRADING_COMMITMENT,
	canManuallyConfirmCommitment,
	getCommitmentMatchScore,
	isCommitmentComplete,
	normalizeCommitment,
} from '../src/behavior/commitment';

void test('accepts the exact trading commitment', () => {
	assert.equal(isCommitmentComplete(DAILY_TRADING_COMMITMENT), true);
	assert.equal(getCommitmentMatchScore(DAILY_TRADING_COMMITMENT), 100);
});

void test('normalizes Persian and Arabic letter variants, spacing, and punctuation', () => {
	const variant = DAILY_TRADING_COMMITMENT
		.replace(/ی/g, 'ي')
		.replace(/ک/g, 'ك')
		.replace(/؛/g, ';')
		.replace(/،/g, ',')
		.replace(/ /g, '\u200c');

	assert.equal(normalizeCommitment(variant), normalizeCommitment(DAILY_TRADING_COMMITMENT));
	assert.equal(isCommitmentComplete(variant), true);
});

void test('offers a conscious manual continuation after substantial typing', () => {
	const substantialTyping = DAILY_TRADING_COMMITMENT.slice(0, Math.ceil(DAILY_TRADING_COMMITMENT.length * 0.7));
	assert.equal(canManuallyConfirmCommitment(substantialTyping), true);
});
