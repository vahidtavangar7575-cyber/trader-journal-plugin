import type { ChangeEvent } from 'react';
import type { Translator } from '../../../i18n';
import { formatDuration } from '../../../trades/format';
import { formatComputedRr } from '../form';
import type { TradeFormState } from '../form';

interface TradeExecutionFieldsProps {
	form: TradeFormState;
	holdingTime: number | null;
	isEditing: boolean;
	isLiveJournal: boolean;
	isLiveTradeClosed: boolean;
	liveRr: number | null;
	tr: Translator;
	onClosedAtChange: (value: string) => void;
	onEntryPriceChange: (value: string) => void;
	onExitPriceChange: (value: string) => void;
	onOpenedAtChange: (value: string) => void;
	onRrChange: (value: string) => void;
	onStopLossChange: (value: string) => void;
	onTakeProfitChange: (value: string) => void;
}

export function TradeExecutionFields({
	form,
	holdingTime,
	isEditing,
	isLiveJournal,
	isLiveTradeClosed,
	liveRr,
	tr,
	onClosedAtChange,
	onEntryPriceChange,
	onExitPriceChange,
	onOpenedAtChange,
	onRrChange,
	onStopLossChange,
	onTakeProfitChange,
}: TradeExecutionFieldsProps) {
	return (
		<>
			<label className="trader-journal-field">
				<span>{isLiveJournal ? tr('detail.entryPrice') : tr('detail.rr')}</span>
				{isLiveJournal ? (
					<input type="number" step="any" value={form.entryPrice} placeholder="100"
						onChange={(event: ChangeEvent<HTMLInputElement>) => onEntryPriceChange(event.target.value)} required />
				) : (
					<input type="number" step="0.01" value={form.rr} placeholder="2"
						onChange={(event: ChangeEvent<HTMLInputElement>) => onRrChange(event.target.value)} required />
				)}
			</label>

			{isLiveJournal ? (
				<>
					<label className="trader-journal-field">
						<span>{tr('detail.stopLoss')}</span>
						<input type="number" step="any" value={form.stopLoss} placeholder="99"
							onChange={(event: ChangeEvent<HTMLInputElement>) => onStopLossChange(event.target.value)} required />
					</label>
					<label className="trader-journal-field">
						<span>{tr('detail.exitPrice')}</span>
						<input type="number" step="any" value={form.exitPrice} placeholder="102"
							disabled={!isLiveTradeClosed}
							onChange={(event: ChangeEvent<HTMLInputElement>) => onExitPriceChange(event.target.value)}
							required={isLiveTradeClosed} />
					</label>
					<label className="trader-journal-field">
						<span>{tr('detail.takeProfit')}</span>
						<input type="number" step="any" value={form.takeProfit} placeholder="104"
							onChange={(event: ChangeEvent<HTMLInputElement>) => onTakeProfitChange(event.target.value)} required />
					</label>
				</>
			) : null}

			<label className="trader-journal-field">
				<span>{tr('detail.openedAt')}</span>
				<input type="datetime-local" value={form.openedAt}
					onChange={(event: ChangeEvent<HTMLInputElement>) => onOpenedAtChange(event.target.value)}
					disabled={isEditing} required />
			</label>
			<label className="trader-journal-field">
				<span>{tr('detail.closedAt')}</span>
				<input type="datetime-local" value={form.closedAt}
					onChange={(event: ChangeEvent<HTMLInputElement>) => onClosedAtChange(event.target.value)}
					required={!isLiveJournal} />
			</label>
			<div className="trader-journal-field trader-journal-field--readonly">
				<span>{tr('detail.holdingTime')}</span>
				<strong>{formatDuration(holdingTime) || '-'}</strong>
			</div>
			{isLiveJournal ? (
				<div className="trader-journal-field trader-journal-field--readonly">
					<span>RR</span>
					<strong>{liveRr === null ? '-' : `${formatComputedRr(liveRr)}R`}</strong>
				</div>
			) : null}
		</>
	);
}
