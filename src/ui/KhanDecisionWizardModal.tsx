import type { App } from 'obsidian';
import { Modal } from 'obsidian';
import { StrictMode, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import type { Root } from 'react-dom/client';
import {
	DAILY_TRADING_COMMITMENT,
	canManuallyConfirmCommitment,
	getCommitmentMatchScore,
	isCommitmentComplete,
} from '../behavior/commitment';
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
import { getKhanPageGuide } from '../khan/guidance';
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

type WizardScreen = 'commitment' | 'home' | 'setups' | 'flow';

function localDateKey(date = new Date()): string {
	const year = date.getFullYear();
	const month = String(date.getMonth() + 1).padStart(2, '0');
	const day = String(date.getDate()).padStart(2, '0');
	return `${year}-${month}-${day}`;
}

function KhanWizardContent({ plugin, closeModal }: KhanWizardContentProps) {
	const commitmentAlreadyDone = plugin.settings.lastCommitmentDate === localDateKey();
	const [screen, setScreen] = useState<WizardScreen>(() => commitmentAlreadyDone ? 'home' : 'commitment');
	const [commitment, setCommitment] = useState('');
	const [snapshot, setSnapshot] = useState<KhanDecisionSnapshot>(() => createKhanDecisionSnapshot());
	const [error, setError] = useState('');
	const [isPreparingTrade, setIsPreparingTrade] = useState(false);
	const [isSavingCommitment, setIsSavingCommitment] = useState(false);
	const node = getKhanDecisionNode(snapshot);
	const result = getKhanDecisionResult(snapshot);
	const setupCatalog = snapshot.setup ? getKhanSetupCatalogItem(snapshot.setup) : null;
	const pageGuide = getKhanPageGuide(node.page);
	const commitmentReady = isCommitmentComplete(commitment);
	const commitmentManualReady = canManuallyConfirmCommitment(commitment);
	const commitmentProgress = useMemo(() => getCommitmentMatchScore(commitment), [commitment]);
	const canEnterSession = commitmentReady || commitmentManualReady;

	const confirmCommitment = async () => {
		if (!canEnterSession || isSavingCommitment) return;
		try {
			setIsSavingCommitment(true);
			setError('');
			plugin.settings.lastCommitmentDate = localDateKey();
			await plugin.saveSettings();
			setScreen('home');
		} catch (saveError) {
			setError(saveError instanceof Error ? saveError.message : 'ثبت تعهد امروز انجام نشد.');
		} finally {
			setIsSavingCommitment(false);
		}
	};

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
		if (snapshot.history.length === 0) {
			setScreen('home');
			return;
		}
		setSnapshot((current) => backKhanDecision(current));
	};

	const restartFlow = () => {
		setError('');
		setSnapshot(createKhanDecisionSnapshot());
		setScreen('home');
	};

	const startMainFlow = () => {
		setError('');
		setSnapshot(createKhanDecisionSnapshot());
		setScreen('flow');
	};

	const startSetup = (setup: KhanSetupId) => {
		setError('');
		setSnapshot(createKhanDecisionSnapshotForSetup(setup));
		setScreen('flow');
	};

	const openTrade = async (journalType: TradeJournalType) => {
		if (!result || isPreparingTrade) return;
		try {
			setIsPreparingTrade(true);
			setError('');
			const setup = await ensureKhanSetup(plugin, result.setup);
			const seed = createKhanTradeSeed(result, setup.id, setup.name, setup.timeframes[0] ?? '');
			closeModal();
			new TraderJournalModal(plugin.app, plugin, journalType, seed).open();
		} catch (openError) {
			setError(openError instanceof Error ? openError.message : 'آماده‌سازی بلیت معامله انجام نشد.');
			setIsPreparingTrade(false);
		}
	};

	if (screen === 'commitment') {
		return (
			<div className="khan-cockpit" dir="rtl">
				<header className="khan-hero">
					<div className="khan-kicker">آیین شروع جلسه · فقط یک‌بار در هر روز</div>
					<h2>قبل از نمودار، کیفیت تصمیم را انتخاب کن</h2>
					<p>وقتی این تعهد امروز ثبت شد، تا پایان همین روز دوباره از تو خواسته نمی‌شود.</p>
				</header>
				{error ? <div className="trader-journal-form__error">{error}</div> : null}
				<div className="khan-commitment-card">
					<div className="khan-card-title">تعهد معاملاتی امروز</div>
					<div className="khan-commitment-source">{DAILY_TRADING_COMMITMENT}</div>
					<label className="khan-commitment-input">
						<span>متن بالا را خودت تایپ کن. Paste غیرفعال است؛ فاصله، نیم‌فاصله، ی/ک عربی و نشانه‌گذاری نرمال می‌شوند.</span>
						<textarea
							value={commitment}
							rows={9}
							onPaste={(event) => event.preventDefault()}
							onKeyDown={(event) => {
								if ((event.ctrlKey || event.metaKey) && event.key === 'Enter' && canEnterSession) {
									event.preventDefault();
									void confirmCommitment();
								}
							}}
							onChange={(event) => setCommitment(event.target.value)}
							placeholder="از اینجا تایپ کن…"
						/>
					</label>
					<div className="khan-progress"><span style={{ width: `${commitmentProgress}%` }} /></div>
					<div className="khan-progress-label">{commitmentReady ? 'تعهد شناخته شد ✓' : `شباهت هوشمند متن: ${commitmentProgress}%`}</div>
					<div className="khan-commitment-actions">
						<button type="button" className="mod-cta" disabled={!canEnterSession || isSavingCommitment} onClick={() => void confirmCommitment()}>{isSavingCommitment ? 'در حال ثبت…' : commitmentReady ? 'تعهد کامل شد — ورود به جلسه' : 'متن را آگاهانه تایپ کردم؛ ادامه'}</button>
						<small>{commitmentManualReady && !commitmentReady ? 'اگر فقط تفاوت تایپی مانده، ادامه بده.' : 'میانبر: Ctrl + Enter'}</small>
					</div>
				</div>
				<footer className="khan-footer khan-footer--sticky"><button type="button" onClick={closeModal}>بستن</button><button type="button" className="mod-cta" disabled={!canEnterSession || isSavingCommitment} onClick={() => void confirmCommitment()}>ثبت تعهد امروز و ادامه</button></footer>
			</div>
		);
	}

	if (screen === 'home') {
		return (
			<div className="khan-cockpit" dir="rtl">
				<header className="khan-hero khan-hero--compact">
					<div className="khan-kicker">Trading Cockpit · تعهد امروز ثبت شده ✓</div>
					<h2>فقط مسیر خود Presentation</h2>
					<p>مسیر اصلی از صفحه ۱ فایل ۵۸ صفحه‌ای شروع می‌شود و هیچ Router موازیِ «وسط روند» یا «بعد از POI» وارد تصمیم ستاپ نمی‌شود.</p>
				</header>
				<div className="khan-home-grid">
					<button type="button" className="khan-primary-card" onClick={startMainFlow}><strong>شروع دقیق از صفحه ۱ Presentation — مسیر اصلی</strong><span>هر سؤال را همان‌طور که در فایل منبع آمده پاسخ می‌دهی؛ راهنمای آموزشی فقط توضیح می‌دهد روی چارت چه چیزی را پیدا کنی و مسیر را تغییر نمی‌دهد.</span></button>
					<button type="button" className="khan-secondary-card" onClick={() => setScreen('setups')}><strong>مرور مستقیم یکی از ۶ ستاپ</strong><span>فقط برای آموزش و مرور؛ برای تشخیص واقعی بازار از صفحه ۱ شروع کن.</span></button>
				</div>
				<div className="khan-warning"><b>اگر وسط روند یا بعد از POI رسیدی:</b> ستاپ تازه‌ای ساخته نمی‌شود. Major Structure، IDM و POI قبل از حرکت را بازسازی کن؛ سپس فقط وقتی یکی از رویدادهای صفحه ۱ را می‌توانی اثبات کنی وارد مسیر شو. اگر Trigger گذشته، Chase نکن.</div>
				<div className="khan-six-strip">{KHAN_SETUP_CATALOG.map((item) => <span key={item.id}>{item.shortTitle}</span>)}</div>
				<footer className="khan-footer"><button type="button" onClick={closeModal}>بستن</button></footer>
			</div>
		);
	}

	if (screen === 'setups') {
		return (
			<div className="khan-cockpit" dir="rtl">
				<header className="khan-hero khan-hero--compact"><div className="khan-kicker">۶ ستاپ اجرایی منبع</div><h2>مرور ستاپ</h2><p>این میانبر فقط برای مطالعه و Backtest هدفمند است؛ مسیر تشخیص روزانه باید از صفحه ۱ Presentation شروع شود.</p></header>
				<div className="khan-setup-grid">{KHAN_SETUP_CATALOG.map((item) => <button key={item.id} type="button" className="khan-setup-card" onClick={() => startSetup(item.id)}><span className="khan-setup-index">{item.shortTitle}</span><strong>{item.title.replace(`${item.shortTitle} — `, '')}</strong><small>{item.summary}</small><em>{item.sourcePages}</em></button>)}</div>
				<footer className="khan-footer"><button type="button" onClick={() => setScreen('home')}>بازگشت</button></footer>
			</div>
		);
	}

	return (
		<div className="khan-cockpit" dir="rtl">
			<header className="khan-flow-header"><div><div className="khan-kicker">مرحله {snapshot.decisions.length + 1}</div><h2>{snapshot.setup ? KHAN_SETUP_NAMES[snapshot.setup] : 'تشخیص ستاپ'}</h2></div><div className="khan-source-badge">منبع: صفحه {node.page} از Presentation</div></header>
			{error ? <div className="trader-journal-form__error">{error}</div> : null}

			<section className="khan-question-card">
				<div className="khan-card-title">{node.title}</div>
				{node.body ? <p>{node.body}</p> : null}
				{setupCatalog ? <div className="khan-micro-context">تمرکز این مسیر: {setupCatalog.entryFocus}</div> : null}
				{pageGuide ? (
					<details className="khan-trace khan-step-help" open>
						<summary>در این مرحله دقیقاً روی چارت چه کار کنم؟</summary>
						<div className="khan-step-help__body">
							<p><b>اقدام:</b> {pageGuide.action}</p>
							{pageGuide.waitFor ? <p><b>منتظر چه چیزی بمانم:</b> {pageGuide.waitFor}</p> : null}
							{pageGuide.avoid ? <p><b>انجام نده:</b> {pageGuide.avoid}</p> : null}
							<p><b>اگر دیر رسیدم / وسط حرکت هستم:</b> اطلاعات قبل از رسیدنت را از چپ چارت بازسازی کن. اگر پاسخ همین صفحه را با شواهد واقعی نمی‌توانی ثابت کنی، گزینه‌ای را حدس نزن؛ صبر کن یا از معامله صرف‌نظر کن. Trigger از دست‌رفته، Setup جدید ایجاد نمی‌کند.</p>
							{pageGuide.sourceNote ? <p><b>یادداشت منبع:</b> {pageGuide.sourceNote}</p> : null}
						</div>
					</details>
				) : null}

				{node.kind === 'question' ? <div className="khan-answer-grid">{node.answers.map((item) => <button key={item.id} type="button" className="khan-answer-card" onClick={() => answer(item.id)}>{item.label}</button>)}</div> : null}
				{node.kind === 'instruction' ? <button type="button" className="mod-cta khan-continue" onClick={continueFlow}>ادامه مسیر</button> : null}
				{result ? <KhanResultSummary result={result} /> : null}
			</section>

			{snapshot.decisions.length > 0 ? <details className="khan-trace"><summary>مسیر تصمیم ({snapshot.decisions.length} پاسخ)</summary><ol>{snapshot.decisions.map((decision, index) => <li key={`${decision.page}-${index}`}>صفحه {decision.page}: {decision.answerLabel}</li>)}</ol></details> : null}

			<footer className="khan-footer khan-footer--sticky"><button type="button" onClick={closeModal}>بستن</button><button type="button" onClick={restartFlow} disabled={isPreparingTrade}>خانه</button><button type="button" onClick={goBack} disabled={isPreparingTrade}>مرحله قبل</button>{result ? <><button type="button" className="mod-cta" disabled={isPreparingTrade} onClick={() => void openTrade('backtest')}>ساخت بلیت بک‌تست</button><button type="button" className="mod-cta" disabled={isPreparingTrade} onClick={() => void openTrade('live')}>ساخت بلیت معامله</button></> : null}</footer>
		</div>
	);
}

