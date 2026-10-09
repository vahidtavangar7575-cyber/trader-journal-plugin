import assert from 'node:assert/strict';
import test from 'node:test';
import type { TradePlanOption } from '../src/plans/types';
import type { Translator } from '../src/i18n';
import {
	calculateLiveRr,
	formatTradeTagsInput,
	isTradePlanOptionCompatible,
	parseTradeTags,
	validateTradeForm,
} from '../src/ui/traderJournal/form';
import type { TradeFormState } from '../src/ui/traderJournal/form';

const translateKey: Translator = (key) => key;

void test('round-trips stored trade tags through the modal input', () => {
	assert.equal(formatTradeTagsInput(['breakout', 'trend']), 'breakout, trend');
	assert.equal(formatTradeTagsInput('breakout, trend'), 'breakout, trend');
	assert.deepEqual(parseTradeTags(' #breakout, trend, breakout, , #momentum '), [
		'breakout',
		'trend',
		'momentum',
	]);
});

void test('accepts a plan only for its symbol and active date range', () => {
	const plan = createPlanOption({
		symbol: 'NQ',
		startDate: '2026-08-10',
		endDate: '2026-08-20',
	});

	assert.equal(isTradePlanOptionCompatible(plan, 'nq', '2026-08-10'), true);
	assert.equal(isTradePlanOptionCompatible(plan, 'NQ', '2026-08-20'), true);
	assert.equal(isTradePlanOptionCompatible(plan, 'ES', '2026-08-15'), false);
	assert.equal(isTradePlanOptionCompatible(plan, 'NQ', '2026-08-09'), false);
	assert.equal(isTradePlanOptionCompatible(plan, 'NQ', '2026-08-21'), false);
	assert.equal(isTradePlanOptionCompatible(plan, 'NQ', ''), false);
});

void test('keeps an open-ended plan active after its start date', () => {
	const plan = createPlanOption({ endDate: null });

	assert.equal(isTradePlanOptionCompatible(plan, 'NQ', '2026-08-15'), true);
	assert.equal(isTradePlanOptionCompatible(plan, 'NQ', '2026-08-09'), false);
});

void test('accepts live prices with precision greater than two decimal places', () => {
	const form = createLiveForm({
		entryPrice: '1.08425',
		stopLoss: '1.08415',
		takeProfit: '1.08445',
	});

	assert.equal(validateTradeForm(form, 'live', translateKey, []), null);
	assert.equal(calculateLiveRr('long', form.entryPrice, form.stopLoss, form.takeProfit), 2);
});

void test('rejects unavailable, cross-symbol, and out-of-range plans', () => {
	const form = createLiveForm({ planId: 'plan-1' });
	assert.equal(validateTradeForm(form, 'live', translateKey, []), 'error.planUnavailable');
	assert.equal(
		validateTradeForm(form, 'live', translateKey, [createPlanOption({ symbol: 'ES' })]),
		'error.planSymbolMismatch',
	);
	assert.equal(
		validateTradeForm(form, 'live', translateKey, [createPlanOption({ endDate: '2026-08-19' })]),
		'error.planDateMismatch',
	);
});

function createPlanOption(overrides: Partial<TradePlanOption> = {}): TradePlanOption {
	return {
		id: 'plan-1',
		title: 'Opening range',
		symbol: 'NQ',
		status: 'open',
		startDate: '2026-08-10',
		endDate: null,
		filePath: 'Trading/Live/_plans/plan-1.md',
		setupId: 'setup-1',
		setup: 'Breakout',
		...overrides,
	};
}

function createLiveForm(overrides: Partial<TradeFormState> = {}): TradeFormState {
	return {
		symbol: 'NQ',
		planId: '',
		setupId: 'setup-1',
		side: 'long',
		setup: 'Breakout',
		timeframe: '5m',
		result: 'win',
		rr: '',
		tags: '',
		entryPrice: '100',
		stopLoss: '99',
		exitPrice: '',
		takeProfit: '102',
		accountEquity: '',
		riskPct: '',
		positionSize: '',
		positionUnit: 'lot',
		session: 'other',
		marketArrivalContext: '',
		preTradeEmotion: 'neutral',
		urgeToChase: '',
		images: [],
		notes: '',
		openedAt: '2026-08-20T09:30',
		closedAt: '',
		review: {
			context: '',
			entryTiming: '',
			planAdherence: '',
			mistakeTags: [],
			whatWentWell: '',
			lesson: '',
			nextAction: '',
			reviewedAt: '',
		},
		...overrides,
	};
}
