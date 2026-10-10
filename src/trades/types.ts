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
