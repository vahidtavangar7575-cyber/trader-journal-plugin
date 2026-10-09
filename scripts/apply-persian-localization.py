from pathlib import Path


def replace_once(text: str, old: str, new: str, label: str) -> str:
    if old not in text:
        raise RuntimeError(f"Could not find expected text for {label}")
    return text.replace(old, new, 1)

root = Path(__file__).resolve().parents[1]

# 1) Language model and normalization
settings_path = root / "src/settings.ts"
settings = settings_path.read_text(encoding="utf-8")
settings = replace_once(
    settings,
    "export type TraderJournalLanguage = 'en' | 'vi';",
    "export type TraderJournalLanguage = 'en' | 'vi' | 'fa';",
    "language union",
)
settings = replace_once(
    settings,
    "\tlanguage: 'en',",
    "\tlanguage: 'fa',",
    "default language",
)
settings = replace_once(
    settings,
    "function normalizeLanguage(value: unknown): TraderJournalLanguage {\n\treturn value === 'vi' ? 'vi' : DEFAULT_SETTINGS.language;\n}",
    "function normalizeLanguage(value: unknown): TraderJournalLanguage {\n\treturn value === 'vi' || value === 'fa' ? value : DEFAULT_SETTINGS.language;\n}",
    "language normalization",
)
settings_path.write_text(settings, encoding="utf-8")

# 2) Add Persian to language selector
settings_tab_path = root / "src/ui/SettingsTab.tsx"
settings_tab = settings_tab_path.read_text(encoding="utf-8")
settings_tab = replace_once(
    settings_tab,
    "\t\t\t\t\t<option value=\"vi\">{tr('option.vietnamese')}</option>",
    "\t\t\t\t\t<option value=\"vi\">{tr('option.vietnamese')}</option>\n\t\t\t\t\t<option value=\"fa\">{tr('option.persian')}</option>",
    "Persian language option",
)
settings_tab_path.write_text(settings_tab, encoding="utf-8")

