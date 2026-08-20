import { useEffect, useMemo, useRef, useState } from 'react';
import type TraderJournalPlugin from '../../main';
import { getLocale, getTranslator, getWeekdayLabels } from '../../i18n';
import { createPlanDaysForRange } from '../../plans/planIndex';
import type { JournalCalendarPlanDay } from '../../plans/planIndex';
import type { JournalCalendarDay } from '../../trades/journalIndex';
import {
	addMonths,
	formatDateKey,
	formatMonthLabel,
	getCalendarDates,
	getMonthDates,
	getMonthKey,
	moveSelectedDateToMonth,
} from './calendarDates';
import {
	createPlansById,
	filterSnapshotByJournalType,
	getAutoSelectedDate,
} from './calendarSnapshot';
import type { TradeCalendarFilter } from './calendarSnapshot';
import { CalendarDateButton, HorizontalCalendarDateButton } from './components/CalendarDateButtons';
import { CalendarDayPanel } from './components/CalendarDayPanel';
import { useCalendarClock } from './hooks/useCalendarClock';
import { useCalendarData } from './hooks/useCalendarData';
import { useCalendarSettings } from './hooks/useCalendarSettings';
import { useEconomicCalendar } from './hooks/useEconomicCalendar';
import {
	type CalendarScrollIntent,
	useHorizontalCalendarScroll,
} from './hooks/useHorizontalCalendarScroll';