function KhanResultSummary({ result }: { result: KhanDecisionResult }) {
	return (
		<div className="khan-result-card">
			<div className="khan-result-badge">ستاپ معتبر بر اساس مسیر فعلی Presentation</div><h3>{KHAN_SETUP_NAMES[result.setup]}</h3>
			<div className="khan-risk-row"><div><span>سقف ریسک مسیر منبع</span><strong>{formatRisk(result.riskPct)}%</strong></div><div><span>مرحله بعد</span><strong>بلیت معامله</strong></div><div><span>قانون اجرا</span><strong>Account + Risk Engine</strong></div></div>
			<p className="khan-risk-note">در بلیت معامله، حساب ذخیره‌شده و موتور مدیریت سرمایه ریسک پیشنهادی نهایی را محاسبه می‌کنند؛ ریسک واقعی که خودت استفاده می‌کنی جداگانه ثبت می‌شود.</p>
			<div className="khan-screenshot-guide"><strong>قبل از ثبت بلیت، دو تصویر اصلی را آماده کن:</strong><span>① M15/HTF: ساختار، POI، نقدینگی هدف، PDH/PDL یا Session context</span><span>② M1/LTF: IDM/CHOCH/Flip/OF/SCOB + Entry + SL + Target</span></div>
			{result.caution ? <div className="khan-warning"><b>نکته منبع:</b> {result.caution}</div> : null}<small>صفحه نتیجه {result.resultPage} · نسخه قوانین {result.ruleVersion}</small>
		</div>
	);
}

