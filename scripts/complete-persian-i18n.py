from pathlib import Path
import re

FA = {
    'calendar.economicNewsError': 'بارگذاری اخبار اقتصادی انجام نشد. درخواست به‌صورت خودکار دوباره ارسال نمی‌شود.',
    'calendar.horizontalAria': 'تقویم افقی معاملات',
    'calendar.imageCount': '{count} تصویر',
    'calendar.linkedTradeCount': '{count} معامله متصل',
    'calendar.notAvailable': '—',
    'calendar.openError': 'تقویم معاملات باز نشد.',
    'calendar.previous': 'قبلی: {value}',
    'dashboard.dateRangeInvalid': 'تاریخ شروع باید قبل از تاریخ پایان یا برابر با آن باشد.',
    'dashboard.dateRangeRequired': 'برای بازه دلخواه هر دو تاریخ را انتخاب کن.',
    'dashboard.emptyFilteredTrades': 'هیچ معامله اخیر با فیلترهای پیشرفته مطابقت ندارد.',
    'dashboard.filteredTradeCount': '{count}/{total} معامله',
    'dashboard.loadSetupsError': 'بارگذاری ستاپ‌های معاملاتی انجام نشد.',
    'dashboard.noReviewAdherence': 'در این بازه ارزیابی پایبندی به پلن وجود ندارد.',
    'dashboard.openError': 'داشبورد معاملات باز نشد.',
    'dashboard.openSetupError': 'ستاپ معاملاتی باز نشد.',
    'dashboard.orphanedPlanLinks': 'معاملات با پلن مفقود',
    'dashboard.planExecutionDescription': 'پلن‌هایی که حداقل یک معامله متصل دارند.',
    'dashboard.planLinkStatus': 'ارتباط با پلن',
    'dashboard.planOverviewSubtitle': 'پلن‌های زنده از فیلتر نماد پیروی می‌کنند و مستقل از نوع معامله و بازه زمانی هستند.',
    'dashboard.reviewInsightsDescription': 'بازخورد فرایندی معاملات زنده بسته‌شده در فیلترهای فعلی.',
    'dashboard.reviewSample': '{count} معامله بازبینی‌شده',
    'dashboard.setupOverviewSubtitle': 'تعریف‌های قابل استفاده مجدد برای پلن‌ها و معاملات.',
    'dashboard.started': 'شروع: {date}',
    'dashboard.subtitle': 'عملکرد را بر اساس تاریخ واقعی معاملات ژورنال بررسی کن.',
    'dashboard.tradesPerExecutedPlan': 'معامله به ازای هر پلن اجراشده',
    'drilldown.appliedFilters': 'فیلترهای اعمال‌شده داشبورد',
    'drilldown.displayText': 'جزئیات معاملات',
    'drilldown.noResults': 'هیچ معامله‌ای با این آمار و جست‌وجو مطابقت ندارد.',
    'drilldown.openError': 'جزئیات معاملات باز نشد.',
    'drilldown.searchPlaceholder': 'نماد، ستاپ، تایم‌فریم، یادداشت یا فایل...',
    'drilldown.sort': 'مرتب‌سازی بر اساس',
    'drilldown.sortNewest': 'جدیدترین ابتدا',
    'drilldown.sortOldest': 'قدیمی‌ترین ابتدا',
    'drilldown.sortRrHigh': 'بیشترین RR ابتدا',
    'drilldown.sortRrLow': 'کمترین RR ابتدا',
    'drilldown.summary': '{count} معامله در {files} فایل',
    'drilldown.title': 'جزئیات معاملات: {category}',
    'error.closedAfterOpened': 'زمان بسته‌شدن باید بعد از زمان بازشدن باشد.',
    'error.closedRequired': 'برای معامله زنده بسته‌شده، زمان بسته‌شدن الزامی است.',
    'error.couldNotRecalculateStats': 'محاسبه دوباره آمار انجام نشد.',
    'error.invalidPlanBlock': 'بلوک پلن Trader Journal نامعتبر است',
    'error.invalidTradeBlock': 'بلوک معامله Trader Journal نامعتبر است',
    'error.openedClosedRequired': 'زمان بازشدن و بسته‌شدن الزامی است.',
    'error.pasteImage': 'چسباندن تصویر انجام نشد.',
    'error.planDateMismatch': 'پلن انتخاب‌شده در تاریخ معامله فعال نیست.',
    'error.planEndDateAfterStart': 'تاریخ پایان پلن باید برابر یا بعد از تاریخ شروع باشد.',
    'error.planStartDateRequired': 'تاریخ شروع پلن الزامی است.',
    'error.planSymbolMismatch': 'پلن انتخاب‌شده مربوط به نماد دیگری است.',
    'error.planTitleRequired': 'عنوان پلن الزامی است.',
    'error.planUnavailable': 'پلن انتخاب‌شده دیگر در دسترس نیست.',
    'image.remoteDisabled': 'پیش‌نمایش راه‌دور غیرفعال است',
    'image.remotePreviewDisabled': 'پیش‌نمایش تصاویر اینترنتی غیرفعال است',
    'image.remove': 'حذف تصویر {index}',
    'image.tradeImage': 'تصویر معامله {index}',
    'impact.high': 'زیاد',
    'impact.holiday': 'تعطیلی',
    'impact.low': 'کم',
    'impact.medium': 'متوسط',
    'journal.backtest': 'بک‌تست',
    'journal.live': 'زنده',
    'modal.addBacktestTrade': 'ثبت معامله بک‌تست',
    'modal.addLiveTrade': 'ثبت معامله زنده',
    'modal.addTradePlan': 'ساخت پلن معاملاتی',
    'modal.addTradeSetup': 'ساخت ستاپ معاملاتی',
    'modal.editBacktestTrade': 'ویرایش معامله بک‌تست',
    'modal.editLiveTrade': 'ویرایش معامله زنده',
    'modal.editTrade': 'ویرایش معامله',
    'modal.editTradePlan': 'ویرایش پلن معاملاتی',
    'modal.editTradeSetup': 'ویرایش ستاپ معاملاتی',
    'modal.reviewTrade': 'بازبینی معامله',
    'notice.invalidBlocksSkipped': ' {count} بلوک نامعتبر نادیده گرفته شد.',
    'notice.recalculatedStats': 'آمار {count} معامله دوباره محاسبه شد.{invalidMessage}',
    'notice.savedPlan': 'پلن معاملاتی در {path} ذخیره شد',
    'notice.savedReview': 'بازبینی معامله در {path} ذخیره شد',
    'notice.savedSetup': 'ستاپ معاملاتی در {path} ذخیره شد',
    'notice.savedTrade': 'معامله در {path} ذخیره شد',
    'notice.savedTradePlanSyncFailed': 'معامله در {path} ذخیره شد، اما همگام‌سازی ارتباط آن با پلن انجام نشد.',
    'notice.savedTradePostProcessFailed': 'معامله در {path} ذخیره شد، اما بازسازی فراداده ژورنال انجام نشد.',
    'notice.updatedPlan': 'پلن معاملاتی در {path} به‌روزرسانی شد',
    'notice.updatedSetup': 'ستاپ معاملاتی در {path} به‌روزرسانی شد',
    'notice.updatedTrade': 'معامله در {path} به‌روزرسانی شد',
    'placeholder.openingRangeBreakout': 'شکست محدوده بازگشایی',
    'placeholder.savingImage': 'در حال ذخیره تصویر چسبانده‌شده...',
    'placeholder.tags': 'شکست، روند',
    'settings.economicCalendarDescription': 'رویدادهای اقتصادی این هفته از Faireconomy بارگذاری می‌شوند و برای کل هفته منبع در حافظه موقت می‌مانند.',
    'settings.economicCountriesDescription': 'فقط رویدادهایی نمایش داده می‌شوند که کد کشور یا ارز آن‌ها در این فهرست باشد.',
    'settings.economicImpactsDescription': 'سطوح اهمیت اخبار قابل نمایش در تقویم معاملات را انتخاب کن.',
    'settings.economicShowAllDescription': 'برای هفته منبع فعلی، فیلتر زمان، کشور یا ارز و اهمیت را نادیده بگیر.',
    'settings.economicShowAllLabel': 'فیلتر رویدادهای اقتصادی',
    'settings.economicTimeZoneDescription': 'منطقه زمانی برای گروه‌بندی رویدادها بر اساس تاریخ و نمایش ساعت آن‌ها.',
    'settings.imageModalDescription': 'تعیین می‌کند انتخاب تصویر در بلوک رندرشده معامله یا پلن، پیش‌نمایش بزرگ را باز کند یا نه.',
    'settings.remoteImagesDescription': 'پیش‌نمایش تصاویر از نشانی‌های اینترنتی خارجی در بلوک معاملات بارگذاری شود.',
    'settings.showAllEconomicEvents': 'نمایش همه رویدادهای اقتصادی',
    'setup.createDescription': 'یادداشت پایه را اکنون بساز و سپس بخش‌های Markdown آن را تکمیل کن.',
    'setup.editDescription': 'فیلدهای پایه را بدون تغییر بخش‌های تفصیلی Markdown به‌روزرسانی کن.',
    'setup.linkedNotFound': 'ستاپ معاملاتی متصل پیدا نشد.',
    'setup.openLinked': 'باز کردن ستاپ متصل {setup}',
    'setup.symbolsDescription': 'برای در دسترس بودن این ستاپ در همه‌جا، «همه نمادها» را انتخاب‌شده نگه دار.',
    'storage.invalidBlockWarning': '{count} {blockLabel} نامعتبر نادیده گرفته شد. پیش از اتکا به این آمار، JSON نامعتبر را اصلاح کن.',
    'storage.invalidBlockWas': 'بلوک بود',
    'storage.invalidBlocksWere': 'بلوک بودند',
}

