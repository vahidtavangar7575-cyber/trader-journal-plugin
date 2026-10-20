import { stringifyValue } from '../../trades/format';

const DATE_KEY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const TIME_PATTERN = /^([01]?\d|2[0-3]):([0-5]\d)$/;

export function syncClosedAtDate(openedAt: string, previousOpenedAt: string, closedAt: string): string {
	const openedDate = getDateTimeDatePart(openedAt);
	const openedTime = getDateTimeTimePart(openedAt);
	if (!openedDate || !openedTime) return closedAt;

	const previousOpenedDate = getDateTimeDatePart(previousOpenedAt);
	const closedDate = getDateTimeDatePart(closedAt);
	const closedTime = getDateTimeTimePart(closedAt);
	const hasManualDifferentClosedDate = Boolean(previousOpenedDate && closedDate && closedDate !== previousOpenedDate);
	if (hasManualDifferentClosedDate) return closedAt;

	return `${openedDate}T${closedTime || openedTime}`;
}

export function getDateTimeDatePart(value: string): string {
	const date = value.split('T', 1)[0] ?? '';
	return DATE_KEY_PATTERN.test(date) ? date : '';
}

export function getDateTimeTimePart(value: string): string {
	const timeSeparatorIndex = value.indexOf('T');
	if (timeSeparatorIndex === -1) return '';
	const time = value.slice(timeSeparatorIndex + 1, timeSeparatorIndex + 6);
	return TIME_PATTERN.test(time) ? normalizeTimeInput(time) : '';
}

export function getTodayDateInput(date = new Date()): string {
	return `${date.getFullYear()}-${padDatePart(date.getMonth() + 1)}-${padDatePart(date.getDate())}`;
}

export function getYesterdayDateInput(date = new Date()): string {
	const yesterday = new Date(date);
	yesterday.setDate(yesterday.getDate() - 1);
	return getTodayDateInput(yesterday);
}

export function getCurrentTimeInput(date = new Date()): string {
	return `${padDatePart(date.getHours())}:${padDatePart(date.getMinutes())}`;
}

export function getCurrentDateTimeLocalInput(date = new Date()): string {
	return `${getTodayDateInput(date)}T${getCurrentTimeInput(date)}`;
}

/**
 * Accepts ISO dates as well as the common MM/DD/YYYY form shown by some Windows locales.
 * Returns YYYY-MM-DD only when the calendar date is actually valid.
 */
export function normalizeDateInput(value: string): string {
	const raw = toEnglishDigits(value).trim().replace(/\s+/g, '');
	if (!raw) return '';

	const isoMatch = /^(\d{4})[-\/.](\d{1,2})[-\/.](\d{1,2})$/.exec(raw);
	if (isoMatch) {
		const year = Number(isoMatch[1] ?? '');
		const month = Number(isoMatch[2] ?? '');
		const day = Number(isoMatch[3] ?? '');
		return formatValidatedDate(year, month, day);
	}

	const usMatch = /^(\d{1,2})[-\/.](\d{1,2})[-\/.](\d{4})$/.exec(raw);
	if (!usMatch) return '';
	const month = Number(usMatch[1] ?? '');
	const day = Number(usMatch[2] ?? '');
	const year = Number(usMatch[3] ?? '');
	return formatValidatedDate(year, month, day);
}

export function normalizeTimeInput(value: string): string {
	const raw = toEnglishDigits(value).trim().replace('.', ':');
	const compact = /^(\d{1,2})(\d{2})$/.exec(raw);
	const candidate = compact ? `${compact[1] ?? ''}:${compact[2] ?? ''}` : raw;
	const match = /^([01]?\d|2[0-3]):([0-5]\d)$/.exec(candidate);
	if (!match) return '';
	const hour = Number(match[1] ?? '');
	const minute = match[2] ?? '';
	return `${padDatePart(hour)}:${minute}`;
}

export function combineDateTimeInput(dateValue: string, timeValue: string): string {
	const date = normalizeDateInput(dateValue);
	const time = normalizeTimeInput(timeValue);
	return date && time ? `${date}T${time}` : '';
}

export function toDateTimeLocalInput(value: unknown): string {
	const raw = stringifyValue(value);
	if (!raw) return '';

	const directDate = getDateTimeDatePart(raw);
	const directTime = getDateTimeTimePart(raw);
	if (directDate && directTime) return `${directDate}T${directTime}`;

	const date = new Date(raw);
	return Number.isNaN(date.getTime()) ? '' : formatDateTimeLocalInput(date);
}

export function toLocalIsoString(value: string): string {
	const datePart = getDateTimeDatePart(value);
	const timePart = getDateTimeTimePart(value);
	if (datePart && timePart) {
		const date = new Date(`${datePart}T${timePart}:00`);
		return Number.isNaN(date.getTime()) ? '' : formatLocalIsoString(date);
	}
	const date = new Date(value);
	if (Number.isNaN(date.getTime())) return '';
	return formatLocalIsoString(date);
}

export function getCurrentLocalIsoString(): string {
	return formatLocalIsoString(new Date());
}

function formatDateTimeLocalInput(date: Date): string {
	return `${getTodayDateInput(date)}T${getCurrentTimeInput(date)}`;
}

function formatLocalIsoString(date: Date): string {
	const offsetMinutes = -date.getTimezoneOffset();
	const sign = offsetMinutes >= 0 ? '+' : '-';
	const absoluteOffsetMinutes = Math.abs(offsetMinutes);
	const offsetHours = Math.floor(absoluteOffsetMinutes / 60);
	const offsetRemainderMinutes = absoluteOffsetMinutes % 60;

	return [
		`${date.getFullYear()}-${padDatePart(date.getMonth() + 1)}-${padDatePart(date.getDate())}`,
		`T${padDatePart(date.getHours())}:${padDatePart(date.getMinutes())}:${padDatePart(date.getSeconds())}`,
		`${sign}${padDatePart(offsetHours)}:${padDatePart(offsetRemainderMinutes)}`,
	].join('');
}

function formatValidatedDate(year: number, month: number, day: number): string {
	if (!isValidCalendarDate(year, month, day)) return '';
	return `${String(year).padStart(4, '0')}-${padDatePart(month)}-${padDatePart(day)}`;
}

function isValidCalendarDate(year: number, month: number, day: number): boolean {
	if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) return false;
	if (year < 1970 || year > 2100 || month < 1 || month > 12 || day < 1 || day > 31) return false;
	const date = new Date(year, month - 1, day);
	return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day;
}

function toEnglishDigits(value: string): string {
	const persian = '۰۱۲۳۴۵۶۷۸۹';
	const arabic = '٠١٢٣٤٥٦٧٨٩';
	return value
		.replace(/[۰-۹]/g, (digit) => String(persian.indexOf(digit)))
		.replace(/[٠-٩]/g, (digit) => String(arabic.indexOf(digit)));
}

function padDatePart(value: number): string {
	return String(value).padStart(2, '0');
}