function createKhanTradeSeed(result: KhanDecisionResult, setupId: string, setupName: string, setupTimeframe: string): TradeEntry {
	const trace = result.decisions.map((decision) => `صفحه ${decision.page}: ${decision.answerLabel}`).join(' | ');
	return {
		setup_id: setupId,
		setup: setupName,
		timeframe: setupTimeframe,
		status: 'open',
		tags: ['khan', result.setup],
		notes: [
			`نتیجه Wizard خان: ${KHAN_SETUP_NAMES[result.setup]}`,
			`سقف ریسک مسیر خان: ${formatRisk(result.riskPct)}%`,
			'ریسک واقعی، حساب، Entry/SL/TP، Context ژورنال و تصاویر در بلیت معامله ثبت می‌شوند.',
			`مسیر صفحات: ${result.pages.join(' → ')}`,
			trace ? `پاسخ‌ها: ${trace}` : '',
			result.caution ? `نکته: ${result.caution}` : '',
		].filter(Boolean).join('\n'),
		khan_setup: result.setup,
		khan_risk_pct: result.riskPct,
		khan_approved_risk_pct: result.riskPct,
		khan_rule_version: result.ruleVersion,
		khan_result_page: result.resultPage,
		khan_source_pages: result.pages,
		khan_decision_path: result.decisions,
		khan_source_exact: true,
		khan_source_document: 'Presentation - Copy.pdf — 58 صفحه',
	};
}

