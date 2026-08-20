import type { ChangeEvent, ClipboardEvent, KeyboardEvent } from 'react';
import type TraderJournalPlugin from '../../../main';
import type { Translator } from '../../../i18n';
import type { TradeImage } from '../../../trades/types';
import { ImagePreview } from '../images';

interface TradeImageFieldsProps {
	images: TradeImage[];
	imageInput: string;
	isPastingImage: boolean;
	plugin: TraderJournalPlugin;
	tr: Translator;
	onImageInputChange: (value: string) => void;
	onImageInputKeyDown: (event: KeyboardEvent<HTMLInputElement>) => void;
	onImagePaste: (event: ClipboardEvent<HTMLInputElement>) => void;
	onRemoveImage: (index: number) => void;
}

export function TradeImageFields({
	images,
	imageInput,
	isPastingImage,
	plugin,
	tr,
	onImageInputChange,
	onImageInputKeyDown,
	onImagePaste,
	onRemoveImage,
}: TradeImageFieldsProps) {
	return (
		<div className="trader-journal-field trader-journal-field--images">
			<span>{tr('detail.images')}</span>
			<input type="text" value={imageInput}
				placeholder={isPastingImage ? tr('placeholder.savingImage') : tr('placeholder.image')}
				onChange={(event: ChangeEvent<HTMLInputElement>) => onImageInputChange(event.target.value)}
				onKeyDown={onImageInputKeyDown} onPaste={onImagePaste} disabled={isPastingImage} />
			{images.length > 0 ? (
				<div className="trader-journal-image-preview-row">
					{images.map((image, index) => (
						<div className="trader-journal-image-preview" key={`${image.value}-${index}`}>
							<button type="button" className="trader-journal-image-preview__remove"
								aria-label={tr('image.remove', { index: index + 1 })}
								onClick={() => onRemoveImage(index)}>X</button>
							<ImagePreview plugin={plugin} image={image} />
						</div>
					))}
				</div>
			) : null}
		</div>
	);
}
