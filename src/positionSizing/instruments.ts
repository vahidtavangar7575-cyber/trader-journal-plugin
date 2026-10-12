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
	officialReferenceFa: string;
	officialSourceFa: string;
}

/**
 * The values used for sizing below are practical spot/CFD defaults, because the
 * journal is primarily used with retail/prop accounts where symbols such as
 * XAUUSD, US30 and NAS100 are broker-defined CFDs. Exchange futures references
 * are kept next to each profile for verification and education, but are NOT
 * silently substituted for a broker contract specification.
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
		noteFa: 'پروفایل اجرایی Spot/CFD: ۱ لات استاندارد = ۱۰۰٬۰۰۰ یورو و ۱ pip = 0.0001.',
		officialReferenceFa: 'مرجع بورس آتی CME برای Euro FX (6E): هر قرارداد = ۱۲۵٬۰۰۰ یورو و Tick پایه 0.00005 = 6.25 USD. این عدد با «لات استاندارد Spot/CFD» یکی نیست.',
		officialSourceFa: 'CME Euro FX — بازبینی مرجع 2026-10',
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
		noteFa: 'پروفایل اجرایی رایج CFD: ۱ لات = ۱۰۰ اونس؛ حرکت 0.01 دلار = 1 دلار در هر لات. اگر بروکر تو متفاوت است، Override را ذخیره کن.',
		officialReferenceFa: 'COMEX Gold Futures (GC): هر قرارداد = ۱۰۰ اونس تروا. E-mini Gold = ۵۰ اونس و Micro Gold (MGC) = ۱۰ اونس. در GC هر حرکت 0.10 دلار روی هر اونس = 10 USD برای یک قرارداد.',
		officialSourceFa: 'CME/COMEX Gold — بازبینی مرجع 2026-10',
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
		noteFa: 'پروفایل اجرایی مرجع CFD: هر ۱ پوینت = ۱ دلار برای ۱ لات. این مقدار در CFDها بروکر-محور است.',
		officialReferenceFa: 'CME/CBOT E-mini Dow (YM): ضریب 5 USD به‌ازای هر پوینت شاخص. Micro E-mini Dow (MYM): ضریب 0.50 USD به‌ازای هر پوینت.',
		officialSourceFa: 'CME/CBOT Dow futures — بازبینی مرجع 2026-10',
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
		noteFa: 'پروفایل اجرایی مرجع CFD: هر ۱ پوینت = ۱ یورو برای ۱ لات. برای حساب USD، EUR→USD تبدیل می‌شود.',
		officialReferenceFa: 'Eurex: DAX Futures (FDAX) = 25 EUR/point، Mini-DAX (FDXM) = 5 EUR/point، Micro-DAX (FDXS) = 1 EUR/point.',
		officialSourceFa: 'Eurex DAX futures — بازبینی مرجع 2026-10',
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
		noteFa: 'پروفایل اجرایی مرجع CFD: هر ۱ پوینت = ۱ دلار برای ۱ لات. مشخصات Contract Size بروکر را ذخیره کن.',
		officialReferenceFa: 'CME: E-mini Nasdaq-100 (NQ) = 20 USD/point با Tick 0.25؛ Micro E-mini Nasdaq-100 (MNQ) = 2 USD/point با Tick 0.25.',
		officialSourceFa: 'CME Nasdaq futures — بازبینی مرجع 2026-10',
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
		noteFa: 'پروفایل اجرایی رایج CFD: ۱ لات = ۱۰۰۰ بشکه؛ حرکت 0.01 دلار = 10 دلار در هر لات. بروکر را یک‌بار تطبیق بده.',
		officialReferenceFa: 'NYMEX WTI Crude Oil (CL): هر قرارداد استاندارد = ۱۰۰۰ بشکه و Tick 0.01 USD/barrel = 10 USD. Micro WTI برابر ۱۰۰ بشکه است.',
		officialSourceFa: 'CME/NYMEX WTI — بازبینی مرجع 2026-10',
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
		noteFa: 'پروفایل اجرایی مرجع CFD: ۱ لات = ۱ BTC؛ هر ۱ دلار حرکت = ۱ دلار در هر لات. قرارداد بروکر/صرافی می‌تواند متفاوت باشد.',
		officialReferenceFa: 'CME Bitcoin Futures (BTC): هر قرارداد = ۵ BTC. Micro Bitcoin Futures (MBT): هر قرارداد = ۰.۱ BTC.',
		officialSourceFa: 'CME Bitcoin futures — بازبینی مرجع 2026-10',
	},
];

export function normalizeInstrumentSymbol(value: string): string {
	return value.trim().toUpperCase().replace(/[\s_-]/g, '');
}

export function findInstrumentProfile(symbol: string): InstrumentProfile | null {
	const normalized = normalizeInstrumentSymbol(symbol);
	if (!normalized) return null;
	return INSTRUMENT_PROFILES.find((profile) => profile.aliases.some((alias) => normalizeInstrumentSymbol(alias) === normalized)) ?? null;
}

export function formatDistanceUnit(profile: InstrumentProfile): string {
	switch (profile.unitLabel) {
		case 'pip': return 'pip';
		case 'point': return 'پوینت';
		case 'tick': return 'تیک';
		case 'dollar': return 'دلار حرکت قیمت';
	}
}
