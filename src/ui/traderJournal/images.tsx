import { normalizePath, TFile, TFolder } from 'obsidian';
import type TraderJournalPlugin from '../../main';
import { getTranslator } from '../../i18n';
import { normalizeSymbol } from '../../settings';
import type { TradeImage, TradeJournalType } from '../../trades/types';

export function createTradeImage(value: string): TradeImage | null {
	const imageValue = cleanImageValue(value);
	if (!imageValue) {
		return null;
	}

	return {
		type: /^https?:\/\//i.test(imageValue) ? 'url' : 'file',
		value: imageValue,
	};
}

export function getClipboardImageFiles(clipboardData: DataTransfer): File[] {
	const itemImageFiles = Array.from(clipboardData.items)
		.filter((item) => item.kind === 'file')
		.map((item) => item.getAsFile())
		.filter((file): file is File => file !== null && isImageFile(file));

	if (itemImageFiles.length > 0) {
		return dedupeImageFiles(itemImageFiles);
	}

	return dedupeImageFiles(Array.from(clipboardData.files).filter(isImageFile));
}

export async function savePastedImage(
	plugin: TraderJournalPlugin,
	imageFile: File,
	symbol: string,
	journalType: TradeJournalType,
): Promise<TradeImage> {
	const attachmentFolder = getAttachmentFolder(plugin, journalType);
	await ensureVaultFolder(plugin, attachmentFolder);

	const attachmentPath = getUniqueAttachmentPath(plugin, attachmentFolder, imageFile, symbol);
	await plugin.app.vault.createBinary(attachmentPath, await imageFile.arrayBuffer());

	return {
		type: 'file',
		value: attachmentPath,
	};
}

export async function deleteCreatedAttachment(
	plugin: TraderJournalPlugin,
	attachmentPath: string,
): Promise<void> {
	const abstractFile = plugin.app.vault.getAbstractFileByPath(attachmentPath);
	if (abstractFile instanceof TFile) {
		await plugin.app.fileManager.trashFile(abstractFile);
	}
}

export function ImagePreview({ plugin, image }: { plugin: TraderJournalPlugin; image: TradeImage }) {
	const value = image.value ?? '';
	const source = resolveImagePreviewSource(plugin, image);
	const isRemoteImage = image.type === 'url' || /^https?:\/\//i.test(value);
	const tr = getTranslator(plugin.settings.language);

	if (source) {
		return (
			<>
				<img src={source} alt={value} />
				<span>{value}</span>
			</>
		);
	}

	return (
		<>
			<div className="trader-journal-image-preview__missing">
				{isRemoteImage && !plugin.settings.allowRemoteImages ? tr('image.remoteDisabled') : tr('image.noPreview')}
			</div>
			<span>{value}</span>
		</>
	);
}

function dedupeImageFiles(imageFiles: File[]): File[] {
	const seenKeys = new Set<string>();

	return imageFiles.filter((file) => {
		const key = `${file.name}-${file.type}-${file.size}`;
		if (seenKeys.has(key)) {
			return false;
		}

		seenKeys.add(key);
		return true;
	});
}

function isImageFile(file: File): boolean {
	return file.type.startsWith('image/');
}

function getAttachmentFolder(plugin: TraderJournalPlugin, journalType: TradeJournalType): string {
	const journalFolder = normalizePath(
		journalType === 'live' ? plugin.settings.liveJournalFolder : plugin.settings.journalFolder,
	).replace(/\/$/, '');
	return normalizePath(`${journalFolder}/_attachments`);
}

async function ensureVaultFolder(plugin: TraderJournalPlugin, folderPath: string): Promise<void> {
	let currentPath = '';

	for (const segment of normalizePath(folderPath).split('/')) {
		currentPath = currentPath ? `${currentPath}/${segment}` : segment;
		const abstractFile = plugin.app.vault.getAbstractFileByPath(currentPath);

		if (abstractFile instanceof TFolder) {
			continue;
		}

		if (abstractFile instanceof TFile) {
			throw new Error(`${currentPath} is a file, not a folder.`);
		}

		await plugin.app.vault.createFolder(currentPath);
	}
}

