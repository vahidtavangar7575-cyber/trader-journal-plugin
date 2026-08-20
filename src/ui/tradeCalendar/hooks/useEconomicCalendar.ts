import { useEffect, useMemo, useState } from 'react';
import type TraderJournalPlugin from '../../../main';
import {
	filterEconomicCalendarEvents,
	groupEconomicEventsByDate,
} from '../../../economicCalendar/calendar';
import type { EconomicCalendarEvent, EconomicImpact } from '../../../economicCalendar/types';

interface EconomicCalendarOptions {
	countries: string[];
	economicWeekKey: string;
	enabled: boolean;
	impacts: EconomicImpact[];
	now: number;
	showAll: boolean;
	timeZone: string;
}

export interface EconomicCalendarState {
	events: EconomicCalendarEvent[];
	eventsByDate: Record<string, EconomicCalendarEvent[]>;
	hasError: boolean;
	isLoading: boolean;
}

export function useEconomicCalendar(
	plugin: TraderJournalPlugin,
	options: EconomicCalendarOptions,
): EconomicCalendarState {
	const { countries, economicWeekKey, enabled, impacts, now, showAll, timeZone } = options;
	const [events, setEvents] = useState<EconomicCalendarEvent[]>([]);
	const [isLoading, setIsLoading] = useState(false);
	const [hasError, setHasError] = useState(false);

	useEffect(() => {
		let disposed = false;
		if (!enabled) {
			setEvents([]);
			setHasError(false);
			setIsLoading(false);
			return;
		}

		setIsLoading(true);
		setHasError(false);
		void plugin.economicCalendarService
			.loadThisWeek()
			.then((snapshot) => {
				if (!disposed) {
					setEvents(snapshot.events);
				}
			})
			.catch((error: unknown) => {
				console.error('Trader Journal failed to load economic calendar', error);
				if (!disposed) {
					setHasError(true);
				}
			})
			.finally(() => {
				if (!disposed) {
					setIsLoading(false);
				}
			});

		return () => {
			disposed = true;
		};
	}, [economicWeekKey, enabled, plugin]);

	const eventsByDate = useMemo(() => {
		if (!enabled) {
			return {};
		}
		const filteredEvents = filterEconomicCalendarEvents(events, countries, impacts, now, showAll);
		return groupEconomicEventsByDate(filteredEvents, timeZone);
	}, [countries, enabled, events, impacts, now, showAll, timeZone]);

	return { events, eventsByDate, hasError, isLoading };
}
