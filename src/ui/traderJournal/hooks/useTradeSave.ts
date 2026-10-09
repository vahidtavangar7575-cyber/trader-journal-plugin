import { Notice, TFile } from 'obsidian';
import { useRef, useState } from 'react';
import type TraderJournalPlugin from '../../../main';
import { getTranslator } from '../../../i18n';
import type { TradePlanOption } from '../../../plans/types';
import { normalizeSymbol } from '../../../settings';
import { stringifyValue } from '../../../trades/format';
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
import { parseTradeTags, validateTradeForm } from '../form';
import type { TradeFormState } from '../form';
import { syncTradePlanLink } from '../planLink';

const KHAN_TRADE_FIELDS = [
	'khan_setup',
	'khan_risk_pct',
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
		const trade = createTradeEntry({
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
				if (!(saveError instanceof TradePostSaveError)) {
					throw saveError;
				}

				commitAttachments();
				console.error('Trader Journal saved the trade but failed during post-save processing', saveError.originalError);
				new Notice(tr('notice.savedTradePostProcessFailed', { path: saveError.file.path }));
				if (isMounted()) {
					closeModal();
				}
				return;
			}

			commitAttachments();
			if (isLiveJournal) {
				try {
					await syncTradePlanLink(plugin, initialTrade, trade, file.path);
				} catch (planLinkError) {
					console.error('Trader Journal saved the trade but failed to synchronize its plan link', planLinkError);
					new Notice(tr('notice.savedTradePlanSyncFailed', { path: file.path }));
					if (isMounted()) {
						closeModal();
					}
					return;
				}
			}

			new Notice(tr(isEditing ? 'notice.updatedTrade' : 'notice.savedTrade', { path: file.path }));
			if (isMounted()) {
				closeModal();
			}
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
	};
	copyKhanTradeMetadata(args.initialTrade, trade);

	if (args.isLiveJournal && form.planId) {
		trade.plan_id = form.planId;
	}
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
	if (args.isLiveTradeClosed) {
		trade.review = buildTradeReview(form.review, getCurrentLocalIsoString());
	}
	return trade;
}

function copyKhanTradeMetadata(source: TradeEntry | undefined, target: TradeEntry): void {
	if (!source) {
		return;
	}
	for (const field of KHAN_TRADE_FIELDS) {
		const value = source[field];
		if (value !== undefined) {
			target[field] = value;
		}
	}
}
