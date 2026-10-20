import type { App } from 'obsidian';
import { Modal } from 'obsidian';
import { StrictMode, useMemo, useState } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import {
	DAILY_TRADING_COMMITMENT,
	canManuallyConfirmCommitment,
	getCommitmentMatchScore,
	isCommitmentComplete,
} from '../behavior/commitment';
import type TraderJournalPlugin from '../main';

interface DailyCommitmentContentProps {
	plugin: TraderJournalPlugin;
	onConfirmed: () => void;
	closeModal: () => void;
}

export function getLocalDateKey(date = new Date()): string {
	const year = date.getFullYear();
	const month = String(date.getMonth() + 1).padStart(2, '0');
	const day = String(date.getDate()).padStart(2, '0');
	return `${year}-${month}-${day}`;
}

export function hasCompletedCommitmentToday(plugin: TraderJournalPlugin): boolean {
	return plugin.settings.lastCommitmentDate === getLocalDateKey();
}

export function runAfterDailyCommitment(plugin: TraderJournalPlugin, action: () => void): void {
	if (hasCompletedCommitmentToday(plugin)) {
		action();
		return;
	}
	new DailyCommitmentModal(plugin.app, plugin, action).open();
}

function DailyCommitmentContent({ plugin, onConfirmed, closeModal }: DailyCommitmentContentProps) {
	const [commitment, setCommitment] = useState('');
	const [error, setError] = useState('');
	const [saving, setSaving] = useState(false);
	const progress = useMemo(() => getCommitmentMatchScore(commitment), [commitment]);
	const complete = isCommitmentComplete(commitment);
	const manualReady = canManuallyConfirmCommitment(commitment);
	const canContinue = complete || manualReady;

	const confirm = async () => {
		if (!canContinue || saving) return;
		try {
			setSaving(true);
			setError('');
			plugin.settings.lastCommitmentDate = getLocalDateKey();
			await plugin.saveSettings();
			closeModal();
			onConfirmed();
		} catch (saveError) {
			setError(saveError instanceof Error ? saveError.message : 'ثبت تعهد امروز انجام نشد.');
		} finally {
			setSaving(false);
		}
	};

	return (
		<div className="trader-journal-form__body khan-cockpit" dir="rtl">
			<header className="khan-hero">
				<div className="khan-kicker">آیین شروع ژورنال · فقط یک‌بار در هر روز</div>
				<h2>قبل از معامله، کیفیت تصمیم را انتخاب کن</h2>
				<p>این صفحه فقط برای تعهد روزانه است. تحلیل ستاپ را روی PDF انجام می‌دهی و Obsidian از اینجا به بعد فقط ژورنال حرفه‌ای توست.</p>
			</header>

			{error ? <div className="trader-journal-form__error">{error}</div> : null}

			<section className="khan-commitment-card">
				<div className="khan-card-title">تعهد معاملاتی امروز</div>
				<div className="khan-commitment-source">{DAILY_TRADING_COMMITMENT}</div>
				<label className="khan-commitment-input">
					<span>متن بالا را خودت تایپ کن. Paste غیرفعال است؛ فاصله و نیم‌فاصله هوشمندانه نرمال می‌شوند.</span>
					<textarea
						value={commitment}
						rows={9}
						onPaste={(event) => event.preventDefault()}
						onKeyDown={(event) => {
							if ((event.ctrlKey || event.metaKey) && event.key === 'Enter' && canContinue) {
								event.preventDefault();
								void confirm();
							}
						}}
						onChange={(event) => setCommitment(event.target.value)}
						placeholder="تعهد امروز را اینجا تایپ کن…"
					/>
				</label>
				<div className="khan-progress"><span style={{ width: `${progress}%` }} /></div>
				<div className="khan-progress-label">{complete ? 'تعهد شناخته شد ✓' : `شباهت هوشمند متن: ${progress}%`}</div>
				<div className="khan-commitment-actions">
					<button type="button" className="mod-cta" disabled={!canContinue || saving} onClick={() => void confirm()}>
						{saving ? 'در حال ثبت…' : complete ? 'تعهد کامل شد — ورود به ژورنال' : 'متن را آگاهانه تایپ کردم؛ ورود به ژورنال'}
					</button>
					<small>{manualReady && !complete ? 'اگر فقط تفاوت تایپی مانده، ادامه بده.' : 'میانبر: Ctrl + Enter'}</small>
				</div>
			</section>

			<footer className="khan-footer khan-footer--sticky">
				<button type="button" onClick={closeModal}>بستن</button>
				<button type="button" className="mod-cta" disabled={!canContinue || saving} onClick={() => void confirm()}>
					ثبت تعهد امروز و ورود به ژورنال
				</button>
			</footer>
		</div>
	);
}

export class DailyCommitmentModal extends Modal {
	private root: Root | null = null;

	constructor(
		app: App,
		private readonly plugin: TraderJournalPlugin,
		private readonly onConfirmed: () => void,
	) {
		super(app);
	}

	onOpen(): void {
		this.modalEl.addClass('trader-journal-modal-shell', 'khan-wizard-modal');
		this.contentEl.addClass('trader-journal-modal-content');
		this.contentEl.empty();
		this.root = createRoot(this.contentEl);
		this.root.render(
			<StrictMode>
				<DailyCommitmentContent plugin={this.plugin} onConfirmed={this.onConfirmed} closeModal={() => this.close()} />
			</StrictMode>,
		);
	}

	onClose(): void {
		this.root?.unmount();
		this.root = null;
		this.contentEl.empty();
	}
}
