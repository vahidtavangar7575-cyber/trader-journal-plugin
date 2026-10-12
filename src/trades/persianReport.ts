import type { TradeEntry, TradeJournalDetails } from './types';
import { formatDateTime, formatDuration, formatPrice, formatRr, getHoldingMinutes, normalizeTradeImages, stringifyValue } from './format';

export const PERSIAN_REPORT_START = '──────── گزارش خودکار فارسی معامله ────────';
export const PERSIAN_REPORT_END = '──────── پایان گزارش خودکار ────────';

export function stripGeneratedPersianReport(value: unknown): string {
  const text = stringifyValue(value);
  const index = text.indexOf(PERSIAN_REPORT_START);
  return (index >= 0 ? text.slice(0, index) : text).trim();
}

export function attachPersianTradeReport(trade: TradeEntry): TradeEntry {
  if (!trade.khan_setup) return trade;
  const userNotes = stripGeneratedPersianReport(trade.notes);
  const report = buildPersianTradeReport(trade);
  return { ...trade, notes: [userNotes, report].filter(Boolean).join('\n\n') };
}

export function buildPersianTradeReport(trade: TradeEntry): string {
  const lines: string[] = [PERSIAN_REPORT_START];
  const add = (label: string, value: unknown, suffix = '') => {
    const text = stringifyValue(value);
    if (text) lines.push(`${label}: ${text}${suffix}`);
  };

  lines.push('');
  lines.push('【 شناسنامه معامله 】');
  add('شناسه معامله', trade.id);
  add('نوع ثبت', journalTypeLabel(trade.journal_type));
  add('وضعیت معامله', stringifyValue(trade.status) === 'closed' ? 'بسته‌شده' : 'باز / در انتظار نتیجه');
  add('نماد', trade.symbol);
  add('جهت', sideLabel(trade.side));
  add('تایم‌فریم اجرا', trade.timeframe);
  add('سشن', sessionLabel(trade.session));
  add('زمان ورود', formatDateTime(trade.opened_at));
  add('زمان خروج', formatDateTime(trade.closed_at));
  add('مدت نگهداری', formatDuration(getHoldingMinutes(trade)));

  lines.push('');
  lines.push('【 منطق خان و مسیر Presentation 】');
  add('ستاپ تشخیص‌داده‌شده', khanSetupLabel(trade.khan_setup));
  add('نسخه موتور قوانین', trade.khan_rule_version);
  add('صفحه نتیجه در Presentation', trade.khan_result_page);
  const pages = asArray(trade.khan_source_pages).map(String).filter(Boolean);
  if (pages.length) lines.push(`مسیر صفحات منبع: ${pages.join(' ← ')}`);
  const sourceDocument = stringifyValue(trade.khan_source_document) || 'Presentation - Copy.pdf (58 pages)';
  lines.push(`منبع تصمیم: ${sourceDocument}`);
  if (trade.khan_source_exact === true) lines.push('وضعیت تطابق: مسیر تصمیم با لینک‌های داخلی خود فایل Presentation تطبیق داده شده است.');
  const decisionPath = normalizeDecisionPath(trade.khan_decision_path);
  if (decisionPath.length) {
    lines.push('پاسخ‌های ثبت‌شده:');
    decisionPath.forEach((item, index) => lines.push(`  ${index + 1}) صفحه ${item.page}: ${item.answerLabel}`));
  }

  addCentralJournal(lines, trade.journal_details);

  lines.push('');
  lines.push('【 حساب و مدیریت سرمایه 】');
  add('نام حساب', trade.account_name);
  add('نوع حساب', accountTypeLabel(trade.account_type));
  add('کد حساب', trade.account_code);
  add('ارز حساب', trade.account_currency);
  addNumber('موجودی قبل از معامله', trade.account_balance_before, lines, trade.account_currency);
  addNumber('Equity هنگام ورود', trade.account_equity, lines, trade.account_currency);
  addNumber('موجودی بعد از معامله', trade.account_balance_after, lines, trade.account_currency);
  addPercent('سقف ریسک مسیر خان', trade.khan_risk_pct, lines);
  addPercent('ریسک پیشنهادی موتور مدیریت سرمایه', trade.risk_rule_recommended_pct, lines);
  addPercent('ریسک واقعی ثبت‌شده', trade.risk_pct, lines);
  addNumber('مبلغ واقعی در معرض ریسک', trade.risk_amount, lines, trade.account_currency);
  add('شماره معامله امروز', trade.risk_rule_trade_number);
  addPercent('پایه ریسک روز', trade.risk_rule_day_base_pct, lines);
  addPercent('پایه ریسک هفته', trade.risk_rule_week_base_pct, lines);
  if (trade.risk_rule_violation === true) lines.push('وضعیت انضباط سرمایه: ⚠ تخطی از حداقل یک قانون ثبت شده است.');
  const warnings = asArray(trade.risk_rule_warnings).map(String).filter(Boolean);
  warnings.forEach((warning) => lines.push(`  هشدار: ${warning}`));

  lines.push('');
  lines.push('【 اجرای معامله 】');
  add('قیمت ورود', formatPrice(trade.entry_price));
  add('حد ضرر', formatPrice(trade.stop_loss));
  add('هدف برنامه‌ریزی‌شده', formatPrice(trade.take_profit));
  add('قیمت خروج واقعی', formatPrice(trade.exit_price));
  add('حجم معامله', positionSizeText(trade.position_size, trade.position_unit));
  add('R برنامه‌ریزی‌شده', formatRr(trade.planned_rr));
  add('R واقعی', formatRr(trade.rr));
  add('نتیجه نهایی', resultLabel(trade.result));
  addNumber('سود/زیان پولی محاسبه‌شده حساب', trade.pnl_amount, lines, trade.account_currency);
  addPercent('سود/زیان درصدی حساب', trade.pnl_pct, lines);

  const details = asJournalDetails(trade.journal_details);
  if (details) {
    lines.push('');
    lines.push('【 هزینه‌ها و کیفیت اجرای ثبت‌شده 】');
    addNumber('کمیسیون', details.commission, lines, trade.account_currency);
    addNumber('Swap', details.swap, lines, trade.account_currency);
    addNumber('سود/زیان ناخالص ثبت‌شده', details.gross_pnl, lines, trade.account_currency);
    addNumber('سود/زیان خالص ثبت‌شده', details.net_pnl, lines, trade.account_currency);
    addR('MFE', details.mfe_r, lines);
    addR('MAE', details.mae_r, lines);
    if (details.stop_management) lines.push(`مدیریت استاپ: ${stopManagementLabel(details.stop_management)}`);
    if (details.stop_widened === true) lines.push('هشدار انضباطی: استاپ برخلاف پلن بازتر/پرریسک‌تر شده است.');
    if (details.exit_reason) lines.push(`علت خروج: ${exitReasonLabel(details.exit_reason)}`);
  }

  lines.push('');
  lines.push('【 وضعیت ذهنی و رفتار 】');
  add('وضعیت بازار هنگام تصمیم', trade.market_arrival_context);
  add('حالت ذهنی قبل از ورود', emotionLabel(trade.pre_trade_emotion));
  const chase = stringifyValue(trade.urge_to_chase);
  if (chase) lines.push(`میل به تعقیب قیمت: ${chase} از ۱۰`);
  addReview(lines, trade);

  const images = normalizeTradeImages(trade.images);
  lines.push('');
  lines.push('【 تصاویر مستند 】');
  if (!images.length) lines.push('تصویری ثبت نشده است.');
  else images.forEach((image, index) => lines.push(`  ${index + 1}) ${image.label || 'تصویر معامله'} — ${image.value}`));

  lines.push('');
  lines.push(PERSIAN_REPORT_END);
  return lines.join('\n');
}

