import { Notice } from 'obsidian';
import type TraderJournalPlugin from '../../../main';
import { getTranslator } from '../../../i18n';
import { formatResult, formatSide, stringifyValue } from '../../../trades/format';
import type { JournalCalendarTrade } from '../../../trades/journalIndex';
import { openJournalTrade } from '../../../trades/openTrade';
import type { TraderJournalLanguage } from '../../../settings';
import { TradeReviewModal } from '../../TradeReviewModal';
import { TraderJournalModal } from '../../TraderJournalModal';
import { CalendarIconButton } from './CalendarIconButton';

export function TradeCalendarCard({
	language,
	planTitle,
	plugin,
	trade,
}: {
	language: TraderJournalLanguage;
	planTitle: string;
	plugin: TraderJournalPlugin;
	trade: JournalCalendarTrade;
}) {
	const tr = getTranslator(language);
	const side = formatSide(trade.trade.side, language);
	const result = formatResult(trade.trade.result, language);
	const openTradeFile = async () => {
		try {
			await openJournalTrade(plugin, trade);
		} catch (error) {
			console.error('Trader Journal failed to open trade note', error);
			new Notice(tr('calendar.openTradeNoteError'));
		}
	};
	const openEditModal = () => {
		new TraderJournalModal(plugin.app, plugin, 'live', trade.trade, trade.filePath).open();
	};
	const openReviewModal = () => {
		new TradeReviewModal(plugin.app, plugin, trade.trade, trade.filePath).open();
	};

	return (
		<div
			className={[
				'trader-journal-calendar-card',
				trade.sideKey ? `trader-journal-calendar-card--${trade.sideKey}` : '',
			].join(' ')}
		>
			<div className="trader-journal-calendar-card__head">
				<button
					type="button"
					className="trader-journal-calendar-card__open"
					aria-label={`${tr('dashboard.openNote')}: ${trade.symbol}`}
					title={tr('dashboard.openNote')}
					onClick={() => void openTradeFile()}
				>
					<strong className="trader-journal-calendar-card__symbol">{trade.symbol}</strong>
				</button>
				<div className="trader-journal-calendar-card__head-meta">
					{trade.journalType === 'live' && trade.status !== 'closed' ? (
						<CalendarIconButton
							icon="pencil"
							label={tr('modal.editLiveTrade')}
							onClick={openEditModal}
							variant="plain"
						/>
					) : null}
					{trade.journalType === 'live' && trade.status === 'closed' ? (
						<CalendarIconButton
							icon={trade.reviewed ? 'clipboard-check' : 'clipboard-pen'}
							label={tr('action.reviewTrade')}
							onClick={openReviewModal}
							variant="plain"
						/>
					) : null}
					{trade.status ? (
						<span
							className={[
								'trader-journal-calendar-card__status',
								`trader-journal-calendar-card__status--${trade.status}`,
							].join(' ')}
						>
							{trade.status === 'open' ? tr('option.open') : tr('option.closed')}
						</span>
					) : null}
					{trade.journalType === 'live' && trade.status === 'closed' && !trade.reviewed ? (
						<span className="trader-journal-calendar-card__status trader-journal-calendar-card__status--review">
							{tr('dashboard.unreviewed')}
						</span>
					) : null}
					<span className="trader-journal-calendar-card__time">{formatTradeTime(trade.createdAt)}</span>
				</div>
			</div>
			<div className="trader-journal-calendar-card__body">
				<span className="trader-journal-calendar-card__meta">
					{[side, trade.setup, trade.timeframe].filter(Boolean).join(' · ') || trade.file.basename}
				</span>
				<span
					className={[
						'trader-journal-calendar-card__result',
						trade.resultKey ? `trader-journal-calendar-card__result--${trade.resultKey}` : '',
					].join(' ')}
				>
					{[result, trade.rr].filter(Boolean).join(' / ') || '-'}
				</span>
			</div>
			{trade.notes ? <div className="trader-journal-calendar-card__notes">{trade.notes}</div> : null}
			{planTitle ? (
				<div className="trader-journal-calendar-card__plan">
					{tr('detail.plan')}: {planTitle}
				</div>
			) : null}
		</div>
	);
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