function getUniqueAttachmentPath(
	plugin: TraderJournalPlugin,
	attachmentFolder: string,
	imageFile: File,
	symbol: string,
): string {
	const baseName = createAttachmentBaseName(symbol);
	const extension = getImageFileExtension(imageFile);
	let candidatePath = normalizePath(`${attachmentFolder}/${baseName}.${extension}`);
	let suffix = 2;

	while (plugin.app.vault.getAbstractFileByPath(candidatePath)) {
		candidatePath = normalizePath(`${attachmentFolder}/${baseName}-${suffix}.${extension}`);
		suffix += 1;
	}

	return candidatePath;
}

function createAttachmentBaseName(symbol: string): string {
	const now = new Date();
	const datePart = [
		now.getFullYear(),
		padDatePart(now.getMonth() + 1),
		padDatePart(now.getDate()),
	].join('');
	const timePart = [
		padDatePart(now.getHours()),
		padDatePart(now.getMinutes()),
		padDatePart(now.getSeconds()),
	].join('');
	const randomPart = Math.random().toString(36).slice(2, 8);
	const symbolPart = sanitizeFileNamePart(normalizeSymbol(symbol) || 'image');

	return `${symbolPart}-${datePart}-${timePart}-${randomPart}`;
}

function getImageFileExtension(file: File): string {
	const extensionFromName = file.name.split('.').pop()?.toLowerCase();
	if (extensionFromName && /^[a-z0-9]+$/.test(extensionFromName)) {
		return extensionFromName === 'jpeg' ? 'jpg' : extensionFromName;
	}

	const extensionByMimeType: Record<string, string> = {
		'image/apng': 'apng',
		'image/avif': 'avif',
		'image/bmp': 'bmp',
		'image/gif': 'gif',
		'image/jpeg': 'jpg',
		'image/png': 'png',
		'image/svg+xml': 'svg',
		'image/tiff': 'tif',
		'image/webp': 'webp',
	};

	return extensionByMimeType[file.type] ?? 'png';
}

function sanitizeFileNamePart(value: string): string {
	const sanitized = value.trim().replace(/[\\/#^[\]|?*:]/g, '-').replace(/\s+/g, '-');
	return sanitized || 'image';
}

function resolveImagePreviewSource(plugin: TraderJournalPlugin, image: TradeImage): string | null {
	const value = cleanImageValue(image.value ?? '');
	if (!value) {
		return null;
	}

	if (image.type === 'url' || /^https?:\/\//i.test(value)) {
		return plugin.settings.allowRemoteImages ? value : null;
	}

	const file = findVaultImage(plugin, value);
	return file ? plugin.app.vault.getResourcePath(file) : null;
}

function findVaultImage(plugin: TraderJournalPlugin, rawPath: string): TFile | null {
	const journalFolder = normalizePath(plugin.settings.journalFolder).replace(/\/$/, '');
	const liveJournalFolder = normalizePath(plugin.settings.liveJournalFolder).replace(/\/$/, '');
	const candidates = [
		normalizePath(rawPath.replace(/^\/+/, '')),
		normalizePath(`${journalFolder}/_attachments/${rawPath}`),
		normalizePath(`${liveJournalFolder}/_attachments/${rawPath}`),
	];

	for (const candidate of [...new Set(candidates.filter(Boolean))]) {
		const abstractFile = plugin.app.vault.getAbstractFileByPath(candidate);
		if (abstractFile instanceof TFile) {
			return abstractFile;
		}
	}

	return null;
}

function cleanImageValue(value: string): string {
	const trimmed = value.trim();
	const wikiMatch = trimmed.match(/^!?\[\[([^\]]+)\]\]$/);

	if (wikiMatch?.[1]) {
		return wikiMatch[1].split('|')[0]?.trim() ?? '';
	}

	const markdownImageMatch = trimmed.match(/^!\[[^\]]*\]\(([^)]+)\)$/);
	if (markdownImageMatch?.[1]) {
		return markdownImageMatch[1].trim();
	}

	return trimmed;
}

function padDatePart(value: number): string {
	return String(value).padStart(2, '0');
}
