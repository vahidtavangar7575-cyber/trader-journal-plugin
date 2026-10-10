import type { TradingAccount } from '../accounts/types';
import { isRiskManagedAccount } from '../accounts/types';
import type { TradeEntry } from '../trades/types';

export interface RiskPolicySettings {
	baseFirstTwoRiskPct: number;
	backtestRiskPct: number;
	thirdTradeProfitDivisor: number;
	fourthTradeRiskPct: number;
	maxDailyTrades: number;
	stopAfterLosses: number;
	minPlannedRr: number;
	targetR: number;
	dailyProfitDivisor: number;
	weeklyProfitDivisor: number;
}

export const DEFAULT_RISK_POLICY: RiskPolicySettings = {
	baseFirstTwoRiskPct: 0.3,
	backtestRiskPct: 0.3,
	thirdTradeProfitDivisor: 4,
	fourthTradeRiskPct: 0.15,
	maxDailyTrades: 4,
	stopAfterLosses: 2,
	minPlannedRr: 2,
	targetR: 2,
	dailyProfitDivisor: 4,
	weeklyProfitDivisor: 16,
};

export interface RiskPolicyEvaluation {
	tradeNumber: number;
	lossesToday: number;
	dailyPnlPct: number;
	firstTwoPnlPct: number;
	weekBaseRiskPct: number;
	dayBaseRiskPct: number;
	policyRiskPct: number;
	recommendedRiskPct: number;
	khanRiskCapPct: number | null;
	managed: boolean;
	hardStop: boolean;
	warnings: string[];
	minPlannedRr: number;
	targetR: number;
}

interface EvaluateRiskPolicyArgs {
	policy: RiskPolicySettings;
	account: TradingAccount | null | undefined;
	date: string;
	trades: TradeEntry[];
	excludeTradeId?: string;
	khanRiskCapPct?: number | null;
}

export function normalizeRiskPolicy(value: Partial<RiskPolicySettings> | null | undefined): RiskPolicySettings {
	return {
		baseFirstTwoRiskPct: positive(value?.baseFirstTwoRiskPct, DEFAULT_RISK_POLICY.baseFirstTwoRiskPct),
		backtestRiskPct: positive(value?.backtestRiskPct, DEFAULT_RISK_POLICY.backtestRiskPct),
		thirdTradeProfitDivisor: positive(value?.thirdTradeProfitDivisor, DEFAULT_RISK_POLICY.thirdTradeProfitDivisor),
		fourthTradeRiskPct: positive(value?.fourthTradeRiskPct, DEFAULT_RISK_POLICY.fourthTradeRiskPct),
		maxDailyTrades: positiveInteger(value?.maxDailyTrades, DEFAULT_RISK_POLICY.maxDailyTrades),
		stopAfterLosses: positiveInteger(value?.stopAfterLosses, DEFAULT_RISK_POLICY.stopAfterLosses),
		minPlannedRr: positive(value?.minPlannedRr, DEFAULT_RISK_POLICY.minPlannedRr),
		targetR: positive(value?.targetR, DEFAULT_RISK_POLICY.targetR),
		dailyProfitDivisor: positive(value?.dailyProfitDivisor, DEFAULT_RISK_POLICY.dailyProfitDivisor),
		weeklyProfitDivisor: positive(value?.weeklyProfitDivisor, DEFAULT_RISK_POLICY.weeklyProfitDivisor),
	};
}

