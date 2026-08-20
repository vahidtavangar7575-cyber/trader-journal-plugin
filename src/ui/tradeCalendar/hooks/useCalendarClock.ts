import { useEffect, useMemo, useState } from 'react';
import { ECONOMIC_CALENDAR_SOURCE_TIME_ZONE, getWeekKey } from '../../../economicCalendar/api';
import { formatDateKey, getNextMinuteDelay } from '../calendarDates';

export interface CalendarClock {
	now: number;
	today: string;
	economicWeekKey: string;
}

export function useCalendarClock(): CalendarClock {
	const [now, setNow] = useState(() => Date.now());

	useEffect(() => {
		let timer: number | null = null;
		const scheduleRefresh = () => {
			timer = window.setTimeout(() => {
				setNow(Date.now());
				scheduleRefresh();
			}, getNextMinuteDelay());
		};
		scheduleRefresh();

		return () => {
			if (timer !== null) {
				window.clearTimeout(timer);
			}
		};
	}, []);

	return useMemo(() => {
		const date = new Date(now);
		return {
			now,
			today: formatDateKey(date),
			economicWeekKey: getWeekKey(date, ECONOMIC_CALENDAR_SOURCE_TIME_ZONE),
		};
	}, [now]);
}
