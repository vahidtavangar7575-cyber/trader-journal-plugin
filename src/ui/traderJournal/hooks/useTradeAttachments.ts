import { useEffect, useRef, useState } from 'react';
import type {
	ClipboardEvent as ReactClipboardEvent,
	Dispatch,
	KeyboardEvent,
	SetStateAction,
} from 'react';
import type TraderJournalPlugin from '../../../main';
import { getTranslator } from '../../../i18n';
import type { TradeImage, TradeJournalType } from '../../../trades/types';
import { TemporaryAttachmentRegistry } from '../TemporaryAttachmentRegistry';
import type { TradeFormState } from '../form';
import {
	createTradeImage,
	deleteCreatedAttachment,
	getClipboardImageFiles,
	savePastedImage,
} from '../images';

interface UseTradeAttachmentsArgs {
	form: TradeFormState;
	journalType: TradeJournalType;
	plugin: TraderJournalPlugin;
	setError: Dispatch<SetStateAction<string>>;
	setForm: Dispatch<SetStateAction<TradeFormState>>;
}

export interface TradeAttachmentsController {
	beginCommit: () => void;
	commit: () => void;
	failCommit: () => Promise<void>;
	handleInputKeyDown: (event: KeyboardEvent<HTMLInputElement>) => void;
	handlePaste: (event: ReactClipboardEvent<HTMLInputElement>) => void;
	imageInput: string;
	isMounted: () => boolean;
	isPastingImage: boolean;
	removeImage: (index: number) => void;
	setImageInput: Dispatch<SetStateAction<string>>;
}

export function useTradeAttachments({
	form,
	journalType,
	plugin,
	setError,
	setForm,
}: UseTradeAttachmentsArgs): TradeAttachmentsController {
	const [imageInput, setImageInput] = useState('');
	const [isPastingImage, setIsPastingImage] = useState(false);
	const mountedRef = useRef(true);
	const registryRef = useRef<TemporaryAttachmentRegistry | null>(null);
	if (!registryRef.current) {
		registryRef.current = new TemporaryAttachmentRegistry((attachmentPath) =>
			deleteCreatedAttachment(plugin, attachmentPath),
		);
	}
	const registry = registryRef.current;
	const tr = getTranslator(plugin.settings.language);

	useEffect(() => {
		mountedRef.current = true;
		registry.activate();

		return () => {
			mountedRef.current = false;
			void registry.requestCleanup().then(logAttachmentCleanupErrors);
		};
	}, [registry]);

	function addImages(images: TradeImage[]) {
		setForm((currentForm) => {
			const existingImageValues = new Set(currentForm.images.map((image) => image.value).filter(Boolean));
			const nextImages = images.filter((image) => image.value && !existingImageValues.has(image.value));

			return {
				...currentForm,
				images: [...currentForm.images, ...nextImages],
			};
		});
	}

	function addImage() {
		const image = createTradeImage(imageInput);
		if (!image) {
			return;
		}

		if (form.images.some((item) => item.value === image.value)) {
			setImageInput('');
			return;
		}

		addImages([image]);
		setImageInput('');
	}

	function removeImage(index: number) {
		const image = form.images[index];
		if (image?.type === 'file' && image.value) {
			void registry.remove(image.value).catch((deleteError: unknown) => {
				console.error('Trader Journal failed to remove pasted image', deleteError);
			});
		}

		setForm((currentForm) => ({
			...currentForm,
			images: currentForm.images.filter((_, itemIndex) => itemIndex !== index),
		}));
	}

	function handleInputKeyDown(event: KeyboardEvent<HTMLInputElement>) {
		if (event.key !== 'Enter') {
			return;
		}

		event.preventDefault();
		addImage();
	}

	function handlePaste(event: ReactClipboardEvent<HTMLInputElement>) {
		const imageFiles = getClipboardImageFiles(event.clipboardData);
		if (imageFiles.length === 0) {
			return;
		}

		event.preventDefault();
		void savePastedImages(imageFiles);
	}

	async function savePastedImages(imageFiles: File[]) {
		try {
			setIsPastingImage(true);
			setError('');
			const results = await Promise.allSettled(
				imageFiles.map(async (imageFile): Promise<TradeImage | null> => {
					const image = await savePastedImage(plugin, imageFile, form.symbol, journalType);
					if (image.type !== 'file' || !image.value) {
						return image;
					}

					return await registry.track(image.value) ? image : null;
				}),
			);
			if (!mountedRef.current) {
				logAttachmentCleanupErrors(await registry.cleanup());
				return;
			}

			const savedImages = results
				.filter((result): result is PromiseFulfilledResult<TradeImage> => result.status === 'fulfilled' && result.value !== null)
				.map((result) => result.value);
			const failedResult = results.find((result): result is PromiseRejectedResult => result.status === 'rejected');
			if (failedResult) {
				logAttachmentCleanupErrors(
					await registry.rollback(
						savedImages
							.filter((image) => image.type === 'file' && Boolean(image.value))
							.map((image) => image.value ?? ''),
					),
				);
				throw failedResult.reason;
			}

			addImages(savedImages);
			setImageInput('');
		} catch (pasteError) {
			if (mountedRef.current) {
				setError(pasteError instanceof Error ? pasteError.message : tr('error.pasteImage'));
			}
		} finally {
			if (mountedRef.current) {
				setIsPastingImage(false);
			}
		}
	}

	return {
		beginCommit: () => registry.beginCommit(),
		commit: () => registry.commit(),
		failCommit: async () => logAttachmentCleanupErrors(await registry.failCommit()),
		handleInputKeyDown,
		handlePaste,
		imageInput,
		isMounted: () => mountedRef.current,
		isPastingImage,
		removeImage,
		setImageInput,
	};
}

function logAttachmentCleanupErrors(errors: unknown[]): void {
	for (const error of errors) {
		console.error('Trader Journal failed to clean up pasted image', error);
	}
}
