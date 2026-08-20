import type { TraderJournalLanguage } from '../../../settings';
import { getLocale, getTranslator } from '../../../i18n';
import type { JournalCalendarDay } from '../../../trades/journalIndex';
import type { JournalCalendarPlanDay } from '../../../plans/planIndex';
import type { CalendarDateCell } from '../calendarDates';
import { parseDateKey } from '../calendarDates';

interface CalendarDateButtonProps {
	calendarDate: CalendarDateCell;
	day: JournalCalendarDay | undefined;
	economicNewsCount: number;
	planDay: JournalCalendarPlanDay | undefined;
	isSelected: boolean;
	isToday: boolean;
	language: TraderJournalLanguage;
	onSelect: (date: string) => void;
}

export function CalendarDateButton(props: CalendarDateButtonProps) {
	const { calendarDate, day, economicNewsCount, planDay, isSelected, isToday, language, onSelect } = props;
	const label = createDateLabel(language, calendarDate.date, day, planDay, economicNewsCount);

	return (
		<button
			type="button"
			className={[
				'trader-journal-calendar-day',
				calendarDate.inMonth ? '' : 'trader-journal-calendar-day--muted',
				isSelected ? 'trader-journal-calendar-day--selected' : '',
				isToday ? 'trader-journal-calendar-day--today' : '',
			]
				.filter(Boolean)
				.join(' ')}
			aria-label={label}
			aria-current={isToday ? 'date' : undefined}
			aria-pressed={isSelected}
			title={label}
			data-date={calendarDate.date}
			onClick={() => onSelect(calendarDate.date)}
		>
			<span className="trader-journal-calendar-day__number">{calendarDate.dayNumber}</span>
			<CalendarDotSummary day={day} planDay={planDay} hasEconomicNews={economicNewsCount > 0} />
		</button>
	);
}

export function HorizontalCalendarDateButton(props: CalendarDateButtonProps) {
	const { calendarDate, day, economicNewsCount, planDay, isSelected, isToday, language, onSelect } = props;
	const locale = getLocale(language);
	const date = parseDateKey(calendarDate.date);
	const weekdayLabel = date
		? date.toLocaleDateString(locale, { weekday: 'short' })
		: calendarDate.date.slice(5);
	const label = createDateLabel(language, calendarDate.date, day, planDay, economicNewsCount);

	return (
		<button
			type="button"
			className={[
				'trader-journal-horizontal-calendar-day',
				isSelected ? 'trader-journal-horizontal-calendar-day--selected' : '',
				isToday ? 'trader-journal-horizontal-calendar-day--today' : '',
			]
				.filter(Boolean)
				.join(' ')}
			aria-label={label}
			aria-current={isToday ? 'date' : undefined}
			aria-pressed={isSelected}
			title={label}
			data-date={calendarDate.date}
			onClick={() => onSelect(calendarDate.date)}
		>
			<span className="trader-journal-horizontal-calendar-day__weekday">{weekdayLabel}</span>
			<span className="trader-journal-horizontal-calendar-day__number">{calendarDate.dayNumber}</span>
			<CalendarDotSummary day={day} planDay={planDay} hasEconomicNews={economicNewsCount > 0} />
		</button>
	);
}

function CalendarDotSummary({
	day,
	hasEconomicNews,
	planDay,
}: {
	day: JournalCalendarDay | undefined;
	hasEconomicNews: boolean;
	planDay: JournalCalendarPlanDay | undefined;
}) {
	return (
		<div className="trader-journal-calendar-dots" aria-hidden="true">
			{day?.backtestCount ? (
				<span className="trader-journal-calendar-dot trader-journal-calendar-dot--backtest" />
			) : null}
			{day?.liveCount ? (
				<span className="trader-journal-calendar-dot trader-journal-calendar-dot--live" />
			) : null}
			{planDay && getPlanCount(planDay) > 0 ? (
				<span className="trader-journal-calendar-dot trader-journal-calendar-dot--plan" />
			) : null}
			{hasEconomicNews ? (
				<span className="trader-journal-calendar-dot trader-journal-calendar-dot--economic-news" />
			) : null}
		</div>
	);
}

function createDateLabel(
	language: TraderJournalLanguage,
	date: string,
	day: JournalCalendarDay | undefined,
	planDay: JournalCalendarPlanDay | undefined,
	economicNewsCount: number,
): string {
	const tr = getTranslator(language);
	const parts = [date];
	if (day?.backtestCount) {
		parts.push(`${day.backtestCount} ${tr('option.backtest').toLowerCase()}`);
	}
	if (day?.liveCount) {
		parts.push(`${day.liveCount} ${tr('option.live').toLowerCase()}`);
	}
	if (planDay && getPlanCount(planDay) > 0) {
		parts.push(`${getPlanCount(planDay)} ${tr('calendar.plans').toLowerCase()}`);
	}
	if (economicNewsCount > 0) {
		parts.push(tr('calendar.economicNewsCount', { count: economicNewsCount }));
	}
	return parts.join(', ');
}

function getPlanCount(planDay: JournalCalendarPlanDay): number {
	return planDay.openPlanCount + planDay.closedPlanCount + planDay.cancelledPlanCount;
}