function addCentralJournal(lines: string[], value: unknown): void {
  const details = asJournalDetails(value);
  if (!details) return;
  lines.push('');
  lines.push('【 ژورنال مرکزی — Context و شواهد تصمیم 】');
  addTextLine(lines, 'روز / عنوان جلسه', details.session_day);
  addTextLine(lines, 'ساختار HTF / M15', structureLabel(details.htf_structure));
  addTextLine(lines, 'لایه ساختار', structureLayerLabel(details.structure_layer));
  addTextLine(lines, 'رویداد نقدینگی', liquidityLabel(details.liquidity_event));
  addTextLine(lines, 'خانواده POI', poiCategoryLabel(details.poi_category));
  addTextLine(lines, 'نوع POI', poiTypeLabel(details.poi_type));
  addTextLine(lines, 'وضعیت IDM', idmStateLabel(details.idm_state));
  addTextLine(lines, 'Trigger / Entry Module', triggerLabel(details.trigger_module));
  addTextLine(lines, 'نقدینگی / هدف اصلی', details.target_liquidity);
  addTextLine(lines, 'مرز ناحیه M15 / POI', details.m15_zone_boundary);
  lines.push(`Context تایم M15/HTF کامل: ${yesNo(details.m15_context_complete)}`);
  lines.push(`Trigger تایم M1 کامل: ${yesNo(details.m1_trigger_complete)}`);
  lines.push(`Zone / نقدینگی موردنظر مصرف شده: ${yesNo(details.zone_consumed)}`);
  lines.push(`خبرهای مهم بررسی شده: ${yesNo(details.news_checked)}`);
}

