import assert from 'node:assert/strict';
import test from 'node:test';
import {
	DAILY_TRADING_COMMITMENT,
	canManuallyConfirmCommitment,
	getCommitmentDifferenceCount,
	getCommitmentMatchScore,
	isCommitmentComplete,
	normalizeCommitment,
} from '../src/behavior/commitment';

void test('accepts the exact trading commitment', () => {
	assert.equal(isCommitmentComplete(DAILY_TRADING_COMMITMENT), true);
	assert.equal(getCommitmentMatchScore(DAILY_TRADING_COMMITMENT), 100);
	assert.equal(getCommitmentDifferenceCount(DAILY_TRADING_COMMITMENT), 0);
});

void test('ignores only the difference between half-space and normal space', () => {
	const variant = DAILY_TRADING_COMMITMENT.replace(/\u200c/g, ' ');
	assert.equal(normalizeCommitment(variant), normalizeCommitment(DAILY_TRADING_COMMITMENT));
	assert.equal(isCommitmentComplete(variant), true);
});

void test('does not silently normalize letters or punctuation', () => {
	const changedLetter = DAILY_TRADING_COMMITMENT.replace('کیفیت', 'كيفيت');
	const changedPunctuation = DAILY_TRADING_COMMITMENT.replace('؛', ';');
	assert.equal(isCommitmentComplete(changedLetter), false);
	assert.equal(isCommitmentComplete(changedPunctuation), false);
	assert.ok(getCommitmentMatchScore(changedLetter) < 100);
	assert.ok(getCommitmentMatchScore(changedPunctuation) < 100);
});

void test('manual bypass stays disabled until the text is fully complete', () => {
	const substantialTyping = DAILY_TRADING_COMMITMENT.slice(0, Math.ceil(DAILY_TRADING_COMMITMENT.length * 0.95));
	assert.equal(canManuallyConfirmCommitment(substantialTyping), false);
	assert.equal(canManuallyConfirmCommitment(DAILY_TRADING_COMMITMENT), true);
});
