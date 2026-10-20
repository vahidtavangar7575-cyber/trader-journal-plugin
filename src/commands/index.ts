import { Notice } from 'obsidian';
import type TraderJournalPlugin from '../main';
import { getTranslator } from '../i18n';
import { rebuildDailyNoteStats } from '../trades/storage';
import { openTraderJournalCalendar } from '../ui/TradeCalendarView';
import { TraderJournalModal } from '../ui/TraderJournalModal';
import { AccountManagerModal } from '../ui/AccountManagerModal';
import { openTraderJournalDashboard } from '../dashboard/DashboardView';
import { runAfterDailyCommitment } from '../ui/DailyCommitmentModal';

export function registerCommands(plugin: TraderJournalPlugin) {
	const tr = getTranslator(plugin.settings.language);

	plugin.addCommand({
		id: 'open-dashboard',
		name: 'باز کردن ژورنال معاملات',
		callback: () => openTraderJournalDashboard(plugin),
	});

	plugin.addCommand({
		id: 'add-live-trade',
		name: 'ثبت معامله جدید',
		callback: () => {
			runAfterDailyCommitment(plugin, () => new TraderJournalModal(plugin.app, plugin, 'live').open());
		},
	});

	plugin.addCommand({
		id: 'add-backtest-trade',
		name: 'ثبت بک‌تست جدید',
		callback: () => {
			runAfterDailyCommitment(plugin, () => new TraderJournalModal(plugin.app, plugin, 'backtest').open());
		},
	});

	plugin.addCommand({
		id: 'manage-trading-accounts',
		name: 'مدیریت حساب‌ها و قوانین سرمایه',
		callback: () => new AccountManagerModal(plugin.app, plugin).open(),
	});

	plugin.addCommand({
		id: 'open-trade-calendar',
		name: tr('command.openTradeCalendar'),
		callback: () => {
			void openTraderJournalCalendar(plugin);
		},
	});

	plugin.addCommand({
		id: 'recalculate-current-journal-stats',
		name: tr('command.recalculateCurrentStats'),
		callback: () => {
			void recalculateCurrentJournalStats(plugin);
		},
	});
}

async function recalculateCurrentJournalStats(plugin: TraderJournalPlugin): Promise<void> {
	const tr = getTranslator(plugin.settings.language);
	const file = plugin.app.workspace.getActiveFile();
	if (!file) {
		new Notice(tr('error.noActiveFile'));
		return;
	}

	try {
		const result = await rebuildDailyNoteStats(plugin, file);
		if (result.skipped) {
			new Notice(tr('error.currentFileNotJournal'));
			return;
		}

		const invalidBlockSuffix = result.stats.invalidTradeBlockCount === 1 ? '' : 's';
		const invalidBlockMessage = result.stats.invalidTradeBlockCount > 0
			? tr('notice.invalidBlocksSkipped', {
				count: result.stats.invalidTradeBlockCount,
				plural: invalidBlockSuffix,
			})
			: '';
		new Notice(
			tr('notice.recalculatedStats', {
				count: result.stats.tradeCount,
				plural: result.stats.tradeCount === 1 ? '' : 's',
				invalidMessage: invalidBlockMessage,
			}),
		);
	} catch (error) {
		new Notice(error instanceof Error ? error.message : tr('error.couldNotRecalculateStats'));
	}
}
