import type { TradeJournalCoreState } from '../../../trades/journalCore';

interface Props {
	value: TradeJournalCoreState;
	isClosed: boolean;
	onChange: (value: TradeJournalCoreState) => void;
}

export function TradeJournalCoreFields({ value, isClosed, onChange }: Props) {
	const set = <K extends keyof TradeJournalCoreState>(key: K, next: TradeJournalCoreState[K]) => {
		onChange({ ...value, [key]: next });
	};

	return (
		<section className="trader-journal-review-form trader-journal-core-journal" dir="rtl">
			<div className="trader-journal-review-form__header">
				<div>
					<h3>ژورنال مرکزی معامله</h3>
					<p>اطلاعات اصلی فایل ژورنال تو اینجا، داخل همان معامله، ذخیره می‌شود. فقط مواردی را ثبت کن که واقعاً روی چارت دیده‌ای؛ فیلدهای خالی به‌زور پر نمی‌شوند.</p>
				</div>
			</div>

			<details open>
				<summary><b>۱) Context و منطق قبل از ورود</b></summary>
				<div className="trader-journal-form__grid trader-journal-core-journal__grid">
					<TextField label="روز / عنوان جلسه" value={value.sessionDay} onChange={(v) => set('sessionDay', v)} placeholder="مثلاً سه‌شنبه لندن" />
					<SelectField label="ساختار HTF / M15" value={value.htfStructure} onChange={(v) => set('htfStructure', v)} options={[
						['', 'مشخص نشده'], ['bullish', 'صعودی'], ['bearish', 'نزولی'], ['range', 'رنج'], ['unclear', 'نامشخص / هنوز قابل تصمیم نیست'],
					]} />
					<SelectField label="لایه ساختار" value={value.structureLayer} onChange={(v) => set('structureLayer', v)} options={[
						['', 'مشخص نشده'], ['major', 'Major / اصلی'], ['internal', 'Internal / داخلی'], ['both', 'هر دو در تحلیل مشخص شده'], ['unclear', 'نامشخص'],
					]} />
					<SelectField label="رویداد نقدینگی" value={value.liquidityEvent} onChange={(v) => set('liquidityEvent', v)} options={[
						['', 'مشخص نشده'], ['idm', 'IDM / Inducement'], ['pdh', 'PDH'], ['pdl', 'PDL'], ['session', 'Session High / Low'], ['eqh-eql', 'EQH / EQL'], ['sweep', 'Sweep ساختاری'], ['other', 'سایر'],
					]} />
					<SelectField label="خانواده POI" value={value.poiCategory} onChange={(v) => set('poiCategory', v)} options={[
						['', 'مشخص نشده'], ['of', 'Order Flow'], ['ob', 'Order Block'], ['scm', 'Single Candle Mitigation'], ['hidden', 'Hidden POI'], ['daily-session', 'Daily / Session POI'], ['other', 'سایر'],
					]} />
					<SelectField label="نوع POI" value={value.poiType} onChange={(v) => set('poiType', v)} options={[
						['', 'مشخص نشده'], ['decisional', 'Decisional'], ['extreme', 'Extreme'], ['unclear', 'هنوز مشخص نیست'],
					]} />
					<SelectField label="وضعیت IDM" value={value.idmState} onChange={(v) => set('idmState', v)} options={[
						['', 'مشخص نشده'], ['intact', 'هنوز مصرف نشده'], ['consumed', 'مصرف شده'], ['transferred', 'به Pullback جدید منتقل شده'], ['unclear', 'نامشخص'],
					]} />
					<SelectField label="Trigger / Entry Module" value={value.triggerModule} onChange={(v) => set('triggerModule', v)} options={[
						['', 'مشخص نشده'], ['choch', 'CHOCH'], ['flip', 'Flip'], ['scm', 'SCM'], ['scob', 'SCOB'], ['sweep', 'Sweep entry'], ['none', 'هنوز Trigger نداریم'],
					]} />
					<TextField label="نقدینگی / هدف اصلی" value={value.targetLiquidity} onChange={(v) => set('targetLiquidity', v)} placeholder="هدف دقیق را بنویس" />
					<TextField label="مرز ناحیه M15 / POI" value={value.m15ZoneBoundary} onChange={(v) => set('m15ZoneBoundary', v)} placeholder="مثلاً 1.09520 تا 1.09480" />
				</div>
				<div className="trader-journal-core-journal__checks">
					<CheckField label="Context تایم M15/HTF کامل شده" checked={value.m15ContextComplete} onChange={(v) => set('m15ContextComplete', v)} />
					<CheckField label="Trigger تایم M1 کامل شده" checked={value.m1TriggerComplete} onChange={(v) => set('m1TriggerComplete', v)} />
					<CheckField label="Zone / نقدینگی موردنظر مصرف شده" checked={value.zoneConsumed} onChange={(v) => set('zoneConsumed', v)} />
					<CheckField label="خبرهای مهم بررسی شده" checked={value.newsChecked} onChange={(v) => set('newsChecked', v)} />
				</div>
			</details>

			<details open={isClosed}>
				<summary><b>۲) اجرای واقعی و ارزیابی بعد از خروج</b></summary>
				<p className="trader-journal-core-journal__hint">این بخش هنگام ثبت اولیه معامله باز لازم نیست. بعد از TP/SL/خروج دستی همان رکورد را باز کن و تکمیلش کن.</p>
				<div className="trader-journal-form__grid trader-journal-core-journal__grid">
					<NumberField label="کمیسیون" value={value.commission} onChange={(v) => set('commission', v)} />
					<NumberField label="Swap" value={value.swap} onChange={(v) => set('swap', v)} />
					<NumberField label="سود/زیان ناخالص" value={value.grossPnl} onChange={(v) => set('grossPnl', v)} />
					<NumberField label="سود/زیان خالص" value={value.netPnl} onChange={(v) => set('netPnl', v)} />
					<NumberField label="MFE به R" value={value.mfeR} onChange={(v) => set('mfeR', v)} />
					<NumberField label="MAE به R" value={value.maeR} onChange={(v) => set('maeR', v)} />
					<SelectField label="مدیریت استاپ" value={value.stopManagement} onChange={(v) => set('stopManagement', v)} options={[
						['', 'ثبت نشده'], ['unchanged', 'بدون تغییر'], ['breakeven', 'انتقال به BE'], ['tightened', 'تنگ‌تر شده'], ['trailed', 'Trailing'], ['widened', 'بازتر شده'], ['removed', 'حذف شده'],
					]} />
					<SelectField label="علت خروج" value={value.exitReason} onChange={(v) => set('exitReason', v)} options={[
						['', 'ثبت نشده'], ['tp', 'TP / هدف'], ['sl', 'SL'], ['trail', 'Trailing stop'], ['manual', 'خروج دستی'], ['time', 'خروج زمانی'], ['invalidated', 'ابطال سناریو'], ['other', 'سایر'],
					]} />
				</div>
				<div className="trader-journal-core-journal__checks">
					<CheckField label="استاپ را برخلاف پلن بازتر کردم / ریسک را زیاد کردم" checked={value.stopWidened} onChange={(v) => set('stopWidened', v)} warning />
				</div>
			</details>
		</section>
	);
}

function TextField({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (value: string) => void; placeholder?: string }) {
	return <label className="trader-journal-field"><span>{label}</span><input value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} /></label>;
}

function NumberField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
	return <label className="trader-journal-field"><span>{label}</span><input type="number" step="any" value={value} onChange={(event) => onChange(event.target.value)} /></label>;
}

function SelectField({ label, value, onChange, options }: { label: string; value: string; onChange: (value: string) => void; options: Array<[string, string]> }) {
	return <label className="trader-journal-field"><span>{label}</span><select value={value} onChange={(event) => onChange(event.target.value)}>{options.map(([id, text]) => <option key={id || 'empty'} value={id}>{text}</option>)}</select></label>;
}

function CheckField({ label, checked, onChange, warning = false }: { label: string; checked: boolean; onChange: (value: boolean) => void; warning?: boolean }) {
	return <label className={`trader-journal-field trader-journal-core-journal__check${warning ? ' is-warning' : ''}`}><input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} /><span>{label}</span></label>;
}
