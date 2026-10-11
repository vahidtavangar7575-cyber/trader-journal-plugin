import type { TradingAccount } from '../accounts/types';
import type { TradeEntry } from '../trades/types';
import type { RiskPolicyEvaluation, RiskPolicySettings } from './policy';
import { getTradePnlPct } from './policy';

interface Args {
	evaluation: RiskPolicyEvaluation;
	policy: RiskPolicySettings;
	account: TradingAccount;
	date: string;
	trades: TradeEntry[];
}

export function buildRiskRecommendationReasons({ evaluation, policy, account, date, trades }: Args): string[] {
	if (!evaluation.managed) {
		return [
			`این حساب از نوع ${account.type} است؛ ریسک تمرینی فعلی ${formatPct(evaluation.recommendedRiskPct)}% از تنظیمات بک‌تست می‌آید.`,
		];
	}

	const reasons: string[] = [];
	const accountTrades = trades.filter((trade) => trade.account_id === account.id && isCompletedTrade(trade));
	const previous = getPreviousTradingDay(accountTrades, date);
	if (previous) {
		const contribution = previous.pnlPct > 0 ? previous.pnlPct / policy.dailyProfitDivisor : 0;
		reasons.push(
			previous.pnlPct > 0
				? `روز معاملاتی قبلی (${previous.date}) ${formatPct(previous.pnlPct)}% سود خالص داشتی؛ طبق قانون سود روزانه ÷ ${formatNumber(policy.dailyProfitDivisor)}، حدود ${formatPct(contribution)}% به پایه روزهای بعد این هفته اضافه می‌شود.`
				: `روز معاملاتی قبلی (${previous.date}) ${formatPct(previous.pnlPct)}% نتیجه داشتی؛ چون فقط سود مثبت به پایه روز بعد اضافه می‌شود، از این روز افزایش ریسک نگرفته‌ای.`,
		);
	}

	reasons.push(`پایه هفته اکنون ${formatPct(evaluation.weekBaseRiskPct)}% و پایه امروز ${formatPct(evaluation.dayBaseRiskPct)}% است.`);

	if (evaluation.tradeNumber <= 2) {
		reasons.push(`این معامله شماره ${evaluation.tradeNumber} امروز است؛ برای معامله اول و دوم، موتور از پایه امروز استفاده می‌کند.`);
	} else if (evaluation.tradeNumber === 3) {
		reasons.push(`سود خالص دو معامله اول امروز ${formatPct(evaluation.firstTwoPnlPct)}% است؛ ریسک معامله سوم = بخش مثبت آن ÷ ${formatNumber(policy.thirdTradeProfitDivisor)}.`);
	} else if (evaluation.tradeNumber === 4) {
		reasons.push(`این معامله چهارم امروز است؛ طبق قانون فعلی ریسک پایه آن ${formatPct(policy.fourthTradeRiskPct)}% است.`);
	} else {
		reasons.push(`این معامله شماره ${evaluation.tradeNumber} امروز است؛ بعد از سقف برنامه، ریسک سیاستی صفر می‌شود مگر خودت آگاهانه از قانون عبور کنی.`);
	}

	if (evaluation.khanRiskCapPct !== null && evaluation.khanRiskCapPct < evaluation.policyRiskPct) {
		reasons.push(`مسیر خان سقف ${formatPct(evaluation.khanRiskCapPct)}% داده که از ریسک سیاستی ${formatPct(evaluation.policyRiskPct)}% کمتر است؛ بنابراین مقدار کمتر انتخاب شده.`);
	}
	if (evaluation.hardStop) {
		reasons.push(`به حد توقف روزانه بعد از ${evaluation.lossesToday} زیان رسیده‌ای؛ پیشنهاد سیستم ادامه‌ندادن معامله است.`);
	}
	reasons.push(`پیشنهاد نهایی موتور برای این معامله: ${formatPct(evaluation.recommendedRiskPct)}%.`);
	return reasons;
}

function getPreviousTradingDay(trades: TradeEntry[], targetDate: string): { date: string; pnlPct: number } | null {
	const totals = new Map<string, number>();
	for (const trade of trades) {
		const date = getTradeDate(trade);
		if (!date || date >= targetDate) continue;
		totals.set(date, (totals.get(date) ?? 0) + getTradePnlPct(trade));
	}
	const previousDate = [...totals.keys()].sort().at(-1);
	return previousDate ? { date: previousDate, pnlPct: round4(totals.get(previousDate) ?? 0) } : null;
}

function isCompletedTrade(trade: TradeEntry): boolean {
	if (trade.status === 'open') return false;
	return trade.result === 'win' || trade.result === 'loss' || trade.result === 'breakeven';
}

function getTradeDate(trade: TradeEntry): string {
	const openedAt = typeof trade.opened_at === 'string' ? trade.opened_at : '';
	const match = openedAt.match(/^(\d{4}-\d{2}-\d{2})/);
	if (match?.[1]) return match[1];
	const date = typeof trade.date === 'string' ? trade.date : '';
	return date.match(/^(\d{4}-\d{2}-\d{2})/)?.[1] ?? '';
}

function formatPct(value: number): string {
	return Number(value.toFixed(4)).toString();
}

function formatNumber(value: number): string {
	return Number(value.toFixed(4)).toString();
}

function round4(value: number): number {
	return Number(value.toFixed(4));
}
