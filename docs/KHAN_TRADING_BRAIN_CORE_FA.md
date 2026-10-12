# هسته مرکزی روش خان — Khan Trading Brain Core

نسخه: 1.0

این سند مرجع مرکزی پروژه برای تبدیل آموزش‌های Trading Hub / Khan به Wizard، ژورنال و بک‌تست است. اصل معماری: **پیچیدگی در موتور، سادگی در صفحه**.

## سلسله‌مراتب منابع

1. `Presentation - Copy.pdf` — 58 صفحه: مرجع اصلی مسیر اجرایی Setup 1–6 و ریسک نوشته‌شده در پایان شاخه‌ها.
2. Trading Hub 3.0 / جزوه آموزشی: تعریف مفاهیم و Context.
3. 21 بخش یکتای دوره ویدئویی در پوشه «کلیه فایل‌های ضبط شده خان»؛ Transcriptها Auto-generated هستند و ممکن است واژه‌هایی مانند CHOCH/POI/Order Block را اشتباه شنیده باشند.
4. قواعد شخصی مدیریت سرمایه کاربر: منبع خان نیستند و باید جدا ذخیره شوند.

هر قانون یکی از وضعیت‌های `confirmed`، `source-execution-confirmed` یا `needs-review` دارد. هیچ Rule حساس فقط از یک Transcript نهایی نمی‌شود.

## نقشه دوره 21 بخشی

1. Impulse / Correction / Valid Pullback
2. IDM / HH HL LH LL / CHOCH / BOS — 1
3. IDM / HH HL LH LL / CHOCH / BOS — 2
4. Imbalance / FVG
5. Order Flow
6. Order Block
7. IFC Candle
8. Liquidity
9. SMT
10. PDH / PDL
11. Session Liquidity — 1
12. Session Liquidity — 2
13. CHOCH Entry Modules
14. Flip Entry — 1
15. Flip Entry — 2
16. Single Candle Mitigation
17. Single Candle Order Block
18. Internal Structure — 1
19. Internal Structure — 2
20. Hidden POI
21. POI Identification / OF / OB / SCOB

## قواعد پایه

### Pullback معتبر
- Bullish: حداقل Low کندل مرجع قبلی باید گرفته شود.
- Bearish: حداقل High کندل مرجع قبلی باید گرفته شود.
- رنگ کندل معیار اعتبار نیست.
- Inside move پولبک جدید نیست.
- Pullback پایه Structure Mapping، IDM و Entry است.

### Structure / IDM
- HH/HL یا LH/LL به‌تنهایی کافی نیست؛ رابطه Pullback و Inducement مهم است.
- BOS با Close و Shadow/Sweep باید جدا ثبت شوند.
- CHOCH باید در Context درست و با وضعیت IDM مشخص تفسیر شود.
- اگر IDM/ساختار قابل نشان‌دادن نیست، سیستم نباید با اطمینان مسیر ورود را جلو ببرد.

### Imbalance
Imbalance به‌تنهایی Setup نیست؛ باید با Structure، POI و Liquidity ترکیب شود.

### Order Flow / Order Block
- OF یکی از پایه‌های انتخاب POI است.
- OB Refinement است؛ هر OB یک POI پرقدرت نیست.
- Decisional و Extreme باید نسبت به Structure و OF مشخص شوند.

### Liquidity
Liquidity فقط Stop نیست. قبل از Entry باید محل نقدینگی، Sweep، IDM و در صورت ارتباط PDH/PDL یا Session High/Low روشن باشد.

### SCOB / SCM
Confirmation / Mitigation هستند؛ بدون Context ساختار/POI/نقدینگی Setup مستقل محسوب نمی‌شوند.

## قانون مرکزی Presentation

مسیر عادی نرم‌افزار از **صفحه 1** شروع می‌شود. سؤال منبع: «قیمت کجاست؟»

- Daily high/low break → Setup 5
- Shadow break → Setup 3
- BOS with candle close → Setup 4
- full IDM consumption → Setup 1
- BOS/CHOCH fast-entry context → Setup 6