# 3) Persian translation layer. We intentionally preserve all technical schema keys.
i18n_path = root / "src/i18n.ts"
i18n = i18n_path.read_text(encoding="utf-8")
fa_block = r'''const FA: Partial<Record<keyof typeof EN, string>> = {
	'action.add': 'افزودن',
	'action.cancel': 'انصراف',
	'action.createSetup': 'ساخت ستاپ',
	'action.remove': 'حذف',
	'action.resetFilters': 'پاک کردن فیلترها',
	'action.reviewTrade': 'بازبینی معامله',
	'action.saveReview': 'ذخیره بازبینی',
	'action.savePlan': 'ذخیره پلن',
	'action.saveTrade': 'ذخیره معامله',
	'action.saving': 'در حال ذخیره...',
	'action.updatePlan': 'به‌روزرسانی پلن',
	'action.updateSetup': 'به‌روزرسانی ستاپ',
	'action.updateTrade': 'به‌روزرسانی معامله',
	'calendar.addTrade': 'افزودن معامله {type}',
	'calendar.addPlan': 'افزودن پلن معاملاتی',
	'calendar.collapseEconomicNews': 'بستن اخبار اقتصادی',
	'calendar.displayText': 'تقویم معاملات',
	'calendar.economicNews': 'اخبار اقتصادی',
	'calendar.economicNewsCount': '{count} رویداد اقتصادی',
	'calendar.expandEconomicNews': 'نمایش اخبار اقتصادی',
	'calendar.filterTradeType': 'فیلتر نوع معامله',
	'calendar.forecast': 'پیش‌بینی: {value}',
	'calendar.loadingTrades': 'در حال بارگذاری معاملات...',
	'calendar.loadingEconomicNews': 'در حال بارگذاری اخبار اقتصادی...',
	'calendar.nextMonth': 'ماه بعد',
	'calendar.noTrades': 'برای این تاریخ معامله‌ای ثبت نشده است.',
	'calendar.noEconomicNews': 'رویداد اقتصادی منطبق برای این تاریخ وجود ندارد.',
	'calendar.openPlanNoteError': 'پلن معاملاتی باز نشد.',
	'calendar.openTradeNoteError': 'یادداشت معامله باز نشد.',
	'calendar.plans': 'پلن‌ها',
	'calendar.previousMonth': 'ماه قبل',
	'calendar.today': 'امروز',
	'calendar.tradeCount': '{count} معامله',
	'calendar.tradeCountPlural': '{count} معامله',
	'calendar.trades': 'معاملات',
	'command.addBacktestTrade': 'ثبت معامله بک‌تست',
	'command.addLiveTrade': 'ثبت معامله زنده',
	'command.addTradePlan': 'ساخت پلن معاملاتی',
	'command.addTradeSetup': 'ساخت ستاپ معاملاتی',
	'command.openDashboard': 'باز کردن داشبورد معاملات',
	'command.openTradeCalendar': 'باز کردن تقویم معاملات',
	'command.recalculateCurrentStats': 'محاسبه دوباره آمار',
	'dashboard.activePlans': 'پلن‌های فعال',
	'dashboard.advancedFilters': 'فیلترهای پیشرفته',
	'dashboard.allPlanLinks': 'همه ارتباط‌های پلن',
	'dashboard.allResults': 'همه نتایج و وضعیت‌ها',
	'dashboard.allReviewStatuses': 'همه وضعیت‌های بازبینی',
	'dashboard.allSetups': 'همه ستاپ‌ها',
	'dashboard.allSides': 'همه جهت‌ها',
	'dashboard.activeSetups': 'ستاپ‌های فعال',
	'dashboard.attention': 'نیازمند توجه',
	'dashboard.allSymbols': 'همه نمادها',
	'dashboard.allTime': 'همه زمان‌ها',
	'dashboard.averageRr': 'میانگین RR',
	'dashboard.cancelledPlans': 'پلن‌های لغوشده',
	'dashboard.archivedSetups': 'ستاپ‌های بایگانی‌شده',
	'dashboard.closedPlans': 'پلن‌های بسته‌شده',
	'dashboard.completedTrades': 'معاملات تکمیل‌شده',
	'dashboard.currentMonth': 'ماه جاری',
	'dashboard.customPeriod': 'بازه دلخواه',
	'dashboard.dateFrom': 'از تاریخ',
	'dashboard.dateTo': 'تا تاریخ',
	'dashboard.emptyPlans': 'پلن فعالی وجود ندارد.',
	'dashboard.emptySetups': 'هنوز ستاپی ساخته نشده است.',
	'dashboard.emptyTrades': 'معامله‌ای مطابق این فیلترها وجود ندارد.',
	'dashboard.editPlan': 'ویرایش پلن',
	'dashboard.editSetup': 'ویرایش ستاپ',
	'dashboard.editTrade': 'ویرایش معامله',
	'dashboard.commonMistakes': 'اشتباهات پرتکرار',
	'dashboard.filters': 'فیلترهای داشبورد',
	'dashboard.last30Days': '۳۰ روز اخیر',
	'dashboard.last7Days': '۷ روز اخیر',
	'dashboard.linkedLiveTrades': 'معاملات زنده دارای پلن',
	'dashboard.netRr': 'RR خالص',
	'dashboard.noMistakes': 'در این بازه اشتباه بازبینی‌شده‌ای وجود ندارد.',
	'dashboard.noLinkedTrades': 'معامله متصل وجود ندارد',
	'dashboard.openCalendar': 'باز کردن تقویم',
	'dashboard.openLiveTrades': 'معاملات زنده باز',
	'dashboard.openNote': 'باز کردن یادداشت',
	'dashboard.openPlans': 'پلن‌های باز',
	'dashboard.period': 'بازه زمانی',
	'dashboard.performance': 'عملکرد معاملاتی',
	'dashboard.planExecution': 'اجرای پلن',
	'dashboard.planOverview': 'نمای کلی پلن',
	'dashboard.plansNeedTrade': 'پلن‌های باز بدون معامله',
	'dashboard.quickActions': 'دسترسی سریع',
	'dashboard.recentTrades': 'معاملات اخیر',
	'dashboard.reviewInsights': 'بینش پس از معامله',
	'dashboard.reviewStatus': 'وضعیت بازبینی',
	'dashboard.reviewCompletionRate': 'درصد تکمیل بازبینی',
	'dashboard.reviewedTrades': 'معاملات بازبینی‌شده',
	'dashboard.resultStatus': 'نتیجه یا وضعیت',
	'dashboard.searchTrades': 'جست‌وجوی معاملات',
	'dashboard.unreviewed': 'بازبینی‌نشده',
	'dashboard.unreviewedClosedTrades': 'معاملات بسته‌شده بدون بازبینی',
	'dashboard.planAdherenceAnalysis': 'RR بر اساس پایبندی به پلن',
	'dashboard.setups': 'ستاپ‌های معاملاتی',
	'dashboard.title': 'داشبورد معاملات',
	'dashboard.totalPlans': 'تعداد پلن‌ها',
	'dashboard.totalTrades': 'تعداد معاملات',
	'dashboard.today': 'امروز',
	'dashboard.tradePlanLinkage': 'ارتباط معامله و پلن',
	'dashboard.unplannedLiveTrades': 'معاملات زنده بدون پلن',
	'dashboard.unreviewedTrades': 'معاملات بازبینی‌نشده',
	'dashboard.withoutPlan': 'بدون پلن',
	'dashboard.withPlan': 'دارای پلن',
	'dashboard.viewAllTime': 'همه زمان‌ها',
	'dashboard.winRate': 'درصد برد',
	'dashboard.yesterday': 'دیروز',
	'detail.additionalData': 'اطلاعات تکمیلی',
	'detail.bias': 'جهت‌گیری',
	'detail.closedAt': 'زمان بسته شدن',
	'detail.dateRange': 'بازه تاریخ',
	'detail.endDate': 'تاریخ پایان',
	'detail.entryPrice': 'قیمت ورود',
	'detail.executionNotes': 'یادداشت اجرای معامله',
	'detail.entryPlan': 'پلن ورود',
	'detail.exitPrice': 'قیمت خروج',
	'detail.holdingTime': 'مدت نگهداری',
	'detail.images': 'تصاویر',
	'detail.invalidation': 'شرط ابطال',
	'detail.linkedTrades': 'معاملات مرتبط',
	'detail.notes': 'یادداشت‌ها',
	'detail.openedAt': 'زمان باز شدن',
	'detail.plan': 'پلن',
	'detail.result': 'نتیجه',
	'detail.rr': 'RR',
	'detail.riskNotes': 'یادداشت ریسک',
	'detail.setup': 'ستاپ',
	'detail.setupName': 'نام ستاپ',
	'detail.side': 'جهت معامله',
	'detail.startDate': 'تاریخ شروع',
	'detail.status': 'وضعیت',
	'detail.stopLoss': 'حد ضرر',
	'detail.symbol': 'نماد',
	'detail.symbols': 'نمادها',
	'detail.takeProfit': 'حد سود',
	'detail.takeProfitPlan': 'پلن حد سود',
	'detail.tags': 'برچسب‌ها',
	'detail.timeframe': 'تایم‌فریم',
	'detail.timeframes': 'تایم‌فریم‌ها',
	'detail.title': 'عنوان',
	'error.couldNotSavePlan': 'پلن معاملاتی ذخیره نشد.',
	'error.couldNotSaveSetup': 'ستاپ معاملاتی ذخیره نشد.',
	'error.couldNotSaveTrade': 'معامله ذخیره نشد.',
	'error.couldNotSaveReview': 'بازبینی معامله ذخیره نشد.',
	'error.currentFileNotJournal': 'فایل فعلی یک یادداشت ژورنال معاملاتی نیست.',
	'error.entryPriceNumber': 'قیمت ورود باید عدد باشد.',
	'error.exitPriceNumber': 'قیمت خروج باید عدد باشد.',
	'error.liveRrRisk': 'حد ضرر باید با قیمت ورود متفاوت باشد.',
	'error.longStopBelow': 'در معامله خرید، حد ضرر باید پایین‌تر از قیمت ورود باشد.',
	'error.longTakeAbove': 'در معامله خرید، حد سود باید بالاتر از قیمت ورود باشد.',
	'error.noActiveFile': 'فایل فعالی وجود ندارد.',
	'error.rrNumber': 'RR باید عدد باشد.',
	'error.reviewRequired': 'برای ذخیره بازبینی حداقل یک ارزیابی اضافه کنید.',
	'error.setupRequired': 'انتخاب ستاپ الزامی است.',
	'error.setupNameRequired': 'نام ستاپ الزامی است.',
	'error.shortStopAbove': 'در معامله فروش، حد ضرر باید بالاتر از قیمت ورود باشد.',
	'error.shortTakeBelow': 'در معامله فروش، حد سود باید پایین‌تر از قیمت ورود باشد.',
	'error.stopLossNumber': 'حد ضرر باید عدد باشد.',
	'error.symbolRequired': 'انتخاب نماد الزامی است.',
	'error.takeProfitNumber': 'حد سود باید عدد باشد.',
	'error.timeframeRequired': 'انتخاب تایم‌فریم الزامی است.',
	'image.fileNotFound': 'فایل تصویر پیدا نشد',
	'image.noPreview': 'پیش‌نمایش موجود نیست',
	'image.open': 'باز کردن {label}',
	'option.backtest': 'بک‌تست',
	'option.active': 'فعال',
	'option.archived': 'بایگانی‌شده',
	'option.breakeven': 'سر‌به‌سر',
	'option.cancelled': 'لغوشده',
	'option.closed': 'بسته‌شده',
	'option.english': 'انگلیسی',
	'option.horizontalCalendar': 'تقویم افقی',
	'option.live': 'زنده',
	'option.long': 'خرید',
	'option.loss': 'ضرر',
	'option.monthCalendar': 'تقویم ماهانه',
	'option.neutral': 'خنثی',
	'option.open': 'باز',
	'option.persian': 'فارسی',
	'option.short': 'فروش',
	'option.vietnamese': 'ویتنامی',
	'option.win': 'برد',
	'placeholder.image': 'تصویر، لینک یا مسیر فایل را اینجا قرار دهید',
	'placeholder.loadingSetups': 'در حال بارگذاری ستاپ‌ها...',
	'placeholder.noPlan': 'بدون پلن',
	'placeholder.planTitle': 'عنوان پلن معاملاتی',
	'placeholder.selectSymbol': 'نماد را انتخاب کنید',
	'placeholder.selectSetup': 'ستاپ را انتخاب کنید',
	'placeholder.selectTimeframe': 'تایم‌فریم را انتخاب کنید',
	'placeholder.searchTrades': 'نماد، ستاپ، تایم‌فریم، یادداشت یا پلن',
	'plan.linkedNotFound': 'پلن معاملاتی مرتبط پیدا نشد.',
	'plan.openLinked': 'باز کردن پلن مرتبط {plan}',
	'result.breakeven': 'سر‌به‌سر',
	'result.loss': 'ضرر',
	'result.win': 'برد',
	'review.context': 'ارزیابی بستر بازار',
	'review.context.correct': 'درست',
	'review.context.partial': 'تا حدی درست',
	'review.context.wrong': 'اشتباه',
	'review.entryTiming': 'زمان‌بندی ورود',
	'review.entryTiming.early': 'زود',
	'review.entryTiming.on_time': 'به‌موقع',
	'review.entryTiming.late': 'دیر',
	'review.lesson': 'درس معامله',
	'review.mistakes': 'اشتباهات',
	'review.mistake.wrong_context': 'بستر بازار اشتباه',
	'review.mistake.early_entry': 'ورود زودهنگام',
	'review.mistake.late_entry': 'ورود دیرهنگام',
	'review.mistake.no_confirmation': 'ورود بدون تأیید',
	'review.mistake.fomo': 'فومو',
	'review.mistake.revenge_trade': 'معامله انتقامی',
	'review.mistake.over_risk': 'ریسک بیش از حد',
	'review.mistake.moved_stop': 'جابه‌جایی حد ضرر',
	'review.mistake.cut_winner_early': 'خروج زود از معامله سودده',
	'review.mistake.ignored_plan': 'نادیده گرفتن پلن',
	'review.nextAction': 'اقدام مشخص برای معامله بعدی',
	'review.optionalHint': 'هنگام بستن معامله اجباری نیست؛ می‌توانید بعداً بازبینی کنید.',
	'review.planAdherence': 'پایبندی به پلن',
	'review.planAdherence.followed': 'کاملاً طبق پلن',
	'review.planAdherence.partial': 'تا حدی طبق پلن',
	'review.planAdherence.not_followed': 'خارج از پلن',
	'review.planAdherence.no_plan': 'بدون پلن',
	'review.requiredHint': 'برای تکمیل بازبینی حداقل یک ارزیابی اضافه کنید.',
	'review.reviewedAt': 'زمان بازبینی',
	'review.select': 'انتخاب ارزیابی',
	'review.title': 'بازبینی پس از معامله',
	'review.whatWentWell': 'چه چیزی خوب انجام شد؟',
	'settings.allowRemoteImagePreviews': 'اجازه نمایش تصویر از آدرس اینترنتی',
	'settings.backtestFolderDescription': 'پوشه اصلی یادداشت‌های روزانه بک‌تست.',
	'settings.backtestFolderLabel': 'پوشه ژورنال بک‌تست',
	'settings.calendarDisplayDescription': 'نحوه نمایش تقویم معاملات در نوار کناری.',
	'settings.calendarDisplayLabel': 'نوع نمایش تقویم',
	'settings.economicCalendarLabel': 'تقویم اقتصادی',
	'settings.economicCountriesLabel': 'کشورها و ارزها',
	'settings.economicImpactsLabel': 'اهمیت خبر',
	'settings.economicTimeZoneLabel': 'منطقه زمانی تقویم اقتصادی',
	'settings.enableEconomicCalendar': 'فعال‌سازی تقویم اقتصادی',
	'settings.imageModalLabel': 'نمایش بزرگ تصویر',
	'settings.languageDescription': 'زبان رابط کاربری ژورنال معاملاتی.',
	'settings.languageLabel': 'زبان',
	'settings.liveFolderDescription': 'پوشه اصلی یادداشت‌های معاملات زنده.',
	'settings.liveFolderLabel': 'پوشه ژورنال زنده',
	'settings.openImageModalOnClick': 'با کلیک روی تصویر، آن را بزرگ نمایش بده',
	'settings.planFolderDescription': 'پوشه اصلی پلن‌های معاملات زنده.',
	'settings.planFolderLabel': 'پوشه پلن‌های معاملاتی',
	'settings.setupFolderDescription': 'پوشه ستاپ‌های قابل استفاده مجدد.',
	'settings.setupFolderLabel': 'پوشه ستاپ‌های معاملاتی',
	'settings.remoteImagesLabel': 'تصاویر اینترنتی',
	'settings.symbolsDescription': 'نمادهایی که در فرم معامله قابل انتخاب هستند.',
	'settings.symbolsLabel': 'نمادها',
	'settings.timeframesDescription': 'تایم‌فریم‌هایی که در فرم معامله قابل انتخاب هستند.',
	'settings.timeframesLabel': 'تایم‌فریم‌ها',
	'side.long': 'خرید',
	'side.short': 'فروش',
	'storage.avgRr': 'میانگین RR',
	'storage.bestRr': 'بهترین RR',
	'storage.breakeven': 'سر‌به‌سر',
	'storage.loss': 'ضرر',
	'storage.netRr': 'RR خالص',
	'storage.plan': 'پلن',
	'storage.summary': 'خلاصه',
	'storage.trade': 'معامله',
	'storage.trades': 'معاملات',
	'storage.win': 'برد',
	'storage.winRate': 'درصد برد',
	'storage.worstRr': 'بدترین RR',
};

'''
if "const FA:" not in i18n:
    i18n = replace_once(i18n, "const TRANSLATIONS = {", fa_block + "const TRANSLATIONS = {", "FA translation insertion")

