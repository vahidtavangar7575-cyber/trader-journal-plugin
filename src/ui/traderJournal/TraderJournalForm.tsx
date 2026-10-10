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
	isTradePlanOptionCompatible,
} from './form';
import type { TradeFormState } from './form';
import { getDateTimeDatePart, getTodayDateInput, syncClosedAtDate } from './dateTime';
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

	const isLiveTradeClosed = !isLiveJournal || Boolean(form.closedAt);
	const holdingTime = useMemo(() => calculateHoldingTime(form.openedAt, form.closedAt), [form.openedAt, form.closedAt]);
	const liveRr = useMemo(
		() => calculateLiveRr(
			form.side,
			form.entryPrice,
			form.stopLoss,
			isLiveTradeClosed ? form.exitPrice : form.takeProfit,
		),
		[form.entryPrice, form.exitPrice, form.side, form.stopLoss, form.takeProfit, isLiveTradeClosed],
	);
	const plannedRr = isLiveJournal
		? calculateLiveRr(form.side, form.entryPrice, form.stopLoss, form.takeProfit)
		: plugin.settings.riskPolicy.targetR;
	const liveResult = liveRr === null ? null : getTradeResultFromRr(liveRr);
	const actualRiskPct = numericValue(form.riskPct);
	const ruleWarnings = riskEvaluation
		? buildRiskRuleWarnings(riskEvaluation, actualRiskPct, plannedRr)
		: [];
	const tr = getTranslator(plugin.settings.language);
	const { isSaving, saveTrade } = useTradeSave({
		beginAttachmentCommit: beginCommit,
		closeModal,
		commitAttachments,
		failAttachmentCommit: failCommit,
		form,
		imageInput,
		initialTrade,
		isEditing,
		isLiveJournal,
		isLiveTradeClosed,
		isMounted,
		journalType,
		liveResult,
		liveRr,
		planOptions,
		plugin,
		riskEvaluation,
		ruleWarnings,
		setError,
		targetFilePath,
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
			closedAt:
				journalType === 'backtest'
					? syncClosedAtDate(openedAt, currentForm.openedAt, currentForm.closedAt)
					: currentForm.closedAt,
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

	return (
		<form className="trader-journal-modal trader-journal-form" onSubmit={handleSubmit}>
			<div className="trader-journal-form__body">
			<h2>{isEditing ? tr(isLiveJournal ? 'modal.editLiveTrade' : 'modal.editBacktestTrade') : isLiveJournal ? tr('modal.addLiveTrade') : tr('modal.addBacktestTrade')}</h2>
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

			<div className="trader-journal-form__grid">
				<TradeIdentityFields
					form={form}
					isEditing={isEditing}
					isLiveJournal={isLiveJournal}
					isLiveTradeClosed={isLiveTradeClosed}
					isLoadingPlans={isLoadingPlans}
					liveResult={liveResult}
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
					isLiveTradeClosed={isLiveTradeClosed}
					liveRr={liveRr}
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

			<TradeSetupFields form={form} isLiveJournal={isLiveJournal} isLoadingSetups={isLoadingSetups} setupOptions={setupOptions} tr={tr}
				onSetupChange={updateSetup} onTagsChange={(tags) => updateField('tags', tags)} />

			<TradeRiskPsychologyFields
				form={form}
				onAccountEquityChange={(value) => updateField('accountEquity', value)}
				onRiskPctChange={(value) => { setRiskAuto(false); updateField('riskPct', value); }}
				onPositionSizeChange={(value) => updateField('positionSize', value)}
				onPositionUnitChange={(value) => updateField('positionUnit', value)}
				onSessionChange={(value) => updateField('session', value)}
				onMarketArrivalContextChange={(value) => updateField('marketArrivalContext', value)}
				onPreTradeEmotionChange={(value) => updateField('preTradeEmotion', value)}
				onUrgeToChaseChange={(value) => updateField('urgeToChase', value)}
			/>

			{isKhanTrade ? (
				<section className="trader-journal-review-form">
					<div className="trader-journal-review-form__header"><h3>پروتکل تصویر معامله خان</h3><p>تصویرها باید تصمیم را بازسازی کنند، نه فقط نتیجه را زیبا نشان دهند.</p></div>
					<ol>
						<li><b>قبل از ورود — M15/HTF:</b> ساختار، POI، نقدینگی هدف، PDH/PDL یا Session context را کامل نشان بده.</li>
						<li><b>قبل از ورود — M1/LTF:</b> IDM/CHOCH/Flip/OF/SCOB، محل Entry، SL و Target را نشان بده.</li>
						<li><b>بعد از خروج — M1/LTF:</b> نقطه اجرای واقعی و علت خروج را ثبت کن.</li>
						<li><b>بعد از معامله — M15/HTF:</b> اختیاری ولی توصیه‌شده؛ نشان بده سناریوی بزرگ‌تر چگونه تمام شد.</li>
					</ol>
				</section>
			) : null}

			<TradeImageFields images={form.images} imageInput={imageInput} isPastingImage={isPastingImage} plugin={plugin} tr={tr}
				onImageInputChange={setImageInput} onImageInputKeyDown={handleImageInputKeyDown} onImagePaste={handleImagePaste} onRemoveImage={removeImage} />

			<label className="trader-journal-field">
				<span>{tr(isLiveJournal ? 'detail.executionNotes' : 'detail.notes')}</span>
				<textarea value={form.notes} rows={4} onChange={(event: ChangeEvent<HTMLTextAreaElement>) => updateField('notes', event.target.value)} />
			</label>

			{isLiveJournal && isLiveTradeClosed ? <TradeReviewFields value={form.review} onChange={(review) => updateField('review', review)} tr={tr} /> : null}
			</div>

			<TradeFormActions
				isCancelDisabled={isSaving || isPastingImage}
				isEditing={isEditing}
				isSaving={isSaving}
				isSubmittingDisabled={isSaving || isPastingImage || (isLiveJournal && isLoadingPlans && Boolean(form.planId))}
				tr={tr}
				onCancel={closeModal}
			/>
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
