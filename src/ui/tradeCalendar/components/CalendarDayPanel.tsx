import { useState } from 'react';
import type TraderJournalPlugin from '../../../main';
import { formatTradeCount, getJournalTypeLabel, getTranslator } from '../../../i18n';
import type { TraderJournalLanguage } from '../../../settings';
import type { JournalCalendarPlan, JournalCalendarPlanDay } from '../../../plans/planIndex';
import type { JournalCalendarDay, JournalCalendarTrade } from '../../../trades/journalIndex';
import { stringifyValue } from '../../../trades/format';
import type { EconomicCalendarEvent } from '../../../economicCalendar/types';
import { TradePlanModal } from '../../TradePlanModal';
import { TraderJournalModal } from '../../TraderJournalModal';
import type { TradeCalendarFilter } from '../calendarSnapshot';
import { getPlanTitleForTrade } from '../calendarSnapshot';
import { CalendarIconButton } from './CalendarIconButton';
import { EconomicCalendarCard } from './EconomicCalendarCard';
import { PlanCalendarCard } from './PlanCalendarCard';
import { TradeCalendarCard } from './TradeCalendarCard';

interface CalendarDayPanelProps {
	economicCalendarEnabled: boolean;
	economicCalendarError: boolean;
	economicEvents: EconomicCalendarEvent[];
	economicTimeZone: string;
	isEconomicCalendarLoading: boolean;
	isLoading: boolean;
	journalTypeFilter: TradeCalendarFilter;
	language: TraderJournalLanguage;
	onFilterChange: (filter: TradeCalendarFilter) => void;
	plansById: Map<string, JournalCalendarPlan>;
	plugin: TraderJournalPlugin;
	selectedDay: JournalCalendarDay;
	selectedEconomicEvents: EconomicCalendarEvent[];
	selectedPlanDay: JournalCalendarPlanDay;
}

export function CalendarDayPanel(props: CalendarDayPanelProps) {
	const {
		economicCalendarEnabled,
		economicCalendarError,
		economicEvents,
		economicTimeZone,
		isEconomicCalendarLoading,
		isLoading,
		journalTypeFilter,
		language,
		onFilterChange,
		plansById,
		plugin,
		selectedDay,
		selectedEconomicEvents,
		selectedPlanDay,
	} = props;
	const [isEconomicCalendarExpanded, setIsEconomicCalendarExpanded] = useState(false);
	const tr = getTranslator(language);

	return (
		<section className="trader-journal-calendar__day-panel">
			<div className="trader-journal-calendar__day-header">
				<div className="trader-journal-calendar__day-count">
					{formatTradeCount(language, selectedDay.trades.length)}
				</div>
				<div className="trader-journal-calendar__actions">
					<CalendarIconButton
						icon="plus"
						label={tr('calendar.addTrade', {
							type: getJournalTypeLabel(language, journalTypeFilter).toLowerCase(),
						})}
						onClick={() => new TraderJournalModal(plugin.app, plugin, journalTypeFilter).open()}
					/>
					{journalTypeFilter === 'live' ? (
						<CalendarIconButton
							icon="clipboard-list"
							label={tr('calendar.addPlan')}
							onClick={() => new TradePlanModal(plugin.app, plugin).open()}
						/>
					) : null}
					<select
						className="trader-journal-calendar__filter"
						value={journalTypeFilter}
						aria-label={tr('calendar.filterTradeType')}
						onChange={(event) => onFilterChange(event.target.value as TradeCalendarFilter)}
					>
						<option value="live">{tr('option.live')}</option>
						<option value="backtest">{tr('option.backtest')}</option>
					</select>
				</div>
			</div>

			{isLoading ? (
				<div className="trader-journal-calendar__empty">{tr('calendar.loadingTrades')}</div>
			) : (
				<>
					{journalTypeFilter === 'live' && economicCalendarEnabled ? (
						<EconomicCalendarSection
							events={selectedEconomicEvents}
							hasAnyEvents={economicEvents.length > 0}
							hasError={economicCalendarError}
							isExpanded={isEconomicCalendarExpanded}
							isLoading={isEconomicCalendarLoading}
							language={language}
							onToggle={() => setIsEconomicCalendarExpanded((expanded) => !expanded)}
							timeZone={economicTimeZone}
						/>
					) : null}
					{journalTypeFilter === 'live' && selectedPlanDay.plans.length > 0 ? (
						<section className="trader-journal-calendar__section">
							<div className="trader-journal-calendar__section-title">{tr('calendar.plans')}</div>
							<div className="trader-journal-calendar__trade-list">
								{selectedPlanDay.plans.map((plan) => (
									<PlanCalendarCard
										language={language}
										plugin={plugin}
										plan={plan}
										linkedTrades={getLinkedTrades(selectedDay.trades, plan.id)}
										key={`${plan.filePath}-${plan.id}`}
									/>
								))}
							</div>
						</section>
					) : null}
					<section className="trader-journal-calendar__section">
						<div className="trader-journal-calendar__section-title">{tr('calendar.trades')}</div>
						{selectedDay.trades.length > 0 ? (
							<div className="trader-journal-calendar__trade-list">
								{selectedDay.trades.map((trade) => (
									<TradeCalendarCard
										language={language}
										plugin={plugin}
										planTitle={getPlanTitleForTrade(trade, plansById)}
										trade={trade}
										key={`${trade.filePath}-${trade.id}`}
									/>
								))}
							</div>
						) : (
							<div className="trader-journal-calendar__empty">{tr('calendar.noTrades')}</div>
						)}
					</section>
				</>
			)}
		</section>
	);
}

function EconomicCalendarSection({
	events,
	hasAnyEvents,
	hasError,
	isExpanded,
	isLoading,
	language,
	onToggle,
	timeZone,
}: {
	events: EconomicCalendarEvent[];
	hasAnyEvents: boolean;
	hasError: boolean;
	isExpanded: boolean;
	isLoading: boolean;
	language: TraderJournalLanguage;
	onToggle: () => void;
	timeZone: string;
}) {
	const tr = getTranslator(language);
	return (
		<section className="trader-journal-calendar__section">
			<button
				type="button"
				className="trader-journal-calendar__collapsible-title"
				aria-expanded={isExpanded}
				aria-label={isExpanded ? tr('calendar.collapseEconomicNews') : tr('calendar.expandEconomicNews')}
				onClick={onToggle}
			>
				<span className="trader-journal-calendar__section-title">{tr('calendar.economicNews')}</span>
				<span aria-hidden="true">{isExpanded ? '⌄' : '›'}</span>
			</button>
			{!isExpanded ? null : isLoading && !hasAnyEvents ? (
				<div className="trader-journal-calendar__empty">{tr('calendar.loadingEconomicNews')}</div>
			) : hasError && !hasAnyEvents ? (
				<div className="trader-journal-calendar__empty">{tr('calendar.economicNewsError')}</div>
			) : events.length > 0 ? (
				<div className="trader-journal-calendar__trade-list">
					{events.map((event, index) => (
						<EconomicCalendarCard
							event={event}
							language={language}
							timeZone={timeZone}
							key={`${event.date}-${event.country}-${event.title}-${index}`}
						/>
					))}
				</div>
			) : (
				<div className="trader-journal-calendar__empty">{tr('calendar.noEconomicNews')}</div>
			)}
		</section>
	);
}

function getLinkedTrades(trades: JournalCalendarTrade[], planId: string): JournalCalendarTrade[] {
	return trades.filter((trade) => stringifyValue(trade.trade.plan_id) === planId);
}