i18n = replace_once(
    i18n,
    "const TRANSLATIONS = {\n\ten: EN,\n\tvi: VI,\n};",
    "const TRANSLATIONS = {\n\ten: EN,\n\tvi: VI,\n\tfa: { ...EN, ...FA },\n};",
    "translation registry",
)
i18n = replace_once(
    i18n,
    "export function getLocale(language: TraderJournalLanguage): string | undefined {\n\treturn language === 'vi' ? 'vi-VN' : undefined;\n}",
    "export function getLocale(language: TraderJournalLanguage): string | undefined {\n\tif (language === 'fa') return 'fa-IR';\n\treturn language === 'vi' ? 'vi-VN' : undefined;\n}",
    "Persian locale",
)
i18n = replace_once(
    i18n,
    "export function getWeekdayLabels(language: TraderJournalLanguage): string[] {\n\treturn language === 'vi' ? ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'] : ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];\n}",
    "export function getWeekdayLabels(language: TraderJournalLanguage): string[] {\n\tif (language === 'fa') return ['دوشنبه', 'سه‌شنبه', 'چهارشنبه', 'پنجشنبه', 'جمعه', 'شنبه', 'یکشنبه'];\n\treturn language === 'vi' ? ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'] : ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];\n}",
    "Persian weekdays",
)
i18n_path.write_text(i18n, encoding="utf-8")

