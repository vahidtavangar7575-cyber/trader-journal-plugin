import { useEffect, useState } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import type TraderJournalPlugin from '../../../main';
import { listTradePlanOptions } from '../../../plans/storage';
import type { TradePlanOption } from '../../../plans/types';
import { normalizeSymbol } from '../../../settings';
import { listTradeSetups } from '../../../setups/storage';
import type { TradeSetupDefinition } from '../../../setups/types';
import { stringifyValue } from '../../../trades/format';
import type { TradeEntry } from '../../../trades/types';
import { getDateTimeDatePart, getTodayDateInput } from '../dateTime';
import type { TradeFormState } from '../form';

interface UseTradeReferenceDataArgs {
	form: TradeFormState;
	initialTrade: TradeEntry | undefined;
	isEditing: boolean;
	isLiveJournal: boolean;
	plugin: TraderJournalPlugin;
	setForm: Dispatch<SetStateAction<TradeFormState>>;
}

export interface TradeReferenceData {
	isLoadingPlans: boolean;
	isLoadingSetups: boolean;
	planOptions: TradePlanOption[];
	setupOptions: TradeSetupDefinition[];
}

export function useTradeReferenceData({
	form,
	initialTrade,
	isEditing,
	isLiveJournal,
	plugin,
	setForm,
}: UseTradeReferenceDataArgs): TradeReferenceData {
	const [planOptions, setPlanOptions] = useState<TradePlanOption[]>([]);
	const [isLoadingPlans, setIsLoadingPlans] = useState(isLiveJournal);
	const [setupOptions, setSetupOptions] = useState<TradeSetupDefinition[]>([]);
	const [isLoadingSetups, setIsLoadingSetups] = useState(true);

	useEffect(() => {
		let disposed = false;
		void listTradeSetups(plugin)
			.then((setups) => {
				if (disposed) {
					return;
				}

				const initialSetupId = stringifyValue(initialTrade?.setup_id);
				const initialSetupName = stringifyValue(initialTrade?.setup).toLocaleLowerCase();
				const matchingSetup = initialSetupId
					? setups.find((setup) => setup.id === initialSetupId)
					: setups.find((setup) => setup.name.toLocaleLowerCase() === initialSetupName);
				setSetupOptions(setups);
				if (matchingSetup && !initialSetupId) {
					setForm((currentForm) => ({
						...currentForm,
						setupId: currentForm.setupId || matchingSetup.id,
						setup: currentForm.setupId ? currentForm.setup : matchingSetup.name,
					}));
				}
			})
			.catch((loadError: unknown) => {
				console.error('Trader Journal failed to load trade setups', loadError);
			})
			.finally(() => {
				if (!disposed) {
					setIsLoadingSetups(false);
				}
			});

		return () => {
			disposed = true;
		};
	}, [initialTrade, plugin, setForm]);

	useEffect(() => {
		if (!isLiveJournal) {
			return;
		}

		let disposed = false;
		const symbol = normalizeSymbol(form.symbol);
		const date = getDateTimeDatePart(form.openedAt) || getTodayDateInput();
		setIsLoadingPlans(true);
		void listTradePlanOptions(plugin, {
			symbol,
			date,
			includePlanId: isEditing ? form.planId : undefined,
		})
			.then((options) => {
				if (!disposed) {
					setPlanOptions(options);
				}
			})
			.catch((loadError: unknown) => {
				console.error('Trader Journal failed to load trade plan options', loadError);
				if (!disposed) {
					setPlanOptions([]);
				}
			})
			.finally(() => {
				if (!disposed) {
					setIsLoadingPlans(false);
				}
			});

		return () => {
			disposed = true;
		};
	}, [form.openedAt, form.planId, form.symbol, isEditing, isLiveJournal, plugin]);

	return {
		isLoadingPlans,
		isLoadingSetups,
		planOptions,
		setupOptions,
	};
}