«زمانی که کاربر پای چارت نشسته» Rule خان نیست و نباید Setup را تعیین کند.

## Setup 1 — صفحات 2–17

- برخورد به POI؟ خیر → منبع وارد Setup 2 می‌شود.
- اگر بله: Decisional یا Extreme.
- M1 refinement: آخرین Pullback/IDM/CHOCH و نواحی پایین‌تایم.
- انتظار برای مصرف IDM در جهت عکس.
- تعیین واکنش SCOB به Decisional/Extreme.
- Resultهای منبع: 0.1 / 0.2 / 0.5 و در شاخه‌ای 1 درصد.

## Setup 2 — صفحات 18–23

- تعیین روند.
- بررسی Shadow کندل، سطح قبلی و Fill شدن Imbalance.
- بسته به شاخه: کل کندل یا Shadow = HTF POI.
- M1 refinement → Decisional/Extreme.
- Result: 0.2 / 0.5 درصد.

## Setup 3 — صفحات 24–36

- M15 Shadow event.
- M1 آخرین Pullback/IDM به‌عنوان CHOCH/Flip.
- بررسی Body break و مصرف IDM معکوس.
- OB Decisional/Extreme و واکنش SCOB.
- روند M15 و محل Shadow break.
- Exception صفحه 32 فقط مخصوص همان شاخه است: شکست Shadow پولبک آخر می‌تواند بدون مصرف IDM جداگانه ادامه پیدا کند.
- Result: 0.2 / 0.5 / 1 درصد.

## Setup 4 — صفحات 37–40

- M1 اولین Pullback شروع حرکت = Fake CHOCH.
- صبر برای شکستن جدیدترین Pullback.
- IDM جدید = CHOCH.
- بررسی تأیید برگشت.
- مصرف IDM معکوس و واکنش OB Decisional/Extreme.
- Result: 0.1 / 0.2 درصد.

فایل Presentation از صفحه 37 یک لینک مشترک به صفحه 53 دارد. سیستم باید **لینک را حفظ کند اما Setup 4 را بی‌صدا به Setup 6 تغییر نام ندهد**؛ این یک shared execution branch است.

## Setup 5 — صفحات 41–50

- PDH یا PDL break.
- M15 آخرین Pullback به جای IDM به‌عنوان CHOCH.
- بعد از مصرف CHOCH منتظر SCOB.
- Decisional / Extreme.
- جهت کندل Daily وارد تصمیم می‌شود.
- Result: 0.1 / 0.2 / 0.5 درصد.

## Setup 6 — صفحات 51–58

- کل Pullback قبلی ماژور = POI.
- واکنش/نزدیکی به ناحیه یا حرکت بدون دیدن آن.
- صفحه 52: ناحیه = HTF IDM، انتقال به Pullbackهای بعدی، مصرف کامل آخرین Pullback و بررسی OF قبلی؛ سپس منبع صریحاً می‌گوید طبق Setup 1 ادامه بده.
- M1 OF refinement، آخرین IDM = CHOCH، سپس IDM جهت عکس.
- OFهای جهت عکس و واکنش نهایی SCOB.
- Result: 0.1 / 0.2 / 0.5 درصد.

## اگر وسط روند یا بعد از POI رسیدیم

این **Setup جدید نیست** و در Wizard نباید Router جدا داشته باشد.

1. از صفحه 1 شروع کن.
2. با نگاه به کندل‌های تشکیل‌شده، رویدادهای منبعی را که واقعاً رخ داده‌اند بازسازی کن.
3. مسیر Presentation را تا اولین شرطی جلو ببر که هنوز رخ نداده؛ همان نقطه انتظار فعلی است.
4. اگر Entry/SCOB منبع قبلاً فعال شده و قیمت ناحیه را ترک کرده، معامله Missed است؛ Chase ممنوع.
5. رویداد تازه → دوباره طبقه‌بندی از صفحه 1.

## UX الزامی

