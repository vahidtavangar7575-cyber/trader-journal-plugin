import { useState } from 'react';
import type { ChangeEvent } from 'react';
import type { Translator } from '../../../i18n';
import { formatDuration } from '../../../trades/format';
import { getCurrentDateTimeLocalInput } from '../dateTime';
import { calculateLiveRr, calculateTargetPriceForRr, formatComputedRr } from '../form';
import type { TradeFormState } from '../form';
import { JournalDateTimeField } from './JournalDateTimeField';

interface TradeExecutionFieldsProps {
	form: TradeFormState;
	holdingTime: number | null;
	isEditing: boolean;
	isLiveJournal: boolean;
	usesExecutionLifecycle: boolean;
	isExecutionTradeClosed: boolean;
	executionRr: number | null;
	plannedRr: number | null;
	targetR: number;
	tr: Translator;
	onClosedAtChange: (value: string) => void;
	onEntryPriceChange: (value: string) => void;
	onExitPriceChange: (value: string) => void;
	onOpenedAtChange: (value: string) => void;
	onRrChange: (value: string) => void;
	onStopLossChange: (value: string) => void;
	onTakeProfitChange: (value: string) => void;
	onApplyTargetRr: () => void;
}

export function TradeExecutionFields({
	form,
	holdingTime,
	isEditing,
	isLiveJournal,
	usesExecutionLifecycle,
	isExecutionTradeClosed,
	executionRr,
	plannedRr,
	targetR,
	tr,
	onClosedAtChange,
	onEntryPriceChange,
	onExitPriceChange,
	onOpenedAtChange,
	onRrChange,
	onStopLossChange,
	onTakeProfitChange,
	onApplyTargetRr,
}: TradeExecutionFieldsProps) {
	const [winRText, setWinRText] = useState(() => executionRr !== null && executionRr > 0 ? formatComputedRr(executionRr) : '2');
	const winR = Number(winRText);
	const customWinTarget = Number.isFinite(winR) && winR > 0
		? calculateTargetPriceForRr(form.side, form.entryPrice, form.stopLoss, winR)
		: null;
	const twoRTarget = calculateTargetPriceForRr(form.side, form.entryPrice, form.stopLoss, 2);
	const quickCloseAvailable = usesExecutionLifecycle && isEditing && !isExecutionTradeClosed;

	function markClosed(exitPrice: string) {
		onExitPriceChange(exitPrice);
		if (isLiveJournal) onClosedAtChange(getCurrentDateTimeLocalInput());
	}

	function markLoss() {
		if (calculateLiveRr(form.side, form.entryPrice, form.stopLoss, form.stopLoss) === null) return;
		markClosed(form.stopLoss);
	}

	function markTwoRWin() {
		if (twoRTarget === null) return;
		setWinRText('2');
		markClosed(String(twoRTarget));
	}

	function markCustomWin() {
		if (customWinTarget === null) return;
		markClosed(String(customWinTarget));
	}

	function reopenTrade() {
		onClosedAtChange('');
		onExitPriceChange('');
	}

	return (
		<>
			<label className="trader-journal-field">
				<span>{usesExecutionLifecycle ? tr('detail.entryPrice') : tr('detail.rr')}</span>
				{usesExecutionLifecycle ? (
					<input type="number" step="any" value={form.entryPrice} placeholder="مثلاً 1.09618"
						onChange={(event: ChangeEvent<HTMLInputElement>) => onEntryPriceChange(event.target.value)} required />
				) : (
					<input type="number" step="0.01" value={form.rr} placeholder="2"
						onChange={(event: ChangeEvent<HTMLInputElement>) => onRrChange(event.target.value)} required />
				)}
			</label>

			{usesExecutionLifecycle ? (
				<>
					<label className="trader-journal-field">
						<span>{tr('detail.stopLoss')}</span>
						<input type="number" step="any" value={form.stopLoss} placeholder="حد ضرر واقعی"
							onChange={(event: ChangeEvent<HTMLInputElement>) => onStopLossChange(event.target.value)} required />
					</label>
					<label className="trader-journal-field">
						<span>{tr('detail.takeProfit')} · هدف فعلی {formatComputedRr(targetR)}R</span>
						<div className="trader-journal-setup-select-row">
							<input type="number" step="any" value={form.takeProfit} placeholder="هدف معامله"
								onChange={(event: ChangeEvent<HTMLInputElement>) => onTakeProfitChange(event.target.value)} required />
							<button type="button" onClick={onApplyTargetRr}>تنظیم {formatComputedRr(targetR)}R</button>
						</div>
					</label>
				</>
			) : null}

			<JournalDateTimeField
				label={tr('detail.openedAt')}
				value={form.openedAt}
				onChange={onOpenedAtChange}
				disabled={isEditing}
				required
				allowEmpty={false}
				hint="برای ثبت سریع «الان» را بزن. تاریخ‌های 2026-10-20 و 10/20/2026 هر دو پذیرفته می‌شوند."
			/>

			{usesExecutionLifecycle && !isEditing ? (
				<div className="trader-journal-field trader-journal-field--readonly journal-v3-open-state">
					<span>وضعیت معامله</span>
					<strong>● باز — فعلاً فقط اطلاعات ورود ذخیره می‌شود</strong>
					<small>خروج و نتیجه اجباری نیستند. بعداً همین رکورد را باز کن و با یک کلیک SL، 2R یا R واقعی را ثبت کن.</small>
				</div>
			) : null}

			{quickCloseAvailable ? (
				<section className="trader-journal-review-form journal-v3-result-card" style={{ gridColumn: '1 / -1' }}>
					<div className="trader-journal-review-form__header">
						<h3>نتیجه را در چند ثانیه ثبت کن</h3>
						<p>برای ضرر، SL را بزن. برای سود، 2R انتخاب سریع است؛ اگر تریل کرده‌ای R واقعی را وارد کن.</p>
					</div>
					<div className="journal-v3-result-actions">
						<button type="button" className="journal-v3-loss-button" onClick={markLoss} disabled={!form.stopLoss.trim()}>ضرر · -1R / SL</button>
						<button type="button" className="mod-cta" onClick={markTwoRWin} disabled={twoRTarget === null}>برد · +2R</button>
						<div className="journal-v3-custom-r">
							<input aria-label="R واقعی سود" type="number" min="0.01" step="0.1" value={winRText} onChange={(event) => setWinRText(event.target.value)} placeholder="مثلاً 3.4" />
							<button type="button" onClick={markCustomWin} disabled={customWinTarget === null}>ثبت سود با این R</button>
						</div>
					</div>
					{!isLiveJournal ? <small>در بک‌تست بعد از انتخاب نتیجه، زمان تاریخی خروج را نیز پایین ثبت کن.</small> : null}
				</section>
			) : null}

			{usesExecutionLifecycle && isExecutionTradeClosed ? (
				<>
					<div className="trader-journal-field trader-journal-field--readonly journal-v3-result-selected">
						<span>نتیجه انتخاب‌شده</span>
						<strong>{executionRr === null ? '-' : executionRr < 0 ? 'ضرر · -1R' : `برد · +${formatComputedRr(executionRr)}R`}</strong>
						<button type="button" onClick={reopenTrade}>بازگرداندن معامله به حالت باز</button>
					</div>
					<JournalDateTimeField
						label="زمان بسته شدن"
						value={form.closedAt}
						onChange={onClosedAtChange}
						required
						quickMode="closed"
						hint={isLiveJournal ? 'در معامله زنده هنگام انتخاب نتیجه، زمان فعلی خودکار ثبت می‌شود.' : 'در بک‌تست زمان تاریخی خروج را ثبت کن.'}
					/>
					<label className="trader-journal-field">
						<span>{tr('detail.exitPrice')} · از R انتخاب‌شده محاسبه شده و قابل اصلاح است</span>
						<input type="number" step="any" value={form.exitPrice} placeholder="قیمت خروج"
							onChange={(event: ChangeEvent<HTMLInputElement>) => onExitPriceChange(event.target.value)} />
					</label>
				</>
			) : null}

			{!usesExecutionLifecycle ? (
				<JournalDateTimeField
					label={tr('detail.closedAt')}
					value={form.closedAt}
					onChange={onClosedAtChange}
					required
					quickMode="closed"
				/>
			) : null}

			<div className="trader-journal-field trader-journal-field--readonly">
				<span>{tr('detail.holdingTime')}</span>
				<strong>{formatDuration(holdingTime) || '-'}</strong>
			</div>
			{usesExecutionLifecycle ? (
				<>
					<div className="trader-journal-field trader-journal-field--readonly">
						<span>RR برنامه‌ریزی‌شده</span>
						<strong>{plannedRr === null ? '-' : `${formatComputedRr(plannedRr)}R`}</strong>
					</div>
					<div className="trader-journal-field trader-journal-field--readonly">
						<span>RR واقعی</span>
						<strong>{!isExecutionTradeClosed || executionRr === null ? '-' : `${formatComputedRr(executionRr)}R`}</strong>
					</div>
				</>
			) : null}
		</>
	);
}
