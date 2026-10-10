import { Notice, TFile } from 'obsidian';
import { useRef, useState } from 'react';
import type TraderJournalPlugin from '../../../main';
import { getTranslator } from '../../../i18n';
import type { TradePlanOption } from '../../../plans/types';
import { normalizeSymbol } from '../../../settings';
import { stringifyValue } from '../../../trades/format';
import { previewAccountLedger } from '../../../accounts/ledger';
import type { RiskPolicyEvaluation } from '../../../risk/policy';
import {
	calculateHoldingTime,
	createTradeId,
	saveTradeToDailyNote,
	TradePostSaveError,
	updateTradeInJournalFile,
} from '../../../trades/storage';
import type { TradeEntry, TradeJournalType, TradeResult } from '../../../trades/types';
import { buildTradeReview } from '../../TradeReviewFields';
import {
	getCurrentLocalIsoString,
	getDateTimeDatePart,
	getTodayDateInput,
	toLocalIsoString,
} from '../dateTime';
import { createTradeImage } from '../images';
import { calculateRiskAmount, parseTradeTags, validateTradeForm } from '../form';
import type { TradeFormState } from '../form';
import { syncTradePlanLink } from '../planLink';

const KHAN_TRADE_FIELDS = [
	'khan_setup',
	'khan_risk_pct',
	'khan_approved_risk_pct',
	'khan_rule_version',
	'khan_result_page',
	'khan_source_pages',
	'khan_decision_path',
] as const;

interface UseTradeSaveArgs {
	beginAttachmentCommit: () => void;
	closeModal: () => void;
	commitAttachments: () => void;
	failAttachmentCommit: () => Promise<void>;
	form: TradeFormState;
	imageInput: string;
	initialTrade: TradeEntry | undefined;
	isEditing: boolean;
	isLiveJournal: boolean;
	isLiveTradeClosed: boolean;
	isMounted: () => boolean;
	journalType: TradeJournalType;
	liveResult: TradeResult | null;
	liveRr: number | null;
	planOptions: TradePlanOption[];
	plugin: TraderJournalPlugin;
	riskEvaluation: RiskPolicyEvaluation | null;
	ruleWarnings: string[];
	setError: (error: string) => void;
	targetFilePath: string | undefined;
}

interface TradeSaveController {
	isSaving: boolean;
	saveTrade: () => Promise<void>;
}

export function useTradeSave({
	beginAttachmentCommit,
	closeModal,
	commitAttachments,
	failAttachmentCommit,
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
}: UseTradeSaveArgs): TradeSaveController {
	const [isSaving, setIsSaving] = useState(false);
	const tradeIdRef = useRef(stringifyValue(initialTrade?.id));
	const tr = getTranslator(plugin.settings.language);

	async function saveTrade() {
		const validationError = validateTradeForm(form, journalType, tr, planOptions);
		if (validationError) {
			setError(validationError);
			return;
		}

		const symbol = normalizeSymbol(form.symbol);
		const openedAt = toLocalIsoString(form.openedAt);
		const journalDate = getDateTimeDatePart(form.openedAt) || getTodayDateInput();
		const closedAt = isLiveTradeClosed ? toLocalIsoString(form.closedAt) : '';
		const rr = isLiveJournal ? liveRr : Number(form.rr);
		if (rr === null) {
			setError(tr('error.liveRrRisk'));
			return;
		}

		if (!tradeIdRef.current) {
			tradeIdRef.current = createTradeId(symbol, openedAt, journalDate);
		}
		const baseTrade = createTradeEntry({
			form,
			imageInput,
			initialTrade,
			isLiveJournal,
			isLiveTradeClosed,
			journalType,
			liveResult,
			openedAt,
			closedAt,
			rr,
			symbol,
			tradeId: tradeIdRef.current,
		});
		const ledger = previewAccountLedger(plugin.settings.accounts, initialTrade, baseTrade);
		const trade = attachRiskPolicyMetadata(ledger.trade, riskEvaluation, ruleWarnings);

		const persistLedger = async () => {
			plugin.settings.accounts = ledger.accounts;
			if (form.accountId) plugin.settings.lastSelectedAccountId = form.accountId;
			await plugin.saveSettings();
		};

		try {
			setIsSaving(true);
			setError('');
			beginAttachmentCommit();
			let file: TFile;
			try {
				file = isEditing && targetFilePath
					? await updateTradeInJournalFile(plugin, targetFilePath, trade)
					: await saveTradeToDailyNote(plugin, journalDate, trade);
			} catch (saveError) {
				if (!(saveError instanceof TradePostSaveError)) throw saveError;
				commitAttachments();
				await persistLedger();
				console.error('Trader Journal saved the trade but failed during post-save processing', saveError.originalError);
				new Notice(tr('notice.savedTradePostProcessFailed', { path: saveError.file.path }));
				if (isMounted()) closeModal();
				return;
			}

			commitAttachments();
			await persistLedger();
			if (isLiveJournal) {
				try {
					await syncTradePlanLink(plugin, initialTrade, trade, file.path);
				} catch (planLinkError) {
					console.error('Trader Journal saved the trade but failed to synchronize its plan link', planLinkError);
					new Notice(tr('notice.savedTradePlanSyncFailed', { path: file.path }));
					if (isMounted()) closeModal();
					return;
				}
			}

			new Notice(tr(isEditing ? 'notice.updatedTrade' : 'notice.savedTrade', { path: file.path }));
			if (ruleWarnings.length > 0) {
				new Notice(`معامله ذخیره شد، اما ${ruleWarnings.length} تخطی از قواعد مدیریت سرمایه نیز ثبت شد.`);
			}
			if (isMounted()) closeModal();
		} catch (saveError) {
			await failAttachmentCommit();
			if (isMounted()) {
				setError(saveError instanceof Error ? saveError.message : tr('error.couldNotSaveTrade'));
				setIsSaving(false);
			}
		}
	}

	return { isSaving, saveTrade };
}

