import { useEffect, useState } from 'react';
import type TraderJournalPlugin from '../../../main';
import type { JournalDataSnapshot } from '../../../journal/JournalDataService';

export function useCalendarData(plugin: TraderJournalPlugin): JournalDataSnapshot {
	const [snapshot, setSnapshot] = useState<JournalDataSnapshot>(() =>
		plugin.journalDataService.getSnapshot(),
	);

	useEffect(() => plugin.journalDataService.subscribe(setSnapshot), [plugin]);
	return snapshot;
}
