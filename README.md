# Trader Journal — نسخه فارسی با Wizard خان

Trader Journal یک افزونه local-first برای Obsidian است که ژورنال معاملاتی، پلن، بک‌تست، Review، آمار و تقویم را با یک **Wizard تصمیم‌گیری فارسی برای Setupهای خان** یکپارچه می‌کند.

> اصل طراحی این Fork: **پیچیدگی در موتور، سادگی در صفحه.**

## قابلیت‌های اصلی

- رابط فارسی و راست‌چین (RTL).
- حفظ نمایش LTR برای Symbol، قیمت، تاریخ، عدد و داده‌های فنی.
- Wizard مرحله‌ای برای شش Setup خان.
- انتقال مستقیم نتیجه Wizard به فرم معامله Live یا Backtest.
- ذخیره Metadata ساختاریافته برای تحلیل آماری و بک‌تست.
- ثبت Setup، Plan، Live trade و Backtest trade داخل Vault.
- داشبورد آماری، Review و تقویم معاملات.
- ثبت تصاویر در Vault و مدیریت Attachmentها.
- تقویم اقتصادی اختیاری.
- Build، Lint، Test، Manifest validation و Persian coverage در CI.

## مدل داده

ساختار کلی داده‌ها:

```text
Khan Wizard → Setup → Plan → Live trade
                    └──────→ Backtest trade
```

معامله‌ای که از Wizard ساخته می‌شود می‌تواند علاوه بر داده‌های استاندارد ژورنال این فیلدها را نگه دارد:

```text
khan_setup
khan_risk_pct
khan_rule_version
khan_result_page
khan_source_pages
khan_decision_path
```

این اطلاعات برای مقایسه Setupها، تحلیل ریسک، بررسی مسیر تصمیم و توسعه تدریجی منطق ماشینی مناسب هستند.

## نصب سریع

به صفحه **Releases** همین مخزن بروید و آخرین فایل زیر را دریافت کنید:

```text
trader-journal-<version>.zip
```

سپس پوشه `trader-journal` داخل ZIP را در این مسیر قرار دهید:

```text
<Vault>/.obsidian/plugins/
```

ساختار نهایی باید چنین باشد:

```text
<Vault>/.obsidian/plugins/trader-journal/manifest.json
<Vault>/.obsidian/plugins/trader-journal/main.js
<Vault>/.obsidian/plugins/trader-journal/styles.css
```

بعد Obsidian را Reload کنید و از **Settings → Community plugins** افزونه **Trader Journal** را فعال کنید.

راهنمای کامل نصب: [`docs/INSTALL-FA.md`](docs/INSTALL-FA.md)

## شروع کار با Wizard خان

پس از فعال‌سازی افزونه یکی از این روش‌ها را استفاده کنید:

- آیکن Wizard خان در Ribbon؛ یا
- Command Palette و جست‌وجوی `Trader Journal`.

Wizard سؤال‌ها را مرحله‌به‌مرحله نمایش می‌دهد و بر اساس پاسخ‌ها مسیر تصمیم را جلو می‌برد. در شاخه‌هایی که منبع مقدار ریسک مشخص کرده، ریسک پیشنهادی نیز ثبت می‌شود. در پایان می‌توانید نتیجه را مستقیماً به فرم Live یا Backtest منتقل کنید.

## درباره خودکارسازی قواعد خان

این Fork فقط قواعدی را به شکل قطعی ماشینی می‌کند که در منبع به‌صورت مسیر تصمیم مشخص شده‌اند. مفاهیمی مانند POI، SCOB، IDM، CHOCH، Decisional و Extreme تا زمانی که تعریف عددی یکتای OHLC نداشته باشند از کاربر پرسیده می‌شوند و افزونه آن‌ها را حدس نمی‌زند.

این محدودیت عمدی است تا برداشت شخصی به‌اشتباه به‌عنوان قانون قطعی وارد سیستم نشود.

## جریان پیشنهادی استفاده

1. Wizard خان را باز کنید.
2. پاسخ‌های ساختاریافته را وارد کنید.
3. Setup و Risk پیشنهادی را بررسی کنید.
4. معامله را به Live یا Backtest منتقل کنید.
5. قیمت‌ها، زمان‌ها و تصاویر را تکمیل و ذخیره کنید.
6. بعد از بسته‌شدن معامله Review را ثبت کنید.
7. نتایج را در Dashboard و Calendar تحلیل کنید.

## ذخیره‌سازی

داده‌های اصلی داخل Vault می‌مانند. نمونه ساختار:

```text
Trading/
  _setups/
  Backtests/
  Live/
    _plans/
```

Tradeها در بلوک‌های JSON ساختاریافته ذخیره می‌شوند و summary/statistics از روی همان داده‌ها بازسازی می‌شوند.

## حریم خصوصی و شبکه

Trader Journal به‌صورت پیش‌فرض local-first است و Analytics یا Telemetry جمع‌آوری نمی‌کند.

- تصاویر Paste شده داخل Vault ذخیره می‌شوند.
- Remote image preview به‌صورت پیش‌فرض غیرفعال است.
- Economic calendar به‌صورت پیش‌فرض غیرفعال است.
- در صورت فعال‌کردن تقویم اقتصادی، افزونه داده هفتگی را از منبع تعریف‌شده در کد دریافت می‌کند؛ محتوای Vault برای آن ارسال نمی‌شود.

## تنظیمات

از **Settings → Trader Journal** می‌توانید مواردی مانند این‌ها را کنترل کنید:

- زبان رابط (فارسی / English / Vietnamese)
- پوشه Live و Backtest
- پوشه Plan و Setup
- Symbolها و Timeframeها
- نوع نمایش Calendar
- Remote images
- Image preview modal
- Economic calendar، Time zone، Country/Currency و Impact

فارسی در این Fork زبان پیش‌فرض است.

## توسعه و تست

نیازمندی‌ها:

- Node.js 18 یا جدیدتر
- npm

دستورات اصلی:

```bash
npm ci
npm run validate
npm run build
npm run lint
npm test
python scripts/check-persian-coverage.py
```

ورودی اصلی افزونه `src/main.ts` است و Bundle تولیدی `main.js` خواهد بود.

## انتشار

Workflow انتشار پس از تغییر نسخه در `manifest.json` همه کنترل‌های Build/Test را اجرا می‌کند و در صورت موفقیت این فایل‌ها را منتشر می‌کند:

- `main.js`
- `manifest.json`
- `styles.css`
- `trader-journal-<version>.zip`

Tag نسخه باید دقیقاً با Version داخل `manifest.json` برابر باشد و `v` نداشته باشد.

## اعتبار و مجوز

این مخزن Fork پروژه Trader Journal است و مجوز اصلی مخزن حفظ شده است. بخش فارسی، RTL و Khan workflow در همین Fork توسعه یافته‌اند. برای جزئیات مجوز به فایل [`LICENSE`](LICENSE) مراجعه کنید.
