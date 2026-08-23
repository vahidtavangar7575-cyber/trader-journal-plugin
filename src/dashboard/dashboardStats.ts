import type { JournalPlanSnapshot, JournalCalendarPlan } from '../plans/planIndex';
import type { JournalCalendarSnapshot, JournalCalendarTrade } from '../trades/journalIndex';
import { formatResult, formatSide, stringifyValue } from '../trades/format';
import { normalizeSymbol, type TraderJournalLanguage } from '../settings';
import type { TradeJournalType } from '../trades/types';
import type { TradeReviewMistakeTag, TradeReviewPlanAdherence } from '../trades/types';
import {
	TRADE_REVIEW_PLAN_ADHERENCE_OPTIONS,
	normalizeTradeReview,
} from '../trades/review';
import { formatLocalDateKey, isValidDateKey } from './dashboardDates';

export type DashboardPeriod = 'today' | 'yesterday' | '7d' | '30d' | 'month' | 'custom' | 'all';

export interface DashboardFilters {
	journalType: TradeJournalType;
	period: DashboardPeriod;
	symbol: string;
	dateFrom?: string;
	dateTo?: string;
}

export type RecentTradeOutcomeFilter = 'all' | 'open' | 'win' | 'loss' | 'breakeven';
export type RecentTradeSideFilter = 'all' | 'long' | 'short';
export type RecentTradeReviewFilter = 'all' | 'reviewed' | 'unreviewed';
export type RecentTradePlanFilter = 'all' | 'linked' | 'unplanned';

export interface RecentTradeFilters {
	query: string;
	outcome: RecentTradeOutcomeFilter;
	side: RecentTradeSideFilter;
	setup: string;
	review: RecentTradeReviewFilter;
	plan: RecentTradePlanFilter;
}

export const DEFAULT_RECENT_TRADE_FILTERS: RecentTradeFilters = {
	query: '',
	outcome: 'all',
	side: 'all',
	setup: '',
	review: 'all',
	plan: 'all',
};

export interface DashboardMetrics {
	tradeCount: number;
	completedTradeCount: number;
	winRate: number;
	netRr: number;
	averageRr: number;
}

export interface PlanMetrics {
	totalCount: number;
	openCount: number;
	closedCount: number;
	cancelledCount: number;
	withTradesCount: number;
	executionRate: number;
	openWithoutTradesCount: number;
}

export interface ReviewMistakeMetric {
	tag: TradeReviewMistakeTag;
	count: number;
	rate: number;
}

export interface PlanAdherenceMetric {
	adherence: TradeReviewPlanAdherence;
	tradeCount: number;
	winRate: number;
	netRr: number;
	averageRr: number;
}

export interface ReviewMetrics {
	closedTradeCount: number;
	reviewedTradeCount: number;
	unreviewedTradeCount: number;
	reviewCompletionRate: number;
	mistakes: ReviewMistakeMetric[];
	planAdherence: PlanAdherenceMetric[];
}

export interface TradePlanLinkMetrics {
	linkedTradeCount: number;
	unplannedTradeCount: number;
	orphanedTradeCount: number;
	executedPlanCount: number;
	tradesPerExecutedPlan: number;
}

export function getDashboardTrades(
	snapshot: JournalCalendarSnapshot,
	filters: DashboardFilters,
	today = new Date(),
): JournalCalendarTrade[] {
	const dateRange = getPeriodDateRange(filters, today);
	if (!dateRange) {
		return [];
	}
	const { startDate, endDate } = dateRange;
	return collectTrades(snapshot)
		.filter((trade) => trade.journalType === filters.journalType)
		.filter((trade) => !filters.symbol || trade.symbol === filters.symbol)
		.filter((trade) => !startDate || trade.journalDate >= startDate)
		.filter((trade) => !endDate || trade.journalDate <= endDate)
		.sort((first, second) => {
			if (first.journalDate !== second.journalDate) {
				return second.journalDate.localeCompare(first.journalDate);
			}
			return second.sortTime - first.sortTime;
		});
}

