import { useEffect, useMemo, useState } from 'react';
import type { ChangeEvent, SyntheticEvent } from 'react';
import type TraderJournalPlugin from '../../main';
import { normalizeSymbol } from '../../settings';
import { getTranslator } from '../../i18n';
import { stringifyValue } from '../../trades/format';
import { calculateHoldingTime } from '../../trades/storage';
import type { TradeEntry, TradeJournalType } from '../../trades/types';
import { isSetupAvailableForSymbol } from '../../setups/storage';
import { buildRiskRuleWarnings, evaluateRiskPolicy } from '../../risk/policy';
import { TradeReviewFields } from '../TradeReviewFields';
import {
	calculateLiveRr,
	calculateTargetPriceForRr,
	createInitialTradeForm,
	getTradeResultFromRr,
	isExecutionFormClosing,
	isTradePlanOptionCompatible,
} from './form';
import type { TradeFormState } from './form';
import { getDateTimeDatePart, getTodayDateInput } from './dateTime';
import { TradeAccountFields } from './components/TradeAccountFields';
import { TradeExecutionFields } from './components/TradeExecutionFields';
import { TradeFormActions } from './components/TradeFormActions';
import { TradeIdentityFields } from './components/TradeIdentityFields';
import { TradeImageFields } from './components/TradeImageFields';
import { TradeRiskPsychologyFields } from './components/TradeRiskPsychologyFields';
import { TradeSetupFields } from './components/TradeSetupFields';
import { useTradeAttachments } from './hooks/useTradeAttachments';
import { useTradeReferenceData } from './hooks/useTradeReferenceData';
import { useTradeSave } from './hooks/useTradeSave';

export interface TraderJournalFormProps {
	plugin: TraderJournalPlugin;
	journalType: TradeJournalType;
	initialTrade?: TradeEntry;
	targetFilePath?: string;
	closeModal: () => void;
}

