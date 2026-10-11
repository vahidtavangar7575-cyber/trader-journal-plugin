import { KHAN_RULES } from './rules';

export interface KhanPageGuide {
  action: string;
  waitFor?: string;
  avoid?: string;
  sourceNote?: string;
}

/**
 * Human guidance for the 58-page Presentation flow.
 * This does NOT create new Khan rules or new setups. It explains what the user
 * should physically do on the chart while the source graph remains unchanged.
 */
export const KHAN_PAGE_GUIDANCE: Readonly<Record<number, KhanPageGuide>> = {
  1: guide('روی نمودار مشخص کن کدام رویداد اصلیِ صفحه اول رخ داده است: مصرف کامل IDM، شکست سقف/کف با Shadow، BOS با Close، BOS/CHOCH برای ورود سریع، یا شکست سقف/کف روزانه.', 'فقط وقتی یکی از پنج رویداد را واقعاً روی چارت می‌بینی مسیر را انتخاب کن.', 'اگر هیچ‌کدام واضح نیست، ستاپ را حدس نزن؛ ابتدا ساختار، نقدینگی و POI را بازسازی کن.'),
  2: guide('POI موردنظر مسیر ستاپ ۱ را روی تایم بالاتر مشخص کن و بررسی کن قیمت واقعاً آن را لمس/مصرف کرده یا نه.', 'برای «بله»، برخورد واقعی قیمت به POI لازم است.', 'صرف نزدیک‌شدن قیمت را برخورد حساب نکن.'),
  3: guide('POI لمس‌شده را مطابق مدل خودت به Decisional یا Extreme طبقه‌بندی کن.', 'مرز ناحیه را قبل از پایین‌رفتن به M1 مشخص کن.', 'بعد از دیدن نتیجه M1 نوع POI را عوض نکن.'),
  4: guide('به M1 برو؛ آخرین Pullback/IDM مرتبط با CHOCH را مشخص کن، نقطه شکست را پیدا کن و ناحیه‌های Decisional و Extreme یک‌دقیقه را refine کن.', 'منتظر شکست/تأیید همان ساختاری بمان که در Presentation دنبال می‌شود.', 'روی اولین حرکت بدون مشخص‌کردن Pullback و IDM وارد نشو.'),
  5: reverseIdmGuide(),
  6: resultGuide('0.1٪'),
  7: resultGuide('0.2٪'),
  8: reverseIdmGuide(),
  9: resultGuide('0.2٪'),
  10: resultGuide('0.5٪', 'اگر ناحیه منبع شکسته شد، خود Presentation ارجاع به بررسی Setup 4 تا Extreme اصلی دارد.'),
  11: guide('به M1 برو و همان منطق Refinement را برای شاخه Extreme تایم بالا اجرا کن: آخرین Pullback/IDM/CHOCH، سپس Decisional و Extreme یک‌دقیقه.', 'صبر کن ساختار پایین‌تایم قابل نام‌گذاری شود.', 'فقط به دلیل رسیدن به Extreme تایم بالا وارد نشو.'),
  12: reverseIdmGuide(),
  13: resultGuide('0.2٪'),
  14: resultGuide('0.5٪'),
  15: reverseIdmGuide(),
  16: resultGuide('0.5٪'),
  17: resultGuide('1٪'),

  18: guide('روند/ساختار فعلی را مشخص کن. این صفحه شروع Setup 2 است.', 'قبل از ادامه باید بتوانی جهت ساختار را روی چارت نشان بدهی.', 'مسیر عجیب نزولی را «اصلاح» نکن؛ لینک PDF خود Presentation آن را به صفحه 16 می‌برد.', 'این مسیر دقیقاً از لینک داخلی فایل Presentation خوانده شده است.'),
  19: guide('کندل بعدی را بررسی کن: آیا با Shadow کف قبلی را گرفته و Imbalance قبلی را پر کرده؟ سپس رنگ/جهت همان کندل را مطابق سؤال منبع تعیین کن.', 'تا شکل کندل و پرشدن Imbalance هر دو روشن نشده‌اند ادامه نده.', 'فقط با رنگ کندل تصمیم نگیر؛ شرط ساختاری صفحه را هم چک کن.'),
  20: guide('طبق منبع، کل کندل را HTF POI بگیر؛ سپس در M1 POI را refine و Decisional/Extreme را نام‌گذاری کن.', 'بعد از Refinement، واکنش SCOB/ورود را طبق شاخه نهایی بررسی کن.', 'POI را بعد از دیدن نتیجه معامله جابه‌جا نکن.'),
  21: guide('طبق منبع، Shadow کندل را HTF POI بگیر؛ سپس در M1 refine و Decisional/Extreme را مشخص کن.', 'بعد از Refinement، فقط شاخه منبع را ادامه بده.', 'کل کندل را جای Shadow نگذار؛ این دو شاخه در Presentation جدا هستند.'),
  22: resultGuide('0.2٪'),
  23: resultGuide('0.5٪'),

  24: guide('در M15 رویداد Shadow منبع را تأیید کن. سپس در M1 آخرین Pullback/IDM را به‌عنوان CHOCH یا Flip بررسی کن و ببین شکست بدنه + مصرف IDM معکوس رخ داده یا نه.', 'تا پاسخ سؤال اصلی صفحه 24 روشن نشده، وارد شاخه OB نشو.', 'Shadow ساده بدون Context صفحه 24 را Setup 3 فرض نکن.'),
  25: guide('OBهای Decisional و Extreme را مشخص کن و ببین SCOB به کدام ناحیه واکنش داده است.', 'واکنش ناحیه باید روی چارت قابل نشان‌دادن باشد.', 'بعد از نتیجه، ناحیه واکنش را عوض نکن.'),
  26: trendGuide('M15'),
  27: trendGuide('M15'),
  28: shadowBreakGuide(),
  29: shadowBreakGuide(),
  30: shadowBreakGuide(),
  31: shadowBreakGuide(),
  32: guide('اگر Shadow سقف Pullback آخر را شکسته، طبق خود Presentation برای این شاخه مصرف IDM جداگانه لازم نیست؛ نواحی Decisional/Extreme را مشخص کن و به صفحه 25 برگرد.', 'بعد از مشخص‌شدن نواحی، شاخه OB/SCOB را ادامه بده.', 'این استثناء را به شاخه‌های دیگر تعمیم نده.'),
  33: trendGuide('M15'),
  34: resultGuide('0.2٪'),
  35: resultGuide('0.5٪'),
  36: resultGuide('1٪'),

  37: guide('در M1 اولین Pullback شروع حرکت را Fake CHOCH علامت بزن؛ منتظر شکستن جدیدترین Pullback باش و IDM جدید را CHOCH در نظر بگیر. سپس به سؤال «آیا برگشت تأیید شد؟» پاسخ بده.', 'شکست جدیدترین Pullback و ساخت CHOCH جدید باید روشن باشد.', 'صرف برگشت قیمت را تأیید محسوب نکن.', 'در فایل Presentation پاسخ «بله» به صفحه 53 لینک دارد؛ سیستم این اتصال را عیناً حفظ می‌کند.'),
  38: guide('مصرف IDM در جهت معکوس را تأیید کن و مشخص کن قیمت به OB Decisional یا Extreme واکنش داده است.', 'واکنش OB باید قبل از بلیت ورود دیده شود.', 'اگر IDM معکوس هنوز مصرف نشده، نتیجه ستاپ را جلو نینداز.'),
  39: resultGuide('0.1٪'),
  40: resultGuide('0.2٪'),

  41: guide('مشخص کن قیمت در حال شکستن High روز قبل (PDH) است یا Low روز قبل (PDL).', 'سطح روز قبل را قبل از تصمیم روی نمودار علامت بزن.', 'سطوح روزانه را با سقف/کف داخلی سشن اشتباه نگیر.'),
  42: guide('در M15 آخرین Pullback را به‌جای IDM به‌عنوان CHOCH در نظر بگیر؛ بعد از مصرف CHOCH ببین SCOB به Decisional یا Extreme واکنش داده است.', 'مصرف CHOCH و واکنش SCOB هر دو باید روشن باشند.', 'فقط به دلیل شکست PDH وارد نشو.'),
  43: guide('در M15 آخرین Pullback را به‌جای IDM به‌عنوان CHOCH در نظر بگیر؛ بعد از مصرف CHOCH ببین SCOB به Decisional یا Extreme واکنش داده است.', 'مصرف CHOCH و واکنش SCOB هر دو باید روشن باشند.', 'فقط به دلیل شکست PDL وارد نشو.'),
  44: trendGuide('Daily candle'),
  45: trendGuide('Daily candle'),
  46: trendGuide('Daily candle'),
  47: trendGuide('Daily candle'),
  48: resultGuide('0.1٪', 'این Result در PDF یک لینک ادامه به صفحه 44 دارد؛ ورود فعلی معتبر است و ادامه لینک منبع جداگانه ثبت می‌شود.'),
  49: resultGuide('0.2٪', 'این Result در PDF یک لینک ادامه به صفحه 44 دارد.'),
  50: resultGuide('0.5٪', 'این Result در PDF یک لینک ادامه به صفحه 44 دارد.'),

  51: guide('کل Pullback ماژور قبلی را HTF POI بگیر و بررسی کن آیا قیمت آن را دیده/به آن واکنش نزدیک شده یا بدون دیدن آن حرکت کرده است.', 'مرز Pullback ماژور را قبل از جواب مشخص کن.', 'POI ماژور را با یک نوسان کوچک داخلی اشتباه نگیر.'),
  52: guide('کل ناحیه را HTF IDM در نظر بگیر و آن را به Pullbackهای بعدی منتقل کن. طبق متن منبع، آخرین Pullback باید کامل مصرف شود و حرکت تا OF قبلی بررسی شود؛ سپس از Setup 1 ادامه بده.', 'منتظر مصرف کامل Pullback/IDM و ارتباط با OF قبلی باش.', 'قبل از این شروط مستقیم به Setup 1 نپر.'),
  53: guide('در M1 ناحیه OF را refine کن؛ آخرین IDM را CHOCH بگیر، بعد از شکست IDM جهت عکس را مشخص کن و تعیین کن CHOCH روی OF Decisional یا Extreme زده شده است.', 'ساختار OF/IDM/CHOCH باید روی تصویر M1 قابل بازسازی باشد.', 'اگر نمی‌توانی آخرین IDM و OF را مشخص کنی، از ورود صرف‌نظر کن و Context را بازسازی کن.'),
  54: guide('OFهای جهت عکس را مشخص کن و ببین SCOB به کدام OF نهایی پایین‌تایم واکنش داده است.', 'واکنش SCOB به OF نهایی شرط تعیین شاخه ریسک است.', 'SCOB را بدون OF Context مستقل معامله نکن.'),
  55: guide('OFهای جهت عکس را مشخص کن و ببین SCOB به کدام OF نهایی پایین‌تایم واکنش داده است.', 'واکنش SCOB به OF نهایی شرط تعیین شاخه ریسک است.', 'SCOB را بدون OF Context مستقل معامله نکن.'),
  56: resultGuide('0.1٪', 'در PDF این نتیجه لینک ادامه به Setup 1 / صفحه 2 دارد.'),
  57: resultGuide('0.2٪', 'در PDF این نتیجه لینک ادامه به Setup 1 / صفحه 2 دارد.'),
  58: resultGuide('0.5٪', 'در PDF این نتیجه لینک ادامه به Setup 1 / صفحه 2 دارد.'),
};

