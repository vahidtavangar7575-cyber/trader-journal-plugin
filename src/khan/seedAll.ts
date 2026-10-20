import type TraderJournalPlugin from '../main';
import type { KhanSetupId } from './types';
import { ensureKhanSetup } from './setups';

const ALL_KHAN_SETUPS: KhanSetupId[] = [
	'setup-1',
	'setup-2',
	'setup-3',
	'setup-4',
	'setup-5',
	'setup-6',
];

export async function ensureAllKhanSetups(plugin: TraderJournalPlugin): Promise<void> {
	for (const setupId of ALL_KHAN_SETUPS) {
		try {
			await ensureKhanSetup(plugin, setupId);
		} catch (error) {
			console.error(`Trader Journal failed to seed ${setupId}`, error);
		}
	}
}
