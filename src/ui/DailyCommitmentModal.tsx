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

const paperStyle = {
	border: '1px solid color-mix(in srgb, var(--interactive-accent) 34%, var(--background-modifier-border))',
	borderRadius: 18,
	background: 'color-mix(in srgb, var(--background-secondary) 94%, var(--interactive-accent) 6%)',
	padding: '18px 20px',
	boxShadow: '0 12px 34px rgba(0,0,0,.07)',
} as const;

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
		<div dir="rtl" style={{ display: 'flex', flexDirection: 'column', gap: 14, width: '100%', minHeight: 0, padding: '4px 8px 16px', overflowY: 'auto', overscrollBehavior: 'contain' }}>
			<header style={{ ...paperStyle, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 18, flexWrap: 'wrap', background: 'linear-gradient(135deg, color-mix(in srgb, var(--background-secondary) 88%, var(--interactive-accent) 12%), var(--background-secondary))' }}>
				<div style={{ flex: '1 1 520px' }}>
					<span style={{ display: 'block', color: 'var(--text-accent)', fontSize: 12, fontWeight: 800, marginBottom: 5 }}>آیین شروع جلسه · یک‌بار در هر روز</span>
					<h2 style={{ margin: '0 0 7px', fontSize: 23 }}>تعهد امروز را با دست بنویس</h2>
					<p style={{ margin: 0, lineHeight: 1.85 }}>فقط قبل از اولین معامله. هدف، پیش‌بینی بازار نیست؛ ذهن را روی فرایند، ریسک و اجرای آرام تنظیم می‌کنیم.</p>
				</div>
				<div aria-label={`شباهت ${progress} درصد`} style={{ minWidth: 112, textAlign: 'center', borderRadius: 16, padding: '10px 14px', background: 'var(--background-primary)', border: '1px solid var(--background-modifier-border)' }}>
					<strong style={{ display: 'block', fontSize: 28, color: complete ? 'var(--color-green)' : 'var(--text-accent)', lineHeight: 1.1 }}>{progress}%</strong>
					<span style={{ display: 'block', marginTop: 5, color: 'var(--text-muted)', fontSize: 12 }}>{complete ? 'کامل' : `${differences.toLocaleString('fa-IR')} اختلاف`}</span>
				</div>
			</header>

			<div aria-hidden="true" style={{ height: 4, borderRadius: 999, overflow: 'hidden', background: 'var(--background-modifier-border)' }}><span style={{ display: 'block', width: `${progress}%`, height: '100%', borderRadius: 999, background: complete ? 'var(--color-green)' : 'var(--interactive-accent)', transition: 'width .15s ease' }} /></div>
			{error ? <div className="trader-journal-form__error">{error}</div> : null}

			<section style={paperStyle}>
				<div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap', alignItems: 'center', marginBottom: 10 }}><strong>متن مرجع امروز</strong><small style={{ color: 'var(--text-muted)' }}>{getLocalDateKey()}</small></div>
				<p style={{ margin: 0, color: 'var(--text-normal)', fontSize: 15.5, lineHeight: 2.08, textAlign: 'justify' }}>{DAILY_TRADING_COMMITMENT}</p>
			</section>

			<section style={{ ...paperStyle, borderColor: complete ? 'color-mix(in srgb, var(--color-green) 60%, var(--background-modifier-border))' : 'color-mix(in srgb, var(--interactive-accent) 42%, var(--background-modifier-border))' }}>
				<div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap', alignItems: 'center', marginBottom: 10 }}><strong>حالا دقیقاً همان متن را بنویس</strong><small style={{ color: 'var(--text-muted)' }}>Paste غیرفعال · فقط نیم‌فاصله نادیده گرفته می‌شود</small></div>
				<textarea
					value={commitment}
					autoFocus
					rows={12}
					dir="rtl"
					onPaste={(event) => event.preventDefault()}
					onKeyDown={(event) => {
						if ((event.ctrlKey || event.metaKey) && event.key === 'Enter' && complete) {
							event.preventDefault();
							void confirm();
						}
					}}
					onChange={(event) => setCommitment(event.target.value)}
					placeholder="از «من امروز...» شروع کن…"
					spellCheck={false}
					style={{ display: 'block', width: '100%', minWidth: 0, minHeight: 285, margin: 0, padding: 0, border: 0, borderRadius: 0, outline: 'none', boxShadow: 'none', resize: 'vertical', background: 'transparent', color: 'var(--text-normal)', font: 'inherit', fontSize: 15.5, lineHeight: 2.08, textAlign: 'justify' }}
				/>
				<div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid var(--background-modifier-border)', color: complete ? 'var(--color-green)' : 'var(--text-muted)', lineHeight: 1.7, fontSize: 13 }}>
					{complete ? '✓ متن کامل و دقیق است؛ آماده شروع جلسه‌ای.' : progress >= 95 ? 'خیلی نزدیک است؛ یک حرف، فاصله معمولی، نشانه یا کلمه هنوز متفاوت است.' : 'آرام ادامه بده؛ درصد فقط راهنماست. نیم‌فاصله به‌تنهایی اختلاف محسوب نمی‌شود.'}
				</div>
			</section>

			<div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 10 }} aria-label="سه اصل امروز">
				{[
					['فرایند', 'پاداش امروز اجرای صحیح است، نه پول.'],
					['ریسک', 'حد ضرر هزینه سرمایه‌گذاری است، نه شکست هویتی.'],
					['خنثی‌بودن', 'بازار چیزی به من بدهکار نیست و احساس ندارد.'],
				].map(([title, text]) => <div key={title} style={{ ...paperStyle, borderRadius: 14, padding: '12px 14px', boxShadow: 'none' }}><strong style={{ display: 'block', marginBottom: 3 }}>{title}</strong><span style={{ color: 'var(--text-muted)', fontSize: 13, lineHeight: 1.7 }}>{text}</span></div>)}
			</div>

			<footer style={{ position: 'sticky', bottom: 0, zIndex: 4, display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', padding: '12px 0 2px', background: 'linear-gradient(180deg, transparent, var(--background-primary) 24%)' }}>
				<button type="button" onClick={closeModal}>بستن</button>
				<small style={{ flex: '1 1 240px', color: 'var(--text-muted)' }}>میانبر پس از تکمیل: Ctrl + Enter</small>
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
		this.modalEl.addClass('trader-journal-modal-shell', 'journal-v3-modal-shell');
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
		this.modalEl.removeClass('trader-journal-modal-shell', 'journal-v3-modal-shell');
		this.contentEl.removeClass('trader-journal-modal-content');
		this.contentEl.empty();
	}
}
