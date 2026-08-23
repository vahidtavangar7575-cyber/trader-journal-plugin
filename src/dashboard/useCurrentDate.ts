import { useEffect, useState } from 'react';

export function useCurrentDate(): Date {
	const [currentDate, setCurrentDate] = useState(() => new Date());

	useEffect(() => {
		let timer: number | undefined;
		const scheduleNextDay = () => {
			const now = new Date();
			const nextDay = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
			timer = window.setTimeout(() => {
				setCurrentDate(new Date());
				scheduleNextDay();
			}, Math.max(1_000, nextDay.getTime() - now.getTime() + 1_000));
		};

		scheduleNextDay();
		return () => {
			if (timer !== undefined) {
				window.clearTimeout(timer);
			}
		};
	}, []);

	return currentDate;
}
