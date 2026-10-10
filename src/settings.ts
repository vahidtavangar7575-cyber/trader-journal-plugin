import { ECONOMIC_IMPACTS } from './economicCalendar/types';
import type { EconomicImpact } from './economicCalendar/types';
import type { TradingAccount, TradingAccountType } from './accounts/types';
import { DEFAULT_RISK_POLICY, normalizeRiskPolicy } from './risk/policy';
import type { RiskPolicySettings } from './risk/policy';

export type CalendarDisplayMode = 'month' | 'horizontal_calendar';
export type TraderJournalLanguage = 'en' | 'vi' | 'fa';
export const CALENDAR_DISPLAY_MODE_CHANGE_EVENT = 'trader-journal-calendar-display-mode-change';
export const LANGUAGE_CHANGE_EVENT = 'trader-journal-language-change';
export const ECONOMIC_CALENDAR_SETTINGS_CHANGE_EVENT = 'trader-journal-economic-calendar-settings-change';
export const IMAGE_MODAL_SETTING_CHANGE_EVENT = 'trader-journal-image-modal-setting-change';
export const DEFAULT_ECONOMIC_CALENDAR_TIME_ZONE = 'Asia/Ho_Chi_Minh';

export interface TraderJournalSettings {
	journalFolder: string;
	liveJournalFolder: string;
	planFolder: string;
	setupFolder: string;
	symbols: string[];
	timeframes: string[];
	allowRemoteImages: boolean;
	openImageModalOnClick: boolean;
	calendarDisplayMode: CalendarDisplayMode;
	language: TraderJournalLanguage;
	economicCalendarEnabled: boolean;
	economicCalendarShowAll: boolean;
	economicCalendarTimeZone: string;
	economicCalendarCountries: string[];
	economicCalendarImpacts: EconomicImpact[];
	accounts: TradingAccount[];
	lastSelectedAccountId: string;
	lastCommitmentDate: string;
	riskPolicy: RiskPolicySettings;
}

export const DEFAULT_SETTINGS: TraderJournalSettings = {
	journalFolder: 'Trading/Backtests',
	liveJournalFolder: 'Trading/Live',
	planFolder: 'Trading/Live/_plans',
	setupFolder: 'Trading/_setups',
	symbols: ['NQ', 'ES'],
	timeframes: ['1m', '3m', '5m', '15m', '1h'],
	allowRemoteImages: false,
	openImageModalOnClick: true,
	calendarDisplayMode: 'month',
	language: 'fa',
	economicCalendarEnabled: false,
	economicCalendarShowAll: false,
	economicCalendarTimeZone: DEFAULT_ECONOMIC_CALENDAR_TIME_ZONE,
	economicCalendarCountries: ['USD'],
	economicCalendarImpacts: ['High', 'Medium'],
	accounts: [],
	lastSelectedAccountId: '',
	lastCommitmentDate: '',
	riskPolicy: { ...DEFAULT_RISK_POLICY },
};

export function normalizeSettings(settings: Partial<TraderJournalSettings> | null | undefined): TraderJournalSettings {
	const accounts = normalizeAccounts(settings?.accounts);
	const lastSelectedAccountId = typeof settings?.lastSelectedAccountId === 'string' &&
		accounts.some((account) => account.id === settings.lastSelectedAccountId)
		? settings.lastSelectedAccountId
		: '';
	return {
		journalFolder: settings?.journalFolder?.trim() || DEFAULT_SETTINGS.journalFolder,
		liveJournalFolder: settings?.liveJournalFolder?.trim() || DEFAULT_SETTINGS.liveJournalFolder,
		planFolder: settings?.planFolder?.trim() || DEFAULT_SETTINGS.planFolder,
		setupFolder: settings?.setupFolder?.trim() || DEFAULT_SETTINGS.setupFolder,
		symbols: normalizeStringList(settings?.symbols, DEFAULT_SETTINGS.symbols, normalizeSymbol),
		timeframes: normalizeStringList(settings?.timeframes, DEFAULT_SETTINGS.timeframes, normalizeTimeframe),
		allowRemoteImages: settings?.allowRemoteImages === true,
		openImageModalOnClick: settings?.openImageModalOnClick !== false,
		calendarDisplayMode: normalizeCalendarDisplayMode(settings?.calendarDisplayMode),
		language: normalizeLanguage(settings?.language),
		economicCalendarEnabled: settings?.economicCalendarEnabled === true,
		economicCalendarShowAll: settings?.economicCalendarShowAll === true,
		economicCalendarTimeZone: normalizeTimeZone(settings?.economicCalendarTimeZone),
		economicCalendarCountries: normalizeStringList(
			settings?.economicCalendarCountries,
			DEFAULT_SETTINGS.economicCalendarCountries,
			normalizeCountry,
		),
		economicCalendarImpacts: normalizeEconomicImpacts(settings?.economicCalendarImpacts),
		accounts,
		lastSelectedAccountId,
		lastCommitmentDate: normalizeDateKey(settings?.lastCommitmentDate),
		riskPolicy: normalizeRiskPolicy(settings?.riskPolicy),
	};
}

