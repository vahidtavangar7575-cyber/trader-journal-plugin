import { useRef } from 'react';
import type { ChangeEvent, ClipboardEvent, KeyboardEvent } from 'react';
import type TraderJournalPlugin from '../../../main';
import type { Translator } from '../../../i18n';
import type { TradeImage } from '../../../trades/types';
import { ImagePreview } from '../images';

interface TradeImageFieldsProps {
	images: TradeImage[];
	imageInput: string;
	isKhanTrade?: boolean;
	isPastingImage: boolean;
	plugin: TraderJournalPlugin;
	tr: Translator;
	onImageInputChange: (value: string) => void;
	onImageInputKeyDown: (event: KeyboardEvent<HTMLInputElement>) => void;
	onImagePaste: (event: ClipboardEvent<HTMLInputElement>) => void;
	onRemoveImage: (index: number) => void;
	onSelectImageFiles: (files: File[], label?: string) => void;
}

export function TradeImageFields({
	images,
	imageInput,
	isKhanTrade = false,
	isPastingImage,
	plugin,
	tr,
	onImageInputChange,
	onImageInputKeyDown,
	onImagePaste,
	onRemoveImage,
	onSelectImageFiles,
}: TradeImageFieldsProps) {
	const supplementalImages = images
		.map((image, index) => ({ image, index }))
		.filter(({ image }) => image.label !== 'khan-m15-entry' && image.label !== 'khan-m1-entry');

	return (
		<div className="trader-journal-field trader-journal-field--images">
			<span>{tr('detail.images')}</span>

			{isKhanTrade ? (
				<section style={{ display: 'grid', gap: '10px', marginBottom: '12px' }}>
					<div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
						دو تصویر اصلی تصمیم را مستقیم از حافظه کامپیوتر انتخاب کن. هر کادر فقط برای تایم‌فریم خودش است.
					</div>
					<div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,minmax(0,1fr))', gap: '10px' }}>
						<KhanImageSlot
							title="تصویر 15 دقیقه / HTF"
							description="ساختار، POI، نقدینگی هدف، PDH/PDL و Session context"
							label="khan-m15-entry"
							images={images}
							isBusy={isPastingImage}
							plugin={plugin}
							onRemoveImage={onRemoveImage}
							onSelectImageFiles={onSelectImageFiles}
						/>
						<KhanImageSlot
							title="تصویر 1 دقیقه / LTF"
							description="IDM/CHOCH/Flip/OF/SCOB همراه Entry، SL و Target"
							label="khan-m1-entry"
							images={images}
							isBusy={isPastingImage}
							plugin={plugin}
							onRemoveImage={onRemoveImage}
							onSelectImageFiles={onSelectImageFiles}
						/>
					</div>
				</section>
			) : null}

			<input type="text" value={imageInput}
				placeholder={isPastingImage ? tr('placeholder.savingImage') : isKhanTrade ? 'تصویر تکمیلی: لینک، مسیر فایل داخل Vault یا Paste' : tr('placeholder.image')}
				onChange={(event: ChangeEvent<HTMLInputElement>) => onImageInputChange(event.target.value)}
				onKeyDown={onImageInputKeyDown} onPaste={onImagePaste} disabled={isPastingImage} />
			{supplementalImages.length > 0 ? (
				<div className="trader-journal-image-preview-row">
					{supplementalImages.map(({ image, index }) => (
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

interface KhanImageSlotProps {
	title: string;
	description: string;
	label: string;
	images: TradeImage[];
	isBusy: boolean;
	plugin: TraderJournalPlugin;
	onRemoveImage: (index: number) => void;
	onSelectImageFiles: (files: File[], label?: string) => void;
}

function KhanImageSlot({
	title,
	description,
	label,
	images,
	isBusy,
	plugin,
	onRemoveImage,
	onSelectImageFiles,
}: KhanImageSlotProps) {
	const inputRef = useRef<HTMLInputElement | null>(null);
	const imageIndex = images.findIndex((image) => image.label === label);
	const image = imageIndex >= 0 ? images[imageIndex] : null;

	return (
		<div style={{ border: '1px solid var(--background-modifier-border)', borderRadius: '10px', padding: '10px', minWidth: 0 }}>
			<strong style={{ display: 'block', marginBottom: '4px' }}>{title}</strong>
			<small style={{ display: 'block', minHeight: '34px', color: 'var(--text-muted)' }}>{description}</small>
			<input
				ref={inputRef}
				type="file"
				accept="image/*"
				style={{ display: 'none' }}
				onChange={(event) => {
					const files = Array.from(event.target.files ?? []);
					if (files.length > 0) onSelectImageFiles(files.slice(0, 1), label);
					event.target.value = '';
				}}
			/>
			{image ? (
				<div className="trader-journal-image-preview" style={{ marginTop: '8px' }}>
					<button type="button" className="trader-journal-image-preview__remove" aria-label={`حذف ${title}`} onClick={() => onRemoveImage(imageIndex)}>X</button>
					<ImagePreview plugin={plugin} image={image} />
				</div>
			) : (
				<button type="button" className="mod-cta" style={{ width: '100%', marginTop: '8px' }} disabled={isBusy} onClick={() => inputRef.current?.click()}>
					{isBusy ? 'در حال ذخیره تصویر…' : 'انتخاب تصویر از کامپیوتر'}
				</button>
			)}
		</div>
	);
}
