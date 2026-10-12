import type { TradeJournalDetails } from './types';

export interface TradeJournalCoreState {
	sessionDay: string;
	htfStructure: string;
	structureLayer: string;
	liquidityEvent: string;
	poiCategory: string;
	poiType: string;
	idmState: string;
	triggerModule: string;
	m15ContextComplete: boolean;
	m1TriggerComplete: boolean;
	zoneConsumed: boolean;
	newsChecked: boolean;
	targetLiquidity: string;
	m15ZoneBoundary: string;
	commission: string;
	swap: string;
	grossPnl: string;
	netPnl: string;
	mfeR: string;
	maeR: string;
	stopManagement: string;
	stopWidened: boolean;
	exitReason: string;
}

export function createTradeJournalCoreState(value: unknown): TradeJournalCoreState {
	const details = isRecord(value) ? value : {};
	return {
		sessionDay: text(details.session_day),
		htfStructure: text(details.htf_structure),
		structureLayer: text(details.structure_layer),
		liquidityEvent: text(details.liquidity_event),
		poiCategory: text(details.poi_category),
		poiType: text(details.poi_type),
		idmState: text(details.idm_state),
		triggerModule: text(details.trigger_module),
		m15ContextComplete: details.m15_context_complete === true,
		m1TriggerComplete: details.m1_trigger_complete === true,
		zoneConsumed: details.zone_consumed === true,
		newsChecked: details.news_checked === true,
		targetLiquidity: text(details.target_liquidity),
		m15ZoneBoundary: text(details.m15_zone_boundary),
		commission: numberText(details.commission),
		swap: numberText(details.swap),
		grossPnl: numberText(details.gross_pnl),
		netPnl: numberText(details.net_pnl),
		mfeR: numberText(details.mfe_r),
		maeR: numberText(details.mae_r),
		stopManagement: text(details.stop_management),
		stopWidened: details.stop_widened === true,
		exitReason: text(details.exit_reason),
	};
}

export function buildTradeJournalDetails(state: TradeJournalCoreState): TradeJournalDetails | undefined {
	const details: TradeJournalDetails = {};
	assignText(details, 'session_day', state.sessionDay);
	assignText(details, 'htf_structure', state.htfStructure);
	assignText(details, 'structure_layer', state.structureLayer);
	assignText(details, 'liquidity_event', state.liquidityEvent);
	assignText(details, 'poi_category', state.poiCategory);
	assignText(details, 'poi_type', state.poiType);
	assignText(details, 'idm_state', state.idmState);
	assignText(details, 'trigger_module', state.triggerModule);
	if (state.m15ContextComplete) details.m15_context_complete = true;
	if (state.m1TriggerComplete) details.m1_trigger_complete = true;
	if (state.zoneConsumed) details.zone_consumed = true;
	if (state.newsChecked) details.news_checked = true;
	assignText(details, 'target_liquidity', state.targetLiquidity);
	assignText(details, 'm15_zone_boundary', state.m15ZoneBoundary);
	assignNumber(details, 'commission', state.commission);
	assignNumber(details, 'swap', state.swap);
	assignNumber(details, 'gross_pnl', state.grossPnl);
	assignNumber(details, 'net_pnl', state.netPnl);
	assignNumber(details, 'mfe_r', state.mfeR);
	assignNumber(details, 'mae_r', state.maeR);
	assignText(details, 'stop_management', state.stopManagement);
	if (state.stopWidened) details.stop_widened = true;
	assignText(details, 'exit_reason', state.exitReason);
	return Object.keys(details).length ? details : undefined;
}

function assignText(target: TradeJournalDetails, key: keyof TradeJournalDetails, raw: string): void {
	const value = raw.trim();
	if (value) (target as Record<string, unknown>)[key] = value;
}

function assignNumber(target: TradeJournalDetails, key: keyof TradeJournalDetails, raw: string): void {
	if (!raw.trim()) return;
	const value = Number(raw);
	if (Number.isFinite(value)) (target as Record<string, unknown>)[key] = value;
}

function text(value: unknown): string {
	return typeof value === 'string' ? value : value === undefined || value === null ? '' : String(value);
}

function numberText(value: unknown): string {
	const parsed = typeof value === 'number' ? value : typeof value === 'string' ? Number(value) : Number.NaN;
	return Number.isFinite(parsed) ? String(parsed) : '';
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}