path = Path(__file__).resolve().parents[1] / 'src' / 'i18n.ts'
text = path.read_text(encoding='utf-8')
fa_marker = "const FA: Partial<Record<keyof typeof EN, string>> = {"
translations_marker = 'const TRANSLATIONS'
fa_start = text.find(fa_marker)
translations_start = text.find(translations_marker, fa_start)
if fa_start == -1 or translations_start == -1:
    raise SystemExit('Could not locate the Persian translation block.')
fa_end = text.rfind('\n};', fa_start, translations_start)
if fa_end == -1:
    raise SystemExit('Could not locate the end of the Persian translation block.')

fa_block = text[fa_start:fa_end]
key_pattern = re.compile(r"^[\t ]*'([^']+)'\s*:", re.MULTILINE)
existing = set(key_pattern.findall(fa_block))
missing = sorted(set(FA) - existing)

coverage_text = (Path(__file__).with_name('check-persian-coverage.py')).read_text(encoding='utf-8')
_ = coverage_text  # keep the companion checker discoverable next to this script

if not missing:
    print('No Persian translations needed to be added.')
    raise SystemExit(0)

lines = []
for key in missing:
    value = FA[key].replace('\\', '\\\\').replace("'", "\\'")
    lines.append(f"\t'{key}': '{value}',")
insert = '\n' + '\n'.join(lines)
text = text[:fa_end] + insert + text[fa_end:]
path.write_text(text, encoding='utf-8')
print(f'Added {len(missing)} Persian translation entries.')
