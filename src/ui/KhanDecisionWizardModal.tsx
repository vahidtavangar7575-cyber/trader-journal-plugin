import type { App } from 'obsidian';
import { Modal } from 'obsidian';
import { StrictMode, useState } from 'react';
import { createRoot } from 'react-dom/client';
import type { Root } from 'react-dom/client';
import {
	answerKhanDecision,
	backKhanDecision,
	continueKhanDecision,
	createKhanDecisionSnapshot,
	getKhanDecisionNode,
	getKhanDecisionResult,
} from '../khan/engine';
import { KHAN_SETUP_NAMES } from '../khan/rules';
import { ensureKhanSetup } from '../khan/setups';
import type { KhanDecisionResult, KhanDecisionSnapshot } from '../khan/types';
import type TraderJournalPlugin from '../main';
import type { TradeEntry, TradeJournalType } from '../trades/types';
import { TraderJournalModal } from './TraderJournalModal';

interface KhanWizardContentProps {
	plugin: TraderJournalPlugin;
	closeModal: () => void;
}

function KhanWizardContent({ plugin, closeModal }: KhanWizardContentProps) {
	const [snapshot, setSnapshot] = useState<KhanDecisionSnapshot>(() => createKhanDecisionSnapshot());
	const [error, setError] = useState('');
	const [isPreparingTrade, setIsPreparingTrade] = useState(false);
	const node = getKhanDecisionNode(snapshot);
	const result = getKhanDecisionResult(snapshot);

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

	const restart = () => {
		setError('');
		setSnapshot(createKhanDecisionSnapshot());
	};

	const openTrade = async (journalType: TradeJournalType) => {
		if (!result || isPreparingTrade) {
			return;
		}
		try {
			setIsPreparingTrade(true);
			setError('');
			const setup = await ensureKhanSetup(plugin, result.setup);
			const seed = createKhanTradeSeed(result, setup.id, setup.name, setup.timeframes[0] ?? '');
			closeModal();
			new TraderJournalModal(plugin.app, plugin, journalType, seed).open();
		} catch (openError) {
			setError(openError instanceof Error ? openError.message : 'آماده‌سازی معامله انجام نشد.');
			setIsPreparingTrade(false);
		}
	};

	return (
		<div className="trader-journal-modal trader-journal-form" dir="rtl">
			<div className="trader-journal-form__body">
				<h2>راهنمای تصمیم ستاپ‌های خان</h2>
				<p>
					صفحه منبع: <b>{node.page}</b>
					{snapshot.setup ? <> · مسیر فعال: <b>{KHAN_SETUP_NAMES[snapshot.setup]}</b></> : null}
				</p>
				<p>هر بار فقط وضعیت واقعی نمودار را انتخاب کن. مسیر و ریسک از نمودار تصمیم ۵۸ صفحه‌ای منبع محاسبه می‌شود.</p>

				{error ? <div className="trader-journal-form__error">{error}</div> : null}

				<section className="trader-journal-field">
					<h3>{node.title}</h3>
					{node.body ? <p>{node.body}</p> : null}
					{node.kind === 'question' ? (
						<div className="trader-journal-form__actions">
							{node.answers.map((item) => (
								<button key={item.id} type="button" className="mod-cta" onClick={() => answer(item.id)}>
									{item.label}
								</button>
							))}
						</div>
					) : null}

					{node.kind === 'instruction' ? (
						<div className="trader-journal-form__actions">
							<button type="button" className="mod-cta" onClick={continueFlow}>ادامه مسیر</button>
						</div>
					) : null}

					{result ? <KhanResultSummary result={result} /> : null}
				</section>

				{snapshot.decisions.length > 0 ? (
					<details>
						<summary>نمایش مسیر تصمیم ({snapshot.decisions.length} پاسخ)</summary>
						<ol>
							{snapshot.decisions.map((decision, index) => (
								<li key={`${decision.page}-${index}`}>صفحه {decision.page}: {decision.answerLabel}</li>
							))}
						</ol>
					</details>
				) : null}
			</div>

			<div className="trader-journal-form__actions">
				<button type="button" onClick={closeModal}>بستن</button>
				<button type="button" onClick={restart} disabled={isPreparingTrade}>شروع دوباره</button>
				<button type="button" onClick={goBack} disabled={snapshot.history.length === 0 || isPreparingTrade}>مرحله قبل</button>
				{result ? (
					<>
						<button type="button" className="mod-cta" disabled={isPreparingTrade} onClick={() => void openTrade('backtest')}>
							ثبت بک‌تست با این نتیجه
						</button>
						<button type="button" className="mod-cta" disabled={isPreparingTrade} onClick={() => void openTrade('live')}>
							ثبت معامله زنده با این نتیجه
						</button>
					</>
				) : null}
			</div>
		</div>
	);
}

function KhanResultSummary({ result }: { result: KhanDecisionResult }) {
	return (
		<div>
			<h3>نتیجه مسیر</h3>
			<p><b>{KHAN_SETUP_NAMES[result.setup]}</b></p>
			<p>ریسک پیشنهادی منبع: <b>{formatRisk(result.riskPct)}%</b></p>
			<p>صفحه نتیجه: {result.resultPage} · نسخه قوانین: {result.ruleVersion}</p>
			{result.caution ? <p><b>نکته:</b> {result.caution}</p> : null}
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
		tags: ['khan', result.setup],
		notes: [
			`نتیجه Wizard خان: ${KHAN_SETUP_NAMES[result.setup]}`,
			`ریسک پیشنهادی منبع: ${formatRisk(result.riskPct)}%`,
			`مسیر صفحات: ${result.pages.join(' → ')}`,
			trace ? `پاسخ‌ها: ${trace}` : '',
			result.caution ? `نکته: ${result.caution}` : '',
		].filter(Boolean).join('\n'),
		khan_setup: result.setup,
		khan_risk_pct: result.riskPct,
		khan_rule_version: result.ruleVersion,
		khan_result_page: result.resultPage,
		khan_source_pages: result.pages,
		khan_decision_path: result.decisions,
	};
}

function formatRisk(value: number): string {
	return Number.isInteger(value) ? String(value) : String(value).replace(/^0\./, '0.');
}

export class KhanDecisionWizardModal extends Modal {
	private root: Root | null = null;

	constructor(app: App, private readonly plugin: TraderJournalPlugin) {
		super(app);
	}

	onOpen() {
		this.titleEl.empty();
		this.modalEl.addClass('trader-journal-modal-shell');
		this.contentEl.addClass('trader-journal-modal-content');
		this.contentEl.empty();
		this.root = createRoot(this.contentEl);
		this.root.render(
			<StrictMode>
				<KhanWizardContent plugin={this.plugin} closeModal={() => this.close()} />
			</StrictMode>,
		);
	}

	onClose() {
		this.root?.unmount();
		this.root = null;
		this.modalEl.removeClass('trader-journal-modal-shell');
		this.contentEl.removeClass('trader-journal-modal-content');
		this.contentEl.empty();
	}
}
