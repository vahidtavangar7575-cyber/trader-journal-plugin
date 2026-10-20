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
		<div className="trader-journal-form__body khan-cockpit" dir="rtl" style={{ gap: 16, padding: '4px 10px 20px' }}>
			<header className="khan-hero" style={{ borderRadius: 18, padding: '22px 24px' }}>
				<div className="khan-kicker">آیین شروع جلسه · فقط یک‌بار در هر روز</div>
				<h2 style={{ marginTop: 8, marginBottom: 8 }}>امروز کیفیت تصمیم را انتخاب کن</h2>
				<p>قبل از اولین معامله، این متن را با دست تایپ کن. پس از ثبت موفق، تا فردا دوباره از تو خواسته نمی‌شود.</p>
				<div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 14 }} aria-label="قوانین تعهد">
					<span className="trader-journal-plan-badge">Paste غیرفعال</span>
					<span className="trader-journal-plan-badge">فقط نیم‌فاصله نادیده گرفته می‌شود</span>
					<span className="trader-journal-plan-badge">حروف و علائم باید مطابق متن باشند</span>
				</div>
			</header>

			{error ? <div className="trader-journal-form__error">{error}</div> : null}

			<section className="trader-journal-review-form" style={{ borderRadius: 16, padding: 18 }}>
				<div className="trader-journal-review-form__header" style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center' }}>
					<div>
						<p>متن مرجع امروز</p>
						<h3 style={{ marginTop: 4 }}>تعهد معامله‌گر حرفه‌ای</h3>
					</div>
					<span className="trader-journal-plan-badge">{getLocalDateKey()}</span>
				</div>
				<div className="khan-commitment-source" style={{ fontSize: 15, lineHeight: 2, textAlign: 'justify', borderRadius: 12, padding: 18 }}>
					{DAILY_TRADING_COMMITMENT}
				</div>
			</section>

			<section className="khan-commitment-card trader-journal-review-form" style={{ borderRadius: 16, padding: 18 }}>
				<div className="trader-journal-review-form__header" style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center' }}>
					<div>
						<p>فضای تایپ</p>
						<h3 style={{ marginTop: 4 }}>تعهدت را اینجا بنویس</h3>
					</div>
					<strong style={{ fontSize: 26, color: complete ? 'var(--color-green)' : 'var(--text-accent)' }}>{progress}%</strong>
				</div>

				<label className="khan-commitment-input">
					<span>مقایسه دقیق است؛ فقط نیم‌فاصله با فاصله معمولی برابر در نظر گرفته می‌شود.</span>
					<textarea
						value={commitment}
						rows={13}
						autoFocus
						onPaste={(event) => event.preventDefault()}
						onKeyDown={(event) => {
							if ((event.ctrlKey || event.metaKey) && event.key === 'Enter' && complete) {
								event.preventDefault();
								void confirm();
							}
						}}
						onChange={(event) => setCommitment(event.target.value)}
						placeholder="از جمله اول شروع کن؛ متن را کامل و دقیق بنویس…"
						spellCheck={false}
						style={{ minHeight: 290, resize: 'vertical', lineHeight: 1.95, fontSize: 15, borderRadius: 12, padding: 16 }}
					/>
				</label>

				<div className="khan-progress"><span style={{ width: `${progress}%` }} /></div>
				<div className="trader-journal-form__grid" style={{ marginTop: 6 }}>
					<div className="trader-journal-field trader-journal-field--readonly"><span>شباهت</span><strong>{progress}%</strong></div>
					<div className="trader-journal-field trader-journal-field--readonly"><span>اختلاف باقی‌مانده</span><strong>{complete ? '۰' : differences.toLocaleString('fa-IR')}</strong></div>
					<div className="trader-journal-field trader-journal-field--readonly"><span>کاراکتر باقی‌مانده</span><strong>{remaining.toLocaleString('fa-IR')}</strong></div>
				</div>

				<div className={complete ? 'trader-journal-plan-linked-trades' : 'trader-journal-form__error'} style={{ marginTop: 4 }}>
					{complete
						? '✓ متن کامل و صحیح است. جلسه امروز آماده شروع است.'
						: 'اگر درصد نزدیک ۱۰۰ است، یک حرف، علامت یا کلمه با متن مرجع تفاوت دارد. نیم‌فاصله به‌تنهایی باعث خطا نمی‌شود.'}
				</div>
			</section>

			<footer className="khan-footer khan-footer--sticky" style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 10, borderRadius: 14 }}>
				<button type="button" onClick={closeModal}>بستن</button>
				<button type="button" className="mod-cta" disabled={!complete || saving} onClick={() => void confirm()}>
					{saving ? 'در حال ثبت تعهد امروز…' : complete ? 'ثبت تعهد و ورود به ژورنال' : `تکمیل متن · ${progress}%`}
				</button>
				<small style={{ flex: '1 1 280px' }}>پس از ثبت موفق، این صفحه تا روز بعد نمایش داده نمی‌شود. میانبر پس از تکمیل: Ctrl + Enter</small>
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
		this.modalEl.style.width = 'min(1080px, calc(100vw - 32px))';
		this.modalEl.style.maxWidth = 'calc(100vw - 32px)';
		this.modalEl.style.height = 'min(900px, calc(100dvh - 40px))';
		this.modalEl.style.maxHeight = 'calc(100dvh - 40px)';
		this.modalEl.style.overflow = 'hidden';
		this.contentEl.style.height = '100%';
		this.contentEl.style.minHeight = '0';
		this.contentEl.style.overflow = 'hidden';
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
		this.modalEl.removeAttribute('style');
		this.contentEl.removeAttribute('style');
		this.contentEl.empty();
	}
}
