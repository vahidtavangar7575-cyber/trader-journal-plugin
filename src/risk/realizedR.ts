import type { TradeSide } from '../trades/types';

export function calculateExitPriceFromR(
	side: TradeSide,
	entryPrice: string,
	stopLoss: string,
	realizedR: number,
): number | null {
	const entry = Number(entryPrice);
	const stop = Number(stopLoss);
	if (!Number.isFinite(entry) || entry <= 0 || !Number.isFinite(stop) || stop <= 0 || !Number.isFinite(realizedR)) return null;
	const risk = side === 'short' ? stop - entry : entry - stop;
	if (risk <= 0) return null;
	const exit = side === 'short' ? entry - risk * realizedR : entry + risk * realizedR;
	return Number.isFinite(exit) && exit > 0 ? Number(exit.toFixed(8)) : null;
}