interface CreateTradeEntryArgs {
	closedAt: string;
	form: TradeFormState;
	imageInput: string;
	initialTrade: TradeEntry | undefined;
	isLiveJournal: boolean;
	isLiveTradeClosed: boolean;
	journalType: TradeJournalType;
	liveResult: TradeResult | null;
	openedAt: string;
	rr: number;
	symbol: string;
	tradeId: string;
}

function createTradeEntry(args: CreateTradeEntryArgs): TradeEntry {
	const { form } = args;
	const pendingImage = createTradeImage(args.imageInput);
	const images = pendingImage && !form.images.some((image) => image.value === pendingImage.value)
		? [...form.images, pendingImage]
		: form.images;
	const computedRiskAmount = calculateRiskAmount(form.accountEquity, form.riskPct);
	const trade: TradeEntry = {
		schemaVersion: 1,
		id: args.tradeId,
		date: stringifyValue(args.initialTrade?.date) || getCurrentLocalIsoString(),
		journal_type: args.journalType,
		symbol: args.symbol,
		side: form.side,
		setup_id: form.setupId || undefined,
		setup: form.setup.trim(),
		timeframe: form.timeframe,
		rr: args.rr,
		images,
		notes: form.notes.trim(),
		opened_at: args.openedAt,
		...(form.accountId ? { account_id: form.accountId } : {}),
		...(form.accountEquity.trim() ? { account_equity: Number(form.accountEquity) } : {}),
		...(form.riskPct.trim() ? { risk_pct: Number(form.riskPct) } : {}),
		...(computedRiskAmount !== null ? { risk_amount: computedRiskAmount } : {}),
		...(form.positionSize.trim() ? { position_size: Number(form.positionSize) } : {}),
		position_unit: form.positionUnit,
		session: form.session,
		...(form.marketArrivalContext ? { market_arrival_context: form.marketArrivalContext } : {}),
		pre_trade_emotion: form.preTradeEmotion,
		...(form.urgeToChase.trim() ? { urge_to_chase: Number(form.urgeToChase) } : {}),
	};
	copyKhanTradeMetadata(args.initialTrade, trade);

	if (args.isLiveJournal && form.planId) trade.plan_id = form.planId;
	if (!args.isLiveJournal) {
		trade.result = form.result;
		trade.closed_at = args.closedAt;
		trade.holding_time = calculateHoldingTime(args.openedAt, args.closedAt);
		trade.tags = parseTradeTags(form.tags);
		return trade;
	}

	trade.status = args.isLiveTradeClosed ? 'closed' : 'open';
	trade.entry_price = Number(form.entryPrice);
	trade.stop_loss = Number(form.stopLoss);
	trade.take_profit = Number(form.takeProfit);
	if (args.isLiveTradeClosed && args.liveResult) {
		trade.result = args.liveResult;
		trade.closed_at = args.closedAt;
		trade.exit_price = Number(form.exitPrice);
		trade.holding_time = calculateHoldingTime(args.openedAt, args.closedAt);
	}
	if (args.isLiveTradeClosed) trade.review = buildTradeReview(form.review, getCurrentLocalIsoString());
	return trade;
}

function attachRiskPolicyMetadata(
	trade: TradeEntry,
	evaluation: RiskPolicyEvaluation | null,
	warnings: string[],
): TradeEntry {
	if (!evaluation) return trade;
	return {
		...trade,
		risk_rule_trade_number: evaluation.tradeNumber,
		risk_rule_recommended_pct: evaluation.recommendedRiskPct,
		risk_rule_day_base_pct: evaluation.dayBaseRiskPct,
		risk_rule_week_base_pct: evaluation.weekBaseRiskPct,
		risk_rule_violation: warnings.length > 0,
		...(warnings.length ? { risk_rule_warnings: warnings } : {}),
	};
}

function copyKhanTradeMetadata(source: TradeEntry | undefined, target: TradeEntry): void {
	if (!source) return;
	for (const field of KHAN_TRADE_FIELDS) {
		const value = source[field];
		if (value !== undefined) target[field] = value;
	}
}
