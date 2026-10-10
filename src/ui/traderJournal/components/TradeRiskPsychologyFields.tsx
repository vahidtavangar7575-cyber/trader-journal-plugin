import type { ChangeEvent } from 'react';
import type { TradeFormState } from '../form';
import { calculateRiskAmount } from '../form';

interface Props {
	form: TradeFormState;
	accountLinked: boolean;
	recommendedRiskPct: number | null;
	onAccountEquityChange: (value: string) => void;
	onRiskPctChange: (value: string) => void;
	onPositionSizeChange: (value: string) => void;
	onPositionUnitChange: (value: TradeFormState['positionUnit']) => void;
	onSessionChange: (value: TradeFormState['session']) => void;
	onMarketArrivalContextChange: (value: string) => void;
	onPreTradeEmotionChange: (value: TradeFormState['preTradeEmotion']) => void;
	onUrgeToChaseChange: (value: string) => void;
}

export function TradeRiskPsychologyFields({
	form,
	accountLinked,
	recommendedRiskPct,
	onAccountEquityChange,
	onRiskPctChange,
	onPositionSizeChange,
	onPositionUnitChange,
	onSessionChange,
	onMarketArrivalContextChange,
	onPreTradeEmotionChange,
	onUrgeToChaseChange,
}: Props) {
	const riskAmount = calculateRiskAmount(form.accountEquity, form.riskPct);
	const chaseLevel = Number(form.urgeToChase);
	const showChaseWarning = Number.isFinite(chaseLevel) && chaseLevel >= 7;

	return (
		<section className="trader-journal-review-form">
			<div className="trader-journal-review-form__header">
				<h3>ریسک واقعی، حجم و وضعیت ذهنی قبل از معامله</h3>
				<p>عدد پیشنهادی سیستم حکم نیست؛ عددی که واقعاً با آن وارد می‌شوی/شدی را اینجا ثبت کن تا بعداً انضباط واقعی قابل اندازه‌گیری باشد.</p>
			</div>

			<div className="trader-journal-form__grid">
				<label className="trader-journal-field">
					<span>{accountLinked ? 'سرمایه / Equity حساب ذخیره‌شده' : 'سرمایه / Equity'}</span>
					<input type="number" min="0" step="any" value={form.accountEquity} placeholder="10000"
						disabled={accountLinked}
						onChange={(event: ChangeEvent<HTMLInputElement>) => onAccountEquityChange(event.target.value)} />
				</label>
				<label className="trader-journal-field">
					<span>ریسک واقعی این معامله % {recommendedRiskPct !== null ? `(پیشنهاد سیستم: ${formatPct(recommendedRiskPct)}%)` : ''}</span>
					<input type="number" min="0" step="0.01" value={form.riskPct} placeholder="0.2"
						onChange={(event: ChangeEvent<HTMLInputElement>) => onRiskPctChange(event.target.value)} />
				</label>
				<div className="trader-journal-field trader-journal-field--readonly">
					<span>مبلغ ریسک واقعی</span>
					<strong>{riskAmount === null ? '-' : new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 }).format(riskAmount)}</strong>
				</div>
				<label className="trader-journal-field">
					<span>حجم معامله</span>
					<input type="number" min="0" step="any" value={form.positionSize} placeholder="0.10"
						onChange={(event: ChangeEvent<HTMLInputElement>) => onPositionSizeChange(event.target.value)} />
				</label>
				<label className="trader-journal-field">
					<span>واحد حجم</span>
					<select value={form.positionUnit} onChange={(event) => onPositionUnitChange(event.target.value as TradeFormState['positionUnit'])}>
						<option value="lot">Lot</option>
						<option value="contract">Contract</option>
						<option value="unit">Unit</option>
					</select>
				</label>
				<label className="trader-journal-field">
					<span>Session</span>
					<select value={form.session} onChange={(event) => onSessionChange(event.target.value as TradeFormState['session'])}>
						<option value="asia">Asia</option>
						<option value="london">London</option>
						<option value="new_york">New York</option>
						<option value="overlap">London / New York overlap</option>
						<option value="other">Other</option>
					</select>
				</label>
			</div>

			<div className="trader-journal-form__grid">
				<label className="trader-journal-field">
					<span>موقعیت بازار هنگام تصمیم (اختیاری؛ روی تشخیص ستاپ اثر ندارد)</span>
					<select value={form.marketArrivalContext} onChange={(event) => onMarketArrivalContextChange(event.target.value)}>
						<option value="">ثبت نکن</option>
						<option value="approaching-poi">در مسیر POI</option>
						<option value="at-poi">داخل/روی POI</option>
						<option value="after-poi">بعد از واکنش POI</option>
						<option value="mid-move">وسط حرکت/ستاپ</option>
						<option value="in-trade">از قبل داخل معامله</option>
					</select>
				</label>
				<label className="trader-journal-field">
					<span>حالت ذهنی قبل از ورود</span>
					<select value={form.preTradeEmotion} onChange={(event) => onPreTradeEmotionChange(event.target.value as TradeFormState['preTradeEmotion'])}>
						<option value="calm">آرام و متمرکز</option>
						<option value="neutral">خنثی</option>
						<option value="activated">برانگیخته / هیجانی</option>
					</select>
				</label>
				<label className="trader-journal-field">
					<span>میل به تعقیب قیمت (۰ تا ۱۰)</span>
					<input type="number" min="0" max="10" step="1" value={form.urgeToChase} placeholder="0"
						onChange={(event: ChangeEvent<HTMLInputElement>) => onUrgeToChaseChange(event.target.value)} />
				</label>
			</div>

			{showChaseWarning ? <div className="trader-journal-form__error">میل به تعقیب قیمت بالاست. قبل از ورود دوباره بررسی کن آیا Trigger هنوز معتبر است یا فقط از حرکت از دست‌رفته ناراحت شده‌ای.</div> : null}
		</section>
	);
}

function formatPct(value: number): string {
	return Number(value.toFixed(4)).toString();
}
