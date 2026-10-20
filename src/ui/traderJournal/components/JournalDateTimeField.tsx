import { useEffect, useMemo, useState } from 'react';
import {
	combineDateTimeInput,
	getCurrentDateTimeLocalInput,
	getCurrentTimeInput,
	getDateTimeDatePart,
	getDateTimeTimePart,
	getTodayDateInput,
	getYesterdayDateInput,
	normalizeDateInput,
	normalizeTimeInput,
} from '../dateTime';

interface Props {
	label: string;
	value: string;
	onChange: (value: string) => void;
	required?: boolean;
	disabled?: boolean;
	allowEmpty?: boolean;
	hint?: string;
	quickMode?: 'opened' | 'closed';
}

export function JournalDateTimeField({
	label,
	value,
	onChange,
	required = false,
	disabled = false,
	allowEmpty = true,
	hint,
	quickMode = 'opened',
}: Props) {
	const [dateText, setDateText] = useState(() => getDateTimeDatePart(value));
	const [timeText, setTimeText] = useState(() => getDateTimeTimePart(value));
	const normalizedDate = useMemo(() => normalizeDateInput(dateText), [dateText]);
	const normalizedTime = useMemo(() => normalizeTimeInput(timeText), [timeText]);
	const dateInvalid = Boolean(dateText.trim()) && !normalizedDate;
	const timeInvalid = Boolean(timeText.trim()) && !normalizedTime;

	useEffect(() => {
		setDateText(getDateTimeDatePart(value));
		setTimeText(getDateTimeTimePart(value));
	}, [value]);

	function commit(nextDate: string, nextTime: string) {
		const next = combineDateTimeInput(nextDate, nextTime);
		if (next) onChange(next);
		else if (allowEmpty && !nextDate.trim() && !nextTime.trim()) onChange('');
	}

	function applyNow() {
		const now = getCurrentDateTimeLocalInput();
		setDateText(getDateTimeDatePart(now));
		setTimeText(getDateTimeTimePart(now));
		onChange(now);
	}

	function applyToday() {
		const date = getTodayDateInput();
		const time = normalizedTime || getCurrentTimeInput();
		setDateText(date);
		setTimeText(time);
		commit(date, time);
	}

	function applyYesterday() {
		const date = getYesterdayDateInput();
		const time = normalizedTime || getCurrentTimeInput();
		setDateText(date);
		setTimeText(time);
		commit(date, time);
	}

	function clear() {
		setDateText('');
		setTimeText('');
		onChange('');
	}

	return (
		<div className="trader-journal-field journal-v3-datetime">
			<span>{label}{required ? ' *' : ''}</span>
			<div className="journal-v3-datetime__inputs">
				<input
					type="text"
					inputMode="numeric"
					autoComplete="off"
					value={dateText}
					disabled={disabled}
					placeholder="YYYY-MM-DD یا 12/20/2026"
					aria-invalid={dateInvalid}
					onChange={(event) => {
						const nextDate = event.target.value;
						setDateText(nextDate);
						commit(nextDate, timeText);
					}}
					onBlur={() => {
						if (!normalizedDate) return;
						setDateText(normalizedDate);
						commit(normalizedDate, timeText);
					}}
				/>
				<input
					type="text"
					inputMode="numeric"
					autoComplete="off"
					value={timeText}
					disabled={disabled}
					placeholder="HH:mm"
					aria-invalid={timeInvalid}
					onChange={(event) => {
						const nextTime = event.target.value;
						setTimeText(nextTime);
						commit(dateText, nextTime);
					}}
					onBlur={() => {
						if (!normalizedTime) return;
						setTimeText(normalizedTime);
						commit(dateText, normalizedTime);
					}}
				/>
			</div>
			<div className="journal-v3-datetime__quick-actions">
				<button type="button" onClick={applyNow} disabled={disabled}>الان</button>
				<button type="button" onClick={applyToday} disabled={disabled}>امروز</button>
				{quickMode === 'opened' ? <button type="button" onClick={applyYesterday} disabled={disabled}>دیروز</button> : null}
				{allowEmpty ? <button type="button" onClick={clear} disabled={disabled}>پاک کردن</button> : null}
			</div>
			{dateInvalid ? <small className="journal-v3-field-error">تاریخ معتبر نیست. نمونه: 2026-10-20 یا 10/20/2026</small> : null}
			{timeInvalid ? <small className="journal-v3-field-error">زمان معتبر نیست. نمونه: 14:30</small> : null}
			{!dateInvalid && !timeInvalid && hint ? <small>{hint}</small> : null}
		</div>
	);
}
