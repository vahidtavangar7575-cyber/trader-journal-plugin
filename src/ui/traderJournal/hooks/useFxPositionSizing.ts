import { useEffect, useState } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import type TraderJournalPlugin from '../../../main';
import type { TradingAccount } from '../../../accounts/types';
import { fetchLiveFxConversionRate } from '../../../risk/fxRate';
import {
	calculateFxPositionSize,
	prepareFxPositionSizing,
} from '../../../risk/positionSizing';
import type { FxPositionSizingResult } from '../../../risk/positionSizing';
import type { TradeFormState } from '../form';

interface Args {
	plugin: TraderJournalPlugin;
	form: TradeFormState;
	selectedAccount: TradingAccount | null;
	setForm: Dispatch<SetStateAction<TradeFormState>>;
}

export interface FxSizingController {
	result: FxPositionSizingResult | null;
	isLoading: boolean;
	error: string;
	onlineEnabled: boolean;
	apiKey: string;
	lotStep: number;
	setOnlineEnabled: (value: boolean) => void;
	setApiKey: (value: string) => void;
	setLotStep: (value: string) => void;
}

export function useFxPositionSizing({ plugin, form, selectedAccount, setForm }: Args): FxSizingController {
	const [result, setResult] = useState<FxPositionSizingResult | null>(null);
	const [isLoading, setIsLoading] = useState(false);
	const [error, setError] = useState('');
	const [onlineEnabled, setOnlineEnabledState] = useState(plugin.settings.fxPositionSizingEnabled);
	const [apiKey, setApiKeyState] = useState(plugin.settings.fxRateApiKey);
	const [lotStep, setLotStepState] = useState(plugin.settings.fxLotStep);

	useEffect(() => {
		let cancelled = false;
		const run = async () => {
			setError('');
			setIsLoading(false);
			const equity = Number(form.accountEquity);
			const riskPct = Number(form.riskPct);
			const entryPrice = Number(form.entryPrice);
			const stopLoss = Number(form.stopLoss);
			if (!selectedAccount || !Number.isFinite(equity) || equity <= 0 || !Number.isFinite(riskPct) || riskPct <= 0 ||
				!Number.isFinite(entryPrice) || entryPrice <= 0 || !Number.isFinite(stopLoss) || stopLoss <= 0) {
				setResult(null);
				return;
			}

			const preparation = prepareFxPositionSizing(form.symbol, selectedAccount.currency, stopLoss);
			if (preparation.kind === 'invalid') {
				setResult(null);
				setError(preparation.reason);
				return;
			}

			let conversionRate: number | null = null;
			if (preparation.kind === 'ready') {
				conversionRate = preparation.conversionRate;
			} else {
				if (!onlineEnabled) {
					setResult(null);
					setError(`برای ${preparation.fromCurrency}/${preparation.toCurrency} نرخ تبدیل آنلاین لازم است. محاسبه آنلاین FX را فعال کن.`);
					return;
				}
				if (!apiKey.trim()) {
					setResult(null);
					setError('برای Cross FX یک API Key از Twelve Data لازم است.');
					return;
				}
				try {
					setIsLoading(true);
					const quote = await fetchLiveFxConversionRate(preparation.fromCurrency, preparation.toCurrency, apiKey);
					if (cancelled) return;
					conversionRate = quote.rate;
				} catch (fetchError) {
					if (cancelled) return;
					setResult(null);
					setError(fetchError instanceof Error ? fetchError.message : 'دریافت نرخ تبدیل آنلاین انجام نشد.');
					setIsLoading(false);
					return;
				}
			}

			const next = calculateFxPositionSize({
				symbol: form.symbol,
				accountCurrency: selectedAccount.currency,
				equity,
				riskPct,
				entryPrice,
				stopLoss,
				conversionRate,
				lotStep,
			});
			if (cancelled) return;
			setIsLoading(false);
			setResult(next);
			if (!next) {
				setError('با ورودی‌های فعلی حجم معتبر قابل محاسبه نیست. فاصله Entry و Stop و Lot step را بررسی کن.');
				return;
			}
			setForm((current) => {
				const positionSize = formatLots(next.lots);
				if (current.positionSize === positionSize && current.positionUnit === 'lot') return current;
				return { ...current, positionSize, positionUnit: 'lot' };
			});
		};
		void run();
		return () => { cancelled = true; };
	}, [
		apiKey,
		form.accountEquity,
		form.entryPrice,
		form.riskPct,
		form.stopLoss,
		form.symbol,
		lotStep,
		onlineEnabled,
		selectedAccount?.currency,
		selectedAccount?.id,
		setForm,
	]);

	const setOnlineEnabled = (value: boolean) => {
		setOnlineEnabledState(value);
		plugin.settings.fxPositionSizingEnabled = value;
		void plugin.saveSettings();
	};
	const setApiKey = (value: string) => {
		setApiKeyState(value);
		plugin.settings.fxRateApiKey = value.trim();
		void plugin.saveSettings();
	};
	const setLotStep = (raw: string) => {
		const value = Number(raw);
		if (!Number.isFinite(value) || value <= 0) return;
		setLotStepState(value);
		plugin.settings.fxLotStep = value;
		void plugin.saveSettings();
	};

	return { result, isLoading, error, onlineEnabled, apiKey, lotStep, setOnlineEnabled, setApiKey, setLotStep };
}

function formatLots(value: number): string {
	return Number(value.toFixed(8)).toString();
}
