import { parseTradeJson, stringifyValue } from './format';
import { TRADE_CODE_BLOCK_LANGUAGE } from './types';
import type { TradeEntry } from './types';

const TRADE_BLOCK_PATTERN = /```trader-journal-trade\s*\n([\s\S]*?)\n```/g;

export interface ReplaceTradeBlockResult {
	content: string;
	replaced: boolean;
}

export function renderTradeBlock(trade: TradeEntry): string {
	return `\`\`\`${TRADE_CODE_BLOCK_LANGUAGE}\n${JSON.stringify(trade, null, '\t')}\n\`\`\``;
}

export function replaceTradeBlockById(content: string, trade: TradeEntry): ReplaceTradeBlockResult {
	const tradeId = stringifyValue(trade.id);
	if (!tradeId) {
		return { content, replaced: false };
	}

	let replaced = false;
	const nextContent = content.replace(TRADE_BLOCK_PATTERN, (block, source: string) => {
		if (replaced) {
			return block;
		}

		const { trade: existingTrade } = parseTradeJson(source);
		if (stringifyValue(existingTrade?.id) !== tradeId) {
			return block;
		}

		replaced = true;
		return renderTradeBlock(trade);
	});

	return {
		content: nextContent,
		replaced,
	};
}
