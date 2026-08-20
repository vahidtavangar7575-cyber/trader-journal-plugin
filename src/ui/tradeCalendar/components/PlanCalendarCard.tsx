import { Notice } from 'obsidian';
import type TraderJournalPlugin from '../../../main';
import type { JournalCalendarPlan } from '../../../plans/planIndex';
import type { JournalCalendarTrade } from '../../../trades/journalIndex';
import { formatSide, stringifyValue } from '../../../trades/format';
import { getTranslator } from '../../../i18n';
import type { TraderJournalLanguage } from '../../../settings';
import { TradePlanModal } from '../../TradePlanModal';
import { CalendarIconButton } from './CalendarIconButton';

export function PlanCalendarCard({
	language,
	linkedTrades,
	plugin,
	plan,
}: {
	language: TraderJournalLanguage;
	linkedTrades: JournalCalendarTrade[];
	plugin: TraderJournalPlugin;
	plan: JournalCalendarPlan;
}) {
	const tr = getTranslator(language);
	const openPlanFile = async () => {
		try {
			await plugin.app.workspace.openLinkText(plan.filePath, '', false);
		} catch (error) {
			console.error('Trader Journal failed to open plan note', error);
			new Notice(tr('calendar.openPlanNoteError'));
		}
	};
	const openEditModal = () => {
		new TradePlanModal(plugin.app, plugin, plan.plan, plan.filePath).open();
	};

	return (
		<div
			className={[
				'trader-journal-calendar-card',
				'trader-journal-calendar-card--plan',
				`trader-journal-calendar-card--plan-${plan.status}`,
			].join(' ')}
		>
			<div className="trader-journal-calendar-card__head">
				<button
					type="button"
					className="trader-journal-calendar-card__open"
					aria-label={`${tr('dashboard.openNote')}: ${plan.symbol}`}
					title={tr('dashboard.openNote')}
					onClick={() => void openPlanFile()}
				>
					<strong className="trader-journal-calendar-card__symbol">{plan.symbol}</strong>
				</button>
				<div className="trader-journal-calendar-card__head-meta">
					<CalendarIconButton
						icon="pencil"
						label={tr('modal.editTradePlan')}
						onClick={openEditModal}
						variant="plain"
					/>
					<span
						className={[
							'trader-journal-calendar-card__status',
							`trader-journal-calendar-card__status--plan-${plan.status}`,
						].join(' ')}
					>
						{getPlanStatusLabel(tr, plan.status)}
					</span>
				</div>
			</div>
			<div className="trader-journal-calendar-card__body">
				<span className="trader-journal-calendar-card__meta">
					{[plan.title, plan.setup, plan.timeframes.join(', ')].filter(Boolean).join(' · ')}
				</span>
				<span className="trader-journal-calendar-card__result">{formatPlanDateRange(plan)}</span>
			</div>
			{plan.notes ? <div className="trader-journal-calendar-card__notes">{plan.notes}</div> : null}
			<div className="trader-journal-calendar-card__plan-meta">
				{[
					plan.imageCount ? tr('calendar.imageCount', { count: plan.imageCount }) : '',
					plan.linkedTradeCount ? tr('calendar.linkedTradeCount', { count: plan.linkedTradeCount }) : '',
				]
					.filter(Boolean)
					.join(' · ')}
			</div>
			{linkedTrades.length > 0 ? (
				<div className="trader-journal-calendar-card__linked-trades">
					{linkedTrades.map((trade) => (
						<span key={`${trade.filePath}-${trade.id}`}>
							{[
								formatTradeTime(trade.createdAt),
								formatSide(trade.trade.side, language),
								trade.setup,
								trade.rr,
							]
								.filter(Boolean)
								.join(' / ')}
						</span>
					))}
				</div>
			) : null}
		</div>
	);
}

function getPlanStatusLabel(tr: ReturnType<typeof getTranslator>, status: JournalCalendarPlan['status']): string {
	if (status === 'closed') {
		return tr('option.closed');
	}
	if (status === 'cancelled') {
		return tr('option.cancelled');
	}
	return tr('option.open');
}

function formatPlanDateRange(plan: JournalCalendarPlan): string {
	return [plan.startDate, plan.endDate].filter(Boolean).join(' - ');
}

function formatTradeTime(value: string): string {
	const date = new Date(value);
	if (Number.isNaN(date.getTime())) {
		return stringifyValue(value);
	}
	return date.toLocaleTimeString(undefined, {
		hour: '2-digit',
		minute: '2-digit',
		hour12: false,
	});
}
