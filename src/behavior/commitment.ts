export const DAILY_TRADING_COMMITMENT = `من امروز برای پیش‌بینی بازار اینجا نیستم؛ برای اجرای دقیق فرایندم اینجا هستم. هیچ معامله‌ای حق ندارد مرا وادار کند از ساختار، نقدینگی، POI، تأیید ورود، حد ضرر و ریسک تعیین‌شده عبور کنم. فرصت‌ها تمام نمی‌شوند؛ اگر شکار هنوز در تله من نیست، تیر نمی‌زنم و اگر شرایط از دست رفت، دنبال آن نمی‌دوم. برد بعدی به من بدهکار نیست و باخت قبلی را پس نمی‌گیرم. هر معامله فقط یک نمونه از یک توزیع احتمالات است. من نتیجه را کنترل نمی‌کنم؛ کیفیت مشاهده، صبر، اندازه ریسک و اجرای پلن را کنترل می‌کنم. برد را بدون غرور ثبت می‌کنم، باخت را بدون انتقام مطالعه می‌کنم و بعد از هر معامله به حالت خنثی برمی‌گردم. امروز هدف من یک درصد یادگیری بیشتر، یک تصمیم آگاهانه‌تر و یک اجرای تمیزتر است. هدف بلندمدت من تبدیل شدن به یکی از منضبط‌ترین و بهترین معامله‌گران ایران است و این هدف را با اجرای درست همین معامله، نه با عجله برای سود، می‌سازم. من متعهد می‌شوم فقط وقتی وارد شوم که شرایط من کامل باشد، از حد ریسک خود عبور نکنم، استاپ را برای فرار از پذیرش زیان جابه‌جا نکنم و هیچ فرصت از دست‌رفته‌ای را تعقیب نکنم. امروز با آرامش، دقت و احترام به سرمایه‌ام معامله می‌کنم.`;

export const SHORT_TRADING_COMMITMENT = 'فرایند مهم‌تر از نتیجه است؛ فقط ستاپ کامل، ریسک مجاز و اجرای دقیق.';

const PERSIAN_CHAR_NORMALIZATION: Array<[RegExp, string]> = [
	[/ي|ى/g, 'ی'],
	[/ك/g, 'ک'],
	[/ۀ/g, 'ه'],
	[/ة/g, 'ه'],
	[/ؤ/g, 'و'],
	[/إ|أ/g, 'ا'],
];

export function normalizeCommitment(value: string): string {
	let normalized = value.normalize('NFKC');
	for (const [pattern, replacement] of PERSIAN_CHAR_NORMALIZATION) {
		normalized = normalized.replace(pattern, replacement);
	}
	return normalized
		.replace(/\u200C/g, ' ')
		.replace(/[\u200B\u200D-\u200F\u202A-\u202E\u2060\uFEFF]/g, '')
		.replace(/[؛;،,.!?؟:«»"'(){}…ـ]/g, ' ')
		.replaceAll('[', ' ')
		.replaceAll(']', ' ')
		.replace(/\s+/g, ' ')
		.trim();
}

export function getCommitmentMatchScore(value: string): number {
	const input = normalizeCommitment(value);
	const target = normalizeCommitment(DAILY_TRADING_COMMITMENT);
	if (!input) return 0;
	if (input === target) return 100;

	const inputTokens = input.split(' ');
	const targetTokens = target.split(' ');
	const maxTokens = Math.max(inputTokens.length, targetTokens.length);
	let matchingTokens = 0;
	for (let index = 0; index < Math.min(inputTokens.length, targetTokens.length); index += 1) {
		if (inputTokens[index] === targetTokens[index]) matchingTokens += 1;
	}
	const tokenScore = maxTokens > 0 ? matchingTokens / maxTokens : 0;
	const lengthScore = Math.min(input.length, target.length) / Math.max(input.length, target.length);
	return Math.round((tokenScore * 0.8 + lengthScore * 0.2) * 100);
}

export function isCommitmentComplete(value: string): boolean {
	const input = normalizeCommitment(value);
	const target = normalizeCommitment(DAILY_TRADING_COMMITMENT);
	if (input === target) return true;
	const lengthRatio = input.length / target.length;
	return lengthRatio >= 0.85 && getCommitmentMatchScore(value) >= 96;
}

export function canManuallyConfirmCommitment(value: string): boolean {
	const inputLength = normalizeCommitment(value).length;
	const targetLength = normalizeCommitment(DAILY_TRADING_COMMITMENT).length;
	return inputLength >= Math.max(120, targetLength * 0.55);
}
