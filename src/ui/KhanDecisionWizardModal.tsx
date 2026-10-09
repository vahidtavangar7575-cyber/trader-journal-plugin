import type { App } from 'obsidian';
import { Modal } from 'obsidian';
import { StrictMode, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import type { Root } from 'react-dom/client';
import { DAILY_TRADING_COMMITMENT, isCommitmentComplete } from '../behavior/commitment';
import {
	answerKhanDecision,
	backKhanDecision,
	continueKhanDecision,
	createKhanDecisionSnapshot,
	createKhanDecisionSnapshotForSetup,
	getKhanDecisionNode,
	getKhanDecisionResult,
} from '../khan/engine';
import { KHAN_SETUP_CATALOG, getKhanSetupCatalogItem } from '../khan/catalog';
import { KHAN_SETUP_NAMES } from '../khan/rules';
import { ensureKhanSetup } from '../khan/setups';
import type { KhanDecisionResult, KhanDecisionSnapshot, KhanSetupId } from '../khan/types';
import type TraderJournalPlugin from '../main';
import type { TradeEntry, TradeJournalType } from '../trades/types';
import { TraderJournalModal } from './TraderJournalModal';

interface KhanWizardContentProps {
	plugin: TraderJournalPlugin;
	closeModal: () => void;
}

type WizardScreen = 'commitment' | 'home' | 'context' | 'setups' | 'wait-poi' | 'flow';
type MarketArrivalContext = 'approaching-poi' | 'at-poi' | 'after-poi' | 'mid-move' | 'in-trade';

const MARKET_CONTEXT_LABELS: Record<MarketArrivalContext, string> = {
	'approaching-poi': 'قیمت در مسیر POI است',
	'at-poi': 'قیمت داخل یا روی POI است',
	'after-poi': 'قیمت به POI برخورد کرده و واکنش شروع شده',
	'mid-move': 'وسط حرکت یا بعد از بخشی از ستاپ پای چارت رسیده‌ام',
	'in-trade': 'از قبل داخل معامله هستم',
};

function KhanWizardContent({ plugin, closeModal }: KhanWizardContentProps) {
	const [screen, setScreen] = useState<WizardScreen>('commitment');
	const [commitment, setCommitment] = useState('');
	const [snapshot, setSnapshot] = useState<KhanDecisionSnapshot>(() => createKhanDecisionSnapshot());
	const [arrivalContext, setArrivalContext] = useState<MarketArrivalContext>('at-poi');
	const [error, setError] = useState('');
	const [isPreparingTrade, setIsPreparingTrade] = useState(false);
	const [equity, setEquity] = useState('');
	const [personalRiskCap, setPersonalRiskCap] = useState('');
	const node = getKhanDecisionNode(snapshot);
	const result = getKhanDecisionResult(snapshot);
	const setupCatalog = snapshot.setup ? getKhanSetupCatalogItem(snapshot.setup) : null;
	const commitmentReady = isCommitmentComplete(commitment);
	const commitmentProgress = useMemo(() => {
		const targetLength = DAILY_TRADING_COMMITMENT.length;
		return Math.min(100, Math.round((commitment.length / targetLength) * 100));
	}, [commitment]);

	const answer = (answerId: string) => {
		setError('');
		setSnapshot((current) => answerKhanDecision(current, answerId));
	};

	const continueFlow = () => {
		setError('');
		setSnapshot((current) => continueKhanDecision(current));
	};

	const goBack = () => {
		setError('');
		setSnapshot((current) => backKhanDecision(current));
	};

	const restartFlow = () => {
		setError('');
		setSnapshot(createKhanDecisionSnapshot());
		setScreen('home');
	};

	const startSmartFlow = () => {
		setSnapshot(createKhanDecisionSnapshot());
		setScreen('context');
	};

	const startSetup = (setup: KhanSetupId) => {
		setError('');
		setSnapshot(createKhanDecisionSnapshotForSetup(setup));
		setScreen('flow');
	};

	const chooseMarketContext = (context: MarketArrivalContext) => {
		setArrivalContext(context);
		setError('');
		if (context === 'approaching-poi') {
			setScreen('wait-poi');
			return;
		}
		if (context === 'in-trade') {
			setScreen('wait-poi');
			return;
		}
		setSnapshot(createKhanDecisionSnapshot());
		setScreen('flow');
	};

	const approvedRiskPct = useMemo(() => {
		if (!result) return null;
		const cap = Number(personalRiskCap);
		return Number.isFinite(cap) && cap > 0 ? Math.min(result.riskPct, cap) : result.riskPct;
	}, [personalRiskCap, result]);

	const riskAmount = useMemo(() => {
		if (approvedRiskPct === null) return null;
		const account = Number(equity);
		if (!Number.isFinite(account) || account <= 0) return null;
		return account * approvedRiskPct / 100;
	}, [approvedRiskPct, equity]);

	const openTrade = async (journalType: TradeJournalType) => {
		if (!result || isPreparingTrade) return;
		try {
			setIsPreparingTrade(true);
			setError('');
			const setup = await ensureKhanSetup(plugin, result.setup);
			const seed = createKhanTradeSeed(
				result,
				setup.id,
				setup.name,
				setup.timeframes[0] ?? '',
				arrivalContext,
				approvedRiskPct,
				riskAmount,
				Number(equity),
			);
			closeModal();
			new TraderJournalModal(plugin.app, plugin, journalType, seed).open();
		} catch (openError) {
			setError(openError instanceof Error ? openError.message : 'آماده‌سازی معامله انجام نشد.');
			setIsPreparingTrade(false);
		}
	};

	if (screen === 'commitment') {
		return (
			<div className="khan-cockpit" dir="rtl">
				<header className="khan-hero">
					<div className="khan-kicker">آیین شروع جلسه</div>
					<h2>قبل از نمودار، کیفیت تصمیم را انتخاب کن</h2>
					<p>این مرحله سود را تضمین نمی‌کند؛ فقط اصطکاکی آگاهانه می‌سازد تا ورود از روی عجله، FOMO یا انتقام سخت‌تر شود.</p>
				</header>
				<div className="khan-commitment-card">
					<div className="khan-card-title">تعهد معاملاتی امروز</div>
					<div className="khan-commitment-source">{DAILY_TRADING_COMMITMENT}</div>
					<label className="khan-commitment-input">
						<span>متن بالا را خودت تایپ کن. Paste عمداً غیرفعال است.</span>
						<textarea
							value={commitment}
							rows={9}
							onPaste={(event) => event.preventDefault()}
							onChange={(event) => setCommitment(event.target.value)}
							placeholder="از اینجا تایپ کن…"
						/>
					</label>
					<div className="khan-progress"><span style={{ width: `${commitmentProgress}%` }} /></div>
					<div className="khan-progress-label">{commitmentReady ? 'تعهد کامل شد ✓' : `${commitmentProgress}%`}</div>
				</div>
				<footer className="khan-footer">
					<button type="button" onClick={closeModal}>بستن</button>
					<button type="button" className="mod-cta" disabled={!commitmentReady} onClick={() => setScreen('home')}>
						ورود آگاهانه به جلسه
					</button>
				</footer>
			</div>
		);
	}

	if (screen === 'home') {
		return (
			<div className="khan-cockpit" dir="rtl">
				<header className="khan-hero khan-hero--compact">
					<div className="khan-kicker">Trading Cockpit</div>
					<h2>امروز فقط فرایند را اجرا می‌کنیم</h2>
					<p>بازار فرصت نامحدود دارد؛ وظیفه تو پیدا کردن فرصت نیست، رد کردن فرصت ناقص است.</p>
				</header>
				<div className="khan-home-grid">
					<button type="button" className="khan-primary-card" onClick={startSmartFlow}>
						<strong>تشخیص هوشمند از وضعیت فعلی بازار</strong>
						<span>برای استفاده روزانه؛ از جایی که الان پای چارت نشسته‌ای شروع می‌کنیم.</span>
					</button>
					<button type="button" className="khan-secondary-card" onClick={() => setScreen('setups')}>
						<strong>مرور یا شروع مستقیم یکی از ۶ ستاپ</strong>
						<span>برای آموزش، بک‌تست یا وقتی می‌دانی دقیقاً کدام Setup را می‌خواهی بررسی کنی.</span>
					</button>
				</div>
				<div className="khan-six-strip">{KHAN_SETUP_CATALOG.map((item) => <span key={item.id}>{item.shortTitle} ✓</span>)}</div>
				<footer className="khan-footer"><button type="button" onClick={closeModal}>بستن</button></footer>
			</div>
		);
	}

	if (screen === 'setups') {
		return (
			<div className="khan-cockpit" dir="rtl">
				<header className="khan-hero khan-hero--compact">
					<div className="khan-kicker">۶ ستاپ اجرایی</div>
					<h2>ستاپ را انتخاب کن</h2>
					<p>این شش کارت همان ۶ مسیر Presentation هستند؛ Entry Moduleهای دوره مثل CHOCH، Flip، SCM و SCOB زیرمجموعه منطق اجرا هستند، نه ستاپ شماره ۷.</p>
				</header>
				<div className="khan-setup-grid">
					{KHAN_SETUP_CATALOG.map((item) => (
						<button key={item.id} type="button" className="khan-setup-card" onClick={() => startSetup(item.id)}>
							<span className="khan-setup-index">{item.shortTitle}</span>
							<strong>{item.title.replace(`${item.shortTitle} — `, '')}</strong>
							<small>{item.summary}</small>
							<em>{item.sourcePages}</em>
						</button>
					))}
				</div>
				<footer className="khan-footer"><button type="button" onClick={() => setScreen('home')}>بازگشت</button></footer>
			</div>
		);
	}

	if (screen === 'context') {
		return (
			<div className="khan-cockpit" dir="rtl">
				<header className="khan-hero khan-hero--compact">
					<div className="khan-kicker">نقطه ورود تو به فرایند</div>
					<h2>وقتی پای چارت نشستی، قیمت کجا بود؟</h2>
					<p>این سؤال جزو Ruleهای خان نیست؛ یک Router اجرایی است تا مجبور نباشی همیشه از ابتدای PDF شروع کنی.</p>
				</header>
				<div className="khan-context-grid">
					{(Object.keys(MARKET_CONTEXT_LABELS) as MarketArrivalContext[]).map((context) => (
						<button key={context} type="button" className="khan-context-card" onClick={() => chooseMarketContext(context)}>
							<strong>{MARKET_CONTEXT_LABELS[context]}</strong>
							<span>{marketContextHint(context)}</span>
						</button>
					))}
				</div>
				<footer className="khan-footer"><button type="button" onClick={() => setScreen('home')}>بازگشت</button></footer>
			</div>
		);
	}

	if (screen === 'wait-poi') {
		const inTrade = arrivalContext === 'in-trade';
		return (
			<div className="khan-cockpit" dir="rtl">
				<header className="khan-hero khan-hero--compact">
					<div className="khan-kicker">{inTrade ? 'مدیریت، نه ورود جدید' : 'حالت انتظار حرفه‌ای'}</div>
					<h2>{inTrade ? 'تو از قبل داخل معامله‌ای' : 'قیمت هنوز در تله ورود نیست'}</h2>
					<p>{inTrade ? 'در این حالت Wizard ورود جدید نباید تو را به معامله دوم هل بدهد. مدیریت باید از Plan و Live Trade فعلی بیاید.' : 'این لحظه برای پیش‌بینی ورود نیست؛ برای آماده‌سازی سناریو و ثبت Context است.'}</p>
				</header>
				<div className="khan-checklist-card">
					<strong>{inTrade ? 'چک مدیریت' : 'تا رسیدن قیمت به POI'}</strong>
					<ul>
						<li>{inTrade ? 'استاپ فقط طبق قانون مدیریت معامله تغییر کند، نه برای فرار از پذیرش زیان.' : 'POI تایم بالاتر و نقدینگی هدف را مشخص کن.'}</li>
						<li>{inTrade ? 'معامله جدید برای جبران/تقویت حس برد یا باخت باز نکن.' : 'یک Screenshot از M15/HTF بگیر که POI، ساختار و مسیر قیمت مشخص باشد.'}</li>
						<li>{inTrade ? 'اگر Setup invalidate شد، طبق Plan عمل کن؛ دوباره داستان جدید نساز.' : 'هیچ Entry را قبل از Trigger معتبر جلو نینداز.'}</li>
						<li>{inTrade ? 'نتیجه این معامله هیچ حقی روی معامله بعدی ایجاد نمی‌کند.' : 'وقتی قیمت به POI رسید، Wizard تصمیم را از همان‌جا شروع کن.'}</li>
					</ul>
				</div>
				<footer className="khan-footer">
					<button type="button" onClick={() => setScreen('context')}>بازگشت</button>
					{!inTrade ? <button type="button" className="mod-cta" onClick={() => { setSnapshot(createKhanDecisionSnapshot()); setScreen('flow'); }}>قیمت به POI/ناحیه تصمیم رسید</button> : null}
				</footer>
			</div>
		);
	}

	return (
		<div className="khan-cockpit" dir="rtl">
			<header className="khan-flow-header">
				<div>
					<div className="khan-kicker">مرحله {snapshot.decisions.length + 1}</div>
					<h2>{snapshot.setup ? KHAN_SETUP_NAMES[snapshot.setup] : 'تشخیص ستاپ'}</h2>
				</div>
				<div className="khan-source-badge">منبع: صفحه {node.page} از Presentation</div>
			</header>

			{arrivalContext === 'after-poi' || arrivalContext === 'mid-move' ? (
				<div className="khan-warning">تو بعد از شروع حرکت پای چارت رسیده‌ای. اگر Trigger معتبر از دست رفته، تعقیب قیمت یک ستاپ جدید نمی‌سازد.</div>
			) : null}
			{error ? <div className="trader-journal-form__error">{error}</div> : null}

			<section className="khan-question-card">
				<div className="khan-card-title">{node.title}</div>
				{node.body ? <p>{node.body}</p> : null}
				{setupCatalog ? <div className="khan-micro-context">تمرکز این مسیر: {setupCatalog.entryFocus}</div> : null}

				{node.kind === 'question' ? (
					<div className="khan-answer-grid">
						{node.answers.map((item) => (
							<button key={item.id} type="button" className="khan-answer-card" onClick={() => answer(item.id)}>
								{item.label}
							</button>
						))}
					</div>
				) : null}

				{node.kind === 'instruction' ? (
					<button type="button" className="mod-cta khan-continue" onClick={continueFlow}>ادامه مسیر</button>
				) : null}

				{result ? (
					<KhanResultSummary
						result={result}
						equity={equity}
						personalRiskCap={personalRiskCap}
						approvedRiskPct={approvedRiskPct}
						riskAmount={riskAmount}
						onEquityChange={setEquity}
						onRiskCapChange={setPersonalRiskCap}
					/>
				) : null}
			</section>

			{snapshot.decisions.length > 0 ? (
				<details className="khan-trace">
					<summary>مسیر تصمیم ({snapshot.decisions.length} پاسخ)</summary>
					<ol>{snapshot.decisions.map((decision, index) => <li key={`${decision.page}-${index}`}>صفحه {decision.page}: {decision.answerLabel}</li>)}</ol>
				</details>
			) : null}

			<footer className="khan-footer">
				<button type="button" onClick={closeModal}>بستن</button>
				<button type="button" onClick={restartFlow} disabled={isPreparingTrade}>خانه</button>
				<button type="button" onClick={goBack} disabled={snapshot.history.length === 0 || isPreparingTrade}>مرحله قبل</button>
				{result ? (
					<>
						<button type="button" className="mod-cta" disabled={isPreparingTrade} onClick={() => void openTrade('backtest')}>ثبت بک‌تست</button>
						<button type="button" className="mod-cta" disabled={isPreparingTrade} onClick={() => void openTrade('live')}>ثبت معامله زنده</button>
					</>
				) : null}
			</footer>
		</div>
	);
}

function marketContextHint(context: MarketArrivalContext): string {
	switch (context) {
		case 'approaching-poi': return 'سناریو را آماده می‌کنیم؛ فعلاً ورود نداریم.';
		case 'at-poi': return 'بهترین نقطه برای شروع تصمیم‌گیری ساختاریافته.';
		case 'after-poi': return 'با هشدار ضدتعقیب وارد Rule Engine می‌شویم.';
		case 'mid-move': return 'اول بررسی می‌کنیم آیا Trigger هنوز معتبر است یا فرصت تمام شده.';
		case 'in-trade': return 'به‌جای ورود جدید، مدیریت معامله فعلی اولویت دارد.';
	}
}

interface KhanResultSummaryProps {
	result: KhanDecisionResult;
	equity: string;
	personalRiskCap: string;
	approvedRiskPct: number | null;
	riskAmount: number | null;
	onEquityChange: (value: string) => void;
	onRiskCapChange: (value: string) => void;
}

function KhanResultSummary({ result, equity, personalRiskCap, approvedRiskPct, riskAmount, onEquityChange, onRiskCapChange }: KhanResultSummaryProps) {
	return (
		<div className="khan-result-card">
			<div className="khan-result-badge">ستاپ معتبر بر اساس مسیر فعلی</div>
			<h3>{KHAN_SETUP_NAMES[result.setup]}</h3>
			<div className="khan-risk-row">
				<div><span>ریسک منبع</span><strong>{formatRisk(result.riskPct)}%</strong></div>
				<div><span>ریسک نهایی</span><strong>{approvedRiskPct === null ? '-' : `${formatRisk(approvedRiskPct)}%`}</strong></div>
				<div><span>مبلغ ریسک</span><strong>{riskAmount === null ? '-' : formatMoney(riskAmount)}</strong></div>
			</div>
			<div className="khan-risk-inputs">
				<label><span>Equity / سرمایه حساب</span><input type="number" step="any" min="0" value={equity} onChange={(event) => onEquityChange(event.target.value)} placeholder="مثلاً 10000" /></label>
				<label><span>سقف شخصی ریسک %</span><input type="number" step="0.01" min="0" value={personalRiskCap} onChange={(event) => onRiskCapChange(event.target.value)} placeholder="اگر داری وارد کن" /></label>
			</div>
			<p className="khan-risk-note">ریسک نهایی هرگز بالاتر از ریسک شاخه منبع نمی‌رود؛ اگر سقف شخصی پایین‌تری وارد کنی، مقدار کمتر اعمال می‌شود.</p>
			<div className="khan-screenshot-guide">
				<strong>قبل از ورود این دو تصویر را بگیر:</strong>
				<span>① M15/HTF: ساختار، POI، نقدینگی هدف، PDH/PDL یا Session context</span>
				<span>② M1/LTF: IDM/CHOCH/OF/SCOB + Entry + SL + Target</span>
			</div>
			{result.caution ? <div className="khan-warning"><b>نکته منبع:</b> {result.caution}</div> : null}
			<small>صفحه نتیجه {result.resultPage} · نسخه قوانین {result.ruleVersion}</small>
		</div>
	);
}

function createKhanTradeSeed(
	result: KhanDecisionResult,
	setupId: string,
	setupName: string,
	setupTimeframe: string,
	arrivalContext: MarketArrivalContext,
	approvedRiskPct: number | null,
	riskAmount: number | null,
	equity: number,
): TradeEntry {
	const trace = result.decisions.map((decision) => `صفحه ${decision.page}: ${decision.answerLabel}`).join(' | ');
	return {
		setup_id: setupId,
		setup: setupName,
		timeframe: setupTimeframe,
		tags: ['khan', result.setup],
		notes: [
			`نتیجه Wizard خان: ${KHAN_SETUP_NAMES[result.setup]}`,
			`ریسک پیشنهادی منبع: ${formatRisk(result.riskPct)}%`,
			approvedRiskPct !== null ? `ریسک نهایی انتخاب‌شده: ${formatRisk(approvedRiskPct)}%` : '',
			`موقعیت هنگام نشستن پای چارت: ${MARKET_CONTEXT_LABELS[arrivalContext]}`,
			'تصاویر لازم: M15/HTF context قبل از ورود + M1/LTF execution قبل از ورود + تصویر بعد از خروج.',
			`مسیر صفحات: ${result.pages.join(' → ')}`,
			trace ? `پاسخ‌ها: ${trace}` : '',
			result.caution ? `نکته: ${result.caution}` : '',
		].filter(Boolean).join('\n'),
		khan_setup: result.setup,
		khan_risk_pct: result.riskPct,
		khan_approved_risk_pct: approvedRiskPct ?? result.riskPct,
		khan_rule_version: result.ruleVersion,
		khan_result_page: result.resultPage,
		khan_source_pages: result.pages,
		khan_decision_path: result.decisions,
		market_arrival_context: arrivalContext,
		...(Number.isFinite(equity) && equity > 0 ? { account_equity: equity } : {}),
		...(riskAmount !== null ? { risk_amount: Number(riskAmount.toFixed(2)) } : {}),
	};
}

function formatRisk(value: number): string {
	return Number.isInteger(value) ? String(value) : String(value).replace(/^0\./, '0.');
}

function formatMoney(value: number): string {
	return new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 }).format(value);
}

