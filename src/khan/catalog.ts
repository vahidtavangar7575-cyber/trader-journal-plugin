import type { KhanSetupId } from './types';

export interface KhanSetupCatalogItem {
	id: KhanSetupId;
	title: string;
	shortTitle: string;
	summary: string;
	whenToUse: string;
	entryFocus: string;
	sourcePages: string;
}

export const KHAN_SETUP_CATALOG: KhanSetupCatalogItem[] = [
	{
		id: 'setup-1',
		title: 'ستاپ ۱ — POI → M1 → IDM/CHOCH → SCOB',
		shortTitle: 'ستاپ ۱',
		summary: 'وقتی قیمت به POI رسیده و قرار است در M1 ناحیه دسیژنال/اکستریم و واکنش SCOB بررسی شود.',
		whenToUse: 'بعد از مصرف کامل IDM یا وقتی از مسیر اصلی صفحه اول وارد شاخه POI می‌شوی.',
		entryFocus: 'POI، Refinement در M1، IDM/CHOCH، SCOB، Decisional/Extreme',
		sourcePages: 'Presentation 2–17',
	},
	{
		id: 'setup-2',
		title: 'ستاپ ۲ — Shadow/Imbalance → HTF POI → M1',
		shortTitle: 'ستاپ ۲',
		summary: 'شاخه جایگزین وقتی شرط برخورد POI در مسیر ستاپ ۱ برقرار نیست و رفتار Shadow/Imbalance مبنای POI می‌شود.',
		whenToUse: 'وقتی از سؤال برخورد POI در Setup 1 پاسخ «خیر» می‌گیری یا برای مرور مستقیم این ساختار.',
		entryFocus: 'Trend، Shadow، Imbalance، HTF POI، M1 Refinement، SCOB',
		sourcePages: 'Presentation 18–23',
	},
	{
		id: 'setup-3',
		title: 'ستاپ ۳ — M15 Shadow → M1 Structure → SCOB',
		shortTitle: 'ستاپ ۳',
		summary: 'شکست سطح با Shadow در M15 و بررسی آخرین Pullback/IDM و CHOCH یا Flip در M1.',
		whenToUse: 'وقتی کندل M15 سطح را با سایه شکسته و بسته شده و ورود از ساختار M1 بررسی می‌شود.',
		entryFocus: 'M15 Shadow، M1 CHOCH/Flip، IDM، OB، SCOB، Daily/Trend context',
		sourcePages: 'Presentation 24–36',
	},
	{
		id: 'setup-4',
		title: 'ستاپ ۴ — Fake CHOCH → Pullback Break → Reverse IDM',
		shortTitle: 'ستاپ ۴',
		summary: 'اولین Pullback شروع حرکت Fake CHOCH است؛ سپس شکست Pullback جدید و مصرف IDM معکوس بررسی می‌شود.',
		whenToUse: 'بعد از BOS با Close یا وقتی مسیر برگشت داخلی M1 باید با Fake CHOCH تفکیک شود.',
		entryFocus: 'Fake CHOCH، Pullback جدید، IDM، OB، SCOB',
		sourcePages: 'Presentation 37–40',
	},
	{
		id: 'setup-5',
		title: 'ستاپ ۵ — PDH/PDL → M15 → SCOB → Daily Direction',
		shortTitle: 'ستاپ ۵',
		summary: 'برای شکست سقف یا کف روز قبل و بررسی M15، SCOB و جهت کندل روزانه.',
		whenToUse: 'وقتی قیمت در حال شکستن Previous Day High یا Previous Day Low است.',
		entryFocus: 'PDH/PDL، M15 Pullback/CHOCH، SCOB، Daily candle direction',
		sourcePages: 'Presentation 41–50',
	},
	{
		id: 'setup-6',
		title: 'ستاپ ۶ — Major Pullback POI → HTF IDM → OF → SCOB',
		shortTitle: 'ستاپ ۶',
		summary: 'کل Pullback ماژور قبلی به‌عنوان HTF POI و ادامه مسیر با HTF IDM، OF و SCOB در M1.',
		whenToUse: 'برای ورود سریع بعد از BOS/CHOCH یا وقتی منطق Major Pullback/OF فعال است.',
		entryFocus: 'Major Pullback، HTF POI/IDM، Order Flow، M1 CHOCH، SCOB',
		sourcePages: 'Presentation 51–58',
	},
];

export function getKhanSetupCatalogItem(id: KhanSetupId): KhanSetupCatalogItem {
	const item = KHAN_SETUP_CATALOG.find((setup) => setup.id === id);
	if (!item) {
		throw new Error(`Unknown Khan setup ${id}`);
	}
	return item;
}
