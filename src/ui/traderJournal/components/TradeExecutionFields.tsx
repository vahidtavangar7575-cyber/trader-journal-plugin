import { useState } from 'react';
import type { ChangeEvent } from 'react';
import type { Translator } from '../../../i18n';
import { formatDuration } from '../../../trades/format';
import { getCurrentLocalIsoString, toDateTimeLocalInput } from '../dateTime';
import { calculateLiveRr, calculateTargetPriceForRr, formatComputedRr } from '../form';
import type { TradeFormState } from '../form';

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
		if (isLiveJournal) {
			onClosedAtChange(toDateTimeLocalInput(getCurrentLocalIsoString()));
		}
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
					<input type="number" step="any" value={form.entryPrice} placeholder="100"
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
						<input type="number" step="any" value={form.stopLoss} placeholder="99"
							onChange={(event: ChangeEvent<HTMLInputElement>) => onStopLossChange(event.target.value)} required />
					</label>
					<label className="trader-journal-field">
						<span>{tr('detail.takeProfit')} · هدف فعلی {formatComputedRr(targetR)}R</span>
						<div className="trader-journal-setup-select-row">
							<input type="number" step="any" value={form.takeProfit} placeholder="104"
								onChange={(event: ChangeEvent<HTMLInputElement>) => onTakeProfitChange(event.target.value)} required />
							<button type="button" onClick={onApplyTargetRr}>تنظیم {formatComputedRr(targetR)}R</button>
						</div>
					</label>
				</>
			) : null}

			<label className="trader-journal-field">
				<span>{tr('detail.openedAt')}</span>
				<input type="datetime-local" value={form.openedAt}
					onChange={(event: ChangeEvent<HTMLInputElement>) => onOpenedAtChange(event.target.value)}
					disabled={isEditing} required />
			</label>

			{usesExecutionLifecycle && !isEditing ? (
				<div className="trader-journal-field trader-journal-field--readonly">
					<span>وضعیت نتیجه</span>
					<strong>معامله باز — الان فقط بلیت ورود ذخیره می‌شود</strong>
					<small>قیمت خروج و زمان خروج در ثبت اولیه لازم نیستند؛ بعد از TP یا SL همین معامله را باز کن و نتیجه را با یک کلیک ثبت کن.</small>
				</div>
			) : null}

			{quickCloseAvailable ? (
				<section className="trader-journal-field" style={{ gridColumn: '1 / -1', padding: '12px', border: '1px solid var(--background-modifier-border)', borderRadius: '10px' }}>
					<strong style={{ fontSize: '16px' }}>نتیجه معامله را سریع ثبت کن</strong>
					<small>اگر SL خورده «ضرر» را بزن. اگر سود شده، 2R انتخاب اول است؛ برای تریل یا خروج متفاوت R واقعی را در کادر وارد کن.</small>
					<div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,minmax(0,1fr))', gap: '8px', marginTop: '10px' }}>
						<button type="button" onClick={markLoss} disabled={!form.stopLoss.trim()}>ضرر / SL خورد</button>
						<button type="button" className="mod-cta" onClick={markTwoRWin} disabled={twoRTarget === null}>سود · 2R</button>
						<div style={{ display: 'flex', gap: '6px' }}>
							<input aria-label="R واقعی سود" type="number" min="0.01" step="0.1" value={winRText} onChange={(event) => setWinRText(event.target.value)} placeholder="مثلاً 3.4" />
							<button type="button" onClick={markCustomWin} disabled={customWinTarget === null}>ثبت سود با این R</button>
						</div>
					</div>
					{!isLiveJournal ? <small>در بک‌تست بعد از انتخاب نتیجه فقط زمان تاریخی خروج را هم ثبت کن؛ قیمت خروج از R انتخاب‌شده محاسبه می‌شود.</small> : null}
				</section>
			) : null}

			{usesExecutionLifecycle && isExecutionTradeClosed ? (
				<>
					<div className="trader-journal-field trader-journal-field--readonly" style={{ border: '1px solid var(--interactive-accent)', borderRadius: '10px', padding: '10px' }}>
						<span>نتیجه انتخاب‌شده</span>
						<strong>{executionRr === null ? '-' : executionRr < 0 ? 'ضرر / SL' : `سود · ${formatComputedRr(executionRr)}R`}</strong>
						<button type="button" onClick={reopenTrade}>لغو نتیجه و بازگرداندن معامله به حالت باز</button>
					</div>
					<label className="trader-journal-field">
						<span>{tr('detail.closedAt')} · زمان دقیق خروج</span>
						<input type="datetime-local" value={form.closedAt}
							onChange={(event: ChangeEvent<HTMLInputElement>) => onClosedAtChange(event.target.value)} />
						{!form.closedAt ? <small>برای نهایی‌شدن نتیجه، زمان خروج را ثبت کن.</small> : null}
					</label>
					<label className="trader-journal-field">
						<span>{tr('detail.exitPrice')} · از R انتخاب‌شده محاسبه شده و قابل اصلاح است</span>
						<input type="number" step="any" value={form.exitPrice} placeholder="102"
							onChange={(event: ChangeEvent<HTMLInputElement>) => onExitPriceChange(event.target.value)} />
					</label>
				</>
			) : null}

			{!usesExecutionLifecycle ? (
				<label className="trader-journal-field">
					<span>{tr('detail.closedAt')}</span>
					<input type="datetime-local" value={form.closedAt}
						onChange={(event: ChangeEvent<HTMLInputElement>) => onClosedAtChange(event.target.value)} required />
				</label>
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