export function getKhanPageGuide(page: number): KhanPageGuide | null {
  return KHAN_PAGE_GUIDANCE[page] ?? null;
}

export function validateKhanGuidanceCoverage(): string[] {
  return Object.keys(KHAN_RULES)
    .map(Number)
    .filter((page) => !KHAN_PAGE_GUIDANCE[page])
    .map((page) => `Page ${page} has no first-time-user guidance.`);
}

function guide(action: string, waitFor?: string, avoid?: string, sourceNote?: string): KhanPageGuide {
  return { action, ...(waitFor ? { waitFor } : {}), ...(avoid ? { avoid } : {}), ...(sourceNote ? { sourceNote } : {}) };
}

function reverseIdmGuide(): KhanPageGuide {
  return guide('منتظر مصرف IDM در جهت عکس بمان؛ سپس واکنش SCOB را نسبت به Decisional/Extreme مشخص کن.', 'اول مصرف IDM معکوس، بعد واکنش SCOB.', 'قبل از مصرف IDM معکوس، صرفاً با لمس ناحیه وارد نشو.');
}

function resultGuide(risk: string, sourceNote?: string): KhanPageGuide {
  return guide(`این شاخه به Result رسیده است. SCOB و محل اجرای واقعی را روی M1 مشخص کن، سپس بلیت معامله را با سقف ریسک منبع ${risk} بساز.`, 'قبل از ثبت معامله، Entry/SL/Target و دو تصویر HTF/M1 را آماده کن.', 'ریسک منبع سقف کیفیت این شاخه است؛ موتور مدیریت سرمایه می‌تواند مقدار پایین‌تری پیشنهاد کند.', sourceNote);
}

function trendGuide(timeframe: string): KhanPageGuide {
  return guide(`جهت روند/کندل ${timeframe} را طبق ساختار قابل مشاهده تعیین کن و فقط همان گزینه را بزن.`, 'اگر جهت مبهم است، یک مرحله عقب‌تر Context را بازسازی کن.', 'برای رسیدن به ریسک بهتر، جهت را به نفع معامله تفسیر نکن.');
}

function shadowBreakGuide(): KhanPageGuide {
  return guide('مشخص کن قیمت در همین شاخه کدام سمت را با Shadow می‌شکند: High یا Low.', 'شکست باید روی همان Context ایجادشده در صفحات قبل بررسی شود.', 'Shadow را خارج از مسیر قبلی به‌تنهایی سیگنال ورود حساب نکن.');
}