const KHAN_COCKPIT_CSS = `
.khan-cockpit{direction:rtl;display:flex;flex-direction:column;gap:16px;min-width:0;color:var(--text-normal)}
.khan-cockpit *{box-sizing:border-box}.khan-hero{padding:22px;border:1px solid color-mix(in srgb,var(--interactive-accent) 35%,var(--background-modifier-border));border-radius:18px;background:linear-gradient(145deg,color-mix(in srgb,var(--interactive-accent) 14%,var(--background-primary)),var(--background-secondary))}.khan-hero--compact{padding:16px 18px}.khan-hero h2,.khan-flow-header h2{margin:4px 0 8px;font-size:clamp(22px,3vw,30px);line-height:1.35}.khan-hero p{margin:0;color:var(--text-muted);line-height:1.8}.khan-kicker{font-size:12px;font-weight:800;color:var(--interactive-accent);letter-spacing:.06em}.khan-commitment-card,.khan-question-card,.khan-checklist-card{border:1px solid var(--background-modifier-border);border-radius:16px;background:var(--background-secondary);padding:18px}.khan-card-title{font-size:18px;font-weight:800;margin-bottom:10px}.khan-commitment-source{white-space:pre-wrap;line-height:2;padding:14px;border-radius:12px;background:var(--background-primary);border:1px dashed var(--background-modifier-border);user-select:text}.khan-commitment-input{display:flex;flex-direction:column;gap:8px;margin-top:14px}.khan-commitment-input span{font-size:12px;color:var(--text-muted)}.khan-commitment-input textarea{width:100%;line-height:1.9;resize:vertical}.khan-progress{height:7px;margin-top:12px;background:var(--background-modifier-border);border-radius:99px;overflow:hidden}.khan-progress span{display:block;height:100%;background:var(--interactive-accent);transition:width .2s ease}.khan-progress-label{text-align:left;font-size:12px;color:var(--text-muted);margin-top:5px}.khan-home-grid,.khan-context-grid,.khan-setup-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}.khan-primary-card,.khan-secondary-card,.khan-context-card,.khan-setup-card,.khan-answer-card{height:auto;min-height:94px;white-space:normal;text-align:right;border:1px solid var(--background-modifier-border);border-radius:14px;padding:16px;background:var(--background-secondary);box-shadow:none}.khan-primary-card{border-color:color-mix(in srgb,var(--interactive-accent) 55%,var(--background-modifier-border));background:color-mix(in srgb,var(--interactive-accent) 10%,var(--background-secondary))}.khan-primary-card strong,.khan-secondary-card strong,.khan-context-card strong,.khan-setup-card strong{display:block;font-size:16px;line-height:1.5}.khan-primary-card span,.khan-secondary-card span,.khan-context-card span,.khan-setup-card small{display:block;margin-top:7px;color:var(--text-muted);font-size:12px;line-height:1.7}.khan-six-strip{display:flex;flex-wrap:wrap;gap:7px}.khan-six-strip span,.khan-source-badge,.khan-result-badge,.khan-setup-index{border:1px solid var(--background-modifier-border);border-radius:999px;padding:5px 9px;background:var(--background-secondary);font-size:11px}.khan-setup-grid{grid-template-columns:repeat(3,minmax(0,1fr))}.khan-setup-card{min-height:180px;display:flex;flex-direction:column;align-items:stretch}.khan-setup-card em{margin-top:auto;padding-top:10px;font-style:normal;color:var(--interactive-accent);font-size:11px}.khan-flow-header{display:flex;align-items:flex-start;justify-content:space-between;gap:12px}.khan-source-badge{white-space:nowrap}.khan-warning{border:1px solid color-mix(in srgb,var(--color-orange) 65%,var(--background-modifier-border));background:color-mix(in srgb,var(--color-orange) 10%,var(--background-secondary));border-radius:12px;padding:10px 12px;line-height:1.7}.khan-question-card p{line-height:1.8;color:var(--text-muted)}.khan-micro-context{font-size:12px;color:var(--text-muted);border-inline-start:3px solid var(--interactive-accent);padding-inline-start:10px;margin:10px 0}.khan-answer-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;margin-top:14px}.khan-answer-card{min-height:64px;font-weight:750;font-size:14px}.khan-answer-card:hover,.khan-setup-card:hover,.khan-context-card:hover,.khan-primary-card:hover,.khan-secondary-card:hover{border-color:var(--interactive-accent);transform:translateY(-1px)}.khan-continue{margin-top:12px;width:100%}.khan-result-card{margin-top:16px;border:1px solid color-mix(in srgb,var(--color-green) 55%,var(--background-modifier-border));background:color-mix(in srgb,var(--color-green) 7%,var(--background-primary));border-radius:14px;padding:16px}.khan-result-card h3{margin:8px 0 12px}.khan-risk-row{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px}.khan-risk-row>div{padding:10px;border:1px solid var(--background-modifier-border);border-radius:10px;background:var(--background-secondary)}.khan-risk-row span{display:block;color:var(--text-muted);font-size:11px}.khan-risk-row strong{display:block;margin-top:3px;font-size:19px}.khan-risk-inputs{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;margin-top:10px}.khan-risk-inputs label{display:flex;flex-direction:column;gap:5px}.khan-risk-inputs span{font-size:11px;color:var(--text-muted)}.khan-risk-note{font-size:11px!important}.khan-screenshot-guide{display:grid;gap:5px;margin-top:12px;padding:12px;border-radius:10px;background:var(--background-secondary);font-size:12px;line-height:1.6}.khan-trace{border:1px solid var(--background-modifier-border);border-radius:12px;padding:10px 12px}.khan-trace summary{cursor:pointer;font-weight:700}.khan-trace li{margin:5px 0;color:var(--text-muted)}.khan-checklist-card ul{margin:10px 0 0;padding-inline-start:22px}.khan-checklist-card li{margin:9px 0;line-height:1.7}.khan-footer{display:flex;flex-wrap:wrap;gap:8px;justify-content:flex-start;border-top:1px solid var(--background-modifier-border);padding-top:12px}.khan-footer button{height:auto;min-height:38px}.trader-journal-modal-shell:has(.khan-cockpit){width:min(1080px,calc(100vw - 32px));max-width:calc(100vw - 32px)}
@media (max-width:760px){.khan-home-grid,.khan-context-grid,.khan-setup-grid,.khan-answer-grid,.khan-risk-inputs{grid-template-columns:1fr}.khan-risk-row{grid-template-columns:1fr 1fr}.khan-flow-header{flex-direction:column}.khan-source-badge{white-space:normal}.khan-hero{padding:16px}.khan-cockpit{gap:12px}}
@media (max-width:460px){.khan-risk-row{grid-template-columns:1fr}.khan-footer button{flex:1 1 auto}.trader-journal-modal-shell:has(.khan-cockpit){width:calc(100vw - 16px);max-width:calc(100vw - 16px)}}
`;

export class KhanDecisionWizardModal extends Modal {
	private root: Root | null = null;
	private styleEl: HTMLStyleElement | null = null;

	constructor(app: App, private readonly plugin: TraderJournalPlugin) {
		super(app);
	}

	onOpen() {
		this.titleEl.empty();
		this.modalEl.addClass('trader-journal-modal-shell');
		this.contentEl.addClass('trader-journal-modal-content');
		this.contentEl.empty();
		this.styleEl = document.createElement('style');
		this.styleEl.dataset.traderJournalKhanCockpit = 'true';
		this.styleEl.textContent = KHAN_COCKPIT_CSS;
		document.head.appendChild(this.styleEl);
		this.root = createRoot(this.contentEl);
		this.root.render(<StrictMode><KhanWizardContent plugin={this.plugin} closeModal={() => this.close()} /></StrictMode>);
	}

	onClose() {
		this.root?.unmount();
		this.root = null;
		this.styleEl?.remove();
		this.styleEl = null;
		this.modalEl.removeClass('trader-journal-modal-shell');
		this.contentEl.removeClass('trader-journal-modal-content');
		this.contentEl.empty();
	}
}
