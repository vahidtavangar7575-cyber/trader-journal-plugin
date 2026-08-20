import { stringifyValue } from '../trades/format';
import type { LinkedTradeRef } from './types';

export interface UpsertLinkedTradeResult {
	linkedTrades: LinkedTradeRef[];
	changed: boolean;
}

export function upsertLinkedTradeRef(
	existingRefs: LinkedTradeRef[],
	tradeRef: LinkedTradeRef,
): UpsertLinkedTradeResult {
	const tradeId = stringifyValue(tradeRef.trade_id);
	const filePath = stringifyValue(tradeRef.file_path);
	const normalizedRef: LinkedTradeRef = {
		trade_id: tradeId,
		file_path: filePath,
		label: stringifyValue(tradeRef.label),
	};
	const existingIndex = existingRefs.findIndex((existingRef) =>
		tradeId
			? stringifyValue(existingRef.trade_id) === tradeId
			: stringifyValue(existingRef.file_path) === filePath,
	);
	const existingRef = existingRefs[existingIndex];
	if (
		existingRef &&
		stringifyValue(existingRef.trade_id) === normalizedRef.trade_id &&
		stringifyValue(existingRef.file_path) === normalizedRef.file_path &&
		stringifyValue(existingRef.label) === normalizedRef.label
	) {
		return { linkedTrades: existingRefs, changed: false };
	}

	return {
		linkedTrades: existingIndex === -1
			? [...existingRefs, normalizedRef]
			: existingRefs.map((existingTradeRef, index) => index === existingIndex ? normalizedRef : existingTradeRef),
		changed: true,
	};
}
