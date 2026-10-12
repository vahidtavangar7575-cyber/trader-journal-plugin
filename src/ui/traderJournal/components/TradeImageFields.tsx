import { useRef } from 'react';
import type { ChangeEvent, ClipboardEvent, DragEvent, KeyboardEvent } from 'react';
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

const M15_LABEL = 'khan-m15-entry';
const M1_LABEL = 'khan-m1-entry';

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
		.filter(({ image }) => image.label !== M15_LABEL && image.label !== M1_LABEL);

	return (
		<section className="trader-journal-review-form trader-journal-image-workspace">
			<div className="trader-journal-review-form__header trader-journal-image-workspace__header">
				<div>
					<h3>تصاویر تصمیم معامله</h3>
					<p>
						دو تصویر اصلی را مستقیم از کامپیوتر انتخاب یا داخل کادر رها کن. فایل‌ها خودکار در پوشه‌ی _attachments همان ژورنال، بر اساس نماد و تاریخ، ذخیره می‌شوند.
					</p>
				</div>
				<span className="trader-journal-image-workspace__badge">۲ تصویر اصلی</span>
			</div>

			<div className="trader-journal-image-slot-grid">
				<DecisionImageSlot
					title="تصویر 15 دقیقه / HTF"
					description={isKhanTrade
						? 'ساختار، POI، نقدینگی هدف، PDH/PDL و Session context را واضح نشان بده.'
						: 'Context بزرگ‌تر معامله: ساختار، POI، نقدینگی و محل قرارگیری سناریو را نشان بده.'}
					label={M15_LABEL}
					images={images}
					isBusy={isPastingImage}
					plugin={plugin}
					onRemoveImage={onRemoveImage}
					onSelectImageFiles={onSelectImageFiles}
				/>
				<DecisionImageSlot
					title="تصویر 1 دقیقه / LTF"
					description={isKhanTrade
						? 'IDM/CHOCH/Flip/OF/SCOB همراه Entry، SL و Target را نشان بده.'
						: 'جزئیات اجرای معامله: Trigger، Entry، SL و Target را واضح نشان بده.'}
					label={M1_LABEL}
					images={images}
					isBusy={isPastingImage}
					plugin={plugin}
					onRemoveImage={onRemoveImage}
					onSelectImageFiles={onSelectImageFiles}
				/>
			</div>

			<details className="trader-journal-image-supplemental" open={supplementalImages.length > 0}>
				<summary>تصاویر تکمیلی / تصویر خروج</summary>
				<p>برای تصویر بعد از خروج یا تصویر اضافه، می‌توانی فایل را Paste کنی یا لینک/مسیر فایل داخل Vault را وارد کنی و Enter بزنی.</p>
				<input
					type="text"
					value={imageInput}
					placeholder={isPastingImage ? tr('placeholder.savingImage') : 'Paste تصویر، لینک، یا مسیر فایل داخل Vault'}
					onChange={(event: ChangeEvent<HTMLInputElement>) => onImageInputChange(event.target.value)}
					onKeyDown={onImageInputKeyDown}
					onPaste={onImagePaste}
					disabled={isPastingImage}
				/>
				{supplementalImages.length > 0 ? (
					<div className="trader-journal-image-preview-row trader-journal-image-preview-row--supplemental">
						{supplementalImages.map(({ image, index }) => (
							<div className="trader-journal-image-preview" key={`${image.value}-${index}`}>
								<button type="button" className="trader-journal-image-preview__remove" aria-label={tr('image.remove', { index: index + 1 })} onClick={() => onRemoveImage(index)}>×</button>
								<button type="button" className="trader-journal-image-preview__open" aria-label="باز کردن تصویر" onClick={() => void openImage(plugin, image)}>↗</button>
								<ImagePreview plugin={plugin} image={image} />
							</div>
						))}
					</div>
				) : null}
			</details>
		</section>
	);
}

interface DecisionImageSlotProps {
	title: string;
	description: string;
	label: string;
	images: TradeImage[];
	isBusy: boolean;
	plugin: TraderJournalPlugin;
	onRemoveImage: (index: number) => void;
	onSelectImageFiles: (files: File[], label?: string) => void;
}

function DecisionImageSlot({
	title,
	description,
	label,
	images,
	isBusy,
	plugin,
	onRemoveImage,
	onSelectImageFiles,
}: DecisionImageSlotProps) {
	const inputRef = useRef<HTMLInputElement | null>(null);
	const imageIndex = images.findIndex((image) => image.label === label);
	const image = imageIndex >= 0 ? images[imageIndex] : null;

	const handleDrop = (event: DragEvent<HTMLDivElement>) => {
		event.preventDefault();
		if (isBusy) return;
		const files = Array.from(event.dataTransfer.files).filter((file) => file.type.startsWith('image/'));
		if (files.length > 0) onSelectImageFiles(files.slice(0, 1), label);
	};

	return (
		<div
			className={`trader-journal-decision-image-slot${image ? ' is-filled' : ''}`}
			onDragOver={(event) => event.preventDefault()}
			onDrop={handleDrop}
		>
			<div className="trader-journal-decision-image-slot__head">
				<div>
					<strong>{title}</strong>
					<small>{description}</small>
				</div>
				<span className={`trader-journal-decision-image-slot__state${image ? ' is-ready' : ''}`}>{image ? 'ثبت شد ✓' : 'در انتظار'}</span>
			</div>

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
					<div className="trader-journal-decision-image-slot__preview">
						<ImagePreview plugin={plugin} image={image} />
					</div>
					<div className="trader-journal-decision-image-slot__actions">
						<button type="button" onClick={() => inputRef.current?.click()} disabled={isBusy}>تعویض تصویر</button>
						<button type="button" onClick={() => void openImage(plugin, image)}>باز کردن</button>
						<button type="button" className="mod-warning" onClick={() => onRemoveImage(imageIndex)}>حذف</button>
					</div>
				</>
			) : (
				<button type="button" className="trader-journal-decision-image-slot__picker mod-cta" disabled={isBusy} onClick={() => inputRef.current?.click()}>
					<span className="trader-journal-decision-image-slot__picker-icon">＋</span>
					<strong>{isBusy ? 'در حال ذخیره تصویر…' : 'انتخاب تصویر از کامپیوتر'}</strong>
					<small>یا فایل تصویر را روی این کادر Drag & Drop کن</small>
				</button>
			)}
		</div>
	);
}

async function openImage(plugin: TraderJournalPlugin, image: TradeImage): Promise<void> {
	if (!image.value) return;
	if (image.type === 'url' || /^https?:\/\//i.test(image.value)) {
		window.open(image.value, '_blank', 'noopener,noreferrer');
		return;
	}
	await plugin.app.workspace.openLinkText(image.value, '', true);
}
