import type { KhanDecisionNode, KhanSetupId } from './types';

export const KHAN_RULE_VERSION = 'presentation-58p-v1';
export const KHAN_START_PAGE = 1;

export const KHAN_SETUP_NAMES: Record<KhanSetupId, string> = {
	'setup-1': 'Khan Setup 1',
	'setup-2': 'Khan Setup 2',
	'setup-3': 'Khan Setup 3',
	'setup-4': 'Khan Setup 4',
	'setup-5': 'Khan Setup 5',
	'setup-6': 'Khan Setup 6',
};

export const KHAN_RULES: Readonly<Record<number, KhanDecisionNode>> = {
	1: {
		kind: 'question',
		page: 1,
		title: 'قیمت کجاست؟',
		body: 'وضعیت فعلی قیمت را انتخاب کن تا مسیر تصمیم مناسب باز شود.',
		answers: [
			{ id: 'daily-level', label: 'در حال شکستن سقف یا کف روزانه', nextPage: 41, setSetup: 'setup-5' },
			{ id: 'shadow-level', label: 'در حال شکستن سقف یا کف با Shadow', nextPage: 24, setSetup: 'setup-3' },
			{ id: 'bos-close', label: 'بعد از BOS با Close کندل', nextPage: 37, setSetup: 'setup-4' },
			{ id: 'idm-consumed', label: 'بعد از مصرف کامل IDM', nextPage: 2, setSetup: 'setup-1' },
			{ id: 'fast-entry', label: 'بعد از BOS یا CHOCH برای ورود سریع', nextPage: 51, setSetup: 'setup-6' },
		],
	},
	2: {
		kind: 'question',
		page: 2,
		title: 'SETUP 1 — آیا قیمت به POI برخورد کرده است؟',
		answers: [
			{ id: 'yes', label: 'بله', nextPage: 3 },
			{ id: 'no', label: 'خیر', nextPage: 18, setSetup: 'setup-2' },
		],
	},
	3: {
		kind: 'question',
		page: 3,
		title: 'به کدام POI برخورد کرده است؟',
		answers: [
			{ id: 'decisional', label: 'دسیژنال', nextPage: 4 },
			{ id: 'extreme', label: 'اکستریم', nextPage: 11 },
		],
	},
	4: {
		kind: 'question',
		page: 4,
		title: 'تایم یک دقیقه — آخرین پولبک IDM/CHOCH در کدام نقطه بهینه شکسته شد؟',
		body: 'دسیژنال و اکستریم یک دقیقه را پیدا و ناحیه را بهینه کن.',
		answers: [
			{ id: 'decisional', label: 'دسیژنال', nextPage: 5 },
			{ id: 'extreme', label: 'اکستریم', nextPage: 8 },
		],
	},
	5: {
		kind: 'question',
		page: 5,
		title: 'منتظر مصرف IDM در جهت عکس باش؛ SCOB به کدام ناحیه واکنش داد؟',
		answers: [
			{ id: 'decisional', label: 'دسیژنال', nextPage: 6 },
			{ id: 'extreme', label: 'اکستریم', nextPage: 7 },
		],
	},
	6: result(6, 0.1),
	7: result(7, 0.2),
	8: {
		kind: 'question',
		page: 8,
		title: 'منتظر مصرف IDM در جهت عکس باش؛ SCOB به کدام ناحیه واکنش داد؟',
		answers: [
			{ id: 'decisional', label: 'دسیژنال', nextPage: 9 },
			{ id: 'extreme', label: 'اکستریم', nextPage: 10 },
		],
	},
	9: result(9, 0.2),
	10: result(
		10,
		0.5,
		'اگر این ناحیه شکسته شد، تا اکستریم اصلی طبق Setup 4 به صورت تک‌ کندلی، مخالف روند تا اکستریم بررسی شود.',
	),
	11: {
		kind: 'question',
		page: 11,
		title: 'تایم یک دقیقه — آخرین پولبک IDM/CHOCH در کدام نقطه بهینه شکسته شد؟',
		body: 'دسیژنال و اکستریم یک دقیقه را پیدا و ناحیه را بهینه کن.',
		answers: [
			{ id: 'decisional', label: 'دسیژنال یک دقیقه', nextPage: 12 },
			{ id: 'extreme', label: 'اکستریم یک دقیقه', nextPage: 15 },
		],
	},
	12: {
		kind: 'question',
		page: 12,
		title: 'منتظر مصرف IDM در جهت عکس باش؛ SCOB به کدام ناحیه واکنش داد؟',
		answers: [
			{ id: 'decisional', label: 'دسیژنال', nextPage: 13 },
			{ id: 'extreme', label: 'اکستریم', nextPage: 14 },
		],
	},
	13: result(13, 0.2),
	14: result(14, 0.5),
	15: {
		kind: 'question',
		page: 15,
		title: 'منتظر مصرف IDM در جهت عکس باش؛ SCOB به کدام ناحیه واکنش داد؟',
		answers: [
			{ id: 'decisional', label: 'دسیژنال', nextPage: 16 },
			{ id: 'extreme', label: 'اکستریم', nextPage: 17 },
		],
	},
	16: result(16, 0.5),
	17: result(17, 1),
	18: {
		kind: 'question',
		page: 18,
		title: 'SETUP 2 — روند قیمت کجاست؟',
		answers: [
			{ id: 'bullish', label: 'صعودی', nextPage: 19 },
			{ id: 'bearish', label: 'نزولی', nextPage: 16 },
		],
	},
	19: {
		kind: 'question',
		page: 19,
		title: 'کندل بعدی با Shadow کف قبلی را شکسته و ایمبالنس قبلی را پر کرده است؛ آیا همان کندل صعودی است؟',
		answers: [
			{ id: 'yes', label: 'بله', nextPage: 20 },
			{ id: 'no', label: 'خیر', nextPage: 21 },
		],
	},
	20: {
		kind: 'question',
		page: 20,
		title: 'کل کندل را POI تایم بالا بگیر؛ در M1 ناحیه را بهینه کن و نام‌گذاری کن.',
		answers: [
			{ id: 'decisional', label: 'دسیژنال', nextPage: 22 },
			{ id: 'extreme', label: 'اکستریم', nextPage: 23 },
		],
	},
	21: {
		kind: 'question',
		page: 21,
		title: 'Shadow کندل را POI تایم بالا بگیر؛ در M1 ناحیه را بهینه کن و نام‌گذاری کن.',
		answers: [
			{ id: 'decisional', label: 'دسیژنال', nextPage: 22 },
			{ id: 'extreme', label: 'اکستریم', nextPage: 23 },
		],
	},
	22: result(22, 0.2),
	23: result(23, 0.5),
	24: {
		kind: 'question',
		page: 24,
		title: 'SETUP 3 — آیا آخرین سقف با بدنه سقف ماقبل آخر را شکست و IDM را در جهت معکوس مصرف کرد؟',
		body: 'کندل M15 سطح را با سایه شکسته و بسته شده؛ در M1 آخرین پولبک (IDM) را CHOCH یا Flip در نظر بگیر.',
		answers: [
			{ id: 'yes', label: 'بله', nextPage: 25 },
			{ id: 'no', label: 'خیر', nextPage: 32 },
		],
	},
	25: {
		kind: 'question',
		page: 25,
		title: 'OB دسیژنال و اکستریم را مشخص کن؛ SCOB به کدام واکنش داد؟',
		answers: [
			{ id: 'decisional', label: 'دسیژنال', nextPage: 26 },
			{ id: 'extreme', label: 'اکستریم', nextPage: 27 },
		],
	},
	26: trendQuestion(26, 28, 29),
	27: trendQuestion(27, 30, 31),
	28: shadowLocationQuestion(28, 'high-first', 34, 35),
	29: shadowLocationQuestion(29, 'low-first', 34, 35),
	30: shadowLocationQuestion(30, 'low-first', 36, 35),
	31: shadowLocationQuestion(31, 'low-first', 35, 36),
	32: {
		kind: 'instruction',
		page: 32,
		title: 'اگر Shadow سقف پولبک آخر را شکسته، نیاز به مصرف IDM نیست.',
		body: 'نواحی را طبق دسیژنال و اکستریم بالا مشخص کن و ادامه بده.',
		continueTo: 25,
	},
	33: trendQuestion(33, 34, 35),
	34: result(34, 0.2),
	35: result(35, 0.5),
	36: result(36, 1),
	37: {
		kind: 'question',
		page: 37,
		title: 'SETUP 4 — آیا برگشت تأیید شد؟',
		body: 'در M1 اولین پولبکِ آغاز حرکت را Fake CHOCH نام‌گذاری کن؛ صبر کن جدیدترین پولبک شکسته شود و IDM جدید را CHOCH بگیر.',
		answers: [
			{ id: 'yes', label: 'بله', nextPage: 53, setSetup: 'setup-6' },
			{ id: 'no', label: 'خیر', nextPage: 38 },
		],
	},
	38: {
		kind: 'question',
		page: 38,
		title: 'IDM در جهت معکوس مصرف شد؛ به کدام OB واکنش نشان داد؟',
		answers: [
			{ id: 'decisional', label: 'دسیژنال', nextPage: 39 },
			{ id: 'extreme', label: 'اکستریم', nextPage: 40 },
		],
	},
	39: result(39, 0.1),
	40: result(40, 0.2),
	41: {
		kind: 'question',
		page: 41,
		title: 'SETUP 5 — قیمت در چه موقعیتی است؟',
		answers: [
			{ id: 'previous-day-high', label: 'در حال شکستن سقف روز قبل', nextPage: 42 },
			{ id: 'previous-day-low', label: 'در حال شکستن کف روز قبل', nextPage: 43 },
		],
	},
	42: {
		kind: 'question',
		page: 42,
		title: 'در M15 آخرین پولبک را به جای IDM، CHOCH بگیر؛ پس از مصرف CHOCH، SCOB به کدام ناحیه واکنش داد؟',
		answers: [
			{ id: 'decisional', label: 'دسیژنال', nextPage: 44 },
			{ id: 'extreme', label: 'اکستریم', nextPage: 45 },
		],
	},
	43: {
		kind: 'question',
		page: 43,
		title: 'در M15 آخرین پولبک را به جای IDM، CHOCH بگیر؛ پس از مصرف CHOCH، SCOB به کدام ناحیه واکنش داد؟',
		answers: [
			{ id: 'decisional', label: 'دسیژنال', nextPage: 46 },
			{ id: 'extreme', label: 'اکستریم', nextPage: 47 },
		],
	},
	44: trendQuestion(44, 48, 49, 'روند قیمت کندلی در تایم یک‌روزه چه بود؟'),
	45: trendQuestion(45, 49, 50, 'روند قیمت کندلی در تایم یک‌روزه چه بود؟'),
	46: trendQuestion(46, 49, 48, 'روند قیمت کندلی در تایم یک‌روزه چه بود؟'),
	47: trendQuestion(47, 50, 49, 'روند قیمت کندلی در تایم یک‌روزه چه بود؟'),
	48: result(48, 0.1),
	49: result(49, 0.2),
	50: result(50, 0.5),
	51: {
		kind: 'question',
		page: 51,
		title: 'SETUP 6 — کل پولبک قبلی ماژور را POI بگیر؛ آیا قیمت به آن واکنش نشان داد؟',
		answers: [
			{ id: 'yes-near', label: 'بله؛ نزدیک است آن را ببیند', nextPage: 53 },
			{ id: 'no-moved', label: 'خیر؛ آن را ندید و حرکت کرد', nextPage: 52 },
		],
	},
	52: {
		kind: 'instruction',
		page: 52,
		title: 'کل ناحیه را IDM تایم بالا در نظر بگیر و به پولبک‌های بعدی منتقل کن.',
		body: 'قیمت بعد از دیدن آن نباید صرفاً ادامه دهد؛ آخرین پولبک باید به‌عنوان IDM کامل مصرف شود و تا OF قبلی حرکت کند. از اینجا طبق Setup 1 ادامه بده.',
		continueTo: 2,
		setSetup: 'setup-1',
	},
	53: {
		kind: 'question',
		page: 53,
		title: 'در M1 ناحیه OF را بهینه کن؛ آخرین IDM را CHOCH بگیر و پس از شکست، IDM جهت عکس را مشخص کن. CHOCH روی کدام OF زده شد؟',
		answers: [
			{ id: 'decisional', label: 'دسیژنال', nextPage: 54 },
			{ id: 'extreme', label: 'اکستریم', nextPage: 55 },
		],
	},
	54: {
		kind: 'question',
		page: 54,
		title: 'OFهای جهت عکس را مشخص کن؛ SCOB به کدام OF نهایی تایم پایین واکنش داد؟',
		answers: [
			{ id: 'decisional', label: 'دسیژنال', nextPage: 56 },
			{ id: 'extreme', label: 'اکستریم', nextPage: 57 },
		],
	},
	55: {
		kind: 'question',
		page: 55,
		title: 'OFهای جهت عکس را مشخص کن؛ SCOB به کدام OF نهایی تایم پایین واکنش داد؟',
		answers: [
			{ id: 'decisional', label: 'دسیژنال', nextPage: 57 },
			{ id: 'extreme', label: 'اکستریم', nextPage: 58 },
		],
	},
	56: result(56, 0.1),
	57: result(57, 0.2),
	58: result(58, 0.5),
};

