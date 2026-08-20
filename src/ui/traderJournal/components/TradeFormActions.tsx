import type { Translator } from '../../../i18n';

interface TradeFormActionsProps {
	isCancelDisabled: boolean;
	isEditing: boolean;
	isSaving: boolean;
	isSubmittingDisabled: boolean;
	tr: Translator;
	onCancel: () => void;
}

export function TradeFormActions({
	isCancelDisabled,
	isEditing,
	isSaving,
	isSubmittingDisabled,
	tr,
	onCancel,
}: TradeFormActionsProps) {
	return (
		<div className="trader-journal-form__actions">
			<button type="button" onClick={onCancel} disabled={isCancelDisabled}>
				{tr('action.cancel')}
			</button>
			<button type="submit" className="mod-cta" disabled={isSubmittingDisabled}>
				{isSaving ? tr('action.saving') : isEditing ? tr('action.updateTrade') : tr('action.saveTrade')}
			</button>
		</div>
	);
}
