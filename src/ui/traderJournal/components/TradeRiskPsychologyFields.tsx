import type { ChangeEvent } from 'react';
import type { FxPositionSizingResult } from '../../../risk/positionSizing';
import type { TradeFormState } from '../form';
import { calculateRiskAmount } from '../form';

interface Props {
	form: TradeFormState;
	accountLinked: boolean;
	recommendedRiskPct: number | null;
	fxSizingResult: FxPositionSizingResult | null;
	fxSizingLoading: boolean;
	fxSizingError: string;
	fxOnlineEnabled: boolean;
	fxApiKey: string;
	fxLotStep: number;
	onFxOnlineEnabledChange: (value: boolean) => void;
	onFxApiKeyChange: (value: string) => void;
	onFxLotStepChange: (value: string) => void;
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
	fxSizingResult,
	fxSizingLoading,
	fxSizingError,
	fxOnlineEnabled,
	fxApiKey,
	fxLotStep,
	onFxOnlineEnabledChange,
	onFxApiKeyChange,
	onFxLotStepChange,
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
				<p>Entry، Stop Loss، جفت‌ارز، حساب و درصد ریسک را وارد کن؛ برای Forex حجم Lot به‌صورت خودکار محاسبه می‌شود و همیشه رو به پایین روی Lot step گرد می‌شود تا از ریسک تعیین‌شده عبور نکند.</p>
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
				{fxSizingResult ? (
					<div className="trader-journal-field trader-journal-field--readonly">
						<span>حجم پیشنهادی نهایی</span>
						<strong>{formatLots(fxSizingResult.lots)} Lot</strong>
						<small>{new Intl.NumberFormat('en-US').format(fxSizingResult.units)} unit</small>
					</div>
				) : (
					<label className="trader-journal-field">
						<span>حجم معامله</span>
						<input type="number" min="0" step="any" value={form.positionSize} placeholder="0.10"
							onChange={(event: ChangeEvent<HTMLInputElement>) => onPositionSizeChange(event.target.value)} />
					</label>
				)}
				<label className="trader-journal-field">
					<span>واحد حجم</span>
					<select value={form.positionUnit} disabled={Boolean(fxSizingResult)} onChange={(event) => onPositionUnitChange(event.target.value as TradeFormState['positionUnit'])}>
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

			{fxSizingResult ? (
				<div className="trader-journal-account-panel__metrics">
					<span>فاصله Stop: <b>{formatNumber(fxSizingResult.stopDistancePips)} pip</b></span>
					<span>Pip value / Lot: <b>{formatMoney(fxSizingResult.pipValuePerLot)} {fxSizingResult.accountCurrency}</b></span>
					<span>ریسک بعد از گردکردن: <b>{formatMoney(fxSizingResult.actualRiskAmount)} {fxSizingResult.accountCurrency}</b></span>
					<span>ریسک واقعی پس از Lot step: <b>{formatPct(fxSizingResult.actualRiskPct)}%</b></span>
					<span>نرخ تبدیل: <b>{formatNumber(fxSizingResult.quoteToAccountRate)}</b></span>
					<span>منبع تبدیل: <b>{fxSizingResult.conversionSource === 'online-cross' ? 'Twelve Data' : 'محاسبه مستقیم از خود Pair'}</b></span>
				</div>
			) : null}
			{fxSizingLoading ? <div className="trader-journal-plan-linked-trades">در حال دریافت نرخ زنده Cross FX و محاسبه حجم…</div> : null}
			{fxSizingError ? <div className="trader-journal-plan-linked-trades">{fxSizingError}</div> : null}

			<details className="trader-journal-plan-linked-trades">
				<summary>تنظیمات محاسبه خودکار Forex</summary>
				<div className="trader-journal-form__grid" style={{ marginTop: '10px' }}>
					<label className="trader-journal-field">
						<span>نرخ آنلاین Cross FX</span>
						<select value={fxOnlineEnabled ? 'on' : 'off'} onChange={(event) => onFxOnlineEnabledChange(event.target.value === 'on')}>
							<option value="off">خاموش — فقط Pairهایی که بدون API قابل محاسبه‌اند</option>
							<option value="on">روشن — Twelve Data برای Cross currency</option>
						</select>
					</label>
					<label className="trader-journal-field">
						<span>Twelve Data API Key</span>
						<input type="password" value={fxApiKey} disabled={!fxOnlineEnabled} placeholder="کلید شخصی خودت"
							onChange={(event) => onFxApiKeyChange(event.target.value)} />
					</label>
					<label className="trader-journal-field">
						<span>Lot step بروکر</span>
						<input type="number" min="0.000001" step="any" value={fxLotStep} onChange={(event) => onFxLotStepChange(event.target.value)} />
					</label>
				</div>
				<small>API Key فقط در data.json همین پلاگین ذخیره می‌شود و فقط برای درخواست نرخ تبدیل به Twelve Data استفاده می‌شود. برای EURUSD روی حساب USD یا USDJPY روی حساب USD اصلاً درخواست اینترنتی لازم نیست؛ نرخ آنلاین فقط برای Crossهایی مثل EURGBP روی حساب USD لازم می‌شود.</small>
			</details>

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

function formatLots(value: number): string {
	return Number(value.toFixed(8)).toString();
}

function formatNumber(value: number): string {
	return new Intl.NumberFormat('en-US', { maximumFractionDigits: 8 }).format(value);
}

function formatMoney(value: number): string {
	return new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 }).format(value);
}
