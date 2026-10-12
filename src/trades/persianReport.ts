import type { TradeEntry, TradeReviewMistakeTag } from './types';
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
  return {
    ...trade,
    notes: [userNotes, report].filter(Boolean).join('\n\n'),
  };
}

export function buildPersianTradeReport(trade: TradeEntry): string {
  const lines: string[] = [PERSIAN_REPORT_START];
  const add = (label: string, value: unknown, suffix = '') => {
    const text = stringifyValue(value);
    if (text) lines.push(`${label}: ${text}${suffix}`);
  };

  lines.push('');
  lines.push('【 شناسنامه کامل معامله 】');
  add('شناسه معامله', trade.id);
  add('نوع ثبت', journalTypeLabel(trade.journal_type));
  add('وضعیت معامله', stringifyValue(trade.status) === 'closed' ? 'بسته‌شده' : 'باز / در انتظار نتیجه');
  add('نماد', trade.symbol);
  add('جهت', sideLabel(trade.side));
  add('تایم‌فریم اجرا', trade.timeframe);
  add('سشن', sessionLabel(trade.session));
  add('زمان ورود', formatDateTime(trade.opened_at));
  add('زمان خروج', formatDateTime(trade.closed_at));
  const holding = formatDuration(getHoldingMinutes(trade));
  add('مدت نگهداری', holding);

  lines.push('');
  lines.push('【 منطق خان و مسیر دقیق Presentation 】');
  add('ستاپ ثبت‌شده', khanSetupLabel(trade.khan_setup));
  add('نسخه موتور قوانین', trade.khan_rule_version);
  add('صفحه نتیجه در Presentation', trade.khan_result_page);
  const pages = asArray(trade.khan_source_pages).map(String).filter(Boolean);
  if (pages.length) lines.push(`مسیر صفحات منبع: ${pages.join(' ← ')}`);
  const sourceDocument = stringifyValue(trade.khan_source_document) || 'Presentation - Copy.pdf (58 pages)';
  lines.push(`منبع تصمیم: ${sourceDocument}`);
  if (trade.khan_source_exact === true) lines.push('وضعیت تطابق: مسیر تصمیم از گراف منبع Presentation ثبت شده و پاسخ‌ها قابل بازسازی‌اند.');
  const decisionPath = normalizeDecisionPath(trade.khan_decision_path);
  if (decisionPath.length) {
    lines.push('پاسخ‌های ثبت‌شده در مسیر:');
    decisionPath.forEach((item, index) => lines.push(`  ${index + 1}) صفحه ${item.page}: ${item.answerLabel}`));
  }
  add('زمینه عملیاتی هنگام ورود به فرایند', trade.khan_operational_context);
  add('راهنمای عملیاتی ثبت‌شده', trade.khan_operational_guidance);

  lines.push('');
  lines.push('【 حساب و مدیریت سرمایه 】');
  add('نام حساب', trade.account_name);
  add('نوع حساب', accountTypeLabel(trade.account_type));
  add('کد حساب', trade.account_code);
  add('ارز حساب', trade.account_currency);
  addNumber('موجودی قبل از معامله', trade.account_balance_before, lines, trade.account_currency);
  addNumber('Equity هنگام ورود', trade.account_equity, lines, trade.account_currency);
  addNumber('موجودی بعد از معامله', trade.account_balance_after, lines, trade.account_currency);
  addPercent('ریسک نوشته‌شده در مسیر Presentation', trade.khan_risk_pct, lines);
  addPercent('ریسک پیشنهادی موتور مدیریت سرمایه', trade.risk_rule_recommended_pct, lines);
  addPercent('ریسک واقعی اجراشده', trade.risk_pct, lines);
  addNumber('مبلغ واقعی در معرض ریسک', trade.risk_amount, lines, trade.account_currency);
  add('شماره معامله امروز', trade.risk_rule_trade_number);
  addPercent('پایه ریسک روز', trade.risk_rule_day_base_pct, lines);
  addPercent('پایه ریسک هفته', trade.risk_rule_week_base_pct, lines);
  if (trade.risk_rule_violation === true) lines.push('وضعیت انضباط سرمایه: ⚠ حداقل یک تخطی از قوانین ثبت شده است.');
  const warnings = asArray(trade.risk_rule_warnings).map(String).filter(Boolean);
  warnings.forEach((warning) => lines.push(`  هشدار ثبت‌شده: ${warning}`));

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
  addNumber('سود/زیان پولی', trade.pnl_amount, lines, trade.account_currency);
  addPercent('سود/زیان درصدی', trade.pnl_pct, lines);

  lines.push('');
  lines.push('【 وضعیت ذهنی قبل از معامله 】');
  add('وضعیت بازار هنگام تصمیم', trade.market_arrival_context);
  add('حالت ذهنی قبل از ورود', emotionLabel(trade.pre_trade_emotion));
  const chase = stringifyValue(trade.urge_to_chase);
  if (chase) lines.push(`میل به تعقیب قیمت: ${chase} از ۱۰`);

  lines.push('');
  lines.push('【 ارزیابی کیفیت اجرا و تجربه 】');
  if (!trade.review) {
    lines.push('بازبینی پس از معامله هنوز تکمیل نشده است.');
  } else {
    add('کیفیت Context', reviewContextLabel(trade.review.context));
    add('زمان‌بندی ورود', entryTimingLabel(trade.review.entry_timing));
    add('پایبندی به پلن', planAdherenceLabel(trade.review.plan_adherence));
    const mistakes = Array.isArray(trade.review.mistake_tags) ? trade.review.mistake_tags : [];
    if (mistakes.length) lines.push(`خطاهای ثبت‌شده: ${mistakes.map(mistakeLabel).join('، ')}`);
    else lines.push('خطاهای ثبت‌شده: موردی ثبت نشده است.');
    add('کاری که درست انجام شد', trade.review.what_went_well);
    add('درس اصلی معامله', trade.review.lesson);
    add('اقدام مشخص برای معامله بعد', trade.review.next_action);
    add('زمان انجام بازبینی', formatDateTime(trade.review.reviewed_at));
  }

  const images = normalizeTradeImages(trade.images);
  lines.push('');
  lines.push('【 تصاویر مستند معامله 】');
  if (!images.length) {
    lines.push('تصویری ثبت نشده است.');
  } else {
    images.forEach((image, index) => lines.push(`  ${index + 1}) ${image.label || 'تصویر معامله'} — ${image.value}`));
  }

  lines.push('');
  lines.push('【 جمع‌بندی خوانا 】');
  if (stringifyValue(trade.status) !== 'closed') {
    lines.push('این معامله هنوز باز است؛ نتیجه و ارزیابی نهایی باید بعد از بسته‌شدن روی همین رکورد تکمیل شود.');
  } else {
    const result = resultLabel(trade.result) || 'نامشخص';
    const realizedR = formatRr(trade.rr) || 'نامشخص';
    lines.push(`نتیجه ثبت‌شده: ${result} با ${realizedR}.`);
    if (trade.review?.plan_adherence) lines.push(`پایبندی به پلن: ${planAdherenceLabel(trade.review.plan_adherence)}.`);
    if (trade.review?.lesson) lines.push(`درس ثبت‌شده: ${trade.review.lesson}`);
  }

  lines.push('');
  lines.push(PERSIAN_REPORT_END);
  return lines.join('\n');
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

function formatNumber(value: number): string {
  return new Intl.NumberFormat('fa-IR', { maximumFractionDigits: 4 }).format(value);
}

function journalTypeLabel(value: unknown): string {
  return stringifyValue(value) === 'backtest' ? 'بک‌تست / تمرینی' : 'معامله زنده / اجرایی';
}

function sideLabel(value: unknown): string {
  return stringifyValue(value) === 'short' ? 'فروش (Short)' : 'خرید (Long)';
}

function resultLabel(value: unknown): string {
  const raw = stringifyValue(value);
  if (raw === 'win') return 'برد';
  if (raw === 'loss') return 'ضرر';
  if (raw === 'breakeven') return 'سر‌به‌سر';
  return raw;
}

function accountTypeLabel(value: unknown): string {
  const labels: Record<string, string> = {
    backtest: 'بک‌تست',
    demo: 'دمو',
    prop: 'پراپ',
    competition: 'مسابقه',
    live: 'واقعی',
  };
  const raw = stringifyValue(value);
  return labels[raw] ?? raw;
}

function sessionLabel(value: unknown): string {
  const labels: Record<string, string> = {
    asia: 'آسیا',
    london: 'لندن',
    new_york: 'نیویورک',
    overlap: 'هم‌پوشانی لندن و نیویورک',
    other: 'سایر',
  };
  const raw = stringifyValue(value);
  return labels[raw] ?? raw;
}

function emotionLabel(value: unknown): string {
  const labels: Record<string, string> = {
    calm: 'آرام و متمرکز',
    neutral: 'خنثی',
    activated: 'برانگیخته / هیجانی',
  };
  const raw = stringifyValue(value);
  return labels[raw] ?? raw;
}

function reviewContextLabel(value: unknown): string {
  const labels: Record<string, string> = {
    correct: 'درست',
    partial: 'نیمه‌درست / ناقص',
    wrong: 'اشتباه',
  };
  const raw = stringifyValue(value);
  return labels[raw] ?? raw;
}

function entryTimingLabel(value: unknown): string {
  const labels: Record<string, string> = {
    early: 'زودهنگام',
    on_time: 'به‌موقع',
    late: 'دیرهنگام',
  };
  const raw = stringifyValue(value);
  return labels[raw] ?? raw;
}

function planAdherenceLabel(value: unknown): string {
  const labels: Record<string, string> = {
    followed: 'پلن کامل رعایت شد',
    partial: 'بخشی از پلن رعایت شد',
    not_followed: 'پلن رعایت نشد',
    no_plan: 'پلن از قبل ثبت نشده بود',
  };
  const raw = stringifyValue(value);
  return labels[raw] ?? raw;
}

function mistakeLabel(value: TradeReviewMistakeTag): string {
  const labels: Record<TradeReviewMistakeTag, string> = {
    wrong_context: 'Context اشتباه',
    early_entry: 'ورود زودهنگام',
    late_entry: 'ورود دیرهنگام',
    no_confirmation: 'ورود بدون تأیید',
    fomo: 'FOMO / تعقیب قیمت',
    revenge_trade: 'معامله انتقامی',
    over_risk: 'ریسک بیش از قانون',
    moved_stop: 'جابجایی استاپ خارج از قانون',
    cut_winner_early: 'بستن زودهنگام معامله برنده',
    ignored_plan: 'نادیده‌گرفتن پلن',
  };
  return labels[value];
}

function khanSetupLabel(value: unknown): string {
  const raw = stringifyValue(value);
  const match = raw.match(/setup-(\d+)/);
  return match?.[1] ? `ستاپ ${match[1]} خان` : raw;
}

function positionSizeText(size: unknown, unit: unknown): string {
  const sizeText = stringifyValue(size);
  if (!sizeText) return '';
  const unitRaw = stringifyValue(unit);
  const unitLabel = unitRaw === 'lot' ? 'لات' : unitRaw === 'contract' ? 'قرارداد' : unitRaw === 'unit' ? 'واحد' : unitRaw;
  return `${sizeText}${unitLabel ? ` ${unitLabel}` : ''}`;
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : value === undefined || value === null ? [] : [value];
}

function normalizeDecisionPath(value: unknown): Array<{ page: string; answerLabel: string }> {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    if (!item || typeof item !== 'object' || Array.isArray(item)) return [];
    const record = item as Record<string, unknown>;
    const page = stringifyValue(record.page);
    const answerLabel = stringifyValue(record.answerLabel);
    return page && answerLabel ? [{ page, answerLabel }] : [];
  });
}
