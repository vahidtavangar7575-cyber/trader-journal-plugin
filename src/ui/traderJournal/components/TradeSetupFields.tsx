import type { ChangeEvent } from 'react';
import type { Translator } from '../../../i18n';
import { isSetupAvailableForSymbol } from '../../../setups/storage';
import type { TradeSetupDefinition } from '../../../setups/types';
import type { TradeFormState } from '../form';

interface TradeSetupFieldsProps {
	form: TradeFormState;
	isLiveJournal: boolean;
	isLoadingSetups: boolean;
	setupOptions: TradeSetupDefinition[];
	tr: Translator;
	onSetupChange: (setupId: string) => void;
	onTagsChange: (tags: string) => void;
}

export function TradeSetupFields({
	form,
	isLiveJournal,
	isLoadingSetups,
	setupOptions,
	tr,
	onSetupChange,
	onTagsChange,
}: TradeSetupFieldsProps) {
	const availableSetups = setupOptions.filter(
		(setup) =>
			(setup.status === 'active' || setup.id === form.setupId) &&
			(isSetupAvailableForSymbol(setup, form.symbol) || setup.id === form.setupId),
	);

	return (
		<>
			<label className="trader-journal-field">
				<span>{tr('detail.setup')}</span>
				<select value={form.setupId}
					onChange={(event: ChangeEvent<HTMLSelectElement>) => onSetupChange(event.target.value)}
					disabled={isLoadingSetups || (isLiveJournal && Boolean(form.planId))} required>
					<option value="">
						{isLoadingSetups ? tr('placeholder.loadingSetups') : tr('placeholder.selectSetup')}
					</option>
					{availableSetups.map((setup) => (
						<option value={setup.id} key={setup.id}>
							{setup.name}{setup.status === 'archived' ? ` (${tr('option.archived')})` : ''}
						</option>
					))}
				</select>
			</label>
			{isLiveJournal ? null : (
				<label className="trader-journal-field">
					<span>{tr('detail.tags')}</span>
					<input type="text" value={form.tags} placeholder={tr('placeholder.tags')}
						onChange={(event: ChangeEvent<HTMLInputElement>) => onTagsChange(event.target.value)} />
				</label>
			)}
		</>
	);
}