function addReview(lines: string[], trade: TradeEntry): void {
  if (!trade.review) return;
  lines.push('');
  lines.push('【 بازبینی و تجربه 】');
  addTextLine(lines, 'درستی Context', reviewContextLabel(trade.review.context));
  addTextLine(lines, 'زمان‌بندی Entry', entryTimingLabel(trade.review.entry_timing));
  addTextLine(lines, 'پایبندی به پلن', adherenceLabel(trade.review.plan_adherence));
  const mistakes = Array.isArray(trade.review.mistake_tags) ? trade.review.mistake_tags.map(mistakeLabel).filter(Boolean) : [];
  if (mistakes.length) lines.push(`خطاهای ثبت‌شده: ${mistakes.join('، ')}`);
  addTextLine(lines, 'چه چیزی خوب انجام شد', trade.review.what_went_well);
  addTextLine(lines, 'درس معامله', trade.review.lesson);
  addTextLine(lines, 'اقدام بعدی', trade.review.next_action);
}

function addTextLine(lines: string[], label: string, value: unknown): void {
  const text = stringifyValue(value);
  if (text) lines.push(`${label}: ${text}`);
}

function addNumber(label: string, value: unknown, lines: string[], currency: unknown): void {
  const n = Number(value);
  if (!Number.isFinite(n)) return;
  const currencyText = stringifyValue(currency);
  lines.push(`${label}: ${formatNumber(n)}${currencyText ? ` ${currencyText}` : ''}`);
}

function addPercent(label: string, value: unknown, lines: string[]): void {
  const n = Number(value);
  if (!Number.isFinite(n)) return;
  lines.push(`${label}: ${formatNumber(n)}٪`);
}

function addR(label: string, value: unknown, lines: string[]): void {
  const n = Number(value);
  if (Number.isFinite(n)) lines.push(`${label}: ${formatNumber(n)}R`);
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat('fa-IR', { maximumFractionDigits: 4 }).format(value);
}

function asJournalDetails(value: unknown): TradeJournalDetails | null {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as TradeJournalDetails : null;
}

