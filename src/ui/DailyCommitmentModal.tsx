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
		<div className="daily-ritual" dir="rtl">
			<header className="daily-ritual__header">
				<div>
					<span className="daily-ritual__kicker">آیین شروع جلسه · یک‌بار در هر روز</span>
					<h2>تعهد امروز را با دست بنویس</h2>
					<p>این صفحه قرار نیست وقتت را بگیرد؛ فقط قبل از اولین معامله، ذهن را روی فرایند قفل می‌کند.</p>
				</div>
				<div className="daily-ritual__score" aria-label={`شباهت ${progress} درصد`}>
					<strong>{progress}%</strong>
					<span>{complete ? 'کامل' : `${differences.toLocaleString('fa-IR')} اختلاف`}</span>
				</div>
			</header>

			<div className="daily-ritual__progress" aria-hidden="true"><span style={{ width: `${progress}%` }} /></div>
			{error ? <div className="trader-journal-form__error">{error}</div> : null}

			<section className="daily-ritual__paper daily-ritual__paper--reference">
				<div className="daily-ritual__paper-label"><span>متن مرجع امروز</span><small>{getLocalDateKey()}</small></div>
				<p>{DAILY_TRADING_COMMITMENT}</p>
			</section>

			<section className={`daily-ritual__paper daily-ritual__paper--writing${complete ? ' is-complete' : ''}`}>
				<div className="daily-ritual__paper-label"><span>حالا دقیقاً همین متن را بنویس</span><small>Paste غیرفعال · فقط نیم‌فاصله نادیده گرفته می‌شود</small></div>
				<textarea
					value={commitment}
					autoFocus
					rows={12}
					onPaste={(event) => event.preventDefault()}
					onKeyDown={(event) => {
						if ((event.ctrlKey || event.metaKey) && event.key === 'Enter' && complete) {
							event.preventDefault();
							void confirm();
						}
					}}
					onChange={(event) => setCommitment(event.target.value)}
					placeholder="از «من امروز...» شروع کن. کادر دیگری وجود ندارد؛ همین سطح کامل، فضای نوشتن توست."
					spellCheck={false}
				/>
				<div className="daily-ritual__status">
					{complete ? '✓ متن کامل و دقیق است؛ آماده شروع جلسه‌ای.' : progress >= 95 ? 'خیلی نزدیک است؛ یک حرف، فاصله معمولی، نشانه یا کلمه هنوز متفاوت است.' : 'با آرامش ادامه بده؛ درصد فقط راهنماست و عجله لازم نیست.'}
				</div>
			</section>

			<div className="daily-ritual__principles" aria-label="سه اصل امروز">
				<div><strong>فرایند</strong><span>پاداش امروز اجرای صحیح است، نه پول.</span></div>
				<div><strong>ریسک</strong><span>حد ضرر هزینه سرمایه‌گذاری است، نه شکست هویتی.</span></div>
				<div><strong>خنثی‌بودن</strong><span>بازار چیزی به من بدهکار نیست و احساس ندارد.</span></div>
			</div>

			<footer className="daily-ritual__footer">
				<button type="button" onClick={closeModal}>بستن</button>
				<small>میانبر پس از تکمیل: Ctrl + Enter</small>
				<button type="button" className="mod-cta" disabled={!complete || saving} onClick={() => void confirm()}>
					{saving ? 'در حال ثبت…' : complete ? 'ثبت تعهد و ورود به ژورنال' : `ادامه نوشتن · ${progress}%`}
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
		this.modalEl.addClass('trader-journal-modal-shell', 'daily-ritual-modal', 'journal-v3-modal-shell');
		this.contentEl.addClass('trader-journal-modal-content', 'daily-ritual-modal__content');
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
		this.modalEl.removeClass('trader-journal-modal-shell', 'daily-ritual-modal', 'journal-v3-modal-shell');
		this.contentEl.removeClass('trader-journal-modal-content', 'daily-ritual-modal__content');
		this.contentEl.empty();
	}
}
