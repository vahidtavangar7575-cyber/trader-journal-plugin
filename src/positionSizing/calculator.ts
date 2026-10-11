import type { InstrumentProfile } from './instruments';

export interface PositionSizingInput {
	profile: InstrumentProfile;
	entryPrice: number;
	stopLoss: number;
	equity: number;
	riskPct: number;
	quoteToAccountRate: number;
	contractSizeOverride?: number | null;
}

export interface PositionSizingResult {
	riskAmount: number;
	priceDistance: number;
	distanceUnits: number;
	contractSize: number;
	pipValuePerLotQuote: number;
	pipValuePerLotAccount: number;
	lossPerLotAccount: number;
	rawVolume: number;
	recommendedVolume: number;
	actualRiskAmountAtRoundedVolume: number;
	actualRiskPctAtRoundedVolume: number;
	quoteToAccountRate: number;
}

export function calculatePositionSize(input: PositionSizingInput): PositionSizingResult | null {
	const { profile } = input;
	const entry = finitePositive(input.entryPrice);
	const stop = finitePositive(input.stopLoss);
	const equity = finitePositive(input.equity);
	const riskPct = finitePositive(input.riskPct);
	const conversion = finitePositive(input.quoteToAccountRate);
	const contractSize = finitePositive(input.contractSizeOverride) ?? profile.contractSize;
	if (entry === null || stop === null || equity === null || riskPct === null || conversion === null || contractSize <= 0) {
		return null;
	}
	const priceDistance = Math.abs(entry - stop);
	if (priceDistance <= 0 || profile.pipSize <= 0 || profile.volumeStep <= 0) return null;
	const riskAmount = equity * riskPct / 100;
	const distanceUnits = priceDistance / profile.pipSize;
	const pipValuePerLotQuote = profile.pipSize * contractSize;
	const pipValuePerLotAccount = pipValuePerLotQuote * conversion;
	const lossPerLotAccount = priceDistance * contractSize * conversion;
	if (lossPerLotAccount <= 0) return null;
	const rawVolume = riskAmount / lossPerLotAccount;
	const recommendedVolume = floorToStep(rawVolume, profile.volumeStep, profile.maxVolume);
	const actualRiskAmountAtRoundedVolume = recommendedVolume * lossPerLotAccount;
	const actualRiskPctAtRoundedVolume = equity > 0 ? actualRiskAmountAtRoundedVolume / equity * 100 : 0;
	return {
		riskAmount: round(riskAmount, 8),
		priceDistance: round(priceDistance, 10),
		distanceUnits: round(distanceUnits, 4),
		contractSize: round(contractSize, 8),
		pipValuePerLotQuote: round(pipValuePerLotQuote, 8),
		pipValuePerLotAccount: round(pipValuePerLotAccount, 8),
		lossPerLotAccount: round(lossPerLotAccount, 8),
		rawVolume: round(rawVolume, 8),
		recommendedVolume: round(recommendedVolume, stepDecimals(profile.volumeStep)),
		actualRiskAmountAtRoundedVolume: round(actualRiskAmountAtRoundedVolume, 8),
		actualRiskPctAtRoundedVolume: round(actualRiskPctAtRoundedVolume, 6),
		quoteToAccountRate: conversion,
	};
}

export function floorToStep(value: number, step: number, max: number): number {
	if (!Number.isFinite(value) || value <= 0 || !Number.isFinite(step) || step <= 0) return 0;
	const capped = Math.min(value, Number.isFinite(max) && max > 0 ? max : value);
	const precision = stepDecimals(step);
	const factor = 10 ** precision;
	const stepUnits = Math.round(step * factor);
	const valueUnits = Math.floor((capped * factor + 1e-9) / stepUnits) * stepUnits;
	return valueUnits / factor;
}

export function stepDecimals(step: number): number {
	const text = String(step);
	if (!text.includes('.')) return 0;
	return text.split('.')[1]?.length ?? 0;
}

function finitePositive(value: unknown): number | null {
	const parsed = typeof value === 'number' ? value : Number(value);
	return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function round(value: number, decimals: number): number {
	return Number(value.toFixed(decimals));
}
