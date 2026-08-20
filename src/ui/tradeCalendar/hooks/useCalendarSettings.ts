import type { Events } from 'obsidian';
import { useEffect, useState } from 'react';
import type TraderJournalPlugin from '../../../main';
import {
	CALENDAR_DISPLAY_MODE_CHANGE_EVENT,
	ECONOMIC_CALENDAR_SETTINGS_CHANGE_EVENT,
	LANGUAGE_CHANGE_EVENT,
} from '../../../settings';
import type { CalendarDisplayMode, TraderJournalLanguage } from '../../../settings';

export interface CalendarSettingsState {
	calendarDisplayMode: CalendarDisplayMode;
	economicSettingsVersion: number;
	language: TraderJournalLanguage;
}

export function useCalendarSettings(plugin: TraderJournalPlugin): CalendarSettingsState {
	const [calendarDisplayMode, setCalendarDisplayMode] = useState(plugin.settings.calendarDisplayMode);
	const [economicSettingsVersion, setEconomicSettingsVersion] = useState(0);
	const [language, setLanguage] = useState(plugin.settings.language);

	useEffect(() => {
		const workspaceEvents = plugin.app.workspace as Events;
		const displayModeRef = workspaceEvents.on(CALENDAR_DISPLAY_MODE_CHANGE_EVENT, (nextMode: unknown) => {
			if (nextMode === 'month' || nextMode === 'horizontal_calendar') {
				setCalendarDisplayMode(nextMode);
			}
		});
		const languageRef = workspaceEvents.on(LANGUAGE_CHANGE_EVENT, (nextLanguage: unknown) => {
			if (nextLanguage === 'en' || nextLanguage === 'vi') {
				setLanguage(nextLanguage);
			}
		});
		const economicSettingsRef = workspaceEvents.on(ECONOMIC_CALENDAR_SETTINGS_CHANGE_EVENT, () => {
			setEconomicSettingsVersion((version) => version + 1);
		});

		return () => {
			workspaceEvents.offref(displayModeRef);
			workspaceEvents.offref(languageRef);
			workspaceEvents.offref(economicSettingsRef);
		};
	}, [plugin]);

	return { calendarDisplayMode, economicSettingsVersion, language };
}
