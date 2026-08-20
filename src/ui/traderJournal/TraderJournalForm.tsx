import { useMemo, useState } from 'react';
import type { ChangeEvent, SyntheticEvent } from 'react';
import type TraderJournalPlugin from '../../main';
import { normalizeSymbol } from '../../settings';
import { getTranslator } from '../../i18n';
import { stringifyValue } from '../../trades/format';
import { calculateHoldingTime } from '../../trades/storage';
import type { TradeEntry, TradeJournalType } from '../../trades/types';
import { isSetupAvailableForSymbol } from '../../setups/storage';
import { TradeReviewFields } from '../TradeReviewFields';
import {
	calculateLiveRr,
	createInitialTradeForm,
	getTradeResultFromRr,
	isTradePlanOptionCompatible,
} from './form';
import type { TradeFormState } from './form';
import { getDateTimeDatePart, getTodayDateInput, syncClosedAtDate } from './dateTime';
import { TradeExecutionFields } from './components/TradeExecutionFields';
import { TradeFormActions } from './components/TradeFormActions';
import { TradeIdentityFields } from './components/TradeIdentityFields';
import { TradeImageFields } from './components/TradeImageFields';
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
	const [form, setForm] = useState<TradeFormState>(() => createInitialTradeForm(plugin, initialTrade));
	const [error, setError] = useState('');

	const isLiveJournal = journalType === 'live';
	const isEditing = Boolean(initialTrade && targetFilePath);
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
	const isLiveTradeClosed = !isLiveJournal || Boolean(form.closedAt);
	const holdingTime = useMemo(() => calculateHoldingTime(form.openedAt, form.closedAt), [form.openedAt, form.closedAt]);
	const liveRr = useMemo(
		() =>
			calculateLiveRr(
				form.side,
				form.entryPrice,
				form.stopLoss,
				isLiveTradeClosed ? form.exitPrice : form.takeProfit,
			),
		[form.entryPrice, form.exitPrice, form.side, form.stopLoss, form.takeProfit, isLiveTradeClosed],
	);
	const liveResult = liveRr === null ? null : getTradeResultFromRr(liveRr);
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
		setError,
		targetFilePath,
	});

	function updateField<K extends keyof TradeFormState>(field: K, value: TradeFormState[K]) {
		setForm((currentForm) => ({
			...currentForm,
			[field]: value,
		}));
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
			const planId =
				isLiveJournal && !isEditing && currentForm.planId &&
				!isSelectedPlanCompatible(currentForm.planId, symbol, currentForm.openedAt)
					? ''
					: currentForm.planId;
			const keepHistoricalSetup =
				isEditing &&
				normalizeSymbol(symbol) === normalizeSymbol(stringifyValue(initialTrade?.symbol)) &&
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
			: setupOptions.find(
					(setup) => setup.name.toLocaleLowerCase() === plan?.setup.toLocaleLowerCase(),
				);
		setForm((currentForm) => ({
			...currentForm,
			planId,
			setupId: plan ? matchingSetup?.id ?? plan.setupId : currentForm.setupId,
			setup: plan ? matchingSetup?.name ?? plan.setup : currentForm.setup,
		}));
	}

	function updateSetup(setupId: string) {
		const setup = setupOptions.find((option) => option.id === setupId);
		setForm((currentForm) => ({
			...currentForm,
			setupId,
			setup: setup?.name ?? '',
		}));
	}

	const handleSubmit = (event: SyntheticEvent<HTMLFormElement>) => {
		event.preventDefault();
		if (isSaving || isPastingImage || (isLiveJournal && isLoadingPlans && Boolean(form.planId))) {
			return;
		}

		void saveTrade();
	};

	return (
		<form className="trader-journal-modal trader-journal-form" onSubmit={handleSubmit}>
			<div className="trader-journal-form__body">
			<h2>
				{isEditing
					? tr(isLiveJournal ? 'modal.editLiveTrade' : 'modal.editBacktestTrade')
					: isLiveJournal
						? tr('modal.addLiveTrade')
						: tr('modal.addBacktestTrade')}
			</h2>

			{error ? <div className="trader-journal-form__error">{error}</div> : null}

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
					tr={tr}
					onClosedAtChange={(value) => updateField('closedAt', value)}
					onEntryPriceChange={(value) => updateField('entryPrice', value)}
					onExitPriceChange={(value) => updateField('exitPrice', value)}
					onOpenedAtChange={updateOpenedAt}
					onRrChange={(value) => updateField('rr', value)}
					onStopLossChange={(value) => updateField('stopLoss', value)}
					onTakeProfitChange={(value) => updateField('takeProfit', value)}
				/>
			</div>

			<TradeSetupFields
				form={form}
				isLiveJournal={isLiveJournal}
				isLoadingSetups={isLoadingSetups}
				setupOptions={setupOptions}
				tr={tr}
				onSetupChange={updateSetup}
				onTagsChange={(tags) => updateField('tags', tags)}
			/>

			<TradeImageFields
				images={form.images}
				imageInput={imageInput}
				isPastingImage={isPastingImage}
				plugin={plugin}
				tr={tr}
				onImageInputChange={setImageInput}
				onImageInputKeyDown={handleImageInputKeyDown}
				onImagePaste={handleImagePaste}
				onRemoveImage={removeImage}
			/>

			<label className="trader-journal-field">
				<span>{tr(isLiveJournal ? 'detail.executionNotes' : 'detail.notes')}</span>
				<textarea
					value={form.notes}
					rows={4}
					onChange={(event: ChangeEvent<HTMLTextAreaElement>) => updateField('notes', event.target.value)}
				/>
			</label>

			{isLiveJournal && isLiveTradeClosed ? (
				<TradeReviewFields
					value={form.review}
					onChange={(review) => updateField('review', review)}
					tr={tr}
				/>
			) : null}

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