export function getDashboardMetrics(trades: JournalCalendarTrade[]): DashboardMetrics {
	const completedTrades = trades.filter(isTradeIncludedInOutcomeStats);
	const winCount = completedTrades.filter((trade) => trade.resultKey === 'win').length;
	const rrValues = completedTrades.map(getSignedRr);
	const netRr = rrValues.reduce((total, rr) => total + rr, 0);

	return {
		tradeCount: trades.length,
		completedTradeCount: completedTrades.length,
		winRate: completedTrades.length ? (winCount / completedTrades.length) * 100 : 0,
		netRr,
		averageRr: completedTrades.length ? netRr / completedTrades.length : 0,
	};
}

export function filterRecentTrades(
	trades: JournalCalendarTrade[],
	filters: RecentTradeFilters,
	language: TraderJournalLanguage = 'en',
	planSnapshot?: JournalPlanSnapshot,
): JournalCalendarTrade[] {
	const query = filters.query.trim().toLocaleLowerCase();
	const plansById = planSnapshot
		? new Map(planSnapshot.plans.map((plan) => [plan.id, plan]))
		: null;
	return trades.filter((trade) => {
		if (query && !getTradeSearchText(trade, language).includes(query)) {
			return false;
		}
		if (filters.outcome === 'open' && trade.status !== 'open') {
			return false;
		}
		if (
			filters.outcome !== 'all' &&
			filters.outcome !== 'open' &&
			trade.resultKey !== filters.outcome
		) {
			return false;
		}
		if (filters.side !== 'all' && trade.sideKey !== filters.side) {
			return false;
		}
		if (filters.setup && trade.setup !== filters.setup) {
			return false;
		}
		if (trade.journalType === 'live' && filters.review === 'reviewed' && !trade.reviewed) {
			return false;
		}
		if (
			trade.journalType === 'live' &&
			filters.review === 'unreviewed' &&
			(trade.status !== 'closed' || trade.reviewed)
		) {
			return false;
		}
		const hasPlan = plansById
			? getValidLinkedPlanId(trade, plansById) !== null
			: Boolean(stringifyValue(trade.trade.plan_id));
		if (trade.journalType === 'live' && filters.plan === 'linked' && !hasPlan) {
			return false;
		}
		if (trade.journalType === 'live' && filters.plan === 'unplanned' && hasPlan) {
			return false;
		}
		return true;
	});
}

export function getDashboardSymbols(
	tradeSnapshot: JournalCalendarSnapshot,
	planSnapshot: JournalPlanSnapshot,
	journalType: TradeJournalType,
): string[] {
	const tradeSymbols = collectTrades(tradeSnapshot)
		.filter((trade) => trade.journalType === journalType)
		.map((trade) => trade.symbol);
	const planSymbols = planSnapshot.plans.map((plan) => plan.symbol);

	return [...new Set([...tradeSymbols, ...planSymbols].filter(Boolean))]
		.sort((first, second) => first.localeCompare(second));
}

export function getOpenPlans(
	planSnapshot: JournalPlanSnapshot,
	tradeSnapshot: JournalCalendarSnapshot,
	symbol = '',
): JournalCalendarPlan[] {
	const tradeCounts = getPlanTradeCounts(planSnapshot, tradeSnapshot);
	return planSnapshot.plans
		.filter((plan) => plan.status === 'open')
		.filter((plan) => !symbol || plan.symbol === symbol)
		.map((plan) => ({ ...plan, linkedTradeCount: tradeCounts.get(plan.id) ?? 0 }))
		.sort((first, second) => {
			if ((first.linkedTradeCount === 0) !== (second.linkedTradeCount === 0)) {
				return first.linkedTradeCount === 0 ? -1 : 1;
			}
			return second.sortTime - first.sortTime;
		});
}

export function getPlanMetrics(
	planSnapshot: JournalPlanSnapshot,
	tradeSnapshot: JournalCalendarSnapshot,
	symbol = '',
): PlanMetrics {
	const tradeCounts = getPlanTradeCounts(planSnapshot, tradeSnapshot);
	const plans = planSnapshot.plans.filter((plan) => !symbol || plan.symbol === symbol);
	const openPlans = plans.filter((plan) => plan.status === 'open');
	const withTradesCount = plans.filter((plan) => (tradeCounts.get(plan.id) ?? 0) > 0).length;

	return {
		totalCount: plans.length,
		openCount: openPlans.length,
		closedCount: plans.filter((plan) => plan.status === 'closed').length,
		cancelledCount: plans.filter((plan) => plan.status === 'cancelled').length,
		withTradesCount,
		executionRate: plans.length ? (withTradesCount / plans.length) * 100 : 0,
		openWithoutTradesCount: openPlans.filter((plan) => (tradeCounts.get(plan.id) ?? 0) === 0).length,
	};
}

