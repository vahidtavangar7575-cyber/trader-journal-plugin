import assert from 'node:assert/strict';
import test from 'node:test';
import type TraderJournalPlugin from '../src/main';
import { EconomicCalendarService, getWeekKey } from '../src/economicCalendar/api';
import type { EconomicCalendarCache, EconomicCalendarEvent } from '../src/economicCalendar/types';

void test('deduplicates concurrent economic calendar requests for the same week', async () => {
	const plugin = createPluginStub();
	let requestCount = 0;
	let resolveRequest: ((value: { json: unknown }) => void) | undefined;
	const request = () => {
		requestCount += 1;
		return new Promise<{ json: unknown }>((resolve) => {
			resolveRequest = resolve;
		});
	};
	const service = new EconomicCalendarService(plugin, request as never);

	const firstResult = service.loadThisWeek();
	const secondResult = service.loadThisWeek();
	await Promise.resolve();
	assert.equal(requestCount, 1);

	resolveRequest?.({ json: [createEvent()] });
	const [first, second] = await Promise.all([firstResult, secondResult]);
	assert.deepEqual(first.events, second.events);
	assert.equal(plugin.economicCalendarCache?.events.length, 1);
});

void test('returns the current week cache without a network request', async () => {
	const plugin = createPluginStub();
	plugin.economicCalendarCache = {
		weekKey: getWeekKey(new Date(), 'America/New_York'),
		fetchedAt: new Date().toISOString(),
		events: [createEvent()],
	};
	let requestCount = 0;
	const service = new EconomicCalendarService(plugin, (() => {
		requestCount += 1;
		return Promise.resolve({ json: [] });
	}) as never);

	const snapshot = await service.loadThisWeek();
	assert.equal(snapshot.fromCache, true);
	assert.equal(snapshot.events.length, 1);
	assert.equal(requestCount, 0);
});

void test('applies cooldown only when creating a new request', async () => {
	const plugin = createPluginStub();
	plugin.economicCalendarLastRequestAt = new Date().toISOString();
	let requestCount = 0;
	const service = new EconomicCalendarService(plugin, (() => {
		requestCount += 1;
		return Promise.resolve({ json: [] });
	}) as never);

	await assert.rejects(service.loadThisWeek(), /five-minute cooldown/);
	assert.equal(requestCount, 0);
});

void test('does not carry the previous week cooldown into a new source week', async () => {
	const plugin = createPluginStub();
	plugin.economicCalendarLastRequestAt = '2026-08-23T03:59:00.000Z';
	let requestCount = 0;
	const service = new EconomicCalendarService(
		plugin,
		(() => {
			requestCount += 1;
			return Promise.resolve({ json: [] });
		}) as never,
		() => new Date('2026-08-23T04:01:00.000Z'),
	);

	await service.loadThisWeek();
	assert.equal(requestCount, 1);
});

function createPluginStub(): TraderJournalPlugin {
	const plugin = {
		economicCalendarCache: null as EconomicCalendarCache | null,
		economicCalendarLastRequestAt: null as string | null,
		async markEconomicCalendarRequestAttempt(at: string) {
			plugin.economicCalendarLastRequestAt = at;
		},
		async saveEconomicCalendarCache(cache: EconomicCalendarCache) {
			plugin.economicCalendarCache = cache;
		},
	};
	return plugin as unknown as TraderJournalPlugin;
}

function createEvent(): EconomicCalendarEvent {
	return {
		title: 'Non-farm payrolls',
		country: 'USD',
		date: '2026-08-21T12:30:00-04:00',
		impact: 'High',
		forecast: '100K',
		previous: '90K',
	};
}
