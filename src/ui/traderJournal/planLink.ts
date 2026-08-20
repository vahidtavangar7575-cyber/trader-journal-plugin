import type TraderJournalPlugin from '../../main';
import { linkTradeToPlan, unlinkTradeFromPlan } from '../../plans/storage';
import { stringifyValue } from '../../trades/format';
import type { TradeEntry } from '../../trades/types';

export async function syncTradePlanLink(
	plugin: TraderJournalPlugin,
	initialTrade: TradeEntry | undefined,
	trade: TradeEntry,
	filePath: string,
): Promise<void> {
	const previousPlanId = stringifyValue(initialTrade?.plan_id);
	const nextPlanId = stringifyValue(trade.plan_id);
	const tradeId = stringifyValue(trade.id);

	if (nextPlanId) {
		await linkTradeToPlan(plugin, nextPlanId, {
			trade_id: tradeId,
			file_path: filePath,
			label: createTradePlanLinkLabel(trade),
		});
	}

	if (previousPlanId && previousPlanId !== nextPlanId) {
		await unlinkTradeFromPlan(plugin, previousPlanId, tradeId);
	}
}

function createTradePlanLinkLabel(trade: TradeEntry): string {
	const openedAt = stringifyValue(trade.opened_at);
	const time = openedAt ? openedAt.slice(11, 16) : '';
	return [stringifyValue(trade.symbol), time, stringifyValue(trade.side), stringifyValue(trade.setup)]
		.filter(Boolean)
		.join(' / ');
}
