import type { TradeEntry } from '../trades/types';
import { stringifyValue } from '../trades/format';

export type SensoryVesselStatus = 'clear' | 'mixed' | 'loaded';
export type SomaticSignal = 'relaxed' | 'heart_rate' | 'muscle_tension' | 'shallow_breathing' | 'restless';
export type TradeMotivation = 'strategy' | 'fomo' | 'revenge' | 'adrenaline' | 'prove_right' | 'escape_pressure';
export type CounterCandleReaction = 'steady' | 'uneasy' | 'panic';
export type ImpulseAction = 'none' | 'move_stop' | 'remove_stop' | 'double_down' | 'panic_close' | 'hedge';
export type MentalFilter = 'balanced' | 'confirmation_only' | 'threat_only';
export type MentalMapBug = 'none' | 'certainty' | 'control' | 'ego_right' | 'survival' | 'fomo' | 'revenge' | 'dopamine' | 'confirmation';

export interface TradePsychologySnapshot {
	schema_version: 1;
	pre?: {
		sensory_vessel?: SensoryVesselStatus;
		physical_signals?: SomaticSignal[];
		motivation?: TradeMotivation;
		stop_cost_accepted?: boolean;
		internal_monologue?: string;
	};
	in_trade?: {
		counter_candle_reaction?: CounterCandleReaction;
		impulse_action?: ImpulseAction;
		mental_filter?: MentalFilter;
		note?: string;
	};
	post?: {
		process_score?: number;
		sensory_reset_done?: boolean;
		mental_map_bug?: MentalMapBug;
		reprogramming_patch?: string;
	};
}

export const SOMATIC_LABELS: Record<SomaticSignal, string> = {
	relaxed: 'بدن آرام',
	heart_rate: 'تپش قلب',
	muscle_tension: 'انقباض عضلانی',
	shallow_breathing: 'تنفس سطحی',
	restless: 'بی‌قراری',
};

export const MOTIVATION_LABELS: Record<TradeMotivation, string> = {
	strategy: 'اجرای استراتژی',
	fomo: 'FOMO / جا نماندن',
	revenge: 'جبران باخت',
	adrenaline: 'هیجان / آدرنالین',
	prove_right: 'اثبات درست‌بودن تحلیل',
	escape_pressure: 'فرار از فشار / نیاز مالی',
};

export const MENTAL_BUG_LABELS: Record<MentalMapBug, string> = {
	none: 'باگ مشخصی ندیدم',
	certainty: 'دام قطعیت',
	control: 'توهم کنترل بازار',
	ego_right: 'نیاز ایگو به درست‌بودن',
	survival: 'ترس بقا / فشار مالی',
	fomo: 'FOMO و تعقیب حرکت',
	revenge: 'انتقام از بازار',
	dopamine: 'ترید برای هیجان و دوپامین',
	confirmation: 'فیلتر تأییدطلبی',
};

export function createEmptyPsychologySnapshot(): TradePsychologySnapshot {
	return { schema_version: 1 };
}

export function normalizePsychologySnapshot(value: unknown): TradePsychologySnapshot {
	if (!value || typeof value !== 'object') return createEmptyPsychologySnapshot();
	const raw = value as Record<string, unknown>;
	const pre = raw.pre && typeof raw.pre === 'object' ? raw.pre as Record<string, unknown> : undefined;
	const inTrade = raw.in_trade && typeof raw.in_trade === 'object' ? raw.in_trade as Record<string, unknown> : undefined;
	const post = raw.post && typeof raw.post === 'object' ? raw.post as Record<string, unknown> : undefined;
	return {
		schema_version: 1,
		...(pre ? { pre: {
			...(isSensoryVessel(pre.sensory_vessel) ? { sensory_vessel: pre.sensory_vessel } : {}),
			...(Array.isArray(pre.physical_signals) ? { physical_signals: pre.physical_signals.filter(isSomaticSignal) } : {}),
			...(isTradeMotivation(pre.motivation) ? { motivation: pre.motivation } : {}),
			...(typeof pre.stop_cost_accepted === 'boolean' ? { stop_cost_accepted: pre.stop_cost_accepted } : {}),
			...(stringifyValue(pre.internal_monologue).trim() ? { internal_monologue: stringifyValue(pre.internal_monologue).trim() } : {}),
		} } : {}),
		...(inTrade ? { in_trade: {
			...(isCounterReaction(inTrade.counter_candle_reaction) ? { counter_candle_reaction: inTrade.counter_candle_reaction } : {}),
			...(isImpulseAction(inTrade.impulse_action) ? { impulse_action: inTrade.impulse_action } : {}),
			...(isMentalFilter(inTrade.mental_filter) ? { mental_filter: inTrade.mental_filter } : {}),
			...(stringifyValue(inTrade.note).trim() ? { note: stringifyValue(inTrade.note).trim() } : {}),
		} } : {}),
		...(post ? { post: {
			...(Number.isFinite(Number(post.process_score)) ? { process_score: Math.max(0, Math.min(10, Number(post.process_score))) } : {}),
			...(typeof post.sensory_reset_done === 'boolean' ? { sensory_reset_done: post.sensory_reset_done } : {}),
			...(isMentalMapBug(post.mental_map_bug) ? { mental_map_bug: post.mental_map_bug } : {}),
			...(stringifyValue(post.reprogramming_patch).trim() ? { reprogramming_patch: stringifyValue(post.reprogramming_patch).trim() } : {}),
		} } : {}),
	};
}

