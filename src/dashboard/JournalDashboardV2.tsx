import { Notice, normalizePath, TFile } from 'obsidian';
import { useEffect, useMemo, useState } from 'react';
import type TraderJournalPlugin from '../main';
import type { TradingAccount } from '../accounts/types';
import { TRADING_ACCOUNT_TYPE_LABELS } from '../accounts/types';
import type { JournalCalendarTrade } from '../trades/journalIndex';
import type { TradeJournalType, TradeReviewMistakeTag } from '../trades/types';
import { openJournalTrade } from '../trades/openTrade';
import { TraderJournalModal } from '../ui/TraderJournalModal';
import { AccountManagerModal } from '../ui/AccountManagerModal';
import { openTraderJournalCalendar } from '../ui/TradeCalendarView';
import { getDashboardTrades, type DashboardPeriod } from './dashboardStats';
import { useCurrentDate } from './useCurrentDate';

interface Props {
	plugin: TraderJournalPlugin;
}

interface DayPoint {
	date: string;
	netR: number;
	trades: number;
}

interface SetupStat {
	name: string;
	count: number;
	wins: number;
	netR: number;
	averageR: number;
}

interface JournalAnalytics {
	tradeCount: number;
	completedCount: number;
	wins: number;
	losses: number;
	breakeven: number;
	winRate: number;
	netR: number;
	averageR: number;
	profitFactor: number | null;
	maxDrawdownR: number;
	bestWinStreak: number;
	reviewRate: number;
	riskViolationCount: number;
	averageChase: number;
	screenshotCoverage: number;
	fullScreenshotCoverage: number;
	daily: DayPoint[];
	cumulative: number[];
	setups: SetupStat[];
	bestDay: DayPoint | null;
	worstDay: DayPoint | null;
	topMistake: { tag: string; count: number } | null;
}

const MISTAKE_LABELS: Record<TradeReviewMistakeTag, string> = {
	wrong_context: 'کانتکست اشتباه',
	early_entry: 'ورود زودهنگام',
	late_entry: 'ورود دیرهنگام',
	no_confirmation: 'بدون تأیید',
	fomo: 'FOMO / تعقیب قیمت',
	revenge_trade: 'انتقام از بازار',
	over_risk: 'ریسک بیش از حد',
	moved_stop: 'جابجایی استاپ',
	cut_winner_early: 'بستن زودهنگام سود',
	ignored_plan: 'نادیده گرفتن پلن',
};

