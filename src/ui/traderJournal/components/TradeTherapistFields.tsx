import type {
	MentalFilter,
	MentalMapBug,
	SomaticSignal,
	TradeMotivation,
	TradePsychologySnapshot,
} from '../../../behavior/tradeTherapist';
import { MENTAL_BUG_LABELS, MOTIVATION_LABELS, SOMATIC_LABELS, defaultPatch } from '../../../behavior/tradeTherapist';

interface Props {
	value: TradePsychologySnapshot;
	isClosed: boolean;
	onChange: (value: TradePsychologySnapshot) => void;
}

const SOMATIC_OPTIONS = Object.keys(SOMATIC_LABELS) as SomaticSignal[];
const MOTIVATION_OPTIONS = Object.keys(MOTIVATION_LABELS) as TradeMotivation[];
const MENTAL_BUG_OPTIONS = Object.keys(MENTAL_BUG_LABELS) as MentalMapBug[];

export function TradeTherapistFields({ value, isClosed, onChange }: Props) {
	const pre = value.pre ?? {};
	const inTrade = value.in_trade ?? {};
	const post = value.post ?? {};

	const updatePre = (patch: Partial<NonNullable<TradePsychologySnapshot['pre']>>) =>
		onChange({ ...value, pre: { ...pre, ...patch } });
	const updateInTrade = (patch: Partial<NonNullable<TradePsychologySnapshot['in_trade']>>) =>
		onChange({ ...value, in_trade: { ...inTrade, ...patch } });
	const updatePost = (patch: Partial<NonNullable<TradePsychologySnapshot['post']>>) =>
		onChange({ ...value, post: { ...post, ...patch } });

	const toggleSignal = (signal: SomaticSignal) => {
		const current = pre.physical_signals ?? [];
		updatePre({ physical_signals: current.includes(signal) ? current.filter((item) => item !== signal) : [...current, signal] });
	};

	return (
		<section className="trade-therapist-panel" aria-label="ترید تراپیست هوشمند">
			<div className="trade-therapist-panel__intro">
				<div>
					<span className="trade-therapist-panel__eyebrow">ترید تراپیست · ژورنال حسی و شناختی</span>
					<h3>ذهن را ثبت کن، نه فقط قیمت را</h3>
					<p>اختیاری و سریع است. هدف تشخیص پزشکی نیست؛ فقط ثبت الگوی رفتاری برای پیدا کردن لوپ‌های تکرارشونده است.</p>
				</div>
				<span className="trade-therapist-panel__time">۱۵ ثانیه</span>
			</div>

			<div className="trade-therapist-quick-grid">
				<div className="trade-therapist-question">
					<span>ظرف حسی قبل از ورود</span>
					<div className="trade-therapist-chips">
						{([['clear', 'پاک و خنثی'], ['mixed', 'کمی درگیر'], ['loaded', 'بار معامله قبلی']] as const).map(([key, label]) => (
							<button type="button" className={pre.sensory_vessel === key ? 'is-selected' : ''} onClick={() => updatePre({ sensory_vessel: key })} key={key}>{label}</button>
						))}
					</div>
				</div>
				<div className="trade-therapist-question">
					<span>انگیزه واقعی ورود</span>
					<div className="trade-therapist-chips">
						{MOTIVATION_OPTIONS.map((key) => (
							<button type="button" className={pre.motivation === key ? 'is-selected' : ''} onClick={() => updatePre({ motivation: key })} key={key}>{MOTIVATION_LABELS[key]}</button>
						))}
					</div>
				</div>
			</div>

			<details className="trade-therapist-details">
				<summary>ثبت عمیق‌تر فقط اگر چیزی مهم بود</summary>
				<div className="trade-therapist-details__body">
					<div className="trade-therapist-question">
						<span>نشانه‌های جسمی</span>
						<div className="trade-therapist-chips">
							{SOMATIC_OPTIONS.map((key) => (
								<button type="button" className={(pre.physical_signals ?? []).includes(key) ? 'is-selected' : ''} onClick={() => toggleSignal(key)} key={key}>{SOMATIC_LABELS[key]}</button>
							))}
						</div>
					</div>
					<div className="trade-therapist-question">
						<span>حد ضرر را واقعاً به‌عنوان «هزینه سرمایه‌گذاری» پذیرفته‌ای؟</span>
						<div className="trade-therapist-chips">
							<button type="button" className={pre.stop_cost_accepted === true ? 'is-selected' : ''} onClick={() => updatePre({ stop_cost_accepted: true })}>بله، پذیرفته‌ام</button>
							<button type="button" className={pre.stop_cost_accepted === false ? 'is-danger-selected' : ''} onClick={() => updatePre({ stop_cost_accepted: false })}>نه، هنوز مقاومت دارم</button>
						</div>
					</div>
					<label className="trade-therapist-text">
						<span>مونولوگ درونی — فقط یک جمله</span>
						<input value={pre.internal_monologue ?? ''} onChange={(event) => updatePre({ internal_monologue: event.target.value })} placeholder="الان در ذهنم چه می‌گذرد؟" />
					</label>
				</div>
			</details>

			{!isClosed ? (
				<details className="trade-therapist-details">
					<summary>حین معامله · فقط اگر حالتت تغییر کرد</summary>
					<div className="trade-therapist-details__body trade-therapist-quick-grid">
						<SelectChips title="واکنش به کندل خلاف جهت" value={inTrade.counter_candle_reaction ?? ''} options={[['steady', 'خنثی'], ['uneasy', 'نا‌آرام'], ['panic', 'پانیک']]} onChange={(next) => updateInTrade({ counter_candle_reaction: next as 'steady' | 'uneasy' | 'panic' })} />
						<SelectChips title="تکانه رفتاری" value={inTrade.impulse_action ?? ''} options={[['none', 'هیچ'], ['move_stop', 'جابجایی SL'], ['remove_stop', 'حذف SL'], ['double_down', 'اضافه‌کردن حجم'], ['panic_close', 'خروج ترسیده'], ['hedge', 'هج عجولانه']]} onChange={(next) => updateInTrade({ impulse_action: next as NonNullable<TradePsychologySnapshot['in_trade']>['impulse_action'] })} />
						<SelectChips title="فیلتر ذهن" value={inTrade.mental_filter ?? ''} options={[['balanced', 'دیدن هر دو طرف'], ['confirmation_only', 'فقط تأیید سناریوی خودم'], ['threat_only', 'فقط خطر را می‌بینم']]} onChange={(next) => updateInTrade({ mental_filter: next as MentalFilter })} />
					</div>
				</details>
			) : (
				<div className="trade-therapist-post">
					<div className="trade-therapist-post__header">
						<div><strong>دیباگ ذهن بعد از معامله</strong><small>نتیجه پولی را کنار بگذار؛ کیفیت فرایند را امتیاز بده.</small></div>
						<label><span>امتیاز فرایند</span><input type="number" min="0" max="10" step="0.5" value={post.process_score ?? ''} onChange={(event) => updatePost({ process_score: event.target.value === '' ? undefined : Number(event.target.value) })} placeholder="0–10" /></label>
					</div>
					<div className="trade-therapist-question">
						<span>باگ نقشه ذهنی اصلی</span>
						<div className="trade-therapist-chips">
							{MENTAL_BUG_OPTIONS.map((key) => <button type="button" className={post.mental_map_bug === key ? 'is-selected' : ''} onClick={() => updatePost({ mental_map_bug: key, reprogramming_patch: post.reprogramming_patch || defaultPatch(key) })} key={key}>{MENTAL_BUG_LABELS[key]}</button>)}
						</div>
					</div>
					<label className="trade-therapist-text"><span>کد بازنویسی مغز</span><input value={post.reprogramming_patch ?? ''} onChange={(event) => updatePost({ reprogramming_patch: event.target.value })} placeholder="یک جمله کوتاه که معامله بعدی را تغییر می‌دهد" /></label>
					<label className="trade-therapist-reset"><input type="checkbox" checked={post.sensory_reset_done === true} onChange={(event) => updatePost({ sensory_reset_done: event.target.checked })} /><span>ظرف حسی را تخلیه کردم و نتیجه این معامله را به معامله بعدی نمی‌برم.</span></label>
				</div>
			)}

			<div className="trade-therapist-wisdom">«بازار احساس ندارد؛ نتیجه را کنترل نمی‌کنم. پاداش من اجرای فرایند است.»</div>
		</section>
	);
}

function SelectChips({ title, value, options, onChange }: { title: string; value: string; options: ReadonlyArray<readonly [string, string]>; onChange: (value: string) => void }) {
	return <div className="trade-therapist-question"><span>{title}</span><div className="trade-therapist-chips">{options.map(([key, label]) => <button type="button" className={value === key ? 'is-selected' : ''} onClick={() => onChange(key)} key={key}>{label}</button>)}</div></div>;
}
