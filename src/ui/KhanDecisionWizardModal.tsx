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
			const seed = createKhanTradeSeed(
				result,
				setup.id,
				setup.name,
				setup.timeframes[0] ?? '',
			);
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
					<div className="khan-progress-label">
						{commitmentReady ? 'تعهد شناخته شد ✓' : `شباهت هوشمند متن: ${commitmentProgress}%`}
					</div>
					<div className="khan-commitment-actions">
						<button type="button" className="mod-cta" disabled={!canEnterSession || isSavingCommitment} onClick={() => void confirmCommitment()}>
							{isSavingCommitment ? 'در حال ثبت…' : commitmentReady ? 'تعهد کامل شد — ورود به جلسه' : 'متن را آگاهانه تایپ کردم؛ ادامه'}
						</button>
						<small>{commitmentManualReady && !commitmentReady ? 'اگر فقط تفاوت تایپی مانده، ادامه بده.' : 'میانبر: Ctrl + Enter'}</small>
					</div>
				</div>
				<footer className="khan-footer khan-footer--sticky">
					<button type="button" onClick={closeModal}>بستن</button>
					<button type="button" className="mod-cta" disabled={!canEnterSession || isSavingCommitment} onClick={() => void confirmCommitment()}>
						ثبت تعهد امروز و ادامه
					</button>
				</footer>
			</div>
		);
	}

	if (screen === 'home') {
		return (
			<div className="khan-cockpit" dir="rtl">
				<header className="khan-hero khan-hero--compact">
					<div className="khan-kicker">Trading Cockpit · تعهد امروز ثبت شده ✓</div>
					<h2>مسیر را از منطق اصلی شروع کن</h2>
					<p>اگر نمی‌دانی بازار طبق کدام ستاپ پیش می‌رود، مسیر اصلی از اولین سؤال Presentation شروع می‌شود و خود Rule Engine ستاپ را تشخیص می‌دهد.</p>
				</header>
				<div className="khan-home-grid">
					<button type="button" className="khan-primary-card" onClick={startMainFlow}>
						<strong>شروع تشخیص ستاپ از ابتدای مسیر — پیشنهاد اصلی</strong>
						<span>بدون سؤال اضافی درباره «کِی پای چارت نشستی». از سؤال اول قوانین شروع می‌کنیم و مرحله‌به‌مرحله جلو می‌رویم.</span>
					</button>
					<button type="button" className="khan-secondary-card" onClick={() => setScreen('setups')}>
						<strong>شروع مستقیم یکی از ۶ ستاپ</strong>
						<span>فقط وقتی از قبل می‌دانی دقیقاً کدام Setup را می‌خواهی اجرا یا بک‌تست کنی.</span>
					</button>
				</div>
				<div className="khan-six-strip">{KHAN_SETUP_CATALOG.map((item) => <span key={item.id}>{item.shortTitle}</span>)}</div>
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
					<p>این مسیر میانبر است؛ برای حالت عادی بهتر است از تشخیص ستاپ از ابتدای Presentation استفاده کنی.</p>
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

	return (
		<div className="khan-cockpit" dir="rtl">
			<header className="khan-flow-header">
				<div>
					<div className="khan-kicker">مرحله {snapshot.decisions.length + 1}</div>
					<h2>{snapshot.setup ? KHAN_SETUP_NAMES[snapshot.setup] : 'تشخیص ستاپ'}</h2>
				</div>
				<div className="khan-source-badge">منبع: صفحه {node.page} از Presentation</div>
			</header>
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

				{result ? <KhanResultSummary result={result} /> : null}
			</section>

			{snapshot.decisions.length > 0 ? (
				<details className="khan-trace">
					<summary>مسیر تصمیم ({snapshot.decisions.length} پاسخ)</summary>
					<ol>{snapshot.decisions.map((decision, index) => <li key={`${decision.page}-${index}`}>صفحه {decision.page}: {decision.answerLabel}</li>)}</ol>
				</details>
			) : null}

			<footer className="khan-footer khan-footer--sticky">
				<button type="button" onClick={closeModal}>بستن</button>
				<button type="button" onClick={restartFlow} disabled={isPreparingTrade}>خانه</button>
				<button type="button" onClick={goBack} disabled={isPreparingTrade}>مرحله قبل</button>
				{result ? (
					<>
						<button type="button" className="mod-cta" disabled={isPreparingTrade} onClick={() => void openTrade('backtest')}>ساخت بلیت بک‌تست</button>
						<button type="button" className="mod-cta" disabled={isPreparingTrade} onClick={() => void openTrade('live')}>ساخت بلیت معامله</button>
					</>
				) : null}
			</footer>
		</div>
	);
}

function KhanResultSummary({ result }: { result: KhanDecisionResult }) {
	return (
		<div className="khan-result-card">
			<div className="khan-result-badge">ستاپ معتبر بر اساس مسیر فعلی</div>
			<h3>{KHAN_SETUP_NAMES[result.setup]}</h3>
			<div className="khan-risk-row">
				<div><span>حداکثر ریسک مجاز این مسیر</span><strong>{formatRisk(result.riskPct)}%</strong></div>
				<div><span>مرحله بعد</span><strong>بلیت معامله</strong></div>
				<div><span>قانون اجرا</span><strong>Account + Risk Engine</strong></div>
			</div>
			<p className="khan-risk-note">در مرحله بعد حساب ذخیره‌شده را انتخاب می‌کنی. موتور مدیریت سرمایه مقدار پیشنهادی را با سقف خان مقایسه می‌کند و مقدار کمتر را پیشنهاد می‌دهد؛ «ریسک واقعی که خودت وارد شدی» نیز جداگانه قابل ثبت و ویرایش است.</p>
			<div className="khan-screenshot-guide">
				<strong>قبل از ثبت بلیت، این دو تصویر را آماده کن:</strong>
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
): TradeEntry {
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
			'ریسک واقعی، حساب، Entry/SL/TP و تصاویر در بلیت معامله ثبت می‌شوند.',
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
	};
}

function formatRisk(value: number): string {
	return Number.isInteger(value) ? String(value) : String(value).replace(/^0\./, '0.');
}

const KHAN_COCKPIT_CSS = `
.khan-cockpit{direction:rtl;display:flex;flex-direction:column;gap:16px;min-width:0;color:var(--text-normal);padding-bottom:8px}
.khan-cockpit *{box-sizing:border-box}.khan-hero{padding:22px;border:1px solid color-mix(in srgb,var(--interactive-accent) 35%,var(--background-modifier-border));border-radius:18px;background:linear-gradient(145deg,color-mix(in srgb,var(--interactive-accent) 14%,var(--background-primary)),var(--background-secondary))}.khan-hero--compact{padding:16px 18px}.khan-hero h2,.khan-flow-header h2{margin:4px 0 8px;font-size:clamp(22px,3vw,30px);line-height:1.35}.khan-hero p{margin:0;color:var(--text-muted);line-height:1.8}.khan-kicker{font-size:12px;font-weight:800;color:var(--interactive-accent);letter-spacing:.04em}.khan-commitment-card,.khan-question-card{border:1px solid var(--background-modifier-border);border-radius:16px;background:var(--background-secondary);padding:18px}.khan-card-title{font-size:18px;font-weight:800;margin-bottom:10px}.khan-commitment-source{white-space:pre-wrap;line-height:2;padding:14px;border-radius:12px;background:var(--background-primary);border:1px dashed var(--background-modifier-border);user-select:text}.khan-commitment-input{display:flex;flex-direction:column;gap:8px;margin-top:14px}.khan-commitment-input span{font-size:12px;color:var(--text-muted)}.khan-commitment-input textarea{width:100%;line-height:1.9;resize:vertical}.khan-progress{height:7px;margin-top:12px;background:var(--background-modifier-border);border-radius:99px;overflow:hidden}.khan-progress span{display:block;height:100%;background:var(--interactive-accent);transition:width .2s ease}.khan-progress-label{text-align:left;font-size:12px;color:var(--text-muted);margin-top:5px}.khan-commitment-actions{display:flex;flex-wrap:wrap;align-items:center;gap:10px;margin-top:12px;padding-top:12px;border-top:1px solid var(--background-modifier-border)}.khan-commitment-actions button{height:auto;min-height:42px}.khan-commitment-actions small{color:var(--text-muted);line-height:1.6}.khan-home-grid,.khan-setup-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}.khan-primary-card,.khan-secondary-card,.khan-setup-card,.khan-answer-card{height:auto;min-height:94px;white-space:normal;text-align:right;border:1px solid var(--background-modifier-border);border-radius:14px;padding:16px;background:var(--background-secondary);box-shadow:none}.khan-primary-card{border-color:color-mix(in srgb,var(--interactive-accent) 55%,var(--background-modifier-border));background:color-mix(in srgb,var(--interactive-accent) 10%,var(--background-secondary))}.khan-primary-card strong,.khan-secondary-card strong,.khan-setup-card strong{display:block;font-size:16px;line-height:1.5}.khan-primary-card span,.khan-secondary-card span,.khan-setup-card small{display:block;margin-top:7px;color:var(--text-muted);font-size:12px;line-height:1.7}.khan-six-strip{display:flex;flex-wrap:wrap;gap:7px}.khan-six-strip span,.khan-source-badge,.khan-result-badge,.khan-setup-index{border:1px solid var(--background-modifier-border);border-radius:999px;padding:5px 9px;background:var(--background-secondary);font-size:11px}.khan-setup-grid{grid-template-columns:repeat(3,minmax(0,1fr))}.khan-setup-card{min-height:180px;display:flex;flex-direction:column;align-items:stretch}.khan-setup-card em{margin-top:auto;padding-top:10px;font-style:normal;color:var(--interactive-accent);font-size:11px}.khan-flow-header{display:flex;align-items:flex-start;justify-content:space-between;gap:12px}.khan-source-badge{white-space:nowrap}.khan-warning{border:1px solid color-mix(in srgb,var(--color-orange) 65%,var(--background-modifier-border));background:color-mix(in srgb,var(--color-orange) 10%,var(--background-secondary));border-radius:12px;padding:10px 12px;line-height:1.7}.khan-question-card p{line-height:1.8;color:var(--text-muted)}.khan-micro-context{font-size:12px;color:var(--text-muted);border-inline-start:3px solid var(--interactive-accent);padding-inline-start:10px;margin:10px 0}.khan-answer-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;margin-top:14px}.khan-answer-card{min-height:64px;font-weight:750;font-size:14px}.khan-answer-card:hover,.khan-setup-card:hover,.khan-primary-card:hover,.khan-secondary-card:hover{border-color:var(--interactive-accent);transform:translateY(-1px)}.khan-continue{margin-top:12px;width:100%}.khan-result-card{margin-top:16px;border:1px solid color-mix(in srgb,var(--color-green) 55%,var(--background-modifier-border));background:color-mix(in srgb,var(--color-green) 7%,var(--background-primary));border-radius:14px;padding:16px}.khan-result-card h3{margin:8px 0 12px}.khan-risk-row{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px}.khan-risk-row>div{padding:10px;border:1px solid var(--background-modifier-border);border-radius:10px;background:var(--background-secondary)}.khan-risk-row span{display:block;color:var(--text-muted);font-size:11px}.khan-risk-row strong{display:block;margin-top:3px;font-size:16px}.khan-risk-note{font-size:12px!important}.khan-screenshot-guide{display:grid;gap:5px;margin-top:12px;padding:12px;border-radius:10px;background:var(--background-secondary);font-size:12px;line-height:1.6}.khan-trace{border:1px solid var(--background-modifier-border);border-radius:12px;padding:10px 12px}.khan-trace summary{cursor:pointer;font-weight:700}.khan-trace li{margin:5px 0;color:var(--text-muted)}.khan-footer{display:flex;flex-wrap:wrap;gap:8px;justify-content:flex-start;border-top:1px solid var(--background-modifier-border);padding-top:12px}.khan-footer button{height:auto;min-height:38px}.khan-footer--sticky{position:sticky;bottom:0;z-index:10;background:color-mix(in srgb,var(--background-primary) 96%,transparent);padding:12px 0 4px;backdrop-filter:blur(8px)}.trader-journal-modal-shell:has(.khan-cockpit){width:min(1080px,calc(100vw - 32px));max-width:calc(100vw - 32px);max-height:calc(100vh - 24px);overflow:hidden}.trader-journal-modal-content:has(.khan-cockpit){display:block!important;overflow-y:auto!important;overflow-x:hidden!important;max-height:calc(100vh - 72px)!important;scrollbar-gutter:stable;padding-bottom:8px!important}
@media (max-width:760px){.khan-home-grid,.khan-setup-grid,.khan-answer-grid{grid-template-columns:1fr}.khan-risk-row{grid-template-columns:1fr 1fr}.khan-flow-header{flex-direction:column}.khan-source-badge{white-space:normal}.khan-hero{padding:16px}.khan-cockpit{gap:12px}}
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
