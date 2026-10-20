export const DAILY_TRADING_COMMITMENT = `من امروز برای پیش‌بینی بازار اینجا نیستم؛ برای اجرای دقیق، آگاهانه و عاشقانه فرایندم اینجا هستم. هیچ معامله‌ای حق ندارد مرا وادار کند از ساختار، نقدینگی، POI، تأیید ورود، حد ضرر، حجم و ریسک تعیین‌شده عبور کنم. فرصت‌های بازار تمام نمی‌شوند؛ اگر شکار هنوز در تله من نیست، تیر نمی‌زنم و با تیر خطا آن را فراری نمی‌دهم. اگر فرصت از دست رفت، آن را تعقیب نمی‌کنم؛ بازار دوباره فرصت خواهد ساخت. برد بعدی به من بدهکار نیست و باخت قبلی را پس نمی‌گیرم. هر معامله فقط یک نمونه از یک توزیع احتمالات است و ارزش من با نتیجه یک معامله تعریف نمی‌شود. من نتیجه را کنترل نمی‌کنم؛ کیفیت مشاهده، صبر، اندازه ریسک، انتخاب موقعیت و اجرای پلن را کنترل می‌کنم. برد مرا مغرور و عجول نمی‌کند و باخت مرا غمگین، انتقام‌جو یا بی‌انضباط نمی‌کند. برد را بدون غرور ثبت می‌کنم، باخت را بدون انتقام مطالعه می‌کنم و بعد از هر معامله به حالت خنثی برمی‌گردم. همین که آگاهانه پای چارت نشسته‌ام و یک تصمیم درست‌تر می‌گیرم، یک قدم قوی‌تر در مسیر موفقیت برداشته‌ام. امروز لازم نیست بازار را شکست بدهم؛ فقط باید یک درصد بیشتر از دیروز از چارت یاد بگیرم و یک درصد بهتر از دیروز اجرا کنم. من متعهد می‌شوم فقط وقتی وارد شوم که شرایط من کامل باشد، از حد ریسک خود عبور نکنم، استاپ را برای فرار از پذیرش زیان جابه‌جا نکنم، حجم را از روی هیجان تغییر ندهم و هیچ فرصت از دست‌رفته‌ای را تعقیب نکنم. امروز یک روز سراسر آگاهانه، آرام و عاشقانه پای چارت می‌سازم. این کاری است که دوستش دارم و رسالت بلندمدت من تبدیل شدن به بهترین تریدر تاریخ ایران از مسیر دانش، انضباط، تکرار و احترام به سرمایه است. امروز فقط معامله خوب را شکار می‌کنم و اگر معامله خوب وجود نداشت، معامله نکردن را نیز یک اجرای حرفه‌ای می‌دانم.`;

export const SHORT_TRADING_COMMITMENT = 'فرایند مهم‌تر از نتیجه است؛ فقط ستاپ کامل، ریسک مجاز و اجرای دقیق.';

/**
 * Commitment comparison is deliberately strict.
 * The only typographic difference we ignore is Persian half-space (ZWNJ),
 * which is treated exactly like a normal space. Letters, punctuation, spelling,
 * word order and ordinary spaces remain meaningful.
 */
export function normalizeCommitment(value: string): string {
	return value.normalize('NFC').replace(/\u200C/g, ' ');
}

export function getCommitmentMatchScore(value: string): number {
	const input = normalizeCommitment(value);
	const target = normalizeCommitment(DAILY_TRADING_COMMITMENT);
	if (!input) return 0;
	if (input === target) return 100;
	const distance = levenshteinDistance(input, target);
	const maximumLength = Math.max(input.length, target.length);
	if (maximumLength === 0) return 100;
	return Math.max(0, Math.round((1 - distance / maximumLength) * 100));
}

export function getCommitmentDifferenceCount(value: string): number {
	return levenshteinDistance(normalizeCommitment(value), normalizeCommitment(DAILY_TRADING_COMMITMENT));
}

export function isCommitmentComplete(value: string): boolean {
	return normalizeCommitment(value) === normalizeCommitment(DAILY_TRADING_COMMITMENT);
}

/** Kept for compatibility with older callers; manual bypass is intentionally disabled. */
export function canManuallyConfirmCommitment(value: string): boolean {
	return isCommitmentComplete(value);
}

function levenshteinDistance(left: string, right: string): number {
	if (left === right) return 0;
	if (!left.length) return right.length;
	if (!right.length) return left.length;

	let previous = Array.from({ length: right.length + 1 }, (_, index) => index);
	for (let leftIndex = 1; leftIndex <= left.length; leftIndex += 1) {
		const current = [leftIndex];
		for (let rightIndex = 1; rightIndex <= right.length; rightIndex += 1) {
			const cost = left[leftIndex - 1] === right[rightIndex - 1] ? 0 : 1;
			current[rightIndex] = Math.min(
				current[rightIndex - 1] + 1,
				previous[rightIndex] + 1,
				previous[rightIndex - 1] + cost,
			);
		}
		previous = current;
	}
	return previous[right.length];
}