export function evaluateRiskPolicy({
	policy,
	account,
	date,
	trades,
	excludeTradeId,
	khanRiskCapPct,
}: EvaluateRiskPolicyArgs): RiskPolicyEvaluation {
	const normalizedPolicy = normalizeRiskPolicy(policy);
	const managed = isRiskManagedAccount(account);
	const relevantTrades = account
		? trades.filter((trade) => trade.account_id === account.id && trade.id !== excludeTradeId)
		: [];
	const targetDate = isDateKey(date) ? date : localDateKey(new Date());
	const todayTrades = relevantTrades
		.filter((trade) => getTradeDate(trade) === targetDate && isCompletedTrade(trade))
		.sort(compareTradesChronologically);
	const lossesToday = todayTrades.filter((trade) => getRealizedRr(trade) < 0).length;
	const dailyPnlPct = sum(todayTrades.map(getTradePnlPct));
	const firstTwoPnlPct = sum(todayTrades.slice(0, 2).map(getTradePnlPct));
	const tradeNumber = todayTrades.length + 1;
	const weekBaseRiskPct = calculateWeekBaseRisk(normalizedPolicy, relevantTrades, targetDate);
	const dayBaseRiskPct = calculateDayBaseRisk(normalizedPolicy, relevantTrades, targetDate, weekBaseRiskPct);
	let policyRiskPct = managed
		? riskForManagedTrade(normalizedPolicy, tradeNumber, dayBaseRiskPct, firstTwoPnlPct)
		: normalizedPolicy.backtestRiskPct;
	policyRiskPct = round4(policyRiskPct);
	const normalizedKhanCap = finitePositive(khanRiskCapPct) ? Number(khanRiskCapPct) : null;
	const recommendedRiskPct = normalizedKhanCap === null
		? policyRiskPct
		: round4(Math.min(policyRiskPct, normalizedKhanCap));
	const hardStop = managed && lossesToday >= normalizedPolicy.stopAfterLosses;
	const warnings: string[] = [];

	if (hardStop) {
		warnings.push(`امروز ${lossesToday} معامله زیان‌ده ثبت شده است. طبق قانون خودت، روز معاملاتی این حساب تمام شده است.`);
	}
	if (managed && tradeNumber > normalizedPolicy.maxDailyTrades) {
		warnings.push(`این معامله شماره ${tradeNumber} امروز است؛ سقف فعلی برنامه ${normalizedPolicy.maxDailyTrades} معامله است.`);
	}
	if (managed && tradeNumber === 3 && policyRiskPct <= 0) {
		warnings.push('سود خالص دو معامله اول مثبت نیست؛ برای معامله سوم ریسک پیشنهادی برنامه صفر است.');
	}

	return {
		tradeNumber,
		lossesToday,
		dailyPnlPct: round4(dailyPnlPct),
		firstTwoPnlPct: round4(firstTwoPnlPct),
		weekBaseRiskPct: round4(weekBaseRiskPct),
		dayBaseRiskPct: round4(dayBaseRiskPct),
		policyRiskPct,
		recommendedRiskPct,
		khanRiskCapPct: normalizedKhanCap,
		managed,
		hardStop,
		warnings,
		minPlannedRr: normalizedPolicy.minPlannedRr,
		targetR: normalizedPolicy.targetR,
	};
}

export function buildRiskRuleWarnings(
	evaluation: RiskPolicyEvaluation,
	actualRiskPct: number | null,
	plannedRr: number | null,
): string[] {
	const warnings = [...evaluation.warnings];
	if (evaluation.managed && actualRiskPct !== null && actualRiskPct > evaluation.recommendedRiskPct + 0.0001) {
		warnings.push(`ریسک واردشده ${formatPct(actualRiskPct)}% از ریسک پیشنهادی ${formatPct(evaluation.recommendedRiskPct)}% بیشتر است.`);
	}
	if (plannedRr !== null && plannedRr < evaluation.minPlannedRr - 0.0001) {
		warnings.push(`RR برنامه‌ریزی‌شده ${formatR(plannedRr)} است؛ قانون فعلی حداقل ${formatR(evaluation.minPlannedRr)} را می‌خواهد.`);
	}
	return [...new Set(warnings)];
}

export function getTradePnlPct(trade: TradeEntry): number {
	const stored = numeric(trade.pnl_pct);
	if (stored !== null) return stored;
	const riskPct = numeric(trade.risk_pct);
	if (riskPct === null) return 0;
	return round4(riskPct * getRealizedRr(trade));
}

export function getRealizedRr(trade: TradeEntry): number {
	const rr = numeric(trade.rr) ?? 0;
	if (trade.result === 'loss') return -Math.abs(rr || 1);
	if (trade.result === 'breakeven') return 0;
	if (trade.result === 'win') return Math.abs(rr);
	return rr;
}

function riskForManagedTrade(
	policy: RiskPolicySettings,
	tradeNumber: number,
	dayBaseRiskPct: number,
	firstTwoPnlPct: number,
): number {
	if (tradeNumber <= 2) return dayBaseRiskPct;
	if (tradeNumber === 3) return Math.max(0, firstTwoPnlPct) / policy.thirdTradeProfitDivisor;
	if (tradeNumber === 4) return policy.fourthTradeRiskPct;
	return 0;
}

