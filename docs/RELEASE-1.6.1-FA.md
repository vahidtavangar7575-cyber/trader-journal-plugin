# Trader Journal 1.6.1 — بسته نهایی نصب و مستندات فارسی

این نسخه مرحله نهایی آماده‌سازی Fork فارسی برای استفاده روزمره است و روی قابلیت‌های نسخه 1.6.0 بنا شده است.

## تغییرات

- افزودن فایل ZIP آماده نصب برای هر Release با نام `trader-journal-1.6.1.zip`.
- ZIP شامل پوشه صحیح `trader-journal` و فایل‌های `main.js`، `manifest.json` و `styles.css` است.
- افزودن راهنمای نصب و ارتقای فارسی در `docs/INSTALL-FA.md`.
- بازنویسی README به شکل Persian-first و هماهنگ با Wizard خان و قابلیت‌های فعلی Fork.
- اضافه‌شدن فایل ZIP به Build provenance attestation در GitHub Actions.
- همگام‌سازی نسخه Manifest، Package و `versions.json` روی 1.6.1.

## قابلیت‌های محصول

نسخه 1.6.1 همان موتور کامل 1.6.0 را حفظ می‌کند:

- فارسی/RTL
- Wizard تصمیم‌گیری Setupهای Khan 1 تا 6
- ثبت مسیر تصمیم و Risk پیشنهادی
- انتقال نتیجه Wizard به Live/Backtest
- ذخیره Metadata ساختاریافته Khan
- Dashboard، Calendar، Plan، Setup و Review
- تست خودکار قواعد Wizard و پوشش ترجمه فارسی

## نصب

از بخش Releases فایل `trader-journal-1.6.1.zip` را دریافت کنید، Extract کنید و پوشه `trader-journal` را در مسیر `.obsidian/plugins/` داخل Vault قرار دهید. سپس Obsidian را Reload کرده و افزونه را از Community plugins فعال کنید.

## اعتبارسنجی انتشار

Release تنها پس از موفقیت این کنترل‌ها ساخته می‌شود:

- Manifest validation
- TypeScript production build
- Bundle validation
- ESLint
- Automated tests
- Persian translation coverage