export function getOpenLiveTradeCount(snapshot: JournalCalendarSnapshot, symbol = ''): number {
	return collectTrades(snapshot).filter(
		(trade) =>
			trade.journalType === 'live' &&
			trade.status === 'open' &&
			(!symbol || trade.symbol === symbol),
	).length;
}

export function getUnreviewedClosedLiveTradeCount(snapshot: JournalCalendarSnapshot, symbol = ''): number {
	return collectTrades(snapshot).filter(
		(trade) =>
			trade.journalType === 'live' &&
			trade.status === 'closed' &&
			!trade.reviewed &&
			(!symbol || trade.symbol === symbol),
	).length;
}

export function getReviewMetrics(trades: JournalCalendarTrade[]): ReviewMetrics {
	const closedTrades = trades.filter((trade) => trade.journalType === 'live' && trade.status === 'closed');
	const reviewedTrades = closedTrades
		.map((trade) => ({ trade, review: normalizeTradeReview(trade.trade.review) }))
		.filter((item): item is { trade: JournalCalendarTrade; review: NonNullable<typeof item.review> } => Boolean(item.review));
	const mistakeCounts = new Map<TradeReviewMistakeTag, number>();
	for (const { review } of reviewedTrades) {
		for (const tag of new Set(review.mistake_tags ?? [])) {
			mistakeCounts.set(tag, (mistakeCounts.get(tag) ?? 0) + 1);
		}
	}
	const mistakes = [...mistakeCounts.entries()]
		.map(([tag, count]) => ({
			tag,
			count,
			rate: reviewedTrades.length ? (count / reviewedTrades.length) * 100 : 0,
		}))
		.sort((first, second) => second.count - first.count || first.tag.localeCompare(second.tag));
	const planAdherence = TRADE_REVIEW_PLAN_ADHERENCE_OPTIONS.flatMap((adherence) => {
		const matchingTrades = reviewedTrades
			.filter(({ review }) => review.plan_adherence === adherence)
			.map(({ trade }) => trade);
		if (!matchingTrades.length) {
			return [];
		}
		const rrValues = matchingTrades.map(getSignedRr);
		const netRr = rrValues.reduce((total, rr) => total + rr, 0);
		const winCount = matchingTrades.filter((trade) => trade.resultKey === 'win').length;
		return [{
			adherence,
			tradeCount: matchingTrades.length,
			winRate: (winCount / matchingTrades.length) * 100,
			netRr,
			averageRr: netRr / matchingTrades.length,
		}];
	});

	return {
		closedTradeCount: closedTrades.length,
		reviewedTradeCount: reviewedTrades.length,
		unreviewedTradeCount: closedTrades.length - reviewedTrades.length,
		reviewCompletionRate: closedTrades.length ? (reviewedTrades.length / closedTrades.length) * 100 : 0,
		mistakes,
		planAdherence,
	};
}

export function getTradePlanLinkMetrics(
	tradeSnapshot: JournalCalendarSnapshot,
	planSnapshot: JournalPlanSnapshot,
	symbol = '',
): TradePlanLinkMetrics {
	const plansById = new Map(planSnapshot.plans.map((plan) => [plan.id, plan]));
	const liveTrades = collectTrades(tradeSnapshot).filter(
		(trade) => trade.journalType === 'live' && (!symbol || trade.symbol === symbol),
	);
	const linkedTrades = liveTrades.filter((trade) => getValidLinkedPlanId(trade, plansById) !== null);
	const orphanedTrades = liveTrades.filter((trade) => {
		const planId = stringifyValue(trade.trade.plan_id);
		return Boolean(planId) && getValidLinkedPlanId(trade, plansById) === null;
	});
	const executedPlanIds = new Set(
		linkedTrades.map((trade) => getValidLinkedPlanId(trade, plansById)).filter(Boolean),
	);

	return {
		linkedTradeCount: linkedTrades.length,
		unplannedTradeCount: liveTrades.length - linkedTrades.length - orphanedTrades.length,
		orphanedTradeCount: orphanedTrades.length,
		executedPlanCount: executedPlanIds.size,
		tradesPerExecutedPlan: executedPlanIds.size ? linkedTrades.length / executedPlanIds.size : 0,
	};
}

