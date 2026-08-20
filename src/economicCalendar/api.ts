import { requestUrl } from 'obsidian';
import type TraderJournalPlugin from '../main';
import { ECONOMIC_IMPACTS } from './types';
import type {
	EconomicCalendarCache,
	EconomicCalendarEvent,
	EconomicCalendarSnapshot,
	EconomicImpact,
} from './types';

export const ECONOMIC_CALENDAR_URL = 'https://nfs.faireconomy.media/ff_calendar_thisweek.json';

export const ECONOMIC_CALENDAR_SOURCE_TIME_ZONE = 'America/New_York';
const REQUEST_COOLDOWN_MS = 5 * 60 * 1000;

export class EconomicCalendarService {
	private readonly pendingRequests = new Map<string, Promise<EconomicCalendarSnapshot>>();

	constructor(
		private readonly plugin: TraderJournalPlugin,
		private readonly request: typeof requestUrl = requestUrl,
		private readonly getNow: () => Date = () => new Date(),
	) {}

	async loadThisWeek(): Promise<EconomicCalendarSnapshot> {
		const now = this.getNow();
		const weekKey = getWeekKey(now, ECONOMIC_CALENDAR_SOURCE_TIME_ZONE);
		const cache = this.plugin.economicCalendarCache;

		if (cache?.weekKey === weekKey) {
			return createSnapshot(cache, true);
		}
		const pendingRequest = this.pendingRequests.get(weekKey);
		if (pendingRequest) {
			return pendingRequest;
		}

		const lastRequestAt = this.plugin.economicCalendarLastRequestAt;
		const lastRequestWeekKey = lastRequestAt
			? getWeekKey(new Date(lastRequestAt), ECONOMIC_CALENDAR_SOURCE_TIME_ZONE)
			: null;
		if (
			lastRequestAt &&
			lastRequestWeekKey === weekKey &&
			now.getTime() - Date.parse(lastRequestAt) < REQUEST_COOLDOWN_MS
		) {
			throw new Error('Economic calendar request is waiting for the five-minute cooldown.');
		}

		const request = this.fetchAndCache(weekKey).finally(() => {
			if (this.pendingRequests.get(weekKey) === request) {
				this.pendingRequests.delete(weekKey);
			}
		});
		this.pendingRequests.set(weekKey, request);
		return request;
	}

	private async fetchAndCache(weekKey: string): Promise<EconomicCalendarSnapshot> {
		await this.plugin.markEconomicCalendarRequestAttempt(this.getNow().toISOString());
		const response = await this.request({
			url: ECONOMIC_CALENDAR_URL,
			method: 'GET',
		});
		const events = parseEconomicCalendarEvents(response.json);
		const cache: EconomicCalendarCache = {
			weekKey,
			fetchedAt: this.getNow().toISOString(),
			events,
		};
		await this.plugin.saveEconomicCalendarCache(cache);
		return createSnapshot(cache, false);
	}
}

export function getWeekKey(date: Date, timeZone: string): string {
	const dateKey = formatDateInTimeZone(date, timeZone);
	const [year, month, day] = dateKey.split('-').map(Number);
	if (year === undefined || month === undefined || day === undefined) {
		return dateKey;
	}

	const calendarDate = new Date(Date.UTC(year, month - 1, day));
	calendarDate.setUTCDate(calendarDate.getUTCDate() - calendarDate.getUTCDay());
	return calendarDate.toISOString().slice(0, 10);
}

export function formatDateInTimeZone(date: Date, timeZone: string): string {
	const parts = new Intl.DateTimeFormat('en-CA', {
		timeZone,
		year: 'numeric',
		month: '2-digit',
		day: '2-digit',
	}).formatToParts(date);
	const year = parts.find((part) => part.type === 'year')?.value;
	const month = parts.find((part) => part.type === 'month')?.value;
	const day = parts.find((part) => part.type === 'day')?.value;

	if (!year || !month || !day) {
		throw new Error(`Could not format date in time zone: ${timeZone}`);
	}

	return `${year}-${month}-${day}`;
}

export function isValidTimeZone(value: string): boolean {
	try {
		new Intl.DateTimeFormat('en', { timeZone: value }).format();
		return true;
	} catch {
		return false;
	}
}

function createSnapshot(cache: EconomicCalendarCache, fromCache: boolean): EconomicCalendarSnapshot {
	return {
		events: cache.events,
		fromCache,
		fetchedAt: cache.fetchedAt,
	};
}

function parseEconomicCalendarEvents(value: unknown): EconomicCalendarEvent[] {
	if (!Array.isArray(value)) {
		throw new Error('Economic calendar API returned an invalid response.');
	}

	return value.flatMap((item) => {
		const event = parseEconomicCalendarEvent(item);
		return event ? [event] : [];
	});
}

function parseEconomicCalendarEvent(value: unknown): EconomicCalendarEvent | null {
	if (!isRecord(value)) {
		return null;
	}

	const title = getString(value.title);
	const country = getString(value.country).toUpperCase();
	const date = getString(value.date);
	const impact = getString(value.impact);
	if (!title || !country || !date || !isEconomicImpact(impact) || Number.isNaN(Date.parse(date))) {
		return null;
	}

	return {
		title,
		country,
		date,
		impact,
		forecast: getString(value.forecast),
		previous: getString(value.previous),
	};
}

function isEconomicImpact(value: string): value is EconomicImpact {
	return ECONOMIC_IMPACTS.some((impact) => impact === value);
}

function getString(value: unknown): string {
	return typeof value === 'string' ? value.trim() : '';
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}