function calculateWeekBaseRisk(policy: RiskPolicySettings, trades: TradeEntry[], targetDate: string): number {
	const targetWeek = startOfIsoWeek(targetDate);
	const weeklyPnl = new Map<string, number>();
	for (const trade of trades) {
		if (!isCompletedTrade(trade)) continue;
		const date = getTradeDate(trade);
		if (!date || date >= targetWeek) continue;
		const week = startOfIsoWeek(date);
		weeklyPnl.set(week, (weeklyPnl.get(week) ?? 0) + getTradePnlPct(trade));
	}
	let base = policy.baseFirstTwoRiskPct;
	for (const week of [...weeklyPnl.keys()].sort()) {
		const pnl = weeklyPnl.get(week) ?? 0;
		if (pnl > 0) base += pnl / policy.weeklyProfitDivisor;
	}
	return base;
}

function calculateDayBaseRisk(
	policy: RiskPolicySettings,
	trades: TradeEntry[],
	targetDate: string,
	weekBaseRiskPct: number,
): number {
	const weekStart = startOfIsoWeek(targetDate);
	const dailyPnl = new Map<string, number>();
	for (const trade of trades) {
		if (!isCompletedTrade(trade)) continue;
		const date = getTradeDate(trade);
		if (!date || date < weekStart || date >= targetDate) continue;
		dailyPnl.set(date, (dailyPnl.get(date) ?? 0) + getTradePnlPct(trade));
	}
	let base = weekBaseRiskPct;
	for (const day of [...dailyPnl.keys()].sort()) {
		const pnl = dailyPnl.get(day) ?? 0;
		if (pnl > 0) base += pnl / policy.dailyProfitDivisor;
	}
	return base;
}

function isCompletedTrade(trade: TradeEntry): boolean {
	if (trade.journal_type === 'live' && trade.status === 'open') return false;
	return trade.result === 'win' || trade.result === 'loss' || trade.result === 'breakeven';
}

function getTradeDate(trade: TradeEntry): string {
	const openedAt = typeof trade.opened_at === 'string' ? trade.opened_at : '';
	const match = openedAt.match(/^(\d{4}-\d{2}-\d{2})/);
	if (match?.[1]) return match[1];
	const date = typeof trade.date === 'string' ? trade.date : '';
	const dateMatch = date.match(/^(\d{4}-\d{2}-\d{2})/);
	return dateMatch?.[1] ?? '';
}

function compareTradesChronologically(a: TradeEntry, b: TradeEntry): number {
	return String(a.opened_at ?? '').localeCompare(String(b.opened_at ?? ''));
}

function startOfIsoWeek(dateKey: string): string {
	const match = dateKey.match(/^(\d{4})-(\d{2})-(\d{2})$/);
	if (!match?.[1] || !match[2] || !match[3]) return dateKey;
	const year = Number(match[1]);
	const month = Number(match[2]);
	const day = Number(match[3]);
	const date = new Date(Date.UTC(year, month - 1, day));
	const weekday = date.getUTCDay() || 7;
	date.setUTCDate(date.getUTCDate() - weekday + 1);
	return date.toISOString().slice(0, 10);
}

function localDateKey(date: Date): string {
	const y = date.getFullYear();
	const m = String(date.getMonth() + 1).padStart(2, '0');
	const d = String(date.getDate()).padStart(2, '0');
	return `${y}-${m}-${d}`;
}

function isDateKey(value: string): boolean {
	return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function numeric(value: unknown): number | null {
	const parsed = typeof value === 'number' ? value : typeof value === 'string' ? Number(value) : Number.NaN;
	return Number.isFinite(parsed) ? parsed : null;
}

function finitePositive(value: unknown): boolean {
	const parsed = numeric(value);
	return parsed !== null && parsed > 0;
}

function positive(value: unknown, fallback: number): number {
	const parsed = numeric(value);
	return parsed !== null && parsed > 0 ? parsed : fallback;
}

function positiveInteger(value: unknown, fallback: number): number {
	const parsed = numeric(value);
	return parsed !== null && Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function round4(value: number): number {
	return Number(value.toFixed(4));
}

function sum(values: number[]): number {
	return values.reduce((total, value) => total + value, 0);
}

function formatPct(value: number): string {
	return Number(value.toFixed(4)).toString();
}

function formatR(value: number): string {
	return `${Number(value.toFixed(2))}R`;
}
