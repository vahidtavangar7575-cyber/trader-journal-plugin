import { TFile } from 'obsidian';
import type TraderJournalPlugin from '../main';
import { createTradeSetup, listTradeSetups } from '../setups/storage';
import type { TradeSetupDefinition } from '../setups/types';
import { KHAN_SETUP_NAMES } from './rules';
import type { KhanSetupId } from './types';

interface KhanSetupTemplate {
	timeframes: string[];
	description: string;
	entryCriteria: string;
	invalidation: string;
	takeProfit: string;
	riskRules: string;
}

const KHAN_SETUP_TEMPLATES: Record<KhanSetupId, KhanSetupTemplate> = {
	'setup-1': {
		timeframes: ['1m'],
		description: 'مسیر تصمیم Setup 1 بر پایه برخورد قیمت با POI، تفکیک دسیژنال/اکستریم، بهینه‌سازی در تایم یک دقیقه، مصرف IDM در جهت عکس و واکنش SCOB است.',
		entryCriteria: 'پس از برخورد به POI، نوع POI را مشخص کن. در M1 دسیژنال و اکستریم را بهینه کن و محل شکست آخرین پولبک IDM/CHOCH را تعیین کن. سپس منتظر مصرف IDM در جهت عکس و واکنش SCOB به دسیژنال یا اکستریم بمان.',
		invalidation: 'اعتبار مسیر از پاسخ‌های Wizard پیروی می‌کند. منبع ارائه‌شده یک قانون ابطال عمومی مستقل برای همه شاخه‌های Setup 1 تعریف نمی‌کند.',
		takeProfit: 'منبع ارائه‌شده حد سود عمومی ثابتی برای تمام شاخه‌های Setup 1 مشخص نمی‌کند. هدف باید در پلن همان معامله ثبت شود.',
		riskRules: 'ریسک نهایی طبق شاخه تصمیم: 0.1%، 0.2%، 0.5% یا 1%. اگر شاخه 0.5% صفحه 10 شکسته شود، منبع بررسی ادامه تا اکستریم اصلی طبق Setup 4 را ذکر می‌کند.',
	},
	'setup-2': {
		timeframes: ['1m'],
		description: 'Setup 2 از شاخه «POI برخورد نشده» در Setup 1 فعال می‌شود و روند، ساختار کندل/Shadow و بهینه‌سازی POI در M1 را بررسی می‌کند.',
		entryCriteria: 'روند را مشخص کن. در مسیر صعودی، بررسی کن کندل بعدی با Shadow کف قبلی را شکسته و ایمبالنس قبلی را پر کرده است و سپس مشخص کن همان کندل صعودی است یا نه. بسته به پاسخ، کل کندل یا Shadow آن را POI تایم بالا بگیر و در M1 دسیژنال/اکستریم را بهینه کن.',
		invalidation: 'منبع ارائه‌شده قانون ابطال عمومی مستقل برای Setup 2 تعریف نمی‌کند؛ شاخه معتبر باید عیناً از Wizard دنبال شود.',
		takeProfit: 'منبع ارائه‌شده حد سود عمومی ثابتی برای Setup 2 مشخص نمی‌کند.',
		riskRules: 'در شاخه‌های نهایی ارائه‌شده ریسک 0.2% یا 0.5% است؛ شاخه نزولی صفحه 18 طبق لینک خود منبع به نتیجه 0.5% می‌رسد.',
	},
	'setup-3': {
		timeframes: ['15m', '1m'],
		description: 'Setup 3 با شکست سطح توسط سایه کندل M15 و بسته‌شدن آن آغاز می‌شود و سپس ساختار M1، مصرف IDM معکوس، OB دسیژنال/اکستریم و موقعیت Shadow را ارزیابی می‌کند.',
		entryCriteria: 'پس از شکست سطح در M15 با سایه و بسته‌شدن کندل، در M1 آخرین پولبک IDM را CHOCH یا Flip در نظر بگیر. بررسی کن آخرین سقف با بدنه سقف ماقبل آخر را شکسته و IDM را در جهت معکوس مصرف کرده است. OB دسیژنال/اکستریم، روند M15 و موقعیت شکست با Shadow را طبق Wizard دنبال کن.',
		invalidation: 'اگر Shadow سقف پولبک آخر را شکسته باشد، منبع می‌گوید مصرف IDM لازم نیست و نواحی باید طبق دسیژنال و اکستریم مشخص شوند؛ سایر شرایط از مسیر Wizard پیروی می‌کنند.',
		takeProfit: 'منبع ارائه‌شده حد سود عمومی ثابتی برای Setup 3 مشخص نمی‌کند.',
		riskRules: 'نتایج نهایی این Setup در منبع 0.2%، 0.5% یا 1% هستند و مقدار دقیق از شاخه تصمیم Wizard می‌آید.',
	},
	'setup-4': {
		timeframes: ['1m'],
		description: 'Setup 4 روی M1 با Fake CHOCH، شکست جدیدترین پولبک و تأیید یا عدم تأیید برگشت کار می‌کند.',
		entryCriteria: 'در M1 اولین پولبکی را که حرکت از آن آغاز شده و IDM حرکت است Fake CHOCH نام‌گذاری کن. صبر کن جدیدترین پولبک شکسته شود و IDM جدید را CHOCH در نظر بگیر. اگر مسیر به مصرف IDM معکوس برسد، واکنش به OB دسیژنال/اکستریم را بررسی کن.',
		invalidation: 'پاسخ «برگشت تأیید شد» در فایل منبع مستقیماً به میانه مسیر Setup 6 لینک شده است؛ پاسخ دیگر به ارزیابی OB در Setup 4 ادامه می‌دهد.',
		takeProfit: 'منبع ارائه‌شده حد سود عمومی ثابتی برای Setup 4 مشخص نمی‌کند.',
		riskRules: 'در شاخه OB دسیژنال/اکستریم، ریسک نهایی به‌ترتیب 0.1% یا 0.2% است. شاخه تأیید برگشت به مسیر Setup 6 منتقل می‌شود.',
	},
	'setup-5': {
		timeframes: ['1D', '15m'],
		description: 'Setup 5 شکست سقف یا کف روز قبل را با CHOCH در M15، واکنش SCOB و روند کندلی روزانه ترکیب می‌کند.',
		entryCriteria: 'ابتدا مشخص کن قیمت در حال شکستن سقف روز قبل است یا کف روز قبل. در M15 آخرین پولبک را به جای IDM، CHOCH بگیر. پس از مصرف CHOCH، واکنش SCOB به دسیژنال/اکستریم و سپس روند کندلی تایم یک‌روزه را مشخص کن.',
		invalidation: 'اعتبار شاخه با ترکیب موقعیت روز قبل، نوع واکنش SCOB و روند روزانه در Wizard تعیین می‌شود؛ منبع قانون ابطال عمومی جداگانه‌ای ارائه نمی‌کند.',
		takeProfit: 'منبع ارائه‌شده حد سود عمومی ثابتی برای Setup 5 مشخص نمی‌کند.',
		riskRules: 'ریسک نهایی بر اساس ترکیب شاخه‌ها 0.1%، 0.2% یا 0.5% است.',
	},
	'setup-6': {
		timeframes: ['1m'],
		description: 'Setup 6 کل پولبک قبلی ماژور را POI می‌گیرد و در صورت واکنش، OF/CHOCH/IDM معکوس و واکنش SCOB به OF نهایی تایم پایین را دنبال می‌کند.',
		entryCriteria: 'کل پولبک قبلی ماژور را POI بگیر و واکنش قیمت را بررسی کن. در مسیر واکنش، در M1 ناحیه OF را بهینه کن، آخرین IDM را CHOCH نام‌گذاری کن، پس از شکست CHOCH، IDM جهت عکس و OFهای جهت عکس را مشخص کن و واکنش SCOB به OF نهایی تایم پایین را بسنج.',
		invalidation: 'اگر قیمت POI ماژور را نبیند و حرکت کند، منبع کل ناحیه را IDM تایم بالا در نظر می‌گیرد؛ پس از مصرف کامل آخرین پولبک و دیدن OF قبلی، ادامه طبق Setup 1 انجام می‌شود.',
		takeProfit: 'منبع ارائه‌شده حد سود عمومی ثابتی برای Setup 6 مشخص نمی‌کند.',
		riskRules: 'ریسک نهایی در مسیرهای واکنش 0.1%، 0.2% یا 0.5% است. مسیر عدم واکنش به Setup 1 منتقل می‌شود و ریسک از نتیجه آن مسیر گرفته می‌شود.',
	},
};

