import assert from 'node:assert/strict';
import test from 'node:test';
import { buildPersianTradeReport, PERSIAN_REPORT_START, stripGeneratedPersianReport } from '../src/trades/persianReport';
import type { TradeEntry } from '../src/trades/types';

void test('Persian Khan report explains source path, account, risk and execution in readable labels', () => {
  const trade: TradeEntry = {
    id: 'EURUSD-1',
    journal_type: 'backtest',
    status: 'closed',
    symbol: 'EURUSD',
    side: 'long',
    timeframe: '1m',
    setup: 'Khan Setup 5',
    opened_at: '2023-12-19T16:00:00',
    closed_at: '2023-12-19T16:20:00',
    entry_price: 1.1,
    stop_loss: 1.099,
    take_profit: 1.102,
    exit_price: 1.102,
    planned_rr: 2,
    rr: 2,
    result: 'win',
    account_name: 'بک‌تست سه‌ساله',
    account_type: 'backtest',
    account_currency: 'USD',
    account_balance_before: 10000,
    account_balance_after: 10060,
    risk_pct: 0.3,
    risk_amount: 30,
    pnl_amount: 60,
    pnl_pct: 0.6,
    position_size: 0.3,
    position_unit: 'lot',
    khan_setup: 'setup-5',
    khan_rule_version: 'presentation-58p-v1',
    khan_result_page: 48,
    khan_source_pages: [1, 41, 42, 44, 48],
    khan_source_exact: true,
    khan_decision_path: [
      { page: 1, answerId: 'daily-level', answerLabel: 'در حال شکستن سقف و کف روزانه' },
      { page: 41, answerId: 'previous-day-high', answerLabel: 'در حال شکستن سقف روز قبل' },
    ],
  };

  const report = buildPersianTradeReport(trade);
  assert.match(report, /گزارش خودکار فارسی معامله/);
  assert.match(report, /ستاپ تشخیص‌داده‌شده: ستاپ 5 خان/);
  assert.match(report, /مسیر صفحات منبع: 1 ← 41 ← 42 ← 44 ← 48/);
  assert.match(report, /وضعیت تطابق: مسیر تصمیم با لینک‌های داخلی خود فایل Presentation تطبیق و قفل شده است/);
  assert.match(report, /نام حساب: بک‌تست سه‌ساله/);
  assert.match(report, /ریسک واقعی ثبت‌شده/);
  assert.match(report, /R واقعی: 2R/);
  assert.doesNotMatch(report, /khan_setup:/);
  assert.doesNotMatch(report, /risk_rule_recommended_pct:/);
});

void test('generated report is replaced instead of being duplicated during edit/save', () => {
  const old = `یادداشت شخصی من\n\n${PERSIAN_REPORT_START}\nگزارش قدیمی\n──────── پایان گزارش خودکار ────────`;
  assert.equal(stripGeneratedPersianReport(old), 'یادداشت شخصی من');
});
