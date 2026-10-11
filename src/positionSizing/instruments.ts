export type InstrumentProfileId =
	| 'EURUSD'
	| 'XAUUSD'
	| 'US30'
	| 'DAX40'
	| 'NAS100'
	| 'USOIL'
	| 'BTCUSD';

export interface InstrumentProfile {
	id: InstrumentProfileId;
	displayNameFa: string;
	aliases: string[];
	quoteCurrency: string;
	contractSize: number;
	pipSize: number;
	volumeStep: number;
	minVolume: number;
	maxVolume: number;
	unitLabel: 'pip' | 'point' | 'tick' | 'dollar';
	brokerSpecific: boolean;
	noteFa: string;
}

/**
 * Reference CFD/spot-style profiles used by the position-size engine.
 * Contract specifications for CFDs can differ by broker. The calculator
 * therefore exposes the contract size and requires the user to verify it.
 */
export const INSTRUMENT_PROFILES: InstrumentProfile[] = [
	{
		id: 'EURUSD',
		displayNameFa: 'یورو / دلار (EURUSD)',
		aliases: ['EURUSD', 'EUR/USD'],
		quoteCurrency: 'USD',
		contractSize: 100_000,
		pipSize: 0.0001,
		volumeStep: 0.01,
		minVolume: 0.01,
		maxVolume: 100,
		unitLabel: 'pip',
		brokerSpecific: false,
		noteFa: '۱ لات استاندارد = ۱۰۰٬۰۰۰ یورو؛ هر pip برابر 0.0001 است.',
	},
	{
		id: 'XAUUSD',
		displayNameFa: 'طلا / دلار (XAUUSD)',
		aliases: ['XAUUSD', 'GOLD', 'XAU/USD'],
		quoteCurrency: 'USD',
		contractSize: 100,
		pipSize: 0.01,
		volumeStep: 0.01,
		minVolume: 0.01,
		maxVolume: 100,
		unitLabel: 'tick',
		brokerSpecific: true,
		noteFa: 'پروفایل مرجع: ۱ لات = ۱۰۰ اونس؛ حرکت 0.01 دلار = 1 دلار در هر لات.',
	},
	{
		id: 'US30',
		displayNameFa: 'داوجونز (US30)',
		aliases: ['US30', 'DJ30', 'DJI', 'DOW', 'WALLSTREET'],
		quoteCurrency: 'USD',
		contractSize: 1,
		pipSize: 1,
		volumeStep: 0.01,
		minVolume: 0.01,
		maxVolume: 100,
		unitLabel: 'point',
		brokerSpecific: true,
		noteFa: 'پروفایل مرجع CFD: هر ۱ پوینت = ۱ دلار برای ۱ لات. مشخصات بروکر را یک‌بار کنترل کن.',
	},
	{
		id: 'DAX40',
		displayNameFa: 'دکس آلمان (DAX40)',
		aliases: ['DAX40', 'GER40', 'DE40', 'DAX'],
		quoteCurrency: 'EUR',
		contractSize: 1,
		pipSize: 1,
		volumeStep: 0.01,
		minVolume: 0.01,
		maxVolume: 100,
		unitLabel: 'point',
		brokerSpecific: true,
		noteFa: 'پروفایل مرجع CFD: هر ۱ پوینت = ۱ یورو برای ۱ لات. برای حساب USD نرخ EUR→USD آنلاین تبدیل می‌شود.',
	},
	{
		id: 'NAS100',
		displayNameFa: 'نزدک 100 (NAS100)',
		aliases: ['NAS100', 'USTEC', 'US100', 'NASDAQ', 'NASDAQ100'],
		quoteCurrency: 'USD',
		contractSize: 1,
		pipSize: 1,
		volumeStep: 0.01,
		minVolume: 0.01,
		maxVolume: 100,
		unitLabel: 'point',
		brokerSpecific: true,
		noteFa: 'پروفایل مرجع CFD: هر ۱ پوینت = ۱ دلار برای ۱ لات. مشخصات بروکر را یک‌بار کنترل کن.',
	},
	{
		id: 'USOIL',
		displayNameFa: 'نفت WTI (USOIL)',
		aliases: ['USOIL', 'WTI', 'WTICOUSD', 'XTIUSD', 'OIL'],
		quoteCurrency: 'USD',
		contractSize: 1_000,
		pipSize: 0.01,
		volumeStep: 0.01,
		minVolume: 0.01,
		maxVolume: 100,
		unitLabel: 'tick',
		brokerSpecific: true,
		noteFa: 'پروفایل مرجع: ۱ لات = ۱۰۰۰ بشکه؛ حرکت 0.01 دلار = 10 دلار در هر لات.',
	},
	{
		id: 'BTCUSD',
		displayNameFa: 'بیت‌کوین / دلار (BTCUSD)',
		aliases: ['BTCUSD', 'BTC/USD', 'BTC'],
		quoteCurrency: 'USD',
		contractSize: 1,
		pipSize: 1,
		volumeStep: 0.01,
		minVolume: 0.01,
		maxVolume: 100,
		unitLabel: 'dollar',
		brokerSpecific: true,
		noteFa: 'پروفایل مرجع CFD: ۱ لات = ۱ BTC؛ هر ۱ دلار حرکت = ۱ دلار در هر لات.',
	},
];

export function normalizeInstrumentSymbol(value: string): string {
	return value.trim().toUpperCase().replace(/[\s_-]/g, '');
}

export function findInstrumentProfile(symbol: string): InstrumentProfile | null {
	const normalized = normalizeInstrumentSymbol(symbol);
	if (!normalized) return null;
	return INSTRUMENT_PROFILES.find((profile) =>
		profile.aliases.some((alias) => normalizeInstrumentSymbol(alias) === normalized),
	) ?? null;
}

export function formatDistanceUnit(profile: InstrumentProfile): string {
	switch (profile.unitLabel) {
		case 'pip': return 'pip';
		case 'point': return 'پوینت';
		case 'tick': return 'تیک';
		case 'dollar': return 'دلار حرکت قیمت';
	}
}
