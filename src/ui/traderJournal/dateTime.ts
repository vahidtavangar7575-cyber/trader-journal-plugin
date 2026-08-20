import { stringifyValue } from '../../trades/format';

const DATE_KEY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export function syncClosedAtDate(openedAt: string, previousOpenedAt: string, closedAt: string): string {
	const openedDate = getDateTimeDatePart(openedAt);
	const openedTime = getDateTimeTimePart(openedAt);
	if (!openedDate || !openedTime) {
		return closedAt;
	}

	const previousOpenedDate = getDateTimeDatePart(previousOpenedAt);
	const closedDate = getDateTimeDatePart(closedAt);
	const closedTime = getDateTimeTimePart(closedAt);
	const hasManualDifferentClosedDate = Boolean(previousOpenedDate && closedDate && closedDate !== previousOpenedDate);
	if (hasManualDifferentClosedDate) {
		return closedAt;
	}

	return `${openedDate}T${closedTime || openedTime}`;
}

export function getDateTimeDatePart(value: string): string {
	const [date] = value.split('T');
	return date && DATE_KEY_PATTERN.test(date) ? date : '';
}

export function getTodayDateInput(): string {
	const now = new Date();
	return `${now.getFullYear()}-${padDatePart(now.getMonth() + 1)}-${padDatePart(now.getDate())}`;
}

export function toDateTimeLocalInput(value: unknown): string {
	const raw = stringifyValue(value);
	if (!raw) {
		return '';
	}

	const date = new Date(raw);
	return Number.isNaN(date.getTime()) ? '' : formatDateTimeLocalInput(date);
}

export function toLocalIsoString(value: string): string {
	const date = new Date(value);
	if (Number.isNaN(date.getTime())) {
		return '';
	}

	return formatLocalIsoString(date);
}

export function getCurrentLocalIsoString(): string {
	return formatLocalIsoString(new Date());
}

function getDateTimeTimePart(value: string): string {
	const timeSeparatorIndex = value.indexOf('T');
	return timeSeparatorIndex === -1 ? '' : value.slice(timeSeparatorIndex + 1);
}

function formatDateTimeLocalInput(date: Date): string {
	return [
		`${date.getFullYear()}-${padDatePart(date.getMonth() + 1)}-${padDatePart(date.getDate())}`,
		`T${padDatePart(date.getHours())}:${padDatePart(date.getMinutes())}`,
	].join('');
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

function padDatePart(value: number): string {
	return String(value).padStart(2, '0');
}
