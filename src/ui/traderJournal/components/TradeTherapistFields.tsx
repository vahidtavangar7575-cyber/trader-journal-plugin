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

const panelStyle = {
	borderRadius: 18,
	padding: 18,
	background: 'linear-gradient(135deg, color-mix(in srgb, var(--background-secondary) 92%, var(--interactive-accent) 8%), var(--background-secondary))',
	border: '1px solid color-mix(in srgb, var(--interactive-accent) 28%, var(--background-modifier-border))',
	boxShadow: '0 12px 34px rgba(0,0,0,.08)',
} as const;
const sectionStyle = {
	borderRadius: 14,
	padding: 14,
	background: 'color-mix(in srgb, var(--background-primary) 88%, transparent)',
	border: '1px solid var(--background-modifier-border)',
} as const;
const chipRowStyle = { display: 'flex', flexWrap: 'wrap', gap: 7, marginTop: 7 } as const;
const chipBaseStyle = { height: 'auto', minHeight: 34, borderRadius: 999, padding: '6px 11px', whiteSpace: 'normal' } as const;

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
		<section className="trader-journal-review-form" aria-label="ترید تراپیست هوشمند" style={panelStyle}>
			<div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
				<div style={{ flex: '1 1 420px' }}>
					<span style={{ color: 'var(--text-accent)', fontSize: 12, fontWeight: 700, letterSpacing: '.02em' }}>ترید تراپیست · ژورنال حسی و شناختی</span>
					<h3 style={{ margin: '5px 0 5px', fontSize: 20 }}>ذهن را ثبت کن، نه فقط قیمت را</h3>
					<p style={{ margin: 0, lineHeight: 1.8 }}>اختیاری و سریع است. هدف تشخیص پزشکی نیست؛ فقط ثبت الگوهای رفتاری و حسی برای پیدا کردن لوپ‌های تکرارشونده است.</p>
				</div>
				<span className="trader-journal-plan-badge" style={{ alignSelf: 'center', fontWeight: 700 }}>حدود ۱۵ ثانیه</span>
			</div>

			<div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 12 }}>
				<div style={sectionStyle}>
					<strong style={{ display: 'block' }}>ظرف حسی قبل از ورود</strong>
					<div className="trader-journal-review-form__chips" style={chipRowStyle}>
						{([['clear', 'پاک و خنثی'], ['mixed', 'کمی درگیر'], ['loaded', 'بار معامله قبلی']] as const).map(([key, label]) => (
							<button type="button" className={pre.sensory_vessel === key ? 'is-selected' : ''} style={chipBaseStyle} onClick={() => updatePre({ sensory_vessel: key })} key={key}>{label}</button>
						))}
					</div>
				</div>
				<div style={sectionStyle}>
					<strong style={{ display: 'block' }}>انگیزه واقعی ورود</strong>
					<div className="trader-journal-review-form__chips" style={chipRowStyle}>
						{MOTIVATION_OPTIONS.map((key) => (
							<button type="button" className={pre.motivation === key ? 'is-selected' : ''} style={chipBaseStyle} onClick={() => updatePre({ motivation: key })} key={key}>{MOTIVATION_LABELS[key]}</button>
						))}
					</div>
				</div>
			</div>

			<details style={sectionStyle}>
				<summary style={{ cursor: 'pointer', fontWeight: 700 }}>ثبت عمیق‌تر فقط اگر چیزی مهم بود</summary>
				<div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginTop: 14 }}>
					<div>
						<strong style={{ fontSize: 13 }}>نشانه‌های جسمی</strong>
						<div className="trader-journal-review-form__chips" style={chipRowStyle}>
							{SOMATIC_OPTIONS.map((key) => (
								<button type="button" className={(pre.physical_signals ?? []).includes(key) ? 'is-selected' : ''} style={chipBaseStyle} onClick={() => toggleSignal(key)} key={key}>{SOMATIC_LABELS[key]}</button>
							))}
						</div>
					</div>
					<div>
						<strong style={{ fontSize: 13 }}>حد ضرر را واقعاً به‌عنوان «هزینه سرمایه‌گذاری» پذیرفته‌ای؟</strong>
						<div className="trader-journal-review-form__chips" style={chipRowStyle}>
							<button type="button" className={pre.stop_cost_accepted === true ? 'is-selected' : ''} style={chipBaseStyle} onClick={() => updatePre({ stop_cost_accepted: true })}>بله، پذیرفته‌ام</button>
							<button type="button" style={{ ...chipBaseStyle, ...(pre.stop_cost_accepted === false ? { borderColor: 'var(--text-error)', color: 'var(--text-error)' } : {}) }} onClick={() => updatePre({ stop_cost_accepted: false })}>نه، هنوز مقاومت دارم</button>
						</div>
					</div>
					<label className="trader-journal-field">
						<span>مونولوگ درونی — فقط یک جمله</span>
						<input value={pre.internal_monologue ?? ''} onChange={(event) => updatePre({ internal_monologue: event.target.value })} placeholder="الان در ذهنم چه می‌گذرد؟" />
					</label>
				</div>
			</details>

			{!isClosed ? (
				<details style={sectionStyle}>
					<summary style={{ cursor: 'pointer', fontWeight: 700 }}>حین معامله · فقط اگر حالتت تغییر کرد</summary>
					<div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', gap: 12, marginTop: 14 }}>
						<SelectChips title="واکنش به کندل خلاف جهت" value={inTrade.counter_candle_reaction ?? ''} options={[['steady', 'خنثی'], ['uneasy', 'نا‌آرام'], ['panic', 'پانیک']]} onChange={(next) => updateInTrade({ counter_candle_reaction: next as 'steady' | 'uneasy' | 'panic' })} />
						<SelectChips title="تکانه رفتاری" value={inTrade.impulse_action ?? ''} options={[['none', 'هیچ'], ['move_stop', 'جابجایی SL'], ['remove_stop', 'حذف SL'], ['double_down', 'اضافه‌کردن حجم'], ['panic_close', 'خروج ترسیده'], ['hedge', 'هج عجولانه']]} onChange={(next) => updateInTrade({ impulse_action: next as NonNullable<TradePsychologySnapshot['in_trade']>['impulse_action'] })} />
						<SelectChips title="فیلتر ذهن" value={inTrade.mental_filter ?? ''} options={[['balanced', 'دیدن هر دو طرف'], ['confirmation_only', 'فقط تأیید سناریوی خودم'], ['threat_only', 'فقط خطر را می‌بینم']]} onChange={(next) => updateInTrade({ mental_filter: next as MentalFilter })} />
					</div>
				</details>
			) : (
				<div style={{ ...sectionStyle, display: 'flex', flexDirection: 'column', gap: 14 }}>
					<div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', alignItems: 'end' }}>
						<div><strong style={{ display: 'block' }}>دیباگ ذهن بعد از معامله</strong><small style={{ color: 'var(--text-muted)' }}>نتیجه پولی را کنار بگذار؛ کیفیت فرایند را امتیاز بده.</small></div>
						<label className="trader-journal-field" style={{ minWidth: 140 }}><span>امتیاز فرایند</span><input type="number" min="0" max="10" step="0.5" value={post.process_score ?? ''} onChange={(event) => updatePost({ process_score: event.target.value === '' ? undefined : Number(event.target.value) })} placeholder="0–10" /></label>
					</div>
					<div>
						<strong style={{ fontSize: 13 }}>باگ نقشه ذهنی اصلی</strong>
						<div className="trader-journal-review-form__chips" style={chipRowStyle}>
							{MENTAL_BUG_OPTIONS.map((key) => <button type="button" className={post.mental_map_bug === key ? 'is-selected' : ''} style={chipBaseStyle} onClick={() => updatePost({ mental_map_bug: key, reprogramming_patch: post.reprogramming_patch || defaultPatch(key) })} key={key}>{MENTAL_BUG_LABELS[key]}</button>)}
						</div>
					</div>
					<label className="trader-journal-field"><span>کد بازنویسی مغز</span><input value={post.reprogramming_patch ?? ''} onChange={(event) => updatePost({ reprogramming_patch: event.target.value })} placeholder="یک جمله کوتاه که معامله بعدی را تغییر می‌دهد" /></label>
					<label style={{ display: 'flex', gap: 8, alignItems: 'center', lineHeight: 1.7 }}><input type="checkbox" style={{ width: 'auto' }} checked={post.sensory_reset_done === true} onChange={(event) => updatePost({ sensory_reset_done: event.target.checked })} /><span>ظرف حسی را تخلیه کردم و نتیجه این معامله را به معامله بعدی نمی‌برم.</span></label>
				</div>
			)}

			<div style={{ borderRadius: 12, padding: '10px 13px', background: 'color-mix(in srgb, var(--interactive-accent) 8%, var(--background-primary))', color: 'var(--text-muted)', lineHeight: 1.8, textAlign: 'center' }}>«بازار احساس ندارد؛ نتیجه را کنترل نمی‌کنم. پاداش من اجرای فرایند است.»</div>
		</section>
	);
}

function SelectChips({ title, value, options, onChange }: { title: string; value: string; options: ReadonlyArray<readonly [string, string]>; onChange: (value: string) => void }) {
	return <div style={sectionStyle}><strong style={{ display: 'block', fontSize: 13 }}>{title}</strong><div className="trader-journal-review-form__chips" style={chipRowStyle}>{options.map(([key, label]) => <button type="button" className={value === key ? 'is-selected' : ''} style={chipBaseStyle} onClick={() => onChange(key)} key={key}>{label}</button>)}</div></div>;
}
