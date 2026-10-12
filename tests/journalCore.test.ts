import assert from 'node:assert/strict';
import test from 'node:test';
import { buildTradeJournalDetails, createTradeJournalCoreState } from '../src/trades/journalCore';

void test('central journal state restores structured persisted details', () => {
	const state = createTradeJournalCoreState({
		session_day: 'سه‌شنبه لندن',
		htf_structure: 'bullish',
		structure_layer: 'major',
		liquidity_event: 'idm',
		poi_category: 'of',
		poi_type: 'decisional',
		idm_state: 'consumed',
		trigger_module: 'scob',
		m15_context_complete: true,
		m1_trigger_complete: true,
		zone_consumed: false,
		news_checked: true,
		target_liquidity: 'PDH',
		m15_zone_boundary: '1.0950-1.0945',
		commission: 3.5,
		swap: -0.2,
		mfe_r: 2.8,
		mae_r: -0.4,
		stop_management: 'trailed',
		stop_widened: false,
		exit_reason: 'trail',
	});
	assert.equal(state.htfStructure, 'bullish');
	assert.equal(state.m15ContextComplete, true);
	assert.equal(state.commission, '3.5');
	assert.equal(state.mfeR, '2.8');
	assert.equal(state.exitReason, 'trail');
});

void test('central journal builder drops empty values and preserves meaningful booleans/numbers', () => {
	const details = buildTradeJournalDetails({
		sessionDay: '',
		htfStructure: 'bearish',
		structureLayer: 'internal',
		liquidityEvent: 'pdl',
		poiCategory: 'ob',
		poiType: 'extreme',
		idmState: 'intact',
		triggerModule: 'choch',
		m15ContextComplete: true,
		m1TriggerComplete: false,
		zoneConsumed: false,
		newsChecked: true,
		targetLiquidity: 'Asia low',
		m15ZoneBoundary: '',
		commission: '2.25',
		swap: '',
		grossPnl: '120',
		netPnl: '117.75',
		mfeR: '3.1',
		maeR: '-0.5',
		stopManagement: 'unchanged',
		stopWidened: true,
		exitReason: 'tp',
	});
	assert.ok(details);
	assert.equal(details?.session_day, undefined);
	assert.equal(details?.htf_structure, 'bearish');
	assert.equal(details?.m15_context_complete, true);
	assert.equal(details?.m1_trigger_complete, undefined);
	assert.equal(details?.news_checked, true);
	assert.equal(details?.commission, 2.25);
	assert.equal(details?.net_pnl, 117.75);
	assert.equal(details?.stop_widened, true);
});