export function TraderJournalForm({
	plugin,
	journalType,
	initialTrade,
	targetFilePath,
	closeModal,
}: TraderJournalFormProps) {
	const [form, setForm] = useState<TradeFormState>(() => createInitialTradeForm(plugin, initialTrade, journalType));
	const [error, setError] = useState('');
	const [journalRevision, setJournalRevision] = useState(0);
	const [accountRevision, setAccountRevision] = useState(0);
	const [riskAuto, setRiskAuto] = useState(() => !stringifyValue(initialTrade?.risk_pct));

	const isLiveJournal = journalType === 'live';
	const isEditing = Boolean(initialTrade && targetFilePath);
	const isKhanTrade = Boolean(initialTrade?.khan_setup || form.tags.split(',').some((tag) => tag.trim() === 'khan'));
	// Journal 3.0 uses the same open -> close lifecycle for live, demo, prop and backtest records.
	const usesExecutionLifecycle = true;
	const isExecutionTradeClosed = isExecutionFormClosing(form);

	const { isLoadingPlans, isLoadingSetups, planOptions, setupOptions } = useTradeReferenceData({
		form,
		initialTrade,
		isEditing,
		isLiveJournal,
		plugin,
		setForm,
	});
	const {
		beginCommit,
		commit: commitAttachments,
		failCommit,
		handleInputKeyDown: handleImageInputKeyDown,
		handlePaste: handleImagePaste,
		imageInput,
		isMounted,
		isPastingImage,
		removeImage,
		selectImageFiles,
		setImageInput,
	} = useTradeAttachments({ form, journalType, plugin, setError, setForm });

	useEffect(() => plugin.journalDataService.subscribe(() => setJournalRevision((value) => value + 1)), [plugin]);

	const selectedAccount = useMemo(
		() => plugin.settings.accounts.find((account) => account.id === form.accountId) ?? null,
		[accountRevision, form.accountId, plugin],
	);
	const allTrades = useMemo(() => {
		void journalRevision;
		return Object.values(plugin.journalDataService.getSnapshot().trades.daysByDate)
			.flatMap((day) => day.trades.map((entry) => entry.trade));
	}, [journalRevision, plugin]);
	const tradeDate = getDateTimeDatePart(form.openedAt) || getTodayDateInput();
	const khanRiskCap = numericValue(initialTrade?.khan_approved_risk_pct ?? initialTrade?.khan_risk_pct);
	const riskEvaluation = selectedAccount
		? evaluateRiskPolicy({
			policy: plugin.settings.riskPolicy,
			account: selectedAccount,
			date: tradeDate,
			trades: allTrades,
			excludeTradeId: stringifyValue(initialTrade?.id) || undefined,
			khanRiskCapPct: khanRiskCap,
		})
		: null;

	useEffect(() => {
		if (!selectedAccount) return;
		setForm((current) => {
			const nextEquity = String(selectedAccount.currentBalance);
			const nextRisk = riskAuto && riskEvaluation ? formatNumber(riskEvaluation.recommendedRiskPct) : current.riskPct;
			if (current.accountEquity === nextEquity && current.riskPct === nextRisk) return current;
			return { ...current, accountEquity: nextEquity, riskPct: nextRisk };
		});
	}, [selectedAccount?.id, selectedAccount?.currentBalance, riskAuto, riskEvaluation?.recommendedRiskPct]);

	useEffect(() => {
		if (form.accountId && !plugin.settings.accounts.some((account) => account.id === form.accountId)) {
			setForm((current) => ({ ...current, accountId: '', accountEquity: '' }));
		}
	}, [accountRevision, form.accountId, plugin]);

	const holdingTime = useMemo(() => calculateHoldingTime(form.openedAt, form.closedAt), [form.openedAt, form.closedAt]);
	const plannedRr = useMemo(
		() => calculateLiveRr(form.side, form.entryPrice, form.stopLoss, form.takeProfit),
		[form.entryPrice, form.side, form.stopLoss, form.takeProfit],
	);
	const executionRr = useMemo(
		() => isExecutionTradeClosed
			? calculateLiveRr(form.side, form.entryPrice, form.stopLoss, form.exitPrice)
			: null,
		[form.entryPrice, form.exitPrice, form.side, form.stopLoss, isExecutionTradeClosed],
	);
	const executionResult = executionRr === null ? null : getTradeResultFromRr(executionRr);
	const actualRiskPct = numericValue(form.riskPct);
	const ruleWarnings = riskEvaluation
		? buildRiskRuleWarnings(riskEvaluation, actualRiskPct, plannedRr)
		: [];
	const tr = getTranslator(plugin.settings.language);
	const { isSaving, saveTrade } = useTradeSave({
		beginAttachmentCommit: beginCommit,
		closeModal,
		commitAttachments,
		executionResult,
		executionRr,
		failAttachmentCommit: failCommit,
		form,
		imageInput,
		initialTrade,
		isEditing,
		isExecutionTradeClosed,
		isLiveJournal,
		isMounted,
		journalType,
		plannedRr,
		planOptions,
		plugin,
		riskEvaluation,
		ruleWarnings,
		setError,
		targetFilePath,
		usesExecutionLifecycle,
	});

	function updateField<K extends keyof TradeFormState>(field: K, value: TradeFormState[K]) {
		setForm((currentForm) => ({ ...currentForm, [field]: value }));
	}

	function updateOpenedAt(openedAt: string) {
		setForm((currentForm) => ({
			...currentForm,
			openedAt,
			planId:
				isLiveJournal && !isEditing && currentForm.planId &&
				!isSelectedPlanCompatible(currentForm.planId, currentForm.symbol, openedAt)
					? ''
					: currentForm.planId,
		}));
	}

	function updateSymbol(symbol: string) {
		setForm((currentForm) => {
			const selectedSetup = setupOptions.find((setup) => setup.id === currentForm.setupId);
			const planId = isLiveJournal && !isEditing && currentForm.planId &&
				!isSelectedPlanCompatible(currentForm.planId, symbol, currentForm.openedAt) ? '' : currentForm.planId;
			const keepHistoricalSetup = isEditing && normalizeSymbol(symbol) === normalizeSymbol(stringifyValue(initialTrade?.symbol)) &&
				currentForm.setupId === stringifyValue(initialTrade?.setup_id);
			if (!selectedSetup || isSetupAvailableForSymbol(selectedSetup, symbol) || keepHistoricalSetup) {
				return { ...currentForm, symbol, planId };
			}
			return { ...currentForm, symbol, planId: '', setupId: '', setup: '' };
		});
	}

	function isSelectedPlanCompatible(planId: string, symbol: string, openedAt: string): boolean {
		const plan = planOptions.find((option) => option.id === planId);
		const date = getDateTimeDatePart(openedAt) || getTodayDateInput();
		return Boolean(plan && isTradePlanOptionCompatible(plan, symbol, date));
	}

	function updatePlan(planId: string) {
		const plan = planOptions.find((option) => option.id === planId);
		const matchingSetup = plan?.setupId
			? setupOptions.find((setup) => setup.id === plan.setupId)
			: setupOptions.find((setup) => setup.name.toLocaleLowerCase() === plan?.setup.toLocaleLowerCase());
		setForm((currentForm) => ({
			...currentForm,
			planId,
			setupId: plan ? matchingSetup?.id ?? plan.setupId : currentForm.setupId,
			setup: plan ? matchingSetup?.name ?? plan.setup : currentForm.setup,
		}));
	}

	function updateSetup(setupId: string) {
		const setup = setupOptions.find((option) => option.id === setupId);
		setForm((currentForm) => ({ ...currentForm, setupId, setup: setup?.name ?? '' }));
	}

	function updateAccount(accountId: string) {
		const account = plugin.settings.accounts.find((item) => item.id === accountId) ?? null;
		setRiskAuto(true);
		setForm((current) => ({
			...current,
			accountId,
			accountEquity: account ? String(account.currentBalance) : '',
			riskPct: '',
		}));
		plugin.settings.lastSelectedAccountId = accountId;
		void plugin.saveSettings();
	}

	function applyTargetRr() {
		const target = calculateTargetPriceForRr(form.side, form.entryPrice, form.stopLoss, plugin.settings.riskPolicy.targetR);
		if (target === null) {
			setError('برای محاسبه هدف، ابتدا Entry و Stop Loss معتبر وارد کن.');
			return;
		}
		setError('');
		updateField('takeProfit', String(target));
	}

	const handleSubmit = (event: SyntheticEvent<HTMLFormElement>) => {
		event.preventDefault();
		if (isSaving || isPastingImage || (isLiveJournal && isLoadingPlans && Boolean(form.planId))) return;
		void saveTrade();
	};

	const title = isEditing
		? isExecutionTradeClosed ? 'نهایی‌سازی و بازبینی معامله' : 'تکمیل معامله باز'
		: journalType === 'backtest' ? 'ثبت سریع بک‌تست' : 'ثبت سریع معامله';
	const subtitle = isEditing
		? isExecutionTradeClosed ? 'نتیجه، تصاویر خروج و Review را تکمیل کن؛ تمام اطلاعات روی همان رکورد می‌مانند.' : 'معامله هنوز باز است؛ اطلاعات ورود را ویرایش کن یا نتیجه را سریع ثبت کن.'
		: 'اول معامله را ثبت کن؛ نتیجه، ستاپ و جزئیات تکمیلی را می‌توانی بعداً کامل کنی.';
	const completionItems = [
		Boolean(form.accountId),
		Boolean(form.symbol),
		Boolean(form.timeframe),
		Boolean(form.openedAt),
		Boolean(form.entryPrice),
		Boolean(form.stopLoss),
		Boolean(form.takeProfit),
		Boolean(form.riskPct),
		Boolean(form.positionSize),
		Boolean(form.setupId),
		form.images.length >= 2,
	];
	const completion = Math.round(completionItems.filter(Boolean).length / completionItems.length * 100);

	return (
		<form
			className="trader-journal-modal trader-journal-form"
			onSubmit={handleSubmit}
			style={{ display: 'flex', flexDirection: 'column', width: '100%', height: '100%', minHeight: 0, gap: 0 }}
		>
			<div className="trader-journal-form__body" style={{ flex: '1 1 auto', minHeight: 0, overflowY: 'auto', padding: '4px 10px 24px' }}>
				<header className="khan-hero" style={{ borderRadius: 16, padding: '18px 20px' }}>
					<div className="khan-kicker">Journal 3.0 · سریع برای ثبت، عمیق برای بازبینی</div>
					<h2 style={{ marginTop: 6, marginBottom: 6 }}>{title}</h2>
					<p>{subtitle}</p>
					<div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 12 }}>
						<span className="trader-journal-plan-badge">{journalType === 'backtest' ? 'بک‌تست' : 'معامله زنده'}</span>
						<span className="trader-journal-plan-badge">{isExecutionTradeClosed ? 'بسته' : 'باز'}</span>
						<span className="trader-journal-plan-badge">{form.symbol || 'بدون نماد'}</span>
						<span className="trader-journal-plan-badge">تکمیل ژورنال: {completion}%</span>
						{selectedAccount ? <span className="trader-journal-plan-badge">{selectedAccount.name}</span> : null}
					</div>
				</header>

				{error ? <div className="trader-journal-form__error">{error}</div> : null}

				<TradeAccountFields
					plugin={plugin}
					accountId={form.accountId}
					selectedAccount={selectedAccount}
					evaluation={riskEvaluation}
					ruleWarnings={ruleWarnings}
					onAccountChange={updateAccount}
					onAccountsChanged={() => setAccountRevision((value) => value + 1)}
				/>

				<section className="trader-journal-review-form" style={{ borderRadius: 14 }}>
					<div className="trader-journal-review-form__header">
						<h3>۱) هویت و اجرای معامله</h3>
						<p>اطلاعاتی که در لحظه ورود واقعاً می‌دانی. معامله می‌تواند بدون نتیجه ذخیره شود و بعداً تکمیل گردد.</p>
					</div>
					<div className="trader-journal-form__grid">
						<TradeIdentityFields
							form={form}
							isEditing={isEditing}
							isLiveJournal={isLiveJournal}
							usesExecutionLifecycle={usesExecutionLifecycle}
							isExecutionTradeClosed={isExecutionTradeClosed}
							isLoadingPlans={isLoadingPlans}
							executionResult={executionResult}
							planOptions={planOptions}
							symbols={plugin.settings.symbols}
							timeframes={plugin.settings.timeframes}
							tr={tr}
							onPlanChange={updatePlan}
							onResultChange={(result) => updateField('result', result)}
							onSideChange={(side) => updateField('side', side)}
							onSymbolChange={updateSymbol}
							onTimeframeChange={(timeframe) => updateField('timeframe', timeframe)}
						/>
						<TradeExecutionFields
							form={form}
							holdingTime={holdingTime}
							isEditing={isEditing}
							isLiveJournal={isLiveJournal}
							usesExecutionLifecycle={usesExecutionLifecycle}
							isExecutionTradeClosed={isExecutionTradeClosed}
							executionRr={executionRr}
							plannedRr={plannedRr}
							targetR={plugin.settings.riskPolicy.targetR}
							tr={tr}
							onClosedAtChange={(value) => updateField('closedAt', value)}
							onEntryPriceChange={(value) => updateField('entryPrice', value)}
							onExitPriceChange={(value) => updateField('exitPrice', value)}
							onOpenedAtChange={updateOpenedAt}
							onRrChange={(value) => updateField('rr', value)}
							onStopLossChange={(value) => updateField('stopLoss', value)}
							onTakeProfitChange={(value) => updateField('takeProfit', value)}
							onApplyTargetRr={applyTargetRr}
						/>
					</div>
				</section>

				<section className="trader-journal-review-form" style={{ borderRadius: 14 }}>
					<div className="trader-journal-review-form__header">
						<h3>۲) ستاپ و طبقه‌بندی</h3>
						<p>ستاپ را از PDF انتخاب کن. اگر وقت نداری یا مطمئن نیستی، خالی بگذار و معامله را ثبت کن؛ بعداً تکمیلش کن.</p>
					</div>
					<div className="trader-journal-form__grid">
						<TradeSetupFields form={form} isLiveJournal={isLiveJournal} isLoadingSetups={isLoadingSetups} setupOptions={setupOptions} tr={tr}
							onSetupChange={updateSetup} onTagsChange={(tags) => updateField('tags', tags)} />
					</div>
				</section>

				<TradeRiskPsychologyFields
					form={form}
					accountLinked={Boolean(selectedAccount)}
					accountCurrency={selectedAccount?.currency ?? 'USD'}
					recommendedRiskPct={riskEvaluation?.recommendedRiskPct ?? null}
					onAccountEquityChange={(value) => updateField('accountEquity', value)}
					onRiskPctChange={(value) => { setRiskAuto(false); updateField('riskPct', value); }}
					onPositionSizeChange={(value) => updateField('positionSize', value)}
					onPositionUnitChange={(value) => updateField('positionUnit', value)}
					onSessionChange={(value) => updateField('session', value)}
					onMarketArrivalContextChange={(value) => updateField('marketArrivalContext', value)}
					onPreTradeEmotionChange={(value) => updateField('preTradeEmotion', value)}
					onUrgeToChaseChange={(value) => updateField('urgeToChase', value)}
				/>

				<TradeImageFields
					images={form.images}
					imageInput={imageInput}
					isKhanTrade={isKhanTrade}
					isPastingImage={isPastingImage}
					plugin={plugin}
					tr={tr}
					onImageInputChange={setImageInput}
					onImageInputKeyDown={handleImageInputKeyDown}
					onImagePaste={handleImagePaste}
					onRemoveImage={removeImage}
					onSelectImageFiles={selectImageFiles}
				/>

				<section className="trader-journal-review-form" style={{ borderRadius: 14 }}>
					<div className="trader-journal-review-form__header">
						<h3>یادداشت معامله</h3>
						<p>سناریو، چیزی که دیدی، دلیل ورود یا هر نکته‌ای که بعداً برای بازسازی تصمیم لازم است.</p>
					</div>
					<label className="trader-journal-field">
						<textarea value={form.notes} rows={5} placeholder="مثلاً: نقدینگی گرفته شد، واکنش روی POI دیدم، ورود بعد از تأیید..." onChange={(event: ChangeEvent<HTMLTextAreaElement>) => updateField('notes', event.target.value)} />
					</label>
				</section>

				{isExecutionTradeClosed ? <TradeReviewFields value={form.review} onChange={(review) => updateField('review', review)} tr={tr} /> : null}
			</div>

			<div style={{ flex: '0 0 auto', padding: '0 10px 6px', background: 'var(--background-primary)', borderTop: '1px solid var(--background-modifier-border)' }}>
				<TradeFormActions
					isCancelDisabled={isSaving || isPastingImage}
					isEditing={isEditing}
					isSaving={isSaving}
					isSubmittingDisabled={isSaving || isPastingImage || (isLiveJournal && isLoadingPlans && Boolean(form.planId))}
					tr={tr}
					onCancel={closeModal}
				/>
			</div>
		</form>
	);
}

function numericValue(value: unknown): number | null {
	const parsed = typeof value === 'number' ? value : typeof value === 'string' ? Number(value) : Number.NaN;
	return Number.isFinite(parsed) ? parsed : null;
}

function formatNumber(value: number): string {
	return Number(value.toFixed(4)).toString();
}
