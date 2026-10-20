import type { App } from 'obsidian';
import { Modal } from 'obsidian';
import { StrictMode, useMemo, useState } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import {
	DAILY_TRADING_COMMITMENT,
	getCommitmentDifferenceCount,
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
	const differences = useMemo(() => getCommitmentDifferenceCount(commitment), [commitment]);
	const complete = isCommitmentComplete(commitment);
	const remaining = Math.max(0, DAILY_TRADING_COMMITMENT.length - commitment.length);

	const confirm = async () => {
		if (!complete || saving) return;
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
		<div className="trader-journal-form__body khan-cockpit journal-v3-commitment" dir="rtl">
			<header className="khan-hero journal-v3-commitment__hero">
				<div className="khan-kicker">آیین شروع جلسه · فقط یک‌بار در هر روز</div>
				<h2>امروز کیفیت تصمیم را انتخاب کن</h2>
				<p>قبل از اولین معامله، این متن را با دست تایپ کن. بعد از ثبت موفق، تا فردا دوباره از تو خواسته نمی‌شود.</p>
				<div className="journal-v3-commitment__badges" aria-label="قوانین تعهد">
					<span>Paste غیرفعال</span>
					<span>فقط نیم‌فاصله نادیده گرفته می‌شود</span>
					<span>حروف و علائم باید مطابق متن باشند</span>
				</div>
			</header>

			{error ? <div className="trader-journal-form__error">{error}</div> : null}

			<section className="journal-v3-commitment__source-card">
				<div className="journal-v3-section-heading">
					<div>
						<small>متن مرجع امروز</small>
						<h3>تعهد معامله‌گر حرفه‌ای</h3>
					</div>
					<span className="journal-v3-status-pill">{getLocalDateKey()}</span>
				</div>
				<div className="journal-v3-commitment__source">{DAILY_TRADING_COMMITMENT}</div>
			</section>

			<section className="journal-v3-commitment__typing-card">
				<div className="journal-v3-section-heading">
					<div>
						<small>فضای تایپ</small>
						<h3>تعهدت را اینجا بنویس</h3>
					</div>
					<strong className={complete ? 'journal-v3-match journal-v3-match--complete' : 'journal-v3-match'}>{progress}%</strong>
				</div>
				<textarea
					className="journal-v3-commitment__textarea"
					value={commitment}
					rows={12}
					autoFocus
					onPaste={(event) => event.preventDefault()}
					onKeyDown={(event) => {
						if ((event.ctrlKey || event.metaKey) && event.key === 'Enter' && complete) {
							event.preventDefault();
							void confirm();
						}
					}}
					onChange={(event) => setCommitment(event.target.value)}
					placeholder="از جمله اول شروع کن؛ متن باید کامل باشد…"
					spellCheck={false}
				/>

				<div className="khan-progress journal-v3-commitment__progress"><span style={{ width: `${progress}%` }} /></div>
				<div className="journal-v3-commitment__stats">
					<div><span>شباهت</span><strong>{progress}%</strong></div>
					<div><span>اختلاف باقی‌مانده</span><strong>{complete ? '۰' : differences.toLocaleString('fa-IR')}</strong></div>
					<div><span>کاراکتر باقی‌مانده</span><strong>{remaining.toLocaleString('fa-IR')}</strong></div>
				</div>

				<div className={complete ? 'journal-v3-commitment__message is-complete' : 'journal-v3-commitment__message'}>
					{complete
						? '✓ متن کامل و صحیح است. می‌توانی جلسه امروز را شروع کنی.'
						: 'مقایسه دقیق است؛ تنها تفاوت نیم‌فاصله با فاصله عادی نادیده گرفته می‌شود. اگر درصد نزدیک ۱۰۰ است، یک حرف یا علامت را جا انداخته‌ای.'}
				</div>
			</section>

			<footer className="khan-footer khan-footer--sticky journal-v3-commitment__footer">
				<button type="button" onClick={closeModal}>بستن</button>
				<button type="button" className="mod-cta journal-v3-primary-action" disabled={!complete || saving} onClick={() => void confirm()}>
					{saving ? 'در حال ثبت تعهد امروز…' : complete ? 'ثبت تعهد و ورود به ژورنال' : `تکمیل متن · ${progress}%`}
				</button>
				<small>پس از ثبت موفق، این صفحه تا روز بعد نمایش داده نمی‌شود. میانبر پس از تکمیل: Ctrl + Enter</small>
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
		this.modalEl.addClass('trader-journal-modal-shell', 'khan-wizard-modal', 'journal-v3-modal-shell');
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
