import { useEffect } from 'react';
import type { RefObject } from 'react';
import type { CalendarDisplayMode } from '../../../settings';

export interface CalendarScrollIntent {
	align: ScrollLogicalPosition;
	date: string;
	requestId: number;
}

export function useHorizontalCalendarScroll(
	calendarRef: RefObject<HTMLDivElement>,
	displayMode: CalendarDisplayMode,
	intent: CalendarScrollIntent | null,
): void {
	useEffect(() => {
		if (displayMode !== 'horizontal_calendar' || !intent) {
			return;
		}
		const target = calendarRef.current?.querySelector<HTMLElement>(`[data-date="${intent.date}"]`);
		if (!target) {
			return;
		}
		const timer = window.setTimeout(() => {
			target.scrollIntoView({ behavior: 'auto', block: 'nearest', inline: intent.align });
		}, 0);
		return () => window.clearTimeout(timer);
	}, [calendarRef, displayMode, intent]);
}