function result(page: number, riskPct: number, caution?: string): KhanDecisionNode {
	return {
		kind: 'result',
		page,
		title: 'ناحیه SCOB را مشخص کن و برای ورود آماده باش.',
		body: `ریسک پیشنهادی این مسیر: ${riskPct}%`,
		riskPct,
		...(caution ? { caution } : {}),
	};
}

function trendQuestion(
	page: number,
	bullishPage: number,
	bearishPage: number,
	title = 'روند قیمت در تایم M15 چیست؟',
): KhanDecisionNode {
	return {
		kind: 'question',
		page,
		title,
		answers: [
			{ id: 'bullish', label: 'صعودی', nextPage: bullishPage },
			{ id: 'bearish', label: 'نزولی', nextPage: bearishPage },
		],
	};
}

function shadowLocationQuestion(
	page: number,
	order: 'high-first' | 'low-first',
	firstTarget: number,
	secondTarget: number,
): KhanDecisionNode {
	const high = { id: 'break-high', label: 'در حال شکستن سقف با Shadow', nextPage: 0 };
	const low = { id: 'break-low', label: 'در حال شکستن کف با Shadow', nextPage: 0 };
	const answers = order === 'high-first' ? [high, low] : [low, high];
	answers[0] = { ...answers[0], nextPage: firstTarget };
	answers[1] = { ...answers[1], nextPage: secondTarget };
	return {
		kind: 'question',
		page,
		title: 'قیمت کجاست؟',
		answers,
	};
}
