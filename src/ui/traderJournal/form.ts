import type { TradePlanOption } from '../../plans/types';
import { normalizeSymbol } from '../../settings';
import { formatTags, normalizeTradeImages, stringifyValue } from '../../trades/format';
import { calculateHoldingTime } from '../../trades/storage';
import type {
	TradeEntry,
	TradeImage,
	TradeJournalType,
	TradeResult,
	TradeSide,
} from '../../trades/types';
import type TraderJournalPlugin from '../../main';
import type { Translator } from '../../i18n';
import { createTradeReviewFormState } from '../TradeReviewFields';
import type { TradeReviewFormState } from '../TradeReviewFields';
import { getDateTimeDatePart, toDateTimeLocalInput } from './dateTime';

const DATE_KEY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export interface TradeFormState {
	symbol: string;
	planId: string;
	setupId: string;
	side: TradeSide;
	setup: string;
	timeframe: string;
	result: TradeResult;
	rr: string;
	tags: string;
	entryPrice: string;
	stopLoss: string;
	exitPrice: string;
	takeProfit: string;
	images: TradeImage[];
	notes: string;
	openedAt: string;
	closedAt: string;
	review: TradeReviewFormState;
}

export function createInitialTradeForm(
	plugin: TraderJournalPlugin,
	initialTrade: TradeEntry | undefined,
): TradeFormState {
	return {
		symbol: stringifyValue(initialTrade?.symbol) || plugin.settings.symbols[0] || '',
		planId: stringifyValue(initialTrade?.plan_id),
		setupId: stringifyValue(initialTrade?.setup_id),
		side: initialTrade?.side === 'short' ? 'short' : 'long',
		setup: stringifyValue(initialTrade?.setup),
		timeframe: stringifyValue(initialTrade?.timeframe) || plugin.settings.timeframes[0] || '',
		result: initialTrade?.result ?? 'win',
		rr: stringifyValue(initialTrade?.rr),
		tags: formatTradeTagsInput(initialTrade?.tags),
		entryPrice: stringifyValue(initialTrade?.entry_price),
		stopLoss: stringifyValue(initialTrade?.stop_loss),
		exitPrice: stringifyValue(initialTrade?.exit_price),
		takeProfit: stringifyValue(initialTrade?.take_profit),
		images: normalizeTradeImages(initialTrade?.images),
		notes: stringifyValue(initialTrade?.notes),
		openedAt: toDateTimeLocalInput(initialTrade?.opened_at),
		closedAt: toDateTimeLocalInput(initialTrade?.closed_at),
		review: createTradeReviewFormState(initialTrade?.review),
	};
}

export function formatTradeTagsInput(value: unknown): string {
	return formatTags(value).join(', ');
}

export function parseTradeTags(value: string): string[] {
	return [...new Set(
		value
			.split(',')
			.map((tag) => tag.trim().replace(/^#/, ''))
			.filter(Boolean),
	)];
}

export function isTradePlanOptionCompatible(
	plan: TradePlanOption,
	symbol: string,
	date: string,
): boolean {
	const normalizedSymbol = normalizeSymbol(symbol);
	if (!normalizedSymbol || normalizeSymbol(plan.symbol) !== normalizedSymbol) {
		return false;
	}

	if (!DATE_KEY_PATTERN.test(date) || !DATE_KEY_PATTERN.test(plan.startDate) || date < plan.startDate) {
		return false;
	}

	return !plan.endDate || date <= plan.endDate;
}

export function validateTradeForm(
	form: TradeFormState,
	journalType: TradeJournalType,
	tr: Translator,
	planOptions: TradePlanOption[],
): string | null {
	if (!normalizeSymbol(form.symbol)) {
		return tr('error.symbolRequired');
	}

	if (!form.timeframe) {
		return tr('error.timeframeRequired');
	}

	if (!form.setupId || !form.setup.trim()) {
		return tr('error.setupRequired');
	}

	const rr = Number(form.rr);
	if (journalType === 'backtest' && !Number.isFinite(rr)) {
		return tr('error.rrNumber');
	}

	if (journalType === 'live') {
		const isClosed = Boolean(form.closedAt);
		const entryPrice = parseRequiredNumber(form.entryPrice);
		const stopLoss = parseRequiredNumber(form.stopLoss);
		const takeProfit = parseRequiredNumber(form.takeProfit);

		if (entryPrice === null) {
			return tr('error.entryPriceNumber');
		}

		if (stopLoss === null) {
			return tr('error.stopLossNumber');
		}

		if (takeProfit === null) {
			return tr('error.takeProfitNumber');
		}

		if (form.side === 'long' && stopLoss >= entryPrice) {
			return tr('error.longStopBelow');
		}

		if (form.side === 'long' && takeProfit <= entryPrice) {
			return tr('error.longTakeAbove');
		}

		if (form.side === 'short' && stopLoss <= entryPrice) {
			return tr('error.shortStopAbove');
		}

		if (form.side === 'short' && takeProfit >= entryPrice) {
			return tr('error.shortTakeBelow');
		}

		if (isClosed) {
			const exitPrice = parseRequiredNumber(form.exitPrice);
			if (exitPrice === null) {
				return tr('error.exitPriceNumber');
			}

			if (calculateLiveRr(form.side, form.entryPrice, form.stopLoss, form.exitPrice) === null) {
				return tr('error.liveRrRisk');
			}
		}
	}

	if (!form.openedAt || (journalType === 'backtest' && !form.closedAt)) {
		return tr('error.openedClosedRequired');
	}

	if (form.closedAt && calculateHoldingTime(form.openedAt, form.closedAt) === null) {
		return tr('error.closedAfterOpened');
	}

	if (journalType === 'live' && form.planId) {
		const plan = planOptions.find((option) => option.id === form.planId);
		if (!plan) {
			return tr('error.planUnavailable');
		}

		if (normalizeSymbol(plan.symbol) !== normalizeSymbol(form.symbol)) {
			return tr('error.planSymbolMismatch');
		}

		const journalDate = getDateTimeDatePart(form.openedAt);
		if (!isTradePlanOptionCompatible(plan, form.symbol, journalDate)) {
			return tr('error.planDateMismatch');
		}
	}

	return null;
}

export function calculateLiveRr(
	side: TradeSide,
	entryPrice: string,
	stopLoss: string,
	targetPrice: string,
): number | null {
	const entry = parseRequiredNumber(entryPrice);
	const stop = parseRequiredNumber(stopLoss);
	const target = parseRequiredNumber(targetPrice);
	if (entry === null || stop === null || target === null) {
		return null;
	}

	const risk = side === 'short' ? stop - entry : entry - stop;
	if (risk <= 0) {
		return null;
	}

	const priceMove = side === 'short' ? entry - target : target - entry;
	return roundNumber(priceMove / risk);
}

export function getTradeResultFromRr(rr: number): TradeResult {
	if (rr > 0) {
		return 'win';
	}

	if (rr < 0) {
		return 'loss';
	}

	return 'breakeven';
}

export function formatComputedRr(value: number): string {
	return Number.isInteger(value) ? String(value) : value.toFixed(2).replace(/0+$/, '').replace(/\.$/, '');
}

function parseRequiredNumber(value: string): number | null {
	if (!value.trim()) {
		return null;
	}

	const parsed = Number(value);
	return Number.isFinite(parsed) ? parsed : null;
}

function roundNumber(value: number): number {
	return Number(value.toFixed(2));
}
