export interface FxPair {
	base: string;
	quote: string;
}

export interface FxPositionSizingInput {
	symbol: string;
	accountCurrency: string;
	equity: number;
	riskPct: number;
	entryPrice: number;
	stopLoss: number;
	conversionRate?: number | null;
	lotStep?: number;
	contractSize?: number;
}

export interface FxPositionSizingResult {
	pair: FxPair;
	accountCurrency: string;
	riskAmount: number;
	priceDistance: number;
	pipSize: number;
	stopDistancePips: number;
	quoteToAccountRate: number;
	conversionSource: 'quote-account' | 'base-account' | 'online-cross';
	pipValuePerLot: number;
	riskPerLot: number;
	rawLots: number;
	lots: number;
	units: number;
	actualRiskAmount: number;
	actualRiskPct: number;
	lotStep: number;
}

export type FxPositionSizingPreparation =
	| { kind: 'ready'; conversionRate: number; conversionSource: 'quote-account' | 'base-account' }
	| { kind: 'needs-online-rate'; fromCurrency: string; toCurrency: string }
	| { kind: 'invalid'; reason: string };

const DEFAULT_CONTRACT_SIZE = 100_000;
const DEFAULT_LOT_STEP = 0.01;

export function parseFxPair(symbol: string): FxPair | null {
	const normalized = symbol.toUpperCase().replace(/[^A-Z]/g, '');
	if (normalized.length !== 6) return null;
	return { base: normalized.slice(0, 3), quote: normalized.slice(3, 6) };
}

export function prepareFxPositionSizing(
	symbol: string,
	accountCurrency: string,
	stopLoss: number,
): FxPositionSizingPreparation {
	const pair = parseFxPair(symbol);
	if (!pair) return { kind: 'invalid', reason: 'برای محاسبه خودکار حجم، Symbol باید یک جفت‌ارز ۶ حرفی مثل EURUSD یا EUR/USD باشد.' };
	const account = accountCurrency.trim().toUpperCase();
	if (!/^[A-Z]{3}$/.test(account)) return { kind: 'invalid', reason: 'ارز حساب باید کد سه‌حرفی مثل USD یا EUR باشد.' };
	if (!Number.isFinite(stopLoss) || stopLoss <= 0) return { kind: 'invalid', reason: 'Stop Loss معتبر لازم است.' };

	if (pair.quote === account) {
		return { kind: 'ready', conversionRate: 1, conversionSource: 'quote-account' };
	}
	if (pair.base === account) {
		return { kind: 'ready', conversionRate: 1 / stopLoss, conversionSource: 'base-account' };
	}
	return { kind: 'needs-online-rate', fromCurrency: pair.quote, toCurrency: account };
}

export function calculateFxPositionSize(input: FxPositionSizingInput): FxPositionSizingResult | null {
	const pair = parseFxPair(input.symbol);
	if (!pair) return null;
	const accountCurrency = input.accountCurrency.trim().toUpperCase();
	const equity = finitePositive(input.equity);
	const riskPct = finitePositive(input.riskPct);
	const entryPrice = finitePositive(input.entryPrice);
	const stopLoss = finitePositive(input.stopLoss);
	const contractSize = finitePositive(input.contractSize ?? DEFAULT_CONTRACT_SIZE);
	const lotStep = finitePositive(input.lotStep ?? DEFAULT_LOT_STEP);
	if (!equity || !riskPct || !entryPrice || !stopLoss || !contractSize || !lotStep) return null;

	const priceDistance = Math.abs(entryPrice - stopLoss);
	if (priceDistance <= 0) return null;

	let quoteToAccountRate: number;
	let conversionSource: FxPositionSizingResult['conversionSource'];
	if (pair.quote === accountCurrency) {
		quoteToAccountRate = 1;
		conversionSource = 'quote-account';
	} else if (pair.base === accountCurrency) {
		quoteToAccountRate = 1 / stopLoss;
		conversionSource = 'base-account';
	} else {
		const external = finitePositive(input.conversionRate ?? 0);
		if (!external) return null;
		quoteToAccountRate = external;
		conversionSource = 'online-cross';
	}

	const riskAmount = equity * riskPct / 100;
	const riskPerLot = priceDistance * contractSize * quoteToAccountRate;
	if (!Number.isFinite(riskPerLot) || riskPerLot <= 0) return null;
	const rawLots = riskAmount / riskPerLot;
	const lots = floorToStep(rawLots, lotStep);
	if (!Number.isFinite(lots) || lots <= 0) return null;
	const units = lots * contractSize;
	const actualRiskAmount = lots * riskPerLot;
	const pipSize = pair.quote === 'JPY' ? 0.01 : 0.0001;
	const stopDistancePips = priceDistance / pipSize;
	const pipValuePerLot = contractSize * pipSize * quoteToAccountRate;

	return {
		pair,
		accountCurrency,
		riskAmount: roundMoney(riskAmount),
		priceDistance,
		pipSize,
		stopDistancePips: round4(stopDistancePips),
		quoteToAccountRate: round8(quoteToAccountRate),
		conversionSource,
		pipValuePerLot: roundMoney(pipValuePerLot),
		riskPerLot: roundMoney(riskPerLot),
		rawLots: round8(rawLots),
		lots: round8(lots),
		units: Math.round(units),
		actualRiskAmount: roundMoney(actualRiskAmount),
		actualRiskPct: round4(actualRiskAmount / equity * 100),
		lotStep,
	};
}

function finitePositive(value: number): number | null {
	return Number.isFinite(value) && value > 0 ? value : null;
}

function floorToStep(value: number, step: number): number {
	const precision = Math.min(8, decimalPlaces(step));
	const floored = Math.floor((value + Number.EPSILON) / step) * step;
	return Number(floored.toFixed(precision));
}

function decimalPlaces(value: number): number {
	const text = value.toString();
	const exponentMatch = text.match(/e-(\d+)$/i);
	if (exponentMatch?.[1]) return Number(exponentMatch[1]);
	return text.includes('.') ? text.split('.')[1]?.length ?? 0 : 0;
}

function roundMoney(value: number): number {
	return Number(value.toFixed(2));
}

function round4(value: number): number {
	return Number(value.toFixed(4));
}

function round8(value: number): number {
	return Number(value.toFixed(8));
}
