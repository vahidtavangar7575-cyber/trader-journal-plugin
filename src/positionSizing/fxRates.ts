export interface FxRateQuote {
	base: string;
	quote: string;
	rate: number;
	date: string;
	source: 'identity' | 'frankfurter';
}

export async function fetchFxRate(baseCurrency: string, quoteCurrency: string): Promise<FxRateQuote> {
	const base = normalizeCurrency(baseCurrency);
	const quote = normalizeCurrency(quoteCurrency);
	if (!base || !quote) throw new Error('کد ارز حساب یا ارز قیمت معتبر نیست.');
	if (base === quote) {
		return { base, quote, rate: 1, date: new Date().toISOString().slice(0, 10), source: 'identity' };
	}
	const endpoint = `https://api.frankfurter.dev/v2/rate/${encodeURIComponent(base.toLowerCase())}/${encodeURIComponent(quote.toLowerCase())}`;
	const response = await fetch(endpoint, { headers: { Accept: 'application/json' } });
	if (!response.ok) throw new Error(`دریافت نرخ تبدیل ناموفق بود (${response.status}).`);
	const payload = await response.json() as Partial<{ date: string; base: string; quote: string; rate: number }>;
	if (!Number.isFinite(payload.rate) || Number(payload.rate) <= 0) throw new Error('نرخ تبدیل آنلاین معتبر دریافت نشد.');
	return {
		base,
		quote,
		rate: Number(payload.rate),
		date: typeof payload.date === 'string' ? payload.date : new Date().toISOString().slice(0, 10),
		source: 'frankfurter',
	};
}

function normalizeCurrency(value: string): string {
	return value.trim().toUpperCase().replace(/[^A-Z]/g, '').slice(0, 3);
}
