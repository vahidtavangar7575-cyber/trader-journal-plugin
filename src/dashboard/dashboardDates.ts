export function isValidDateKey(value: unknown): value is string {
	if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
		return false;
	}

	const [yearText, monthText, dayText] = value.split('-');
	const year = Number(yearText);
	const month = Number(monthText);
	const day = Number(dayText);
	const date = new Date(`${value}T00:00:00Z`);

	return !Number.isNaN(date.getTime())
		&& date.getUTCFullYear() === year
		&& date.getUTCMonth() + 1 === month
		&& date.getUTCDate() === day;
}

export function formatLocalDateKey(date: Date): string {
	const year = date.getFullYear();
	const month = String(date.getMonth() + 1).padStart(2, '0');
	const day = String(date.getDate()).padStart(2, '0');
	return `${year}-${month}-${day}`;
}
