import { useEffect, useMemo, useState } from 'react';
import type TraderJournalPlugin from '../../../main';
import type { TradeFormState } from '../form';
import { calculatePositionSize } from '../../../positionSizing/calculator';
import { fetchFxRate } from '../../../positionSizing/fxRates';
import { findInstrumentProfile, formatDistanceUnit } from '../../../positionSizing/instruments';

interface Props {
	plugin: TraderJournalPlugin;
	form: TradeFormState;
	accountCurrency: string;
	onApplyPositionSize: (value: string) => void;
}

export function PositionSizeCalculator({ plugin, form, accountCurrency, onApplyPositionSize }: Props) {
	const profile = useMemo(() => findInstrumentProfile(form.symbol), [form.symbol]);
	const [conversionRate, setConversionRate] = useState<number | null>(null);
	const [rateDate, setRateDate] = useState('');
	const [rateError, setRateError] = useState('');
	const [isLoadingRate, setIsLoadingRate] = useState(false);
	const [contractSizeText, setContractSizeText] = useState('');
	const [presetMessage, setPresetMessage] = useState('');

	useEffect(() => {
		if (!profile) {
			setContractSizeText('');
			setPresetMessage('');
			return;
		}
		const saved = plugin.settings.instrumentContractOverrides[profile.id];
		setContractSizeText(String(saved ?? profile.contractSize));
		setPresetMessage(saved ? 'مشخصات ذخیره‌شده بروکر برای این نماد در حال استفاده است.' : 'پروفایل پیش‌فرض اجرایی در حال استفاده است.');
	}, [plugin, profile?.id]);

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
					<p>نماد را یکی از این موارد انتخاب کن: EURUSD، XAUUSD، US30، DAX40/GER40، NAS100، USOIL/WTI یا BTCUSD.</p>
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
	const savedOverride = plugin.settings.instrumentContractOverrides[profile.id];
	const usingSavedOverride = Boolean(savedOverride && Number(contractSizeText) === savedOverride);
	const missingInputs = [
		!Number.isFinite(equity) || equity <= 0 ? 'سرمایه حساب' : '',
		!Number.isFinite(riskPct) || riskPct <= 0 ? 'درصد ریسک' : '',
		!Number.isFinite(entry) || entry <= 0 ? 'Entry' : '',
		!Number.isFinite(stop) || stop <= 0 ? 'Stop Loss' : '',
	].filter(Boolean);

	const saveBrokerPreset = async () => {
		if (!Number.isFinite(contractSize) || contractSize <= 0) return;
		plugin.settings.instrumentContractOverrides[profile.id] = contractSize;
		await plugin.saveSettings();
		setPresetMessage(`ضریب قرارداد ${formatNumber(contractSize, 8)} برای ${profile.id} ذخیره شد و از این به بعد خودکار استفاده می‌شود.`);
	};

	const resetBrokerPreset = async () => {
		delete plugin.settings.instrumentContractOverrides[profile.id];
		await plugin.saveSettings();
		setContractSizeText(String(profile.contractSize));
		setPresetMessage('Override بروکر حذف شد؛ پروفایل پیش‌فرض اجرایی دوباره فعال است.');
	};

	return (
		<section className="trader-journal-review-form trader-journal-position-sizing">
			<div className="trader-journal-review-form__header">
				<h3>محاسبه خودکار حجم — {profile.displayNameFa}</h3>
				<p>{profile.noteFa}</p>
			</div>

			<div style={{ display: 'grid', gap: '10px', padding: '11px 12px', borderRadius: '9px', border: '1px solid var(--background-modifier-border)', background: 'var(--background-primary)' }}>
				<div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center', justifyContent: 'space-between' }}>
					<strong>پروفایل اجرایی بروکر / پراپ</strong>
					<span style={{ color: usingSavedOverride ? 'var(--color-green)' : 'var(--text-muted)', fontSize: 'var(--font-ui-smaller)' }}>{usingSavedOverride ? 'Override ذخیره‌شده ✓' : 'پیش‌فرض مرجع'}</span>
				</div>
				<div className="trader-journal-form__grid">
					<label className="trader-journal-field">
						<span>Contract Size / ضریب قرارداد</span>
						<input type="number" min="0" step="any" value={contractSizeText} onChange={(event) => setContractSizeText(event.target.value)} />
						<small>{profile.brokerSpecific ? 'در CFDها این مقدار می‌تواند بین بروکرها فرق کند؛ مقدار Symbol Specification بروکر را اینجا ثبت کن.' : 'پروفایل استاندارد Spot/CFD.'}</small>
					</label>
					<div className="trader-journal-field trader-journal-field--readonly">
						<span>نرخ تبدیل {profile.quoteCurrency} → {currency}</span>
						<strong>{isLoadingRate ? 'در حال دریافت…' : conversionRate ? formatNumber(conversionRate, 6) : '-'}</strong>
						<small>{conversionRate === 1 ? 'بدون نیاز به تبدیل' : rateDate ? `نرخ آنلاین مرجع — ${rateDate}` : rateError || 'برای این حساب نرخ تبدیل لازم است.'}</small>
					</div>
					<div className="trader-journal-field" style={{ justifyContent: 'end' }}>
						<span>ذخیره مشخصات بروکر</span>
						<div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
							<button type="button" className="mod-cta" disabled={!Number.isFinite(contractSize) || contractSize <= 0} onClick={() => void saveBrokerPreset()}>ذخیره برای {profile.id}</button>
							{savedOverride ? <button type="button" onClick={() => void resetBrokerPreset()}>بازگشت به پیش‌فرض</button> : null}
						</div>
					</div>
				</div>
				{presetMessage ? <small style={{ color: 'var(--text-muted)' }}>{presetMessage}</small> : null}
			</div>

			<details style={{ border: '1px solid var(--background-modifier-border)', borderRadius: '9px', padding: '9px 11px', background: 'var(--background-secondary)' }}>
				<summary style={{ cursor: 'pointer', fontWeight: 700 }}>مرجع رسمی قرارداد بازار — برای تطبیق، نه جایگزینی خودکار بروکر</summary>
				<p style={{ marginTop: '8px', lineHeight: 1.65 }}>{profile.officialReferenceFa}</p>
				<small style={{ color: 'var(--text-muted)' }}>{profile.officialSourceFa}</small>
			</details>

			{result ? (
				<>
					<div className="trader-journal-khan-risk-grid">
						<div><span>ریسک پولی</span><strong>{formatMoney(result.riskAmount, currency)}</strong></div>
						<div><span>فاصله استاپ</span><strong>{formatNumber(result.distanceUnits, 2)} {formatDistanceUnit(profile)}</strong></div>
						<div><span>ارزش هر {formatDistanceUnit(profile)} / 1 lot</span><strong>{formatMoney(result.pipValuePerLotAccount, currency)}</strong></div>
						<div><span>زیان 1 lot تا SL</span><strong>{formatMoney(result.lossPerLotAccount, currency)}</strong></div>
					</div>

					<div className="trader-journal-khan-result-card trader-journal-position-sizing__result" style={{ border: '2px solid var(--interactive-accent)', borderRadius: '12px', padding: '16px', background: 'color-mix(in srgb, var(--interactive-accent) 8%, var(--background-primary))' }}>
						<div style={{ textAlign: 'center', color: 'var(--text-muted)', fontWeight: 700 }}>حجم نهایی پیشنهادی برای ورود</div>
						<input readOnly value={recommendedText} aria-label="حجم نهایی پیشنهادی" style={{ width: '100%', marginTop: '7px', fontSize: '30px', fontWeight: 900, textAlign: 'center', height: '58px', border: '2px solid var(--interactive-accent)' }} />
						<strong style={{ display: 'block', textAlign: 'center', marginTop: '7px', fontSize: '1.05em' }}>{recommendedText} Lot</strong>
						<small style={{ display: 'block', textAlign: 'center', marginTop: '4px' }}>ریسک واقعی پس از گردکردن رو به پایین: {formatMoney(result.actualRiskAmountAtRoundedVolume, currency)} ({formatNumber(result.actualRiskPctAtRoundedVolume, 4)}%)</small>
						<button type="button" className="mod-cta" style={{ width: '100%', minHeight: '46px', marginTop: '10px', fontWeight: 800 }} disabled={!canApply} onClick={() => onApplyPositionSize(String(result.recommendedVolume))}>
							استفاده از حجم {recommendedText} Lot در این معامله
						</button>
						<div style={{ marginTop: '7px', textAlign: 'center', fontWeight: 700, color: isApplied ? 'var(--color-green)' : 'var(--text-muted)' }}>
							{isApplied ? '✓ حجم پیشنهادی در کادر معامله ثبت شده است.' : `حجم فعلی فرم: ${form.positionSize || 'خالی'}`}
						</div>
					</div>

					{result.rawVolume > 0 && result.rawVolume < profile.minVolume ? (
						<div className="trader-journal-form__error">حجم محاسبه‌شده از حداقل حجم مرجع {profile.minVolume} lot کوچک‌تر است؛ ریسک را برای رسیدن به حداقل حجم بالا نبر.</div>
					) : null}
				</>
			) : (
				<div className="trader-journal-setting__description" style={{ lineHeight: 1.6 }}>
					{missingInputs.length ? `برای ساخت حجم دقیق هنوز این موارد لازم‌اند: ${missingInputs.join('، ')}.` : 'در حال آماده‌سازی نرخ تبدیل…'}
				</div>
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
