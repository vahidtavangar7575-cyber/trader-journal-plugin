export const TRADE_CODE_BLOCK_LANGUAGE = 'trader-journal-trade';

export type TradeJournalType = 'backtest' | 'live';
export type TradeResult = 'loss' | 'win' | 'breakeven';
export type TradeSide = 'long' | 'short';
export type TradeImageType = 'url' | 'file';
export type LiveTradeStatus = 'open' | 'closed';
export type TradeReviewContext = 'correct' | 'partial' | 'wrong';
export type TradeReviewEntryTiming = 'early' | 'on_time' | 'late';
export type TradeReviewPlanAdherence = 'followed' | 'partial' | 'not_followed' | 'no_plan';
export type TradePositionUnit = 'lot' | 'contract' | 'unit';
export type TradeSession = 'asia' | 'london' | 'new_york' | 'overlap' | 'other';
export type PreTradeEmotion = 'calm' | 'neutral' | 'activated';
export type TradeAccountType = 'backtest' | 'demo' | 'prop' | 'competition' | 'live';
export type TradeReviewMistakeTag =
	| 'wrong_context'
	| 'early_entry'
	| 'late_entry'
	| 'no_confirmation'
	| 'fomo'
	| 'revenge_trade'
	| 'over_risk'
	| 'moved_stop'
	| 'cut_winner_early'
	| 'ignored_plan';

export interface TradeImage {
	type?: TradeImageType;
	value?: string;
	label?: string;
}

export interface TradeReview {
	schema_version: 1;
	context?: TradeReviewContext;
	entry_timing?: TradeReviewEntryTiming;
	plan_adherence?: TradeReviewPlanAdherence;
	mistake_tags?: TradeReviewMistakeTag[];
	what_went_well?: string;
	lesson?: string;
	next_action?: string;
	reviewed_at: string;
}

/**
 * Structured fields imported from Vahid's central journal model.
 * Internal keys remain stable in English; all user-facing rendering is Persian.
 */
export interface TradeJournalDetails {
	session_day?: string;
	htf_structure?: string;
	structure_layer?: string;
	liquidity_event?: string;
	poi_category?: string;
	poi_type?: string;
	idm_state?: string;
	trigger_module?: string;
	m15_context_complete?: boolean;
	m1_trigger_complete?: boolean;
	zone_consumed?: boolean;
	news_checked?: boolean;
	target_liquidity?: string;
	m15_zone_boundary?: string;
	commission?: number;
	swap?: number;
	gross_pnl?: number;
	net_pnl?: number;
	mfe_r?: number;
	mae_r?: number;
	stop_management?: string;
	stop_widened?: boolean;
	exit_reason?: string;
}

export interface TradeEntry {
	schemaVersion?: number;
	id?: string;
	date?: string;
	journal_type?: TradeJournalType;
	plan_id?: string;
	setup_id?: string;
	status?: LiveTradeStatus;
	symbol?: string;
	side?: TradeSide;
	setup?: string;
	timeframe?: string;
	result?: TradeResult;
	planned_rr?: number | string;
	rr?: number | string;
	tags?: string[] | string;
	entry_price?: number | string;
	stop_loss?: number | string;
	exit_price?: number | string;
	take_profit?: number | string;
	account_id?: string;
	account_name?: string;
	account_type?: TradeAccountType;
	account_code?: string;
	account_currency?: string;
	account_equity?: number | string;
	account_balance_before?: number | string;
	account_balance_after?: number | string;
	risk_pct?: number | string;
	risk_amount?: number | string;
	pnl_amount?: number | string;
	pnl_pct?: number | string;
	position_size?: number | string;
	position_unit?: string;
	session?: string;
	market_arrival_context?: string;
	pre_trade_emotion?: string;
	urge_to_chase?: number | string;
	risk_rule_trade_number?: number | string;
	risk_rule_recommended_pct?: number | string;
	risk_rule_day_base_pct?: number | string;
	risk_rule_week_base_pct?: number | string;
	risk_rule_violation?: boolean;
	risk_rule_warnings?: string[];
	journal_details?: TradeJournalDetails;
	images?: Array<TradeImage | string> | string;
	notes?: string;
	opened_at?: string;
	closed_at?: string;
	holding_time?: number | string | null;
	backtest_start_date?: string | null;
	backtest_end_date?: string | null;
	review?: TradeReview;
	[key: string]: unknown;
}

export interface NormalizedTradeImage {
	type: TradeImageType;
	value: string;
	label?: string;
}
