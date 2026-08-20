import type { ChangeEvent } from 'react';
import type { Translator } from '../../../i18n';
import type { TradePlanOption } from '../../../plans/types';
import type { TradeResult, TradeSide } from '../../../trades/types';
import type { TradeFormState } from '../form';

const SIDE_OPTIONS: TradeSide[] = ['long', 'short'];
const RESULT_OPTIONS: TradeResult[] = ['loss', 'win', 'breakeven'];

interface TradeIdentityFieldsProps {
	form: TradeFormState;
	isEditing: boolean;
	isLiveJournal: boolean;
	isLiveTradeClosed: boolean;
	isLoadingPlans: boolean;
	liveResult: TradeResult | null;
	planOptions: TradePlanOption[];
	symbols: string[];
	timeframes: string[];
	tr: Translator;
	onPlanChange: (planId: string) => void;
	onResultChange: (result: TradeResult) => void;
	onSideChange: (side: TradeSide) => void;
	onSymbolChange: (symbol: string) => void;
	onTimeframeChange: (timeframe: string) => void;
}

export function TradeIdentityFields({
	form,
	isEditing,
	isLiveJournal,
	isLiveTradeClosed,
	isLoadingPlans,
	liveResult,
	planOptions,
	symbols,
	timeframes,
	tr,
	onPlanChange,
	onResultChange,
	onSideChange,
	onSymbolChange,
	onTimeframeChange,
}: TradeIdentityFieldsProps) {
	return (
		<>
			<label className="trader-journal-field">
				<span>{tr('detail.symbol')}</span>
				<select
					value={form.symbol}
					onChange={(event: ChangeEvent<HTMLSelectElement>) => onSymbolChange(event.target.value)}
					disabled={isEditing}
					required
				>
					<option value="">{tr('placeholder.selectSymbol')}</option>
					{symbols.map((symbol) => (
						<option value={symbol} key={symbol}>{symbol}</option>
					))}
				</select>
			</label>

			{isLiveJournal ? (
				<label className="trader-journal-field">
					<span>{tr('detail.plan')}</span>
					<select
						value={form.planId}
						onChange={(event: ChangeEvent<HTMLSelectElement>) => onPlanChange(event.target.value)}
						disabled={isLoadingPlans}
					>
						<option value="">{tr('placeholder.noPlan')}</option>
						{planOptions.map((plan) => (
							<option value={plan.id} key={plan.id}>{formatPlanOptionLabel(plan)}</option>
						))}
					</select>
				</label>
			) : null}

			<label className="trader-journal-field">
				<span>{tr('detail.side')}</span>
				<select
					value={form.side}
					onChange={(event: ChangeEvent<HTMLSelectElement>) => onSideChange(event.target.value as TradeSide)}
				>
					{SIDE_OPTIONS.map((option) => (
						<option value={option} key={option}>
							{tr(option === 'long' ? 'option.long' : 'option.short')}
						</option>
					))}
				</select>
			</label>

			<label className="trader-journal-field">
				<span>{tr('detail.timeframe')}</span>
				<select
					value={form.timeframe}
					onChange={(event: ChangeEvent<HTMLSelectElement>) => onTimeframeChange(event.target.value)}
					required
				>
					<option value="">{tr('placeholder.selectTimeframe')}</option>
					{timeframes.map((timeframe) => (
						<option value={timeframe} key={timeframe}>{timeframe}</option>
					))}
				</select>
			</label>

			{!isLiveJournal ? (
				<label className="trader-journal-field">
					<span>{tr('detail.result')}</span>
					<select
						value={form.result}
						onChange={(event: ChangeEvent<HTMLSelectElement>) => onResultChange(event.target.value as TradeResult)}
					>
						{RESULT_OPTIONS.map((option) => (
							<option value={option} key={option}>{tr(getResultOptionKey(option))}</option>
						))}
					</select>
				</label>
			) : (
				<div className="trader-journal-field trader-journal-field--readonly">
					<span>{tr('detail.result')}</span>
					<strong>
						{!isLiveTradeClosed || liveResult === null ? '-' : tr(getResultOptionKey(liveResult))}
					</strong>
				</div>
			)}
		</>
	);
}

function formatPlanOptionLabel(plan: TradePlanOption): string {
	const endDate = plan.endDate ? ` - ${plan.endDate}` : '';
	return `${plan.symbol} / ${plan.title} / ${plan.startDate}${endDate}`;
}

function getResultOptionKey(result: TradeResult): 'option.loss' | 'option.win' | 'option.breakeven' {
	if (result === 'win') {
		return 'option.win';
	}

	return result === 'breakeven' ? 'option.breakeven' : 'option.loss';
}
