import { requestUrl } from 'obsidian';

export interface FxRateQuote {
	fromCurrency: string;
	toCurrency: string;
	rate: number;
	fetchedAt: string;
	source: 'twelve-data';
}

interface CacheEntry {
	quote: FxRateQuote;
	expiresAt: number;
}

const CACHE_MS = 60_000;
const cache = new Map<string, CacheEntry>();

export async function fetchLiveFxConversionRate(
	fromCurrency: string,
	toCurrency: string,
	apiKey: string,
): Promise<FxRateQuote> {
	const from = normalizeCurrency(fromCurrency);
	const to = normalizeCurrency(toCurrency);
	if (!from || !to) throw new Error('کد ارز برای دریافت نرخ آنلاین معتبر نیست.');
	if (from === to) {
		return { fromCurrency: from, toCurrency: to, rate: 1, fetchedAt: new Date().toISOString(), source: 'twelve-data' };
	}
	if (!apiKey.trim()) throw new Error('برای نرخ زنده Cross FX، API Key سرویس Twelve Data را در تنظیمات وارد کن.');

	const key = `${from}/${to}`;
	const cached = cache.get(key);
	if (cached && cached.expiresAt > Date.now()) return cached.quote;

	const direct = await requestTwelveDataPrice(from, to, apiKey.trim());
	let rate = direct;
	if (rate === null) {
		const inverse = await requestTwelveDataPrice(to, from, apiKey.trim());
		if (inverse === null || inverse <= 0) throw new Error(`نرخ زنده ${from}/${to} از Twelve Data دریافت نشد.`);
		rate = 1 / inverse;
	}
	const quote: FxRateQuote = {
		fromCurrency: from,
		toCurrency: to,
		rate,
		fetchedAt: new Date().toISOString(),
		source: 'twelve-data',
	};
	cache.set(key, { quote, expiresAt: Date.now() + CACHE_MS });
	return quote;
}

async function requestTwelveDataPrice(from: string, to: string, apiKey: string): Promise<number | null> {
	const symbol = encodeURIComponent(`${from}/${to}`);
	const key = encodeURIComponent(apiKey);
	const response = await requestUrl({
		url: `https://api.twelvedata.com/price?symbol=${symbol}&apikey=${key}`,
		method: 'GET',
	});
	if (!response || typeof response.json !== 'object' || response.json === null) return null;
	const record = response.json as Record<string, unknown>;
	if (typeof record.code === 'number' && record.code >= 400) {
		const message = typeof record.message === 'string' ? record.message : 'Twelve Data request failed.';
		throw new Error(message);
	}
	const price = typeof record.price === 'number'
		? record.price
		: typeof record.price === 'string'
			? Number(record.price)
			: Number.NaN;
	return Number.isFinite(price) && price > 0 ? price : null;
}

function normalizeCurrency(value: string): string {
	const normalized = value.trim().toUpperCase();
	return /^[A-Z]{3}$/.test(normalized) ? normalized : '';
}