# 4) Toggle a Persian/RTL body class from plugin state.
main_path = root / "src/main.ts"
main = main_path.read_text(encoding="utf-8")
main = replace_once(
    main,
    "import { normalizeSettings, TraderJournalSettings } from './settings';",
    "import { LANGUAGE_CHANGE_EVENT, normalizeSettings, TraderJournalSettings } from './settings';",
    "language event import",
)
main = replace_once(
    main,
    "\tasync onload() {\n\t\tawait this.loadSettings();",
    "\tasync onload() {\n\t\tawait this.loadSettings();\n\t\tthis.syncPersianDirection();\n\t\tthis.registerEvent(this.app.workspace.on(LANGUAGE_CHANGE_EVENT, () => this.syncPersianDirection()));",
    "RTL initialization",
)
main = replace_once(
    main,
    "\tasync loadSettings() {",
    "\tonunload() {\n\t\tdocument.body.classList.remove('trader-journal-fa');\n\t}\n\n\tprivate syncPersianDirection() {\n\t\tdocument.body.classList.toggle('trader-journal-fa', this.settings.language === 'fa');\n\t}\n\n\tasync loadSettings() {",
    "RTL helper",
)
main_path.write_text(main, encoding="utf-8")

# 5) RTL styling using logical properties, while keeping market symbols/prices readable LTR.
styles_path = root / "styles.css"
styles = styles_path.read_text(encoding="utf-8")
styles = styles.replace("\tpadding: 0 4px 16px 0;", "\tpadding-block: 0 16px;\n\tpadding-inline: 0 4px;", 1)
rtl_css = r'''

/* Persian / RTL ---------------------------------------------------------- */
body.trader-journal-fa .trader-journal-modal,
body.trader-journal-fa .trader-journal-settings,
body.trader-journal-fa .trader-journal-dashboard,
body.trader-journal-fa .trader-journal-calendar,
body.trader-journal-fa .trader-journal-trade-card,
body.trader-journal-fa .trader-journal-plan-card,
body.trader-journal-fa .trader-journal-setup-card {
	direction: rtl;
	text-align: start;
}

body.trader-journal-fa .trader-journal-form__grid,
body.trader-journal-fa .trader-journal-review-form__grid,
body.trader-journal-fa .trader-journal-setting {
	direction: rtl;
}

body.trader-journal-fa input[type='number'],
body.trader-journal-fa input[type='date'],
body.trader-journal-fa input[type='datetime-local'],
body.trader-journal-fa input[type='time'],
body.trader-journal-fa .trader-journal-price,
body.trader-journal-fa .trader-journal-symbol,
body.trader-journal-fa code,
body.trader-journal-fa pre {
	direction: ltr;
	text-align: left;
	unicode-bidi: isolate;
}

body.trader-journal-fa .trader-journal-add-row,
body.trader-journal-fa .trader-journal-toggle,
body.trader-journal-fa .trader-journal-pill,
body.trader-journal-fa .trader-journal-setup-select-row,
body.trader-journal-fa .trader-journal-setting__checkbox-list label,
body.trader-journal-fa .trader-journal-setup-symbols__options label {
	direction: rtl;
}

body.trader-journal-fa select,
body.trader-journal-fa textarea,
body.trader-journal-fa input[type='text'] {
	text-align: start;
}
'''
if "/* Persian / RTL" not in styles:
    styles += rtl_css
