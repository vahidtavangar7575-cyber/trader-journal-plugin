import { useEffect, useMemo, useState } from 'react';
import type { TradeFormState } from '../form';
import { calculatePositionSize } from '../../../positionSizing/calculator';
import { fetchFxRate } from '../../../positionSizing/fxRates';
import { findInstrumentProfile, formatDistanceUnit } from '../../../positionSizing/instruments';

interface Props {
	form: TradeFormState;
	accountCurrency: string;
	onApplyPositionSize: (value: string) => void;
}

export function PositionSizeCalculator({ form, accountCurrency, onApplyPositionSize }: Props) {
	const profile = useMemo(() => findInstrumentProfile(form.symbol), [form.symbol]);
	const [conversionRate, setConversionRate] = useState<number | null>(null);
	const [rateDate, setRateDate] = useState('');
	const [rateError, setRateError] = useState('');
	const [isLoadingRate, setIsLoadingRate] = useState(false);
	const [contractSizeText, setContractSizeText] = useState('');

	useEffect(() => {
		setContractSizeText(profile ? String(profile.contractSize) : '');
	}, [profile?.id]);

	useEffect(() => {
		let cancelled = false;
		if (!profile) {
			setConversionRate(null);
			setRateDate('');
			setRateError('');
			return;
		}
		const account = (accountCurrency || profile.quoteCurrency).trim().toUpperCase();
		if (account === profile.quoteCurrency) {
			setConversionRate(1);
			setRateDate(new Date().toISOString().slice(0, 10));
			setRateError('');
			return;
		}
		setIsLoadingRate(true);
		setRateError('');
		void fetchFxRate(profile.quoteCurrency, account)
			.then((quote) => {
				if (cancelled) return;
				setConversionRate(quote.rate);
				setRateDate(quote.date);
			})
			.catch((error: unknown) => {
				if (cancelled) return;
				setConversionRate(null);
				setRateError(error instanceof Error ? error.message : 'نرخ تبدیل آنلاین دریافت نشد.');
			})
			.finally(() => {
				if (!cancelled) setIsLoadingRate(false);
			});
		return () => { cancelled = true; };
	}, [accountCurrency, profile?.id, profile?.quoteCurrency]);

	if (!profile) {
		return (
			<section className="trader-journal-review-form trader-journal-position-sizing">
				<div className="trader-journal-review-form__header">
					<h3>محاسبه خودکار حجم</h3>
					<p>برای محاسبه خودکار یکی از نمادهای پشتیبانی‌شده را انتخاب کن: EURUSD، XAUUSD، US30، DAX40/GER40، NAS100، USOIL/WTI یا BTCUSD.</p>
				</div>
			</section>
		);
	}

	const entry = Number(form.entryPrice);
	const stop = Number(form.stopLoss);
	const equity = Number(form.accountEquity);
	const riskPct = Number(form.riskPct);
	const contractSize = Number(contractSizeText);
	const result = conversionRate
		? calculatePositionSize({
			profile,
			entryPrice: entry,
			stopLoss: stop,
			equity,
			riskPct,
			quoteToAccountRate: conversionRate,
			contractSizeOverride: Number.isFinite(contractSize) && contractSize > 0 ? contractSize : null,
		})
		: null;
	const belowMinimum = Boolean(result && result.recommendedVolume > 0 && result.recommendedVolume < profile.minVolume);
	const canApply = Boolean(result && result.recommendedVolume >= profile.minVolume && !belowMinimum);
	const currency = (accountCurrency || profile.quoteCurrency).toUpperCase();
	const recommendedText = result ? formatNumber(result.recommendedVolume, 4) : '';
	const isApplied = Boolean(result && Number(form.positionSize) === result.recommendedVolume);

	return (
		<section className="trader-journal-review-form trader-journal-position-sizing">
			<div className="trader-journal-review-form__header">
				<h3>محاسبه خودکار حجم — {profile.displayNameFa}</h3>
				<p>{profile.noteFa}</p>
			</div>

			<div className="trader-journal-form__grid">
				<label className="trader-journal-field">
					<span>Contract Size / ضریب قرارداد</span>
					<input type="number" min="0" step="any" value={contractSizeText} onChange={(event) => setContractSizeText(event.target.value)} />
					<small>{profile.brokerSpecific ? 'برای CFDها این عدد ممکن است بین بروکرها فرق کند؛ فقط یک‌بار مشخصات Symbol بروکر را کنترل کن.' : 'استاندارد بازار فارکس.'}</small>
				</label>
				<div className="trader-journal-field trader-journal-field--readonly">
					<span>نرخ تبدیل {profile.quoteCurrency} → {currency}</span>
					<strong>{isLoadingRate ? 'در حال دریافت…' : conversionRate ? formatNumber(conversionRate, 6) : '-'}</strong>
					<small>{conversionRate === 1 ? 'بدون نیاز به تبدیل' : rateDate ? `منبع آنلاین Frankfurter — ${rateDate}` : rateError || 'برای این حساب نرخ تبدیل لازم است.'}</small>
				</div>
			</div>

			{result ? (
				<>
					<div className="trader-journal-khan-risk-grid">
						<div><span>ریسک پولی</span><strong>{formatMoney(result.riskAmount, currency)}</strong></div>
						<div><span>فاصله استاپ</span><strong>{formatNumber(result.distanceUnits, 2)} {formatDistanceUnit(profile)}</strong></div>
						<div><span>ارزش هر {formatDistanceUnit(profile)} / 1 lot</span><strong>{formatMoney(result.pipValuePerLotAccount, currency)}</strong></div>
						<div><span>زیان 1 lot تا SL</span><strong>{formatMoney(result.lossPerLotAccount, currency)}</strong></div>
					</div>
					<div className="trader-journal-khan-result-card trader-journal-position-sizing__result" style={{ border: '2px solid var(--interactive-accent)', padding: '14px' }}>
						<label className="trader-journal-field" style={{ margin: 0 }}>
							<span style={{ fontWeight: 800 }}>حجم نهایی پیشنهادی برای ورود</span>
							<input
								readOnly
								value={recommendedText}
								aria-label="حجم نهایی پیشنهادی"
								style={{ fontSize: '26px', fontWeight: 900, textAlign: 'center', height: '52px' }}
							/>
						</label>
						<strong style={{ display: 'block', textAlign: 'center', marginTop: '6px' }}>{recommendedText} Lot</strong>
						<small>ریسک واقعی بعد از گردکردن رو به پایین: {formatMoney(result.actualRiskAmountAtRoundedVolume, currency)} ({formatNumber(result.actualRiskPctAtRoundedVolume, 4)}%)</small>
						<button type="button" className="mod-cta" style={{ width: '100%', minHeight: '42px', marginTop: '8px' }} disabled={!canApply} onClick={() => onApplyPositionSize(String(result.recommendedVolume))}>
							ثبت {recommendedText} Lot در کادر «حجم معامله»
						</button>
						<div style={{ marginTop: '6px', fontWeight: 700 }}>
							{isApplied ? '✓ همین حجم اکنون در معامله ثبت شده است.' : `حجم فعلی فرم: ${form.positionSize || 'خالی'} — برای جلوگیری از اشتباه، عدد پیشنهادی را با دکمه بالا ثبت کن.`}
						</div>
					</div>
					{result.rawVolume > 0 && result.rawVolume < profile.minVolume ? (
						<div className="trader-journal-form__error">حجم محاسبه‌شده از حداقل حجم مرجع {profile.minVolume} lot کوچک‌تر است؛ با این مشخصات معامله را کوچک‌تر/پرریسک‌تر نکن.</div>
					) : null}
				</>
			) : (
				<div className="trader-journal-setting__description">برای دیدن حجم، حساب/سرمایه، درصد ریسک، Entry و Stop Loss معتبر را وارد کن.</div>
			)}
			{rateError ? <div className="trader-journal-form__error">{rateError} تا وقتی نرخ معتبر نداریم حجم نهایی ساخته نمی‌شود.</div> : null}
		</section>
	);
}

function formatMoney(value: number, currency: string): string {
	try {
		return new Intl.NumberFormat('en-US', { style: 'currency', currency, maximumFractionDigits: 2 }).format(value);
	} catch {
		return `${formatNumber(value, 2)} ${currency}`;
	}
}

function formatNumber(value: number, digits: number): string {
	return Number(value.toFixed(digits)).toLocaleString('en-US', { maximumFractionDigits: digits });
}
