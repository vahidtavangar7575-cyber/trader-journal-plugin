export type TradingAccountType = 'backtest' | 'demo' | 'prop' | 'competition' | 'live';

export interface TradingAccount {
	id: string;
	name: string;
	type: TradingAccountType;
	code?: string;
	currency: string;
	initialBalance: number;
	currentBalance: number;
	enabled: boolean;
	createdAt: string;
	updatedAt: string;
}

export const TRADING_ACCOUNT_TYPE_LABELS: Record<TradingAccountType, string> = {
	backtest: 'بک‌تست',
	demo: 'دمو',
	prop: 'پراپ',
	competition: 'مسابقه',
	live: 'واقعی',
};

export function isRiskManagedAccount(account: TradingAccount | null | undefined): boolean {
	return Boolean(account && account.type !== 'backtest');
}

export function createTradingAccountId(): string {
	const random = Math.random().toString(36).slice(2, 8);
	return `account-${Date.now().toString(36)}-${random}`;
}