هر صفحه فقط:
- سؤال/دستور همان صفحه منبع
- «الان روی چارت چه کار کنم؟»
- پاسخ‌های بزرگ
- جزئیات Wait/Avoid در بخش بازشونده
- مرحله قبل / خانه / فعلاً ورود ندارم
- شماره صفحه منبع

هیچ مسیر اضافه نباید Presentation را از مرکز خارج کند.

## ثبت معامله

گزارش انسانی باید فارسی و خوانا باشد و حداقل شامل این موارد شود:
- حساب/نوع/کد/موجودی قبل و بعد
- نماد، جهت، تاریخ، سشن
- Setup، صفحات منبع و پاسخ‌ها
- HTF/LTF context
- Entry / SL / TP / Exit
- Risk source / Risk actual / Risk amount
- Position size
- Planned/Realized R
- PnL
- تصاویر M15 و M1
- روان‌شناسی، adherence، mistake، lesson و next action

کلیدهای انگلیسی فنی می‌توانند برای Machine schema باقی بمانند، اما نباید گزارش انسانی را شلوغ کنند.

## حساب‌ها

مفهوم «فعال‌سازی حساب» از UX حذف می‌شود. هر حساب ذخیره‌شده بلافاصله قابل انتخاب است. `enabled` فقط برای سازگاری داده‌های قدیمی باقی می‌ماند. آخرین حساب سازگار باید خودکار برگردد.

## قواعد شخصی مدیریت سرمایه — غیرخان

- حداکثر 4 معامله روزانه برای Demo/Prop/Competition/Live.
- معامله 1 و 2: پایه فعلی 0.3%.
- معامله 3: سود خالص دو معامله اول ÷ 4.
- معامله 4: 0.15%.
- دو باخت → پایان روز؛ ثبت داده همچنان مجاز با Warning.
- Backtest از محدودیت تعداد معاملات معاف.
- حداقل RR فعلی 2R؛ Target فعلی 2R و قابل تغییر.
- 1/4 سود مثبت روزهای قبلی همان هفته به پایه روز افزوده می‌شود.
- 1/16 سود مثبت هفته قبل به پایه هفته بعد اضافه می‌شود.

## ضدتحریف

1. بدون منبع روشن، Setup جدید با نام خان ساخته نمی‌شود.
2. خلاقیت در UX و توضیح مجاز است؛ جعل Rule مجاز نیست.
3. لینک عجیب Presentation نمایش/ثبت می‌شود، نه اینکه مخفیانه اصلاح شود.
4. تعارض Transcript/Presentation باید با برچسب Needs Review بماند.
5. Risk شخصی با Risk منبع مخلوط نمی‌شود.
6. Entry Module با Setup یکی نیست.
7. رسیدن به POI به‌تنهایی Entry نیست.
8. SCOB بدون Context Setup مستقل نیست.
9. Missed Trade با Chase به Setup تازه تبدیل نمی‌شود.
10. تمام تصمیم‌ها باید از گزارش و تصاویر قابل بازسازی باشند.

## وضعیت اطمینان

- Presentation Setup 1–6: source-execution-confirmed
- Valid Pullback: confirmed
- Structure/IDM core: confirmed conceptual
- BOS Close vs Shadow: confirmed
- CHOCH context: confirmed conceptual
- Imbalance role: confirmed conceptual
- OF/OB role: confirmed conceptual
- PDH/PDL: confirmed
- Session Liquidity: confirmed conceptual
- SCOB role: confirmed
- Internal Structure: confirmed conceptual
- Hidden POI exact algorithm: needs-review
- IFC exact algorithm: needs-review
- Semantic reason of every unusual PDF hyperlink: source link confirmed; educational reason may need review

**قانون نهایی محصول:** نرم‌افزار به جای خان ستاپ نمی‌سازد؛ منطق خان را آن‌قدر روشن و مرحله‌ای نمایش می‌دهد که اجرای درست آن نیازمند حفظ‌کردن کل دوره نباشد.