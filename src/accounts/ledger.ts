import type { TradingAccount } from './types';
import type { TradeEntry } from '../trades/types';
import { getRealizedRr } from '../risk/policy';

export interface AccountLedgerPreview {
	trade: TradeEntry;
	accounts: TradingAccount[];
	account: TradingAccount | null;
	balanceBefore: number | null;
	balanceAfter: number | null;
	pnlAmount: number | null;
	pnlPct: number | null;
}

export function previewAccountLedger(
	accounts: TradingAccount[],
	previousTrade: TradeEntry | undefined,
	nextTrade: TradeEntry,
): AccountLedgerPreview {
	const cloned = accounts.map((account) => ({ ...account }));
	const previousAccountId = stringValue(previousTrade?.account_id);
	const nextAccountId = stringValue(nextTrade.account_id);
	const previousPnl = getTradePnlAmount(previousTrade);
	const nextPnl = getTradePnlAmount(nextTrade);

	if (previousAccountId && previousPnl !== null) {
		const previousAccount = cloned.find((account) => account.id === previousAccountId);
		if (previousAccount) {
			previousAccount.currentBalance = roundMoney(previousAccount.currentBalance - previousPnl);
			previousAccount.updatedAt = new Date().toISOString();
		}
	}

	const account = nextAccountId ? cloned.find((item) => item.id === nextAccountId) ?? null : null;
	if (!account) {
		return {
			trade: nextTrade,
			accounts: cloned,
			account: null,
			balanceBefore: null,
			balanceAfter: null,
			pnlAmount: nextPnl,
			pnlPct: getTradePnlPct(nextTrade),
		};
	}

	const balanceBefore = roundMoney(account.currentBalance);
	const balanceAfter = nextPnl === null ? balanceBefore : roundMoney(balanceBefore + nextPnl);
	if (nextPnl !== null) {
		account.currentBalance = balanceAfter;
		account.updatedAt = new Date().toISOString();
	}

	const trade: TradeEntry = {
		...nextTrade,
		account_name: account.name,
		account_type: account.type,
		...(account.code ? { account_code: account.code } : {}),
		account_currency: account.currency,
		account_balance_before: balanceBefore,
		account_balance_after: balanceAfter,
		...(nextPnl !== null ? { pnl_amount: nextPnl } : {}),
		...(getTradePnlPct(nextTrade) !== null ? { pnl_pct: getTradePnlPct(nextTrade) as number } : {}),
	};

	return {
		trade,
		accounts: cloned,
		account,
		balanceBefore,
		balanceAfter,
		pnlAmount: nextPnl,
		pnlPct: getTradePnlPct(nextTrade),
	};
}

export function getTradePnlAmount(trade: TradeEntry | undefined): number | null {
	if (!trade || !isTradeClosed(trade)) return null;
	const stored = numeric(trade.pnl_amount);
	if (stored !== null) return stored;
	const riskAmount = numeric(trade.risk_amount) ?? calculateRiskAmount(trade);
	if (riskAmount === null) return null;
	return roundMoney(riskAmount * getRealizedRr(trade));
}

export function getTradePnlPct(trade: TradeEntry | undefined): number | null {
	if (!trade || !isTradeClosed(trade)) return null;
	const stored = numeric(trade.pnl_pct);
	if (stored !== null) return stored;
	const riskPct = numeric(trade.risk_pct);
	if (riskPct === null) return null;
	return round4(riskPct * getRealizedRr(trade));
}

function calculateRiskAmount(trade: TradeEntry): number | null {
	const equity = numeric(trade.account_equity);
	const riskPct = numeric(trade.risk_pct);
	if (equity === null || equity <= 0 || riskPct === null || riskPct <= 0) return null;
	return roundMoney(equity * riskPct / 100);
}

function isTradeClosed(trade: TradeEntry): boolean {
	if (trade.journal_type === 'live' && trade.status === 'open') return false;
	return trade.result === 'win' || trade.result === 'loss' || trade.result === 'breakeven';
}

function numeric(value: unknown): number | null {
	const parsed = typeof value === 'number' ? value : typeof value === 'string' ? Number(value) : Number.NaN;
	return Number.isFinite(parsed) ? parsed : null;
}

function stringValue(value: unknown): string {
	return typeof value === 'string' ? value : '';
}

function roundMoney(value: number): number {
	return Number(value.toFixed(2));
}

function round4(value: number): number {
	return Number(value.toFixed(4));
}
