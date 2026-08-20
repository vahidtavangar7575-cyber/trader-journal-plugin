import { getPlanEffectiveEndDate } from '../../plans/planIndex';
import type { JournalCalendarPlan, JournalPlanSnapshot } from '../../plans/planIndex';
import type {
	JournalCalendarDay,
	JournalCalendarSnapshot,
	JournalCalendarTrade,
} from '../../trades/journalIndex';
import { stringifyValue } from '../../trades/format';
import type { TradeJournalType } from '../../trades/types';

export type TradeCalendarFilter = TradeJournalType;

export function filterSnapshotByJournalType(
	snapshot: JournalCalendarSnapshot,
	journalType: TradeCalendarFilter,
): JournalCalendarSnapshot {
	const daysByDate: Record<string, JournalCalendarDay> = {};

	for (const day of Object.values(snapshot.daysByDate)) {
		const trades = day.trades.filter((trade) => trade.journalType === journalType);
		if (trades.length === 0) {
			continue;
		}

		daysByDate[day.date] = {
			date: day.date,
			backtestCount: journalType === 'backtest' ? trades.length : 0,
			liveCount: journalType === 'live' ? trades.length : 0,
			trades,
		};
	}

	const dayDates = Object.keys(daysByDate).sort();
	const tradeCount = Object.values(daysByDate).reduce((total, day) => total + day.trades.length, 0);
	return { daysByDate, dayDates, tradeCount };
}

export function createPlansById(snapshot: JournalPlanSnapshot): Map<string, JournalCalendarPlan> {
	const plansById = new Map<string, JournalCalendarPlan>();
	for (const plan of snapshot.plans) {
		if (!plansById.has(plan.id)) {
			plansById.set(plan.id, plan);
		}
	}
	return plansById;
}

export function getAutoSelectedDate(
	journalTypeFilter: TradeCalendarFilter,
	tradeSnapshot: JournalCalendarSnapshot,
	planSnapshot: JournalPlanSnapshot,
	today: string,
): string {
	if (journalTypeFilter === 'live') {
		if (hasLiveCalendarDataOnDate(tradeSnapshot, planSnapshot.plans, today)) {
			return today;
		}

		return getLatestLiveCalendarDate(tradeSnapshot, planSnapshot.plans, today);
	}

	return tradeSnapshot.dayDates[tradeSnapshot.dayDates.length - 1] ?? '';
}

export function getPlanTitleForTrade(
	trade: JournalCalendarTrade,
	plansById: Map<string, JournalCalendarPlan>,
): string {
	const planId = stringifyValue(trade.trade.plan_id);
	return planId ? plansById.get(planId)?.title ?? planId : '';
}

function hasLiveCalendarDataOnDate(
	tradeSnapshot: JournalCalendarSnapshot,
	plans: readonly JournalCalendarPlan[],
	date: string,
): boolean {
	return Boolean(
		tradeSnapshot.daysByDate[date]?.trades.length ||
			plans.some((plan) => plan.startDate <= date && getPlanEffectiveEndDate(plan, date) >= date),
	);
}

function getLatestLiveCalendarDate(
	tradeSnapshot: JournalCalendarSnapshot,
	plans: readonly JournalCalendarPlan[],
	today: string,
): string {
	const planDates = plans.map((plan) => getPlanEffectiveEndDate(plan, today));
	const dates = new Set([...tradeSnapshot.dayDates, ...planDates]);
	const sortedDates = [...dates].sort();
	return sortedDates[sortedDates.length - 1] ?? '';
}