export function buildTherapistSummary(trade: TradeEntry): string[] {
	const psychology = normalizePsychologySnapshot(trade.psychology);
	const pre = psychology.pre;
	const inTrade = psychology.in_trade;
	const post = psychology.post;
	const lines: string[] = [];

	if (pre?.physical_signals?.length) {
		lines.push(`تشخیص حسی/جسمی: ${pre.physical_signals.map((signal) => SOMATIC_LABELS[signal]).join('، ')}.`);
	} else if (pre?.sensory_vessel) {
		lines.push(`وضعیت ظرف حسی پیش از ورود: ${sensoryVesselLabel(pre.sensory_vessel)}.`);
	}

	const inferredBug = post?.mental_map_bug && post.mental_map_bug !== 'none'
		? post.mental_map_bug
		: inferMentalBug(trade, psychology);
	if (inferredBug && inferredBug !== 'none') lines.push(`باگ نقشه ذهنی محتمل: ${MENTAL_BUG_LABELS[inferredBug]}.`);

	if (typeof post?.process_score === 'number') {
		lines.push(`امتیاز فرایند مستقل از نتیجه: ${post.process_score.toFixed(1)} از ۱۰.`);
	}

	const patch = post?.reprogramming_patch || defaultPatch(inferredBug);
	if (patch) lines.push(`کد بازنویسی: ${patch}`);

	if (post?.sensory_reset_done === false || stringifyValue(trade.status) === 'closed') {
		lines.push('ریست حسی پیشنهادی: ۳ بازدم آهسته، رهاکردن نتیجه معامله، نام‌گذاری یک حس جسمی و بازگشت به حالت خنثی قبل از تصمیم بعدی.');
	}
	return lines;
}

export function inferMentalBug(trade: TradeEntry, psychology: TradePsychologySnapshot): MentalMapBug {
	const motivation = psychology.pre?.motivation;
	if (motivation === 'fomo') return 'fomo';
	if (motivation === 'revenge') return 'revenge';
	if (motivation === 'adrenaline') return 'dopamine';
	if (motivation === 'prove_right') return 'ego_right';
	if (motivation === 'escape_pressure') return 'survival';
	if (psychology.in_trade?.mental_filter === 'confirmation_only') return 'confirmation';
	if (psychology.in_trade?.impulse_action === 'move_stop' || psychology.in_trade?.impulse_action === 'remove_stop') return 'control';
	const chase = Number(trade.urge_to_chase);
	if (Number.isFinite(chase) && chase >= 7) return 'fomo';
	return 'none';
}

export function defaultPatch(bug: MentalMapBug): string {
	const patches: Record<MentalMapBug, string> = {
		none: 'نتیجه را رها می‌کنم؛ پاداش من اجرای صحیح فرایند است.',
		certainty: 'من برای قطعیت وارد بازار نمی‌شوم؛ فقط یک احتمال با ریسک محدود را اجرا می‌کنم.',
		control: 'من بازار را کنترل نمی‌کنم؛ فقط اندازه ریسک، نقطه خروج و رفتار خودم را کنترل می‌کنم.',
		ego_right: 'درست‌بودن تحلیل ارزش من را تعیین نمی‌کند؛ ادامه‌دادن اجرای درست مهم‌تر است.',
		survival: 'این معامله قرار نیست مسئله مالی زندگی مرا حل کند؛ فقط یک نمونه از توزیع احتمالات است.',
		fomo: 'فرصت از دست‌رفته بدهی بازار به من نیست؛ حرکت را تعقیب نمی‌کنم.',
		revenge: 'بازار چیزی به من بدهکار نیست؛ معامله بعدی مستقل از معامله قبلی است.',
		dopamine: 'من برای تحریک عصبی معامله نمی‌کنم؛ فقط برای اجرای ستاپ معتبر وارد می‌شوم.',
		confirmation: 'قبل از ورود یک دلیل مخالف سناریوی خودم را هم فعالانه پیدا می‌کنم.',
	};
	return patches[bug];
}

function sensoryVesselLabel(value: SensoryVesselStatus): string {
	return value === 'clear' ? 'پاک و خنثی' : value === 'mixed' ? 'کمی درگیر' : 'پر از بار معامله قبلی';
}

function isSensoryVessel(value: unknown): value is SensoryVesselStatus {
	return value === 'clear' || value === 'mixed' || value === 'loaded';
}
function isSomaticSignal(value: unknown): value is SomaticSignal {
	return value === 'relaxed' || value === 'heart_rate' || value === 'muscle_tension' || value === 'shallow_breathing' || value === 'restless';
}
function isTradeMotivation(value: unknown): value is TradeMotivation {
	return value === 'strategy' || value === 'fomo' || value === 'revenge' || value === 'adrenaline' || value === 'prove_right' || value === 'escape_pressure';
}
function isCounterReaction(value: unknown): value is CounterCandleReaction {
	return value === 'steady' || value === 'uneasy' || value === 'panic';
}
function isImpulseAction(value: unknown): value is ImpulseAction {
	return value === 'none' || value === 'move_stop' || value === 'remove_stop' || value === 'double_down' || value === 'panic_close' || value === 'hedge';
}
function isMentalFilter(value: unknown): value is MentalFilter {
	return value === 'balanced' || value === 'confirmation_only' || value === 'threat_only';
}
function isMentalMapBug(value: unknown): value is MentalMapBug {
	return value === 'none' || value === 'certainty' || value === 'control' || value === 'ego_right' || value === 'survival' || value === 'fomo' || value === 'revenge' || value === 'dopamine' || value === 'confirmation';
}
