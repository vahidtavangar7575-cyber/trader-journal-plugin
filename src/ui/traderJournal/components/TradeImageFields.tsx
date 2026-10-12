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
		<section className="trader-journal-review-form trader-journal-image-workspace" style={{ gap: '14px' }}>
			<div
				className="trader-journal-review-form__header trader-journal-image-workspace__header"
				style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', alignItems: 'flex-start', justifyContent: 'space-between' }}
			>
				<div style={{ minWidth: 0, flex: '1 1 420px' }}>
					<h3>تصاویر تصمیم معامله</h3>
					<p style={{ lineHeight: 1.65, overflowWrap: 'anywhere' }}>
						دو تصویر اصلی را مستقیم از کامپیوتر انتخاب یا داخل کادر رها کن. فایل‌ها خودکار در پوشه‌ی _attachments همان ژورنال، بر اساس نماد و تاریخ، ذخیره می‌شوند.
					</p>
				</div>
				<span
					className="trader-journal-image-workspace__badge"
					style={{ border: '1px solid var(--interactive-accent)', borderRadius: '999px', padding: '4px 9px', color: 'var(--text-accent)', fontSize: 'var(--font-ui-smaller)', fontWeight: 700 }}
				>
					۲ تصویر اصلی
				</span>
			</div>

			<div
				className="trader-journal-image-slot-grid"
				style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(280px, 100%), 1fr))', gap: '12px', minWidth: 0 }}
			>
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

			<details
				className="trader-journal-image-supplemental"
				open={supplementalImages.length > 0}
				style={{ border: '1px solid var(--background-modifier-border)', borderRadius: '10px', padding: '10px 12px', background: 'var(--background-primary)' }}
			>
				<summary style={{ cursor: 'pointer', fontWeight: 700 }}>تصاویر تکمیلی / تصویر خروج</summary>
				<p style={{ marginBlock: '8px', lineHeight: 1.6 }}>
					برای تصویر بعد از خروج یا تصویر اضافه، می‌توانی فایل را Paste کنی یا لینک/مسیر فایل داخل Vault را وارد کنی و Enter بزنی.
				</p>
				<input
					type="text"
					value={imageInput}
					placeholder={isPastingImage ? tr('placeholder.savingImage') : 'Paste تصویر، لینک، یا مسیر فایل داخل Vault'}
					onChange={(event: ChangeEvent<HTMLInputElement>) => onImageInputChange(event.target.value)}
					onKeyDown={onImageInputKeyDown}
					onPaste={onImagePaste}
					disabled={isPastingImage}
					style={{ width: '100%' }}
				/>
				{supplementalImages.length > 0 ? (
					<div className="trader-journal-image-preview-row trader-journal-image-preview-row--supplemental" style={{ marginTop: '10px' }}>
						{supplementalImages.map(({ image, index }) => (
							<div className="trader-journal-image-preview" key={`${image.value}-${index}`}>
								<button type="button" className="trader-journal-image-preview__remove" aria-label={tr('image.remove', { index: index + 1 })} onClick={() => onRemoveImage(index)}>×</button>
								<button type="button" aria-label="باز کردن تصویر" onClick={() => void openImage(plugin, image)} style={{ position: 'absolute', top: '4px', left: '4px', zIndex: 2, width: '22px', minWidth: '22px', height: '22px', minHeight: '22px', padding: 0, borderRadius: '50%' }}>↗</button>
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
			style={{
				display: 'flex', flexDirection: 'column', gap: '10px', minWidth: 0, minHeight: '230px',
				border: `1px solid ${image ? 'var(--color-green)' : 'var(--background-modifier-border)'}`,
				borderRadius: '12px', padding: '12px', background: image ? 'color-mix(in srgb, var(--color-green) 5%, var(--background-primary))' : 'var(--background-primary)',
			}}
		>
			<div className="trader-journal-decision-image-slot__head" style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'flex-start', justifyContent: 'space-between' }}>
				<div style={{ flex: '1 1 180px', minWidth: 0 }}>
					<strong style={{ display: 'block', fontSize: '1.02em' }}>{title}</strong>
					<small style={{ display: 'block', marginTop: '4px', color: 'var(--text-muted)', lineHeight: 1.55, overflowWrap: 'anywhere' }}>{description}</small>
				</div>
				<span
					className={`trader-journal-decision-image-slot__state${image ? ' is-ready' : ''}`}
					style={{ borderRadius: '999px', padding: '3px 8px', fontSize: 'var(--font-ui-smaller)', fontWeight: 700, background: image ? 'color-mix(in srgb, var(--color-green) 14%, transparent)' : 'var(--background-secondary)', color: image ? 'var(--color-green)' : 'var(--text-muted)' }}
				>
					{image ? 'ثبت شد ✓' : 'در انتظار'}
				</span>
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
					<div className="trader-journal-image-preview" style={{ width: '100%', minWidth: 0, maxWidth: '100%', margin: 0 }}>
						<ImagePreview plugin={plugin} image={image} />
					</div>
					<div className="trader-journal-decision-image-slot__actions" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: '6px' }}>
						<button type="button" onClick={() => inputRef.current?.click()} disabled={isBusy}>تعویض</button>
						<button type="button" onClick={() => void openImage(plugin, image)}>باز کردن</button>
						<button type="button" className="mod-warning" onClick={() => onRemoveImage(imageIndex)}>حذف</button>
					</div>
				</>
			) : (
				<button
					type="button"
					className="trader-journal-decision-image-slot__picker mod-cta"
					disabled={isBusy}
					onClick={() => inputRef.current?.click()}
					style={{ display: 'flex', flex: '1 1 auto', minHeight: '150px', width: '100%', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '6px', border: '2px dashed color-mix(in srgb, var(--interactive-accent) 65%, var(--background-modifier-border))', borderRadius: '10px', whiteSpace: 'normal', lineHeight: 1.4, textAlign: 'center' }}
				>
					<span className="trader-journal-decision-image-slot__picker-icon" style={{ fontSize: '28px', lineHeight: 1 }}>＋</span>
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
