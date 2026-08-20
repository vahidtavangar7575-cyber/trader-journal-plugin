export interface CalendarDateCell {
	date: string;
	dayNumber: number;
	inMonth: boolean;
}

export function getCalendarDates(monthKey: string): CalendarDateCell[] {
	const { year, month } = parseMonthKey(monthKey);
	const monthStart = new Date(year, month, 1);
	const startOffset = (monthStart.getDay() + 6) % 7;
	const startDate = new Date(year, month, 1 - startOffset);
	const dates: CalendarDateCell[] = [];

	for (let index = 0; index < 42; index += 1) {
		const date = new Date(startDate);
		date.setDate(startDate.getDate() + index);
		dates.push({
			date: formatDateKey(date),
			dayNumber: date.getDate(),
			inMonth: date.getMonth() === month,
		});
	}

	return dates;
}

export function getMonthDates(monthKey: string): CalendarDateCell[] {
	const { year, month } = parseMonthKey(monthKey);
	const monthStart = new Date(year, month, 1);
	const nextMonthStart = new Date(year, month + 1, 1);
	const dates: CalendarDateCell[] = [];

	for (let date = new Date(monthStart); date < nextMonthStart; date.setDate(date.getDate() + 1)) {
		dates.push({
			date: formatDateKey(date),
			dayNumber: date.getDate(),
			inMonth: true,
		});
	}

	return dates;
}

export function moveSelectedDateToMonth(selectedDate: string, targetMonth: string): string {
	const selected = parseDateKey(selectedDate);
	const { year, month } = parseMonthKey(targetMonth);
	const requestedDay = selected?.getDate() ?? 1;
	const lastDay = new Date(year, month + 1, 0).getDate();
	return formatDateKey(new Date(year, month, Math.min(requestedDay, lastDay)));
}

export function addMonths(monthKey: string, offset: number): string {
	const { year, month } = parseMonthKey(monthKey);
	return formatMonthKey(new Date(year, month + offset, 1));
}

export function getMonthKey(dateKey: string): string {
	return dateKey.slice(0, 7);
}

export function parseMonthKey(monthKey: string): { year: number; month: number } {
	const match = /^(\d{4})-(\d{2})$/.exec(monthKey);
	if (!match) {
		const now = new Date();
		return { year: now.getFullYear(), month: now.getMonth() };
	}

	const year = Number(match[1]);
	const month = Number(match[2]) - 1;
	if (month < 0 || month > 11) {
		const now = new Date();
		return { year: now.getFullYear(), month: now.getMonth() };
	}

	return { year, month };
}

export function formatDateKey(date: Date): string {
	return `${date.getFullYear()}-${padDatePart(date.getMonth() + 1)}-${padDatePart(date.getDate())}`;
}

export function parseDateKey(dateKey: string): Date | null {
	const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateKey);
	if (!match) {
		return null;
	}

	const year = Number(match[1]);
	const month = Number(match[2]);
	const day = Number(match[3]);
	const date = new Date(year, month - 1, day);
	if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) {
		return null;
	}

	return date;
}

export function formatMonthLabel(monthKey: string, locale: string | undefined): string {
	const { year, month } = parseMonthKey(monthKey);
	const monthLabel = new Date(year, month, 1).toLocaleString(locale, {
		month: 'long',
		year: 'numeric',
	});
	return capitalizeFirstLetter(monthLabel, locale);
}

export function getNextMinuteDelay(now = new Date()): number {
	const nextMinute = new Date(now);
	nextMinute.setSeconds(60, 0);
	return Math.max(nextMinute.getTime() - now.getTime(), 1000);
}

function formatMonthKey(date: Date): string {
	return `${date.getFullYear()}-${padDatePart(date.getMonth() + 1)}`;
}

function capitalizeFirstLetter(value: string, locale: string | undefined): string {
	const firstLetter = value.slice(0, 1);
	return firstLetter ? `${firstLetter.toLocaleUpperCase(locale)}${value.slice(1)}` : value;
}

function padDatePart(value: number): string {
	return String(value).padStart(2, '0');
}