export function JournalDashboardV2({ plugin }: Props) {
	const [snapshot, setSnapshot] = useState(() => plugin.journalDataService.getSnapshot());
	const [journalType, setJournalType] = useState<TradeJournalType>('live');
	const [period, setPeriod] = useState<DashboardPeriod>('7d');
	const [symbol, setSymbol] = useState('');
	const [accountId, setAccountId] = useState(plugin.settings.lastSelectedAccountId || '');
	const [savingReport, setSavingReport] = useState(false);
	const currentDate = useCurrentDate();

	useEffect(() => plugin.journalDataService.subscribe(setSnapshot), [plugin]);

	const allPeriodTrades = useMemo(() => getDashboardTrades(
		snapshot.trades,
		{ journalType, period, symbol },
		currentDate,
	), [currentDate, journalType, period, snapshot.trades, symbol]);

	const trades = useMemo(
		() => accountId
			? allPeriodTrades.filter((trade) => String(trade.trade.account_id ?? '') === accountId)
			: allPeriodTrades,
		[accountId, allPeriodTrades],
	);
	const analytics = useMemo(() => calculateJournalAnalytics(trades), [trades]);
	const symbols = useMemo(
		() => [...new Set(Object.values(snapshot.trades.daysByDate)
			.flatMap((day) => day.trades)
			.filter((trade) => trade.journalType === journalType)
			.map((trade) => trade.symbol)
			.filter(Boolean))].sort(),
		[journalType, snapshot.trades.daysByDate],
	);
	const selectedAccount = plugin.settings.accounts.find((account) => account.id === accountId) ?? null;

	const saveReport = async () => {
		if (savingReport) return;
		try {
			setSavingReport(true);
			const path = await saveJournalReport(plugin, {
				analytics,
				journalType,
				period,
				symbol,
				account: selectedAccount,
				trades,
			});
			new Notice(`گزارش ژورنال ذخیره شد: ${path}`);
		} catch (error) {
			new Notice(error instanceof Error ? error.message : 'ذخیره گزارش ژورنال انجام نشد.');
		} finally {
			setSavingReport(false);
		}
	};

	return (
		<div className="trader-journal-dashboard" dir="rtl">
			<header className="trader-journal-dashboard__header">
				<div>
					<div style={styles.kicker}>JOURNAL FIRST · نسخه ثبت حرفه‌ای</div>
					<h2 style={{ marginBottom: 4 }}>داشبورد ژورنال معاملاتی</h2>
					<p>تحلیل ستاپ روی PDF؛ اینجا فقط ثبت، حساب، تصاویر، نتیجه، روان‌شناسی و یادگیری. هیچ Wizard تصمیم‌گیری بین تو و چارت قرار نمی‌گیرد.</p>
				</div>
				<div className="trader-journal-dashboard__quick-actions" aria-label="اقدامات سریع">
					<button type="button" className="mod-cta" onClick={() => new TraderJournalModal(plugin.app, plugin, 'live').open()}>＋ ثبت معامله</button>
					<button type="button" onClick={() => new TraderJournalModal(plugin.app, plugin, 'backtest').open()}>↺ ثبت بک‌تست</button>
					<button type="button" onClick={() => new AccountManagerModal(plugin.app, plugin).open()}>◎ حساب‌ها</button>
					<button type="button" onClick={() => void openTraderJournalCalendar(plugin)}>◫ تقویم</button>
					<button type="button" disabled={savingReport || trades.length === 0} onClick={() => void saveReport()}>{savingReport ? 'در حال ذخیره…' : '▣ ذخیره گزارش بازه'}</button>
				</div>
			</header>

			<section style={styles.heroGrid}>
				{plugin.settings.accounts.length ? plugin.settings.accounts.map((account) => (
					<AccountCard key={account.id} account={account} active={!accountId || account.id === accountId} onClick={() => setAccountId(accountId === account.id ? '' : account.id)} />
				)) : (
					<button type="button" style={styles.emptyAccount} onClick={() => new AccountManagerModal(plugin.app, plugin).open()}>
						<strong>هنوز حسابی ثبت نشده</strong><span>دمو، پراپ، مسابقه، واقعی یا بک‌تست را یک‌بار بساز.</span>
					</button>
				)}
			</section>

			<section className="trader-journal-dashboard__panel" style={styles.filterPanel}>
				<div className="trader-journal-dashboard__filters" style={{ margin: 0 }}>
					<label><span>نوع ژورنال</span><select value={journalType} onChange={(event) => setJournalType(event.target.value as TradeJournalType)}><option value="live">معاملات واقعی / دمو / پراپ</option><option value="backtest">بک‌تست</option></select></label>
					<label><span>بازه</span><select value={period} onChange={(event) => setPeriod(event.target.value as DashboardPeriod)}><option value="today">امروز</option><option value="7d">۷ روز اخیر</option><option value="30d">۳۰ روز اخیر</option><option value="month">ماه جاری</option><option value="all">همه زمان‌ها</option></select></label>
					<label><span>حساب</span><select value={accountId} onChange={(event) => setAccountId(event.target.value)}><option value="">همه حساب‌ها</option>{plugin.settings.accounts.map((account) => <option key={account.id} value={account.id}>{account.name}</option>)}</select></label>
					<label><span>نماد</span><select value={symbol} onChange={(event) => setSymbol(event.target.value)}><option value="">همه نمادها</option>{symbols.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
				</div>
			</section>

			<section style={styles.metricGrid}>
				<Metric title="تعداد معاملات" value={String(analytics.tradeCount)} subtitle={`${analytics.completedCount} نهایی‌شده`} />
				<Metric title="Win Rate" value={formatPct(analytics.winRate)} subtitle={`${analytics.wins} برد · ${analytics.losses} باخت`} tone={analytics.winRate >= 50 ? 'good' : 'neutral'} />
				<Metric title="R خالص" value={formatR(analytics.netR)} subtitle={`میانگین ${formatR(analytics.averageR)}`} tone={analytics.netR >= 0 ? 'good' : 'bad'} />
				<Metric title="Profit Factor" value={analytics.profitFactor === null ? '∞' : formatNumber(analytics.profitFactor)} subtitle="بر مبنای R" tone={(analytics.profitFactor ?? 99) >= 1 ? 'good' : 'bad'} />
				<Metric title="Max Drawdown" value={`${formatNumber(analytics.maxDrawdownR)}R`} subtitle="افت از قله منحنی R" tone={analytics.maxDrawdownR <= 2 ? 'good' : 'bad'} />
				<Metric title="بهترین برد پیاپی" value={String(analytics.bestWinStreak)} subtitle="معامله" />
			</section>

			<section style={styles.chartGrid}>
				<Panel title="منحنی عملکرد R" subtitle="نتیجه تجمعی معاملات نهایی‌شده"><LineChart values={analytics.cumulative} /></Panel>
				<Panel title="عملکرد روزانه" subtitle="R خالص هر روز"><DailyBars items={analytics.daily.slice(-12)} /></Panel>
			</section>

			<section style={styles.qualityGrid}>
				<QualityCard title="کامل بودن تصاویر" value={formatPct(analytics.screenshotCoverage)} detail={`${formatPct(analytics.fullScreenshotCoverage)} دارای هر سه تصویر اصلی`} />
				<QualityCard title="بازبینی معاملات" value={formatPct(analytics.reviewRate)} detail="درصد معاملات بسته‌شده دارای Review" />
				<QualityCard title="تخطی از ریسک" value={String(analytics.riskViolationCount)} detail="معاملاتی که Rule Violation ثبت کرده‌اند" tone={analytics.riskViolationCount ? 'bad' : 'good'} />
				<QualityCard title="میل به تعقیب قیمت" value={formatNumber(analytics.averageChase)} detail="میانگین امتیاز Chase از ۱۰" tone={analytics.averageChase >= 6 ? 'bad' : 'neutral'} />
			</section>

			<section style={styles.chartGrid}>
				<Panel title="عملکرد ستاپ‌ها" subtitle="ستاپ را از روی PDF انتخاب کن؛ ژورنال فقط نتیجه را اندازه می‌گیرد">
					<SetupTable stats={analytics.setups} />
				</Panel>
				<Panel title="گزارش هوشمند بازه" subtitle="خلاصه‌ای که در پایان هفته و ماه باید ببینی">
					<SmartSummary analytics={analytics} selectedAccount={selectedAccount} />
				</Panel>
			</section>

			<section className="trader-journal-dashboard__panel">
				<div className="trader-journal-dashboard__section-header"><div><h3>معاملات اخیر</h3><p>برای بازکردن ژورنال همان معامله روی ردیف کلیک کن.</p></div></div>
				<div style={styles.tradeList}>
					{trades.slice(0, 14).map((trade) => <TradeRow key={`${trade.filePath}:${trade.id}`} trade={trade} onClick={() => void openJournalTrade(plugin, trade)} />)}
					{trades.length === 0 ? <div className="trader-journal-dashboard__empty">برای این فیلتر هنوز معامله‌ای ثبت نشده است.</div> : null}
				</div>
			</section>
		</div>
	);
}

function AccountCard({ account, active, onClick }: { account: TradingAccount; active: boolean; onClick: () => void }) {
	const pnl = account.currentBalance - account.initialBalance;
	const pct = account.initialBalance > 0 ? (pnl / account.initialBalance) * 100 : 0;
	return (
		<button type="button" onClick={onClick} style={{ ...styles.accountCard, ...(active ? styles.accountCardActive : {}) }}>
			<span style={styles.accountType}>{TRADING_ACCOUNT_TYPE_LABELS[account.type]}</span>
			<strong style={styles.accountName}>{account.name}</strong>
			<strong style={styles.accountBalance}>{formatMoney(account.currentBalance, account.currency)}</strong>
			<span style={{ color: pnl >= 0 ? 'var(--color-green)' : 'var(--color-red)' }}>{pnl >= 0 ? '+' : ''}{formatMoney(pnl, account.currency)} · {formatPct(pct)}</span>
		</button>
	);
}

function Metric({ title, value, subtitle, tone = 'neutral' }: { title: string; value: string; subtitle: string; tone?: 'good' | 'bad' | 'neutral' }) {
	const color = tone === 'good' ? 'var(--color-green)' : tone === 'bad' ? 'var(--color-red)' : 'var(--text-normal)';
	return <article style={styles.metricCard}><span style={styles.metricTitle}>{title}</span><strong style={{ ...styles.metricValue, color }}>{value}</strong><small style={styles.muted}>{subtitle}</small></article>;
}

function Panel({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
	return <section style={styles.panel}><div><h3 style={{ margin: 0 }}>{title}</h3><p style={{ margin: '4px 0 14px', color: 'var(--text-muted)' }}>{subtitle}</p></div>{children}</section>;
}

function QualityCard({ title, value, detail, tone = 'neutral' }: { title: string; value: string; detail: string; tone?: 'good' | 'bad' | 'neutral' }) {
	const color = tone === 'good' ? 'var(--color-green)' : tone === 'bad' ? 'var(--color-red)' : 'var(--interactive-accent)';
	return <article style={styles.qualityCard}><span style={styles.muted}>{title}</span><strong style={{ fontSize: 24, color }}>{value}</strong><small style={styles.muted}>{detail}</small></article>;
}

function LineChart({ values }: { values: number[] }) {
	if (values.length === 0) return <div style={styles.emptyChart}>هنوز R نهایی‌شده‌ای برای رسم منحنی وجود ندارد.</div>;
	const width = 640;
	const height = 180;
	const min = Math.min(0, ...values);
	const max = Math.max(0, ...values);
	const range = Math.max(1, max - min);
	const points = values.map((value, index) => {
		const x = values.length === 1 ? width / 2 : (index / (values.length - 1)) * width;
		const y = height - ((value - min) / range) * height;
		return `${x.toFixed(1)},${y.toFixed(1)}`;
	}).join(' ');
	const zeroY = height - ((0 - min) / range) * height;
	return (
		<div style={{ overflowX: 'auto' }}>
			<svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label="منحنی تجمعی R" style={{ width: '100%', minWidth: 420, height: 190 }}>
				<line x1="0" x2={width} y1={zeroY} y2={zeroY} stroke="var(--background-modifier-border)" strokeWidth="1" />
				<polyline points={points} fill="none" stroke="var(--interactive-accent)" strokeWidth="4" strokeLinejoin="round" strokeLinecap="round" />
			</svg>
			<div style={styles.chartLegend}><span>کمینه: {formatR(min)}</span><span>بیشینه: {formatR(max)}</span><span>نهایی: {formatR(values.at(-1) ?? 0)}</span></div>
		</div>
	);
}

function DailyBars({ items }: { items: DayPoint[] }) {
	if (!items.length) return <div style={styles.emptyChart}>داده روزانه‌ای وجود ندارد.</div>;
	const max = Math.max(1, ...items.map((item) => Math.abs(item.netR)));
	return <div style={styles.barList}>{items.map((item) => {
		const width = Math.max(4, Math.abs(item.netR) / max * 100);
		return <div key={item.date} style={styles.barRow}><span style={styles.barLabel}>{item.date.slice(5)}</span><div style={styles.barTrack}><span style={{ ...styles.barFill, width: `${width}%`, background: item.netR >= 0 ? 'var(--color-green)' : 'var(--color-red)' }} /></div><strong style={{ minWidth: 58, textAlign: 'left' }}>{formatR(item.netR)}</strong></div>;
	})}</div>;
}

function SetupTable({ stats }: { stats: SetupStat[] }) {
	if (!stats.length) return <div style={styles.emptyChart}>هنوز ستاپی برای این بازه ثبت نشده است.</div>;
	return <div style={{ display: 'grid', gap: 8 }}>{stats.slice(0, 8).map((stat) => (
		<div key={stat.name} style={styles.setupRow}><div><strong>{stat.name || 'نامشخص'}</strong><small style={{ ...styles.muted, display: 'block' }}>{stat.count} معامله · Win {formatPct(stat.count ? stat.wins / stat.count * 100 : 0)}</small></div><strong style={{ color: stat.netR >= 0 ? 'var(--color-green)' : 'var(--color-red)' }}>{formatR(stat.netR)}</strong></div>
	))}</div>;
}

function SmartSummary({ analytics, selectedAccount }: { analytics: JournalAnalytics; selectedAccount: TradingAccount | null }) {
	const bestSetup = analytics.setups[0] ?? null;
	return (
		<div style={{ display: 'grid', gap: 10 }}>
			<SummaryLine label="حساب" value={selectedAccount ? selectedAccount.name : 'همه حساب‌ها'} />
			<SummaryLine label="بهترین ستاپ این بازه" value={bestSetup ? `${bestSetup.name} · ${formatR(bestSetup.netR)}` : 'داده کافی نیست'} />
			<SummaryLine label="بهترین روز" value={analytics.bestDay ? `${analytics.bestDay.date} · ${formatR(analytics.bestDay.netR)}` : 'داده کافی نیست'} />
			<SummaryLine label="ضعیف‌ترین روز" value={analytics.worstDay ? `${analytics.worstDay.date} · ${formatR(analytics.worstDay.netR)}` : 'داده کافی نیست'} />
			<SummaryLine label="خطای پرتکرار" value={analytics.topMistake ? `${mistakeLabel(analytics.topMistake.tag)} · ${analytics.topMistake.count} بار` : 'خطای پرتکراری ثبت نشده'} />
			<SummaryLine label="کیفیت ثبت" value={`${formatPct(analytics.screenshotCoverage)} پوشش تصویر · ${formatPct(analytics.reviewRate)} Review`} />
			<div style={styles.summaryNote}>هدف گزارش هفتگی/ماهانه این نیست که فقط سود را ببینی؛ باید مشخص کند Edge تو کجا بوده، کجا از فرایند خارج شدی و معامله بعدی چه چیزی را باید بهتر اجرا کنی.</div>
		</div>
	);
}

function SummaryLine({ label, value }: { label: string; value: string }) {
	return <div style={styles.summaryLine}><span style={styles.muted}>{label}</span><strong>{value}</strong></div>;
}

function TradeRow({ trade, onClick }: { trade: JournalCalendarTrade; onClick: () => void }) {
	const r = signedR(trade);
	const account = String(trade.trade.account_name ?? 'بدون حساب');
	const images = getImages(trade).length;
	return (
		<button type="button" onClick={onClick} style={styles.tradeRow}>
			<div><strong>{trade.symbol} · {trade.setup || 'ستاپ نامشخص'}</strong><small style={{ ...styles.muted, display: 'block' }}>{trade.journalDate} · {account} · {trade.timeframe || '-'}</small></div>
			<div style={{ textAlign: 'left' }}><strong style={{ color: r === null ? 'var(--text-muted)' : r >= 0 ? 'var(--color-green)' : 'var(--color-red)' }}>{r === null ? 'باز' : formatR(r)}</strong><small style={{ ...styles.muted, display: 'block' }}>{images} تصویر</small></div>
		</button>
	);
}

function calculateJournalAnalytics(trades: JournalCalendarTrade[]): JournalAnalytics {
	const ordered = [...trades].sort((a, b) => a.journalDate.localeCompare(b.journalDate) || a.sortTime - b.sortTime);
	const completed = ordered.flatMap((trade) => {
		const value = signedR(trade);
		return value === null ? [] : [{ trade, value }];
	});
	let cumulative = 0;
	let peak = 0;
	let maxDrawdownR = 0;
	let currentWinStreak = 0;
	let bestWinStreak = 0;
	let grossWin = 0;
	let grossLoss = 0;
	const cumulativeSeries: number[] = [];
	const dayMap = new Map<string, DayPoint>();
	const setupMap = new Map<string, { count: number; wins: number; netR: number }>();
	const mistakeMap = new Map<string, number>();
	let reviewed = 0;
	let riskViolationCount = 0;
	let chaseSum = 0;
	let chaseCount = 0;
	let anyScreenshot = 0;
	let fullScreenshot = 0;

	for (const { trade, value } of completed) {
		cumulative += value;
		peak = Math.max(peak, cumulative);
		maxDrawdownR = Math.max(maxDrawdownR, peak - cumulative);
		cumulativeSeries.push(cumulative);
		if (value > 0) {
			grossWin += value;
			currentWinStreak += 1;
			bestWinStreak = Math.max(bestWinStreak, currentWinStreak);
		} else {
			if (value < 0) grossLoss += Math.abs(value);
			currentWinStreak = 0;
		}
		const day = dayMap.get(trade.journalDate) ?? { date: trade.journalDate, netR: 0, trades: 0 };
		day.netR += value;
		day.trades += 1;
		dayMap.set(trade.journalDate, day);
		const setupName = trade.setup || 'نامشخص';
		const setup = setupMap.get(setupName) ?? { count: 0, wins: 0, netR: 0 };
		setup.count += 1;
		setup.netR += value;
		if (value > 0) setup.wins += 1;
		setupMap.set(setupName, setup);
	}

	for (const trade of ordered) {
		const review = trade.trade.review;
		if (review) {
			reviewed += 1;
			for (const tag of review.mistake_tags ?? []) mistakeMap.set(tag, (mistakeMap.get(tag) ?? 0) + 1);
		}
		if (trade.trade.risk_rule_violation === true) riskViolationCount += 1;
		const chase = numberValue(trade.trade.urge_to_chase);
		if (chase !== null) { chaseSum += chase; chaseCount += 1; }
		const images = getImages(trade);
		if (images.length > 0) anyScreenshot += 1;
		if (hasFullScreenshotSet(images)) fullScreenshot += 1;
	}

	const setups = [...setupMap.entries()].map(([name, stat]) => ({ name, ...stat, averageR: stat.count ? stat.netR / stat.count : 0 })).sort((a, b) => b.netR - a.netR || b.count - a.count);
	const daily = [...dayMap.values()].sort((a, b) => a.date.localeCompare(b.date));
	const bestDay = daily.length ? ([...daily].sort((a, b) => b.netR - a.netR)[0] ?? null) : null;
	const worstDay = daily.length ? ([...daily].sort((a, b) => a.netR - b.netR)[0] ?? null) : null;
	const topMistake = mistakeMap.size ? ([...mistakeMap.entries()].map(([tag, count]) => ({ tag, count })).sort((a, b) => b.count - a.count)[0] ?? null) : null;
	const wins = completed.filter((item) => item.value > 0).length;
	const losses = completed.filter((item) => item.value < 0).length;
	const breakeven = completed.filter((item) => item.value === 0).length;
	return {
		tradeCount: ordered.length,
		completedCount: completed.length,
		wins,
		losses,
		breakeven,
		winRate: completed.length ? wins / completed.length * 100 : 0,
		netR: cumulative,
		averageR: completed.length ? cumulative / completed.length : 0,
		profitFactor: grossLoss > 0 ? grossWin / grossLoss : grossWin > 0 ? null : 0,
		maxDrawdownR,
		bestWinStreak,
		reviewRate: completed.length ? reviewed / completed.length * 100 : 0,
		riskViolationCount,
		averageChase: chaseCount ? chaseSum / chaseCount : 0,
		screenshotCoverage: ordered.length ? anyScreenshot / ordered.length * 100 : 0,
		fullScreenshotCoverage: ordered.length ? fullScreenshot / ordered.length * 100 : 0,
		daily,
		cumulative: cumulativeSeries,
		setups,
		bestDay,
		worstDay,
		topMistake,
	};
}

function signedR(trade: JournalCalendarTrade): number | null {
	const raw = numberValue(trade.trade.rr);
	if (raw === null || trade.status === 'open') return null;
	if (trade.resultKey === 'loss') return -Math.abs(raw || 1);
	if (trade.resultKey === 'win') return Math.abs(raw);
	if (trade.resultKey === 'breakeven') return 0;
	return raw;
}

function getImages(trade: JournalCalendarTrade): Array<{ label?: string; value?: string } | string> {
	return Array.isArray(trade.trade.images) ? trade.trade.images : trade.trade.images ? [String(trade.trade.images)] : [];
}

function hasFullScreenshotSet(images: Array<{ label?: string; value?: string } | string>): boolean {
	const labels = new Set(images.flatMap((image) => typeof image === 'string' ? [] : image.label ? [image.label] : []));
	const hasContext = labels.has('journal-m15-context') || labels.has('khan-m15-entry');
	const hasEntry = labels.has('journal-m1-entry') || labels.has('khan-m1-entry');
	const hasExit = labels.has('journal-exit');
	return hasContext && hasEntry && hasExit;
}

async function saveJournalReport(
	plugin: TraderJournalPlugin,
	input: { analytics: JournalAnalytics; journalType: TradeJournalType; period: DashboardPeriod; symbol: string; account: TradingAccount | null; trades: JournalCalendarTrade[] },
): Promise<string> {
	const now = new Date();
	const dateKey = localDateKey(now);
	const monthKey = dateKey.slice(0, 7);
	const folder = normalizePath(`Trading/Reports/${monthKey}`);
	await ensureFolder(plugin, folder);
	const suffix = [input.journalType, input.period, input.account?.name || 'all-accounts', input.symbol || 'all-symbols'].join('-').replace(/[^\p{L}\p{N}._-]+/gu, '_');
	const path = normalizePath(`${folder}/${dateKey}-${suffix}.md`);
	const report = buildReportMarkdown(input);
	const existing = plugin.app.vault.getAbstractFileByPath(path);
	if (existing instanceof TFile) await plugin.app.vault.modify(existing, report);
	else await plugin.app.vault.create(path, report);
	return path;
}

async function ensureFolder(plugin: TraderJournalPlugin, folderPath: string): Promise<void> {
	const parts = normalizePath(folderPath).split('/').filter(Boolean);
	let current = '';
	for (const part of parts) {
		current = current ? `${current}/${part}` : part;
		if (!plugin.app.vault.getAbstractFileByPath(current)) await plugin.app.vault.createFolder(current);
	}
}

function buildReportMarkdown(input: { analytics: JournalAnalytics; journalType: TradeJournalType; period: DashboardPeriod; symbol: string; account: TradingAccount | null; trades: JournalCalendarTrade[] }): string {
	const a = input.analytics;
	const setupRows = a.setups.map((setup) => `| ${setup.name} | ${setup.count} | ${formatPct(setup.count ? setup.wins / setup.count * 100 : 0)} | ${formatR(setup.netR)} | ${formatR(setup.averageR)} |`).join('\n') || '| — | 0 | 0% | 0R | 0R |';
	const dayRows = a.daily.map((day) => `| ${day.date} | ${day.trades} | ${formatR(day.netR)} |`).join('\n') || '| — | 0 | 0R |';
	return `# گزارش ژورنال معاملاتی — ${localDateKey(new Date())}\n\n## فیلتر گزارش\n\n- نوع: ${input.journalType === 'live' ? 'معاملات زنده/دمو/پراپ' : 'بک‌تست'}\n- بازه: ${input.period}\n- حساب: ${input.account?.name ?? 'همه حساب‌ها'}\n- نماد: ${input.symbol || 'همه نمادها'}\n\n## خلاصه عملکرد\n\n| شاخص | مقدار |\n|---|---:|\n| تعداد معاملات | ${a.tradeCount} |\n| معاملات نهایی‌شده | ${a.completedCount} |\n| Win Rate | ${formatPct(a.winRate)} |\n| R خالص | ${formatR(a.netR)} |\n| Average R | ${formatR(a.averageR)} |\n| Profit Factor | ${a.profitFactor === null ? '∞' : formatNumber(a.profitFactor)} |\n| Max Drawdown | ${formatNumber(a.maxDrawdownR)}R |\n| بهترین برد پیاپی | ${a.bestWinStreak} |\n| پوشش تصاویر | ${formatPct(a.screenshotCoverage)} |\n| پوشش کامل سه تصویر | ${formatPct(a.fullScreenshotCoverage)} |\n| Review تکمیل‌شده | ${formatPct(a.reviewRate)} |\n| تخطی مدیریت ریسک | ${a.riskViolationCount} |\n| میانگین Chase | ${formatNumber(a.averageChase)}/10 |\n\n## عملکرد ستاپ‌ها\n\n| ستاپ | تعداد | Win Rate | Net R | Avg R |\n|---|---:|---:|---:|---:|\n${setupRows}\n\n## عملکرد روزانه\n\n| تاریخ | تعداد | Net R |\n|---|---:|---:|\n${dayRows}\n\n## برداشت مدیریتی\n\n- بهترین ستاپ این بازه: ${a.setups[0] ? `${a.setups[0].name} (${formatR(a.setups[0].netR)})` : 'داده کافی نیست'}\n- بهترین روز: ${a.bestDay ? `${a.bestDay.date} (${formatR(a.bestDay.netR)})` : 'داده کافی نیست'}\n- ضعیف‌ترین روز: ${a.worstDay ? `${a.worstDay.date} (${formatR(a.worstDay.netR)})` : 'داده کافی نیست'}\n- پرتکرارترین اشتباه: ${a.topMistake ? `${mistakeLabel(a.topMistake.tag)} (${a.topMistake.count} بار)` : 'مورد معناداری ثبت نشده'}\n\n## سؤال‌های پایان بازه\n\n1. کدام رفتار قبل از بهترین معاملات تکرار شد؟\n2. کدام اشتباه بیشترین R را از من گرفت؟\n3. آیا معاملات خارج از قانون مدیریت سرمایه ارزش ادامه‌دادن داشتند؟\n4. در هفته/ماه بعد فقط یک رفتار را بخواهم بهتر کنم، آن رفتار چیست؟\n5. کدام ستاپ باید بیشتر بک‌تست شود و کدام ستاپ باید موقتاً محدود شود؟\n\n> این گزارش از داده‌های ثبت‌شده در Trader Journal ساخته شده است. کیفیت گزارش مستقیماً به کامل‌بودن تصاویر، Review و ثبت دقیق R وابسته است.\n`;
}

function mistakeLabel(tag: string): string {
	return MISTAKE_LABELS[tag as TradeReviewMistakeTag] ?? tag;
}

function numberValue(value: unknown): number | null {
	const parsed = typeof value === 'number' ? value : typeof value === 'string' && value.trim() ? Number(value) : Number.NaN;
	return Number.isFinite(parsed) ? parsed : null;
}

function formatNumber(value: number): string { return Number(value.toFixed(2)).toString(); }
function formatPct(value: number): string { return `${formatNumber(value)}%`; }
function formatR(value: number): string { return `${value > 0 ? '+' : ''}${formatNumber(value)}R`; }
function formatMoney(value: number, currency: string): string { return `${new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 }).format(value)} ${currency}`; }
function localDateKey(date: Date): string { return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`; }

const styles: Record<string, React.CSSProperties> = {
	kicker: { color: 'var(--interactive-accent)', fontWeight: 800, fontSize: 12, letterSpacing: 0.8, marginBottom: 6 },
	heroGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(190px,1fr))', gap: 10, margin: '12px 0' },
	emptyAccount: { display: 'grid', gap: 5, minHeight: 100, textAlign: 'right', border: '1px dashed var(--interactive-accent)', borderRadius: 14, padding: 16, background: 'var(--background-secondary)' },
	accountCard: { display: 'grid', gap: 5, minHeight: 110, textAlign: 'right', border: '1px solid var(--background-modifier-border)', borderRadius: 14, padding: 14, background: 'var(--background-secondary)' },
	accountCardActive: { borderColor: 'var(--interactive-accent)', boxShadow: '0 0 0 1px var(--interactive-accent)' },
	accountType: { color: 'var(--interactive-accent)', fontSize: 12, fontWeight: 700 },
	accountName: { fontSize: 15 }, accountBalance: { fontSize: 22 },
	filterPanel: { padding: 12, marginBottom: 12 },
	metricGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(150px,1fr))', gap: 10, marginBottom: 12 },
	metricCard: { display: 'grid', gap: 5, border: '1px solid var(--background-modifier-border)', borderRadius: 14, padding: 14, background: 'var(--background-secondary)' },
	metricTitle: { color: 'var(--text-muted)', fontSize: 12, fontWeight: 700 },
	metricValue: { fontSize: 26, lineHeight: 1.1 }, muted: { color: 'var(--text-muted)' },
	chartGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(320px,1fr))', gap: 12, marginBottom: 12 },
	panel: { border: '1px solid var(--background-modifier-border)', borderRadius: 16, padding: 16, background: 'var(--background-secondary)' },
	qualityGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: 10, marginBottom: 12 },
	qualityCard: { display: 'grid', gap: 6, border: '1px solid var(--background-modifier-border)', borderRadius: 14, padding: 14, background: 'var(--background-secondary)' },
	emptyChart: { minHeight: 150, display: 'grid', placeItems: 'center', color: 'var(--text-muted)', border: '1px dashed var(--background-modifier-border)', borderRadius: 12 },
	chartLegend: { display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'space-between', color: 'var(--text-muted)', fontSize: 12 },
	barList: { display: 'grid', gap: 8 }, barRow: { display: 'grid', gridTemplateColumns: '44px 1fr 58px', gap: 8, alignItems: 'center' }, barLabel: { fontSize: 12, color: 'var(--text-muted)' }, barTrack: { height: 10, background: 'var(--background-primary)', borderRadius: 999, overflow: 'hidden' }, barFill: { display: 'block', height: '100%', borderRadius: 999 },
	setupRow: { display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', padding: '9px 10px', border: '1px solid var(--background-modifier-border)', borderRadius: 10, background: 'var(--background-primary)' },
	summaryLine: { display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', paddingBottom: 8, borderBottom: '1px solid var(--background-modifier-border)' }, summaryNote: { marginTop: 4, padding: 12, borderRadius: 10, background: 'var(--background-primary)', color: 'var(--text-muted)', lineHeight: 1.8 },
	tradeList: { display: 'grid', gap: 8 }, tradeRow: { display: 'flex', width: '100%', justifyContent: 'space-between', gap: 12, alignItems: 'center', textAlign: 'right', border: '1px solid var(--background-modifier-border)', borderRadius: 12, padding: '10px 12px', background: 'var(--background-secondary)' },
};