styles_path.write_text(styles, encoding="utf-8")

# 6) User-facing Persian guide
persian_doc = root / "docs/PERSIAN.md"
persian_doc.write_text("""# راهنمای فارسی Trader Journal\n\nاین Fork برای تجربه‌ی فارسی و راست‌چین توسعه داده می‌شود.\n\n## مرحله فعلی\n- زبان فارسی به تنظیمات افزونه اضافه شده است.\n- فارسی زبان پیش‌فرض این Fork است.\n- بخش‌های اصلی رابط کاربری ترجمه شده‌اند.\n- رابط افزونه در حالت فارسی RTL می‌شود.\n- فیلدهای عددی، قیمت، تاریخ و کد عمداً LTR نگه داشته می‌شوند.\n- کلیدهای JSON، Frontmatter و شناسه‌های داخلی ترجمه نشده‌اند تا داده‌های ژورنال خراب نشوند.\n\n## مسیر بعدی\n1. تکمیل ترجمه همه رشته‌های رابط.\n2. تست RTL در Dashboard، Calendar و Modalها.\n3. ساخت Wizard ساده برای Setupهای Khan.\n4. افزودن Rule Registry و داده‌های قابل بک‌تست.\n\nاصل طراحی: **پیچیدگی در موتور، سادگی در صفحه.**\n""", encoding="utf-8")

print("Persian localization patch applied.")
