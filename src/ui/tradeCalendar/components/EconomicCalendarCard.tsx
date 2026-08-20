import { formatEconomicEventTime } from '../../../economicCalendar/calendar';
import type { EconomicCalendarEvent, EconomicImpact } from '../../../economicCalendar/types';
import { getLocale, getTranslator } from '../../../i18n';
import type { TraderJournalLanguage } from '../../../settings';

const ECONOMIC_IMPACT_TRANSLATION_KEYS: Record<
	EconomicImpact,
	'impact.high' | 'impact.medium' | 'impact.low' | 'impact.holiday'
> = {
	High: 'impact.high',
	Medium: 'impact.medium',
	Low: 'impact.low',
	Holiday: 'impact.holiday',
};

export function EconomicCalendarCard({
	event,
	language,
	timeZone,
}: {
	event: EconomicCalendarEvent;
	language: TraderJournalLanguage;
	timeZone: string;
}) {
	const tr = getTranslator(language);
	const locale = getLocale(language);
	const forecast = event.forecast || tr('calendar.notAvailable');
	const previous = event.previous || tr('calendar.notAvailable');

	return (
		<div
			className={[
				'trader-journal-economic-card',
				`trader-journal-economic-card--${event.impact.toLowerCase()}`,
			].join(' ')}
		>
			<div className="trader-journal-economic-card__head">
				<strong className="trader-journal-economic-card__country">{event.country}</strong>
				<span className="trader-journal-economic-card__time">
					{formatEconomicEventTime(event, timeZone, locale)}
				</span>
			</div>
			<div className="trader-journal-economic-card__title">{event.title}</div>
			<div className="trader-journal-economic-card__meta">
				<span className="trader-journal-economic-card__impact">
					{tr(ECONOMIC_IMPACT_TRANSLATION_KEYS[event.impact])}
				</span>
				<span>{tr('calendar.forecast', { value: forecast })}</span>
				<span>{tr('calendar.previous', { value: previous })}</span>
			</div>
		</div>
	);
}