export function normalizeSymbol(value: string): string {
	return value.trim().toUpperCase();
}

export function normalizeTimeframe(value: string): string {
	return value.trim();
}

export function normalizeCountry(value: string): string {
	return value.trim().toUpperCase();
}

function normalizeCalendarDisplayMode(value: unknown): CalendarDisplayMode {
	return value === 'horizontal_calendar' ? value : DEFAULT_SETTINGS.calendarDisplayMode;
}

function normalizeLanguage(value: unknown): TraderJournalLanguage {
	return value === 'vi' || value === 'fa' ? value : DEFAULT_SETTINGS.language;
}

function normalizeTimeZone(value: unknown): string {
	if (typeof value !== 'string' || !value.trim()) {
		return DEFAULT_ECONOMIC_CALENDAR_TIME_ZONE;
	}

	const timeZone = value.trim();
	try {
		new Intl.DateTimeFormat('en', { timeZone }).format();
		return timeZone;
	} catch {
		return DEFAULT_ECONOMIC_CALENDAR_TIME_ZONE;
	}
}

function normalizeEconomicImpacts(value: unknown): EconomicImpact[] {
	if (!Array.isArray(value)) {
		return [...DEFAULT_SETTINGS.economicCalendarImpacts];
	}

	const impacts = ECONOMIC_IMPACTS.filter((impact) => value.includes(impact));
	return impacts.length ? impacts : [...DEFAULT_SETTINGS.economicCalendarImpacts];
}

function normalizeStringList(
	values: unknown,
	fallback: string[],
	normalize: (value: string) => string,
): string[] {
	const sourceValues = Array.isArray(values) && values.length ? values : fallback;
	const normalizedValues = sourceValues
		.map((value) => (typeof value === 'string' ? normalize(value) : ''))
		.filter(Boolean);

	const uniqueValues = [...new Set(normalizedValues)];
	return uniqueValues.length ? uniqueValues : [...new Set(fallback.map((value) => normalize(value)).filter(Boolean))];
}

function normalizeAccounts(value: unknown): TradingAccount[] {
	if (!Array.isArray(value)) return [];
	const ids = new Set<string>();
	const accounts: TradingAccount[] = [];
	for (const item of value) {
		if (!isRecord(item)) continue;
		const id = stringField(item.id);
		const name = stringField(item.name);
		const type = normalizeAccountType(item.type);
		const initialBalance = numberField(item.initialBalance);
		const currentBalance = numberField(item.currentBalance);
		if (!id || ids.has(id) || !name || initialBalance === null || initialBalance < 0) continue;
		ids.add(id);
		accounts.push({
			id,
			name,
			type,
			...(stringField(item.code) ? { code: stringField(item.code) } : {}),
			currency: stringField(item.currency).toUpperCase() || 'USD',
			initialBalance,
			currentBalance: currentBalance !== null && currentBalance >= 0 ? currentBalance : initialBalance,
			enabled: item.enabled !== false,
			createdAt: validIso(item.createdAt) ?? new Date().toISOString(),
			updatedAt: validIso(item.updatedAt) ?? new Date().toISOString(),
		});
	}
	return accounts;
}

function normalizeAccountType(value: unknown): TradingAccountType {
	return value === 'backtest' || value === 'demo' || value === 'prop' || value === 'competition' || value === 'live'
		? value
		: 'demo';
}

function normalizeDateKey(value: unknown): string {
	if (typeof value !== 'string') return '';
	const dateKey = value.trim();
	return /^\d{4}-\d{2}-\d{2}$/.test(dateKey) ? dateKey : '';
}

function stringField(value: unknown): string {
	return typeof value === 'string' ? value.trim() : '';
}

function numberField(value: unknown): number | null {
	const parsed = typeof value === 'number' ? value : typeof value === 'string' ? Number(value) : Number.NaN;
	return Number.isFinite(parsed) ? parsed : null;
}

function validIso(value: unknown): string | null {
	return typeof value === 'string' && !Number.isNaN(Date.parse(value)) ? value : null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}