function journalTypeLabel(value: unknown): string { return stringifyValue(value) === 'backtest' ? 'بک‌تست / تمرینی' : 'معامله زنده / اجرایی'; }
function sideLabel(value: unknown): string { return stringifyValue(value) === 'short' ? 'فروش (Short)' : 'خرید (Long)'; }
function resultLabel(value: unknown): string {
  const raw = stringifyValue(value);
  if (raw === 'win') return 'برد';
  if (raw === 'loss') return 'ضرر';
  if (raw === 'breakeven') return 'سر‌به‌سر';
  return raw;
}
function accountTypeLabel(value: unknown): string {
  const labels: Record<string, string> = { backtest: 'بک‌تست', demo: 'دمو', prop: 'پراپ', competition: 'مسابقه', live: 'واقعی' };
  const raw = stringifyValue(value); return labels[raw] ?? raw;
}
function sessionLabel(value: unknown): string {
  const labels: Record<string, string> = { asia: 'آسیا', london: 'لندن', new_york: 'نیویورک', overlap: 'هم‌پوشانی لندن و نیویورک', other: 'سایر' };
  const raw = stringifyValue(value); return labels[raw] ?? raw;
}
function emotionLabel(value: unknown): string {
  const labels: Record<string, string> = { calm: 'آرام و متمرکز', neutral: 'خنثی', activated: 'برانگیخته / هیجانی' };
  const raw = stringifyValue(value); return labels[raw] ?? raw;
}
function khanSetupLabel(value: unknown): string {
  const raw = stringifyValue(value); const match = raw.match(/setup-(\d+)/); return match?.[1] ? `ستاپ ${match[1]} خان` : raw;
}
function positionSizeText(size: unknown, unit: unknown): string {
  const sizeText = stringifyValue(size); if (!sizeText) return '';
  const unitRaw = stringifyValue(unit); const unitLabel = unitRaw === 'lot' ? 'لات' : unitRaw === 'contract' ? 'قرارداد' : unitRaw === 'unit' ? 'واحد' : unitRaw;
  return `${sizeText}${unitLabel ? ` ${unitLabel}` : ''}`;
}
function yesNo(value: unknown): string { return value === true ? 'بله ✓' : 'خیر / ثبت نشده'; }
function labelFrom(value: unknown, map: Record<string, string>): string { const raw = stringifyValue(value); return map[raw] ?? raw; }
function structureLabel(value: unknown): string { return labelFrom(value, { bullish: 'صعودی', bearish: 'نزولی', range: 'رنج', unclear: 'نامشخص / هنوز قابل تصمیم نیست' }); }
function structureLayerLabel(value: unknown): string { return labelFrom(value, { major: 'Major / اصلی', internal: 'Internal / داخلی', both: 'هر دو', unclear: 'نامشخص' }); }
function liquidityLabel(value: unknown): string { return labelFrom(value, { idm: 'IDM / Inducement', pdh: 'PDH', pdl: 'PDL', session: 'Session High / Low', 'eqh-eql': 'EQH / EQL', sweep: 'Sweep ساختاری', other: 'سایر' }); }
function poiCategoryLabel(value: unknown): string { return labelFrom(value, { of: 'Order Flow', ob: 'Order Block', scm: 'Single Candle Mitigation', hidden: 'Hidden POI', 'daily-session': 'Daily / Session POI', other: 'سایر' }); }
function poiTypeLabel(value: unknown): string { return labelFrom(value, { decisional: 'Decisional', extreme: 'Extreme', unclear: 'هنوز مشخص نیست' }); }
function idmStateLabel(value: unknown): string { return labelFrom(value, { intact: 'هنوز مصرف نشده', consumed: 'مصرف شده', transferred: 'به Pullback جدید منتقل شده', unclear: 'نامشخص' }); }
function triggerLabel(value: unknown): string { return labelFrom(value, { choch: 'CHOCH', flip: 'Flip', scm: 'SCM', scob: 'SCOB', sweep: 'Sweep entry', none: 'هنوز Trigger نداریم' }); }
function stopManagementLabel(value: unknown): string { return labelFrom(value, { unchanged: 'بدون تغییر', breakeven: 'انتقال به BE', tightened: 'تنگ‌تر شده', trailed: 'Trailing', widened: 'بازتر شده', removed: 'حذف شده' }); }
function exitReasonLabel(value: unknown): string { return labelFrom(value, { tp: 'TP / هدف', sl: 'SL', trail: 'Trailing stop', manual: 'خروج دستی', time: 'خروج زمانی', invalidated: 'ابطال سناریو', other: 'سایر' }); }
function reviewContextLabel(value: unknown): string { return labelFrom(value, { correct: 'درست', partial: 'نیمه‌درست', wrong: 'اشتباه' }); }
function entryTimingLabel(value: unknown): string { return labelFrom(value, { early: 'زود', on_time: 'به‌موقع', late: 'دیر' }); }
function adherenceLabel(value: unknown): string { return labelFrom(value, { followed: 'کامل', partial: 'نیمه', not_followed: 'تخطی', no_plan: 'بدون پلن' }); }
function mistakeLabel(value: unknown): string {
  return labelFrom(value, { wrong_context: 'Context اشتباه', early_entry: 'ورود زود', late_entry: 'ورود دیر', no_confirmation: 'بدون تأیید', fomo: 'FOMO', revenge_trade: 'انتقام', over_risk: 'ریسک زیاد', moved_stop: 'جابجایی استاپ', cut_winner_early: 'بستن زود سود', ignored_plan: 'نادیده گرفتن پلن' });
}
function asArray(value: unknown): unknown[] { return Array.isArray(value) ? value : value === undefined || value === null ? [] : [value]; }
function normalizeDecisionPath(value: unknown): Array<{ page: string; answerLabel: string }> {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    if (!item || typeof item !== 'object' || Array.isArray(item)) return [];
    const record = item as Record<string, unknown>;
    const page = stringifyValue(record.page); const answerLabel = stringifyValue(record.answerLabel);
    return page && answerLabel ? [{ page, answerLabel }] : [];
  });
}