function getPlanTradeCounts(
	planSnapshot: JournalPlanSnapshot,
	tradeSnapshot: JournalCalendarSnapshot,
): Map<string, number> {
	const plansById = new Map(planSnapshot.plans.map((plan) => [plan.id, plan]));
	const counts = new Map<string, number>();
	for (const trade of collectTrades(tradeSnapshot)) {
		if (trade.journalType !== 'live') {
			continue;
		}
		const planId = getValidLinkedPlanId(trade, plansById);
		if (planId) {
			counts.set(planId, (counts.get(planId) ?? 0) + 1);
		}
	}
	return counts;
}

function getValidLinkedPlanId(
	trade: JournalCalendarTrade,
	plansById: ReadonlyMap<string, JournalCalendarPlan>,
): string | null {
	const planId = stringifyValue(trade.trade.plan_id);
	const plan = plansById.get(planId);
	return plan && normalizeSymbol(plan.symbol) === normalizeSymbol(trade.symbol) ? planId : null;
}

function collectTrades(snapshot: JournalCalendarSnapshot): JournalCalendarTrade[] {
	return Object.values(snapshot.daysByDate).flatMap((day) => day.trades);
}

function getTradeSearchText(trade: JournalCalendarTrade, language: TraderJournalLanguage): string {
	return [
		trade.symbol,
		trade.setup,
		trade.timeframe,
		trade.notes,
		stringifyValue(trade.trade.side),
		stringifyValue(trade.trade.result),
		formatSide(trade.trade.side, language),
		formatResult(trade.trade.result, language),
		stringifyValue(trade.trade.plan_id),
	]
		.filter(Boolean)
		.join(' ')
		.toLocaleLowerCase();
}

function isTradeIncludedInOutcomeStats(trade: JournalCalendarTrade): boolean {
	return trade.journalType !== 'live' || trade.status === 'closed';
}

function getSignedRr(trade: JournalCalendarTrade): number {
	const rr = parseRr(trade.trade.rr);
	if (trade.resultKey === 'loss') {
		return -Math.abs(rr);
	}
	if (trade.resultKey === 'win') {
		return Math.abs(rr);
	}
	if (trade.resultKey === 'breakeven') {
		return 0;
	}
	return rr;
}

function parseRr(value: unknown): number {
	if (typeof value === 'number' && Number.isFinite(value)) {
		return value;
	}

	const parsed = Number(stringifyValue(value).replace(/r$/i, ''));
	return Number.isFinite(parsed) ? parsed : 0;
}

function getPeriodDateRange(
	filters: DashboardFilters,
	today: Date,
): { startDate: string | null; endDate: string | null } | null {
	if (filters.period === 'all') {
		return { startDate: null, endDate: null };
	}
	if (filters.period === 'custom') {
		const startDate = normalizeDateFilter(filters.dateFrom);
		const endDate = normalizeDateFilter(filters.dateTo);
		return startDate && endDate && startDate <= endDate ? { startDate, endDate } : null;
	}

	const end = new Date(today.getFullYear(), today.getMonth(), today.getDate());
	const start = new Date(end);
	if (filters.period === 'today') {
		const date = formatLocalDateKey(start);
		return { startDate: date, endDate: date };
	}
	if (filters.period === 'yesterday') {
		start.setDate(start.getDate() - 1);
		const date = formatLocalDateKey(start);
		return { startDate: date, endDate: date };
	}
	if (filters.period === 'month') {
		start.setDate(1);
	} else {
		start.setDate(start.getDate() - (filters.period === '7d' ? 6 : 29));
	}
	return { startDate: formatLocalDateKey(start), endDate: formatLocalDateKey(end) };
}

function normalizeDateFilter(value: string | undefined): string | null {
	const normalized = value?.trim() ?? '';
	return isValidDateKey(normalized) ? normalized : null;
}