export function TradeCalendar({ plugin }: { plugin: TraderJournalPlugin }) {
	const journalData = useCalendarData(plugin);
	const { economicWeekKey, now, today } = useCalendarClock();
	const { calendarDisplayMode, language } = useCalendarSettings(plugin);
	const economicCalendar = useEconomicCalendar(plugin, {
		countries: plugin.settings.economicCalendarCountries,
		economicWeekKey,
		enabled: plugin.settings.economicCalendarEnabled,
		impacts: plugin.settings.economicCalendarImpacts,
		now,
		showAll: plugin.settings.economicCalendarShowAll,
		timeZone: plugin.settings.economicCalendarTimeZone,
	});
	const [selectedDate, setSelectedDate] = useState(today);
	const [visibleMonth, setVisibleMonth] = useState(getMonthKey(today));
	const [journalTypeFilter, setJournalTypeFilter] = useState<TradeCalendarFilter>('live');
	const [scrollIntent, setScrollIntent] = useState<CalendarScrollIntent>(() => ({
		align: 'center',
		date: today,
		requestId: 0,
	}));
	const initialSelectionAppliedRef = useRef(false);
	const previousFilterRef = useRef<TradeCalendarFilter>(journalTypeFilter);
	const horizontalCalendarRef = useRef<HTMLDivElement>(null);
	const scrollRequestIdRef = useRef(0);
	const tr = getTranslator(language);
	const locale = getLocale(language);
	const weekdayLabels = getWeekdayLabels(language);
	useHorizontalCalendarScroll(horizontalCalendarRef, calendarDisplayMode, scrollIntent);

	const filteredSnapshot = useMemo(
		() => filterSnapshotByJournalType(journalData.trades, journalTypeFilter),
		[journalData.trades, journalTypeFilter],
	);
	const calendarDates = useMemo(() => getCalendarDates(visibleMonth), [visibleMonth]);
	const horizontalCalendarDates = useMemo(() => getMonthDates(visibleMonth), [visibleMonth]);
	const visiblePlanDates = calendarDisplayMode === 'horizontal_calendar' ? horizontalCalendarDates : calendarDates;
	const visiblePlanRangeStart = visiblePlanDates[0]?.date ?? `${visibleMonth}-01`;
	const visiblePlanRangeEnd = visiblePlanDates[visiblePlanDates.length - 1]?.date ?? visiblePlanRangeStart;
	const planDaysByDate = useMemo(
		() =>
			createPlanDaysForRange(
				journalData.plans.plans,
				visiblePlanRangeStart,
				visiblePlanRangeEnd,
				today,
			),
		[journalData.plans, today, visiblePlanRangeEnd, visiblePlanRangeStart],
	);
	const plansById = useMemo(() => createPlansById(journalData.plans), [journalData.plans]);

	useEffect(() => {
		if (journalData.isLoading) {
			return;
		}
		const filterChanged = previousFilterRef.current !== journalTypeFilter;
		previousFilterRef.current = journalTypeFilter;
		if (!filterChanged && initialSelectionAppliedRef.current) {
			return;
		}

		initialSelectionAppliedRef.current = true;
		const targetDate = getAutoSelectedDate(journalTypeFilter, filteredSnapshot, journalData.plans, today);
		if (targetDate && targetDate !== selectedDate) {
			setSelectedDate(targetDate);
			setVisibleMonth(getMonthKey(targetDate));
			requestScroll(targetDate);
		}
	}, [filteredSnapshot, journalData.isLoading, journalData.plans, journalTypeFilter, selectedDate, today]);

	const selectedDay = filteredSnapshot.daysByDate[selectedDate] ?? createEmptyDay(selectedDate);
	const selectedPlanDay =
		journalTypeFilter === 'live'
			? planDaysByDate[selectedDate] ?? createEmptyPlanDay(selectedDate)
			: createEmptyPlanDay(selectedDate);

	function requestScroll(date: string, align: ScrollLogicalPosition = 'center') {
		scrollRequestIdRef.current += 1;
		setScrollIntent({ align, date, requestId: scrollRequestIdRef.current });
	}

	function selectDate(date: string) {
		setSelectedDate(date);
		setVisibleMonth(getMonthKey(date));
		requestScroll(date);
	}

	function goToToday() {
		const nextToday = formatDateKey(new Date());
		setSelectedDate(nextToday);
		setVisibleMonth(getMonthKey(nextToday));
		requestScroll(nextToday);
	}

	function goToAdjacentMonth(offset: number) {
		const nextMonth = addMonths(visibleMonth, offset);
		const nextSelectedDate = moveSelectedDateToMonth(selectedDate, nextMonth);
		setVisibleMonth(nextMonth);
		setSelectedDate(nextSelectedDate);
		requestScroll(nextSelectedDate);
	}

	return (
		<div className="trader-journal-calendar">
			<header className="trader-journal-calendar__header">
				<button
					type="button"
					className="trader-journal-calendar__nav-button"
					aria-label={tr('calendar.previousMonth')}
					onClick={() => goToAdjacentMonth(-1)}
				>
					‹
				</button>
				<div className="trader-journal-calendar__month">{formatMonthLabel(visibleMonth, locale)}</div>
				<button
					type="button"
					className="trader-journal-calendar__nav-button"
					aria-label={tr('calendar.nextMonth')}
					onClick={() => goToAdjacentMonth(1)}
				>
					›
				</button>
				<button type="button" className="trader-journal-calendar__today-button" onClick={goToToday}>
					{tr('calendar.today')}
				</button>
			</header>

			{calendarDisplayMode === 'horizontal_calendar' ? (
				<div
					className="trader-journal-horizontal-calendar"
					aria-label={tr('calendar.horizontalAria')}
					ref={horizontalCalendarRef}
				>
					{horizontalCalendarDates.map((calendarDate) => (
						<HorizontalCalendarDateButton
							calendarDate={calendarDate}
							day={filteredSnapshot.daysByDate[calendarDate.date]}
							economicNewsCount={economicCalendar.eventsByDate[calendarDate.date]?.length ?? 0}
							planDay={journalTypeFilter === 'live' ? planDaysByDate[calendarDate.date] : undefined}
							isSelected={calendarDate.date === selectedDate}
							isToday={calendarDate.date === today}
							key={calendarDate.date}
							language={language}
							onSelect={selectDate}
						/>
					))}
				</div>
			) : (
				<>
					<div className="trader-journal-calendar__weekday-row">
						{weekdayLabels.map((weekday) => (
							<div className="trader-journal-calendar__weekday" key={weekday}>
								{weekday}
							</div>
						))}
					</div>
					<div className="trader-journal-calendar__grid">
						{calendarDates.map((calendarDate) => (
							<CalendarDateButton
								calendarDate={calendarDate}
								day={filteredSnapshot.daysByDate[calendarDate.date]}
								economicNewsCount={economicCalendar.eventsByDate[calendarDate.date]?.length ?? 0}
								planDay={journalTypeFilter === 'live' ? planDaysByDate[calendarDate.date] : undefined}
								isSelected={calendarDate.date === selectedDate}
								isToday={calendarDate.date === today}
								key={calendarDate.date}
								language={language}
								onSelect={selectDate}
							/>
						))}
					</div>
				</>
			)}

			<CalendarDayPanel
				economicCalendarEnabled={plugin.settings.economicCalendarEnabled}
				economicCalendarError={economicCalendar.hasError}
				economicEvents={economicCalendar.events}
				economicTimeZone={plugin.settings.economicCalendarTimeZone}
				isEconomicCalendarLoading={economicCalendar.isLoading}
				isLoading={journalData.isLoading}
				journalTypeFilter={journalTypeFilter}
				language={language}
				onFilterChange={setJournalTypeFilter}
				plansById={plansById}
				plugin={plugin}
				selectedDay={selectedDay}
				selectedEconomicEvents={economicCalendar.eventsByDate[selectedDate] ?? []}
				selectedPlanDay={selectedPlanDay}
			/>
		</div>
	);
}

function createEmptyDay(date: string): JournalCalendarDay {
	return { date, backtestCount: 0, liveCount: 0, trades: [] };
}

function createEmptyPlanDay(date: string): JournalCalendarPlanDay {
	return { date, openPlanCount: 0, closedPlanCount: 0, cancelledPlanCount: 0, plans: [] };
}
