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

const PRIMARY_LABELS = new Set([
	'journal-m15-context',
	'journal-m1-entry',
	'journal-exit',
	'khan-m15-entry',
	'khan-m1-entry',
]);

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
	onSelectImageFiles,
}: TradeImageFieldsProps) {
	const supplementalImages = images
		.map((image, index) => ({ image, index }))
		.filter(({ image }) => !image.label || !PRIMARY_LABELS.has(image.label));

	return (
		<div className="trader-journal-field trader-journal-field--images">
			<section className="trader-journal-review-form" style={{ marginTop: 0 }}>
				<div className="trader-journal-review-form__header">
					<h3>تصاویر اصلی ژورنال</h3>
					<p>سه تصویر اصلی باعث می‌شوند چند هفته بعد بتوانی تصمیم را دقیق بازسازی کنی؛ نتیجه به‌تنهایی کافی نیست.</p>
				</div>
				<div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: 10 }}>
					<JournalImageSlot
						title="۱) تصویر 15 دقیقه / Context"
						description="ساختار، POI، نقدینگی هدف، PDH/PDL و فضای سشن"
						label="journal-m15-context"
						legacyLabels={['khan-m15-entry']}
						images={images}
						isBusy={isPastingImage}
						plugin={plugin}
						onRemoveImage={onRemoveImage}
						onSelectImageFiles={onSelectImageFiles}
					/>
					<JournalImageSlot
						title="۲) تصویر 1 دقیقه / Entry"
						description="IDM / CHOCH / Flip / OF / SCOB، محل Entry، SL و Target"
						label="journal-m1-entry"
						legacyLabels={['khan-m1-entry']}
						images={images}
						isBusy={isPastingImage}
						plugin={plugin}
						onRemoveImage={onRemoveImage}
						onSelectImageFiles={onSelectImageFiles}
					/>
					<JournalImageSlot
						title="۳) تصویر خروج / After"
						description="محل خروج واقعی، مسیر قیمت بعد از ورود و دلیل بسته‌شدن معامله"
						label="journal-exit"
						legacyLabels={[]}
						images={images}
						isBusy={isPastingImage}
						plugin={plugin}
						onRemoveImage={onRemoveImage}
						onSelectImageFiles={onSelectImageFiles}
					/>
				</div>
			</section>

			<label className="trader-journal-field">
				<span>تصاویر تکمیلی</span>
				<input
					type="text"
					value={imageInput}
					placeholder={isPastingImage ? tr('placeholder.savingImage') : 'لینک، مسیر فایل داخل Vault یا Paste تصویر تکمیلی'}
					onChange={(event: ChangeEvent<HTMLInputElement>) => onImageInputChange(event.target.value)}
					onKeyDown={onImageInputKeyDown}
					onPaste={onImagePaste}
					disabled={isPastingImage}
				/>
			</label>

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

interface JournalImageSlotProps {
	title: string;
	description: string;
	label: string;
	legacyLabels: string[];
	images: TradeImage[];
	isBusy: boolean;
	plugin: TraderJournalPlugin;
	onRemoveImage: (index: number) => void;
	onSelectImageFiles: (files: File[], label?: string) => void;
}

function JournalImageSlot({
	title,
	description,
	label,
	legacyLabels,
	images,
	isBusy,
	plugin,
	onRemoveImage,
	onSelectImageFiles,
}: JournalImageSlotProps) {
	const inputRef = useRef<HTMLInputElement | null>(null);
	const acceptedLabels = new Set([label, ...legacyLabels]);
	const imageIndex = images.findIndex((image) => image.label && acceptedLabels.has(image.label));
	const image = imageIndex >= 0 ? images[imageIndex] : null;

	return (
		<div style={{ border: '1px solid var(--background-modifier-border)', borderRadius: 12, padding: 12, minWidth: 0, background: 'var(--background-primary)' }}>
			<strong style={{ display: 'block', marginBottom: 5 }}>{title}</strong>
			<small style={{ display: 'block', minHeight: 38, color: 'var(--text-muted)', lineHeight: 1.6 }}>{description}</small>
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
				<>
					<div className="trader-journal-image-preview" style={{ marginTop: 8, width: '100%' }}>
						<button type="button" className="trader-journal-image-preview__remove" aria-label={`حذف ${title}`} onClick={() => onRemoveImage(imageIndex)}>X</button>
						<ImagePreview plugin={plugin} image={image} />
					</div>
					<button type="button" style={{ width: '100%', marginTop: 8 }} disabled={isBusy} onClick={() => inputRef.current?.click()}>تعویض تصویر</button>
				</>
			) : (
				<button type="button" className="mod-cta" style={{ width: '100%', marginTop: 8 }} disabled={isBusy} onClick={() => inputRef.current?.click()}>
					{isBusy ? 'در حال ذخیره تصویر…' : 'انتخاب تصویر از کامپیوتر'}
				</button>
			)}
		</div>
	);
}
