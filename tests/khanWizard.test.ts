import assert from 'node:assert/strict';
import test from 'node:test';
import {
	answerKhanDecision,
	backKhanDecision,
	continueKhanDecision,
	createKhanDecisionSnapshot,
	getKhanDecisionResult,
	validateKhanRuleGraph,
} from '../src/khan/engine';
import type { KhanDecisionSnapshot } from '../src/khan/types';

void test('Khan rule graph has no missing targets', () => {
	assert.deepEqual(validateKhanRuleGraph(), []);
});

void test('Setup 1 all-decisional route yields 0.1 percent risk', () => {
	const snapshot = answerSequence([
		'idm-consumed',
		'yes',
		'decisional',
		'decisional',
		'decisional',
	]);
	const result = getKhanDecisionResult(snapshot);
	assert.equal(result?.setup, 'setup-1');
	assert.equal(result?.riskPct, 0.1);
	assert.equal(result?.resultPage, 6);
});

void test('Setup 1 all-extreme route yields 1 percent risk', () => {
	const snapshot = answerSequence([
		'idm-consumed',
		'yes',
		'extreme',
		'extreme',
		'extreme',
	]);
	const result = getKhanDecisionResult(snapshot);
	assert.equal(result?.setup, 'setup-1');
	assert.equal(result?.riskPct, 1);
	assert.equal(result?.resultPage, 17);
});

void test('Setup 5 preserves the asymmetric daily-high and daily-low matrix', () => {
	const high = getKhanDecisionResult(answerSequence([
		'daily-level',
		'previous-day-high',
		'decisional',
		'bullish',
	]));
	assert.equal(high?.setup, 'setup-5');
	assert.equal(high?.riskPct, 0.1);
	assert.equal(high?.resultPage, 48);

	const low = getKhanDecisionResult(answerSequence([
		'daily-level',
		'previous-day-low',
		'decisional',
		'bearish',
	]));
	assert.equal(low?.setup, 'setup-5');
	assert.equal(low?.riskPct, 0.1);
	assert.equal(low?.resultPage, 48);
});

void test('Setup 6 maps decisional/decisional to 0.1 and extreme/extreme to 0.5', () => {
	const decisional = getKhanDecisionResult(answerSequence([
		'fast-entry',
		'yes-near',
		'decisional',
		'decisional',
	]));
	assert.equal(decisional?.setup, 'setup-6');
	assert.equal(decisional?.riskPct, 0.1);
	assert.equal(decisional?.resultPage, 56);

	const extreme = getKhanDecisionResult(answerSequence([
		'fast-entry',
		'yes-near',
		'extreme',
		'extreme',
	]));
	assert.equal(extreme?.setup, 'setup-6');
	assert.equal(extreme?.riskPct, 0.5);
	assert.equal(extreme?.resultPage, 58);
});

void test('cross-setup source links update the active setup', () => {
	let setup2 = createKhanDecisionSnapshot();
	setup2 = answerKhanDecision(setup2, 'idm-consumed');
	setup2 = answerKhanDecision(setup2, 'no');
	assert.equal(setup2.page, 18);
	assert.equal(setup2.setup, 'setup-2');

	let setup6 = createKhanDecisionSnapshot();
	setup6 = answerKhanDecision(setup6, 'bos-close');
	setup6 = answerKhanDecision(setup6, 'yes');
	assert.equal(setup6.page, 53);
	assert.equal(setup6.setup, 'setup-6');
});

void test('Setup 6 no-reaction instruction moves to Setup 1 and back restores the previous state', () => {
	let snapshot = createKhanDecisionSnapshot();
	snapshot = answerKhanDecision(snapshot, 'fast-entry');
	snapshot = answerKhanDecision(snapshot, 'no-moved');
	assert.equal(snapshot.page, 52);
	assert.equal(snapshot.setup, 'setup-6');

	snapshot = continueKhanDecision(snapshot);
	assert.equal(snapshot.page, 2);
	assert.equal(snapshot.setup, 'setup-1');

	snapshot = backKhanDecision(snapshot);
	assert.equal(snapshot.page, 52);
	assert.equal(snapshot.setup, 'setup-6');
});

function answerSequence(answerIds: string[]): KhanDecisionSnapshot {
	return answerIds.reduce(
		(snapshot, answerId) => answerKhanDecision(snapshot, answerId),
		createKhanDecisionSnapshot(),
	);
}