function formatRisk(value: number): string { return Number.isInteger(value) ? String(value) : String(value).replace(/^0\./, '0.'); }

const KHAN_COCKPIT_CSS = `
.khan-cockpit{direction:rtl;display:flex;flex-direction:column;gap:16px;min-width:0;color:var(--text-normal);padding-bottom:8px}
.khan-cockpit *{box-sizing:border-box}.khan-hero{padding:22px;border:1px solid color-mix(in srgb,var(--interactive-accent) 35%,var(--background-modifier-border));border-radius:18px;background:linear-gradient(145deg,color-mix(in srgb,var(--interactive-accent) 14%,var(--background-primary)),var(--background-secondary))}.khan-hero--compact{padding:16px 18px}.khan-hero h2,.khan-flow-header h2{margin:4px 0 8px;font-size:clamp(22px,3vw,30px);line-height:1.35}.khan-hero p{margin:0;color:var(--text-muted);line-height:1.8}.khan-kicker{font-size:12px;font-weight:800;color:var(--interactive-accent);letter-spacing:.04em}.khan-commitment-card,.khan-question-card{border:1px solid var(--background-modifier-border);border-radius:16px;background:var(--background-secondary);padding:18px}.khan-card-title{font-size:18px;font-weight:800;margin-bottom:10px}.khan-commitment-source{white-space:pre-wrap;line-height:2;padding:14px;border-radius:12px;background:var(--background-primary);border:1px dashed var(--background-modifier-border);user-select:text}.khan-commitment-input{display:flex;flex-direction:column;gap:8px;margin-top:14px}.khan-commitment-input span{font-size:12px;color:var(--text-muted)}.khan-commitment-input textarea{width:100%;line-height:1.9;resize:vertical}.khan-progress{height:7px;margin-top:12px;background:var(--background-modifier-border);border-radius:99px;overflow:hidden}.khan-progress span{display:block;height:100%;background:var(--interactive-accent);transition:width .2s ease}.khan-progress-label{text-align:left;font-size:12px;color:var(--text-muted);margin-top:5px}.khan-commitment-actions{display:flex;flex-wrap:wrap;align-items:center;gap:10px;margin-top:12px;padding-top:12px;border-top:1px solid var(--background-modifier-border)}.khan-commitment-actions button{height:auto;min-height:42px}.khan-commitment-actions small{color:var(--text-muted);line-height:1.6}.khan-home-grid,.khan-setup-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}.khan-primary-card,.khan-secondary-card,.khan-setup-card,.khan-answer-card{height:auto;min-height:94px;white-space:normal;text-align:right;border:1px solid var(--background-modifier-border);border-radius:14px;padding:16px;background:var(--background-secondary);box-shadow:none}.khan-primary-card{border-color:color-mix(in srgb,var(--interactive-accent) 55%,var(--background-modifier-border));background:color-mix(in srgb,var(--interactive-accent) 10%,var(--background-secondary))}.khan-primary-card strong,.khan-secondary-card strong,.khan-setup-card strong{display:block;font-size:16px;line-height:1.5}.khan-primary-card span,.khan-secondary-card span,.khan-setup-card small{display:block;margin-top:7px;color:var(--text-muted);font-size:12px;line-height:1.7}.khan-six-strip{display:flex;flex-wrap:wrap;gap:7px}.khan-six-strip span,.khan-source-badge,.khan-result-badge,.khan-setup-index{border:1px solid var(--background-modifier-border);border-radius:999px;padding:5px 9px;background:var(--background-secondary);font-size:11px}.khan-setup-grid{grid-template-columns:repeat(3,minmax(0,1fr))}.khan-setup-card{min-height:180px;display:flex;flex-direction:column;align-items:stretch}.khan-setup-card em{margin-top:auto;padding-top:10px;font-style:normal;color:var(--interactive-accent);font-size:11px}.khan-flow-header{display:flex;align-items:flex-start;justify-content:space-between;gap:12px}.khan-source-badge{white-space:nowrap}.khan-warning{border:1px solid color-mix(in srgb,var(--color-orange) 65%,var(--background-modifier-border));background:color-mix(in srgb,var(--color-orange) 10%,var(--background-secondary));border-radius:12px;padding:10px 12px;line-height:1.7}.khan-question-card p{line-height:1.8;color:var(--text-muted)}.khan-micro-context{font-size:12px;color:var(--text-muted);border-inline-start:3px solid var(--interactive-accent);padding-inline-start:10px;margin:10px 0}.khan-answer-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;margin-top:14px}.khan-answer-card{min-height:64px;font-weight:750;font-size:14px}.khan-answer-card:hover,.khan-setup-card:hover,.khan-primary-card:hover,.khan-secondary-card:hover{border-color:var(--interactive-accent);transform:translateY(-1px)}.khan-continue{margin-top:12px;width:100%}.khan-result-card{margin-top:16px;border:1px solid color-mix(in srgb,var(--color-green) 55%,var(--background-modifier-border));background:color-mix(in srgb,var(--color-green) 7%,var(--background-primary));border-radius:14px;padding:16px}.khan-result-card h3{margin:8px 0 12px}.khan-risk-row{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px}.khan-risk-row>div{padding:10px;border:1px solid var(--background-modifier-border);border-radius:10px;background:var(--background-secondary)}.khan-risk-row span{display:block;color:var(--text-muted);font-size:11px}.khan-risk-row strong{display:block;margin-top:3px;font-size:16px}.khan-risk-note{font-size:12px!important}.khan-screenshot-guide{display:grid;gap:5px;margin-top:12px;padding:12px;border-radius:10px;background:var(--background-secondary);font-size:12px;line-height:1.6}.khan-trace{border:1px solid var(--background-modifier-border);border-radius:12px;padding:10px 12px}.khan-trace summary{cursor:pointer;font-weight:700}.khan-trace li{margin:5px 0;color:var(--text-muted)}.khan-step-help{margin:12px 0;background:var(--background-primary)}.khan-step-help__body{padding-top:8px}.khan-step-help__body p{margin:6px 0!important;color:var(--text-normal)!important}.khan-footer{display:flex;flex-wrap:wrap;gap:8px;justify-content:flex-start;border-top:1px solid var(--background-modifier-border);padding-top:12px}.khan-footer button{height:auto;min-height:38px}.khan-footer--sticky{position:sticky;bottom:0;z-index:10;background:color-mix(in srgb,var(--background-primary) 96%,transparent);padding:12px 0 4px;backdrop-filter:blur(8px)}
@media (max-width:760px){.khan-home-grid,.khan-setup-grid,.khan-answer-grid{grid-template-columns:1fr}.khan-risk-row{grid-template-columns:1fr 1fr}.khan-flow-header{flex-direction:column}.khan-source-badge{white-space:normal}.khan-hero{padding:16px}.khan-cockpit{gap:12px}}
@media (max-width:460px){.khan-risk-row{grid-template-columns:1fr}.khan-footer button{flex:1 1 auto}}
`;

export class KhanDecisionWizardModal extends Modal {
	private root: Root | null = null;
	private styleEl: HTMLStyleElement | null = null;
	constructor(app: App, private readonly plugin: TraderJournalPlugin) { super(app); }
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
		this.root?.unmount(); this.root = null;
		this.styleEl?.remove(); this.styleEl = null;
		this.modalEl.removeClass('trader-journal-modal-shell');
		this.contentEl.removeClass('trader-journal-modal-content');
		this.contentEl.empty();
	}
}