export async function ensureKhanSetup(
	plugin: TraderJournalPlugin,
	setupId: KhanSetupId,
): Promise<TradeSetupDefinition> {
	const name = KHAN_SETUP_NAMES[setupId];
	const existing = (await listTradeSetups(plugin)).find(
		(setup) => setup.name.trim().toLocaleLowerCase() === name.toLocaleLowerCase(),
	);
	if (existing) {
		return existing;
	}

	const template = KHAN_SETUP_TEMPLATES[setupId];
	const created = await createTradeSetup(plugin, {
		name,
		status: 'active',
		symbols: [],
		timeframes: template.timeframes,
	});
	const file = plugin.app.vault.getAbstractFileByPath(created.filePath);
	if (!(file instanceof TFile)) {
		return created;
	}

	await plugin.app.vault.process(file, (content) => populateSetupSections(content, template));
	await plugin.referenceDataService.refreshFile(file);
	return {
		...created,
		description: template.description,
		entryCriteria: template.entryCriteria,
		invalidation: template.invalidation,
		takeProfit: template.takeProfit,
		riskRules: template.riskRules,
	};
}

function populateSetupSections(content: string, template: KhanSetupTemplate): string {
	return [
		['Description', template.description],
		['Entry criteria', template.entryCriteria],
		['Invalidation', template.invalidation],
		['Take profit', template.takeProfit],
		['Risk rules', template.riskRules],
	].reduce((current, [heading, value]) => replaceSection(current, heading, value), content);
}

function replaceSection(content: string, heading: string, value: string): string {
	const escaped = heading.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
	const pattern = new RegExp(`(##[ \\t]+${escaped}[ \\t]*\\r?\\n)([\\s\\S]*?)(?=\\r?\\n##[ \\t]+|$)`, 'i');
	return content.replace(pattern, `$1${value}\n`);
}
