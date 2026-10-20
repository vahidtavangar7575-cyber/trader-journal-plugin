import type { WorkspaceLeaf } from 'obsidian';
import { ItemView, Notice } from 'obsidian';
import { StrictMode } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import type TraderJournalPlugin from '../main';
import { getTranslator } from '../i18n';
import { JournalDashboardV2 } from './JournalDashboardV2';
import { runAfterDailyCommitment } from '../ui/DailyCommitmentModal';

export const TRADER_JOURNAL_DASHBOARD_VIEW_TYPE = 'trader-journal-dashboard';
export const TRADER_JOURNAL_DASHBOARD_ICON = 'notebook-tabs';

export function registerTraderJournalDashboardView(plugin: TraderJournalPlugin): void {
	plugin.registerView(
		TRADER_JOURNAL_DASHBOARD_VIEW_TYPE,
		(leaf) => new TraderJournalDashboardView(leaf, plugin),
	);
}

export function openTraderJournalDashboard(plugin: TraderJournalPlugin): void {
	runAfterDailyCommitment(plugin, () => {
		void openTraderJournalDashboardNow(plugin);
	});
}

export async function openTraderJournalDashboardNow(plugin: TraderJournalPlugin): Promise<void> {
	try {
		let leaf = plugin.app.workspace.getLeavesOfType(TRADER_JOURNAL_DASHBOARD_VIEW_TYPE)[0];
		if (!leaf) {
			leaf = plugin.app.workspace.getLeaf('tab');
			await leaf.setViewState({ type: TRADER_JOURNAL_DASHBOARD_VIEW_TYPE, active: true });
		}
		plugin.app.workspace.setActiveLeaf(leaf, { focus: true });
	} catch (error) {
		console.error('Trader Journal failed to open dashboard', error);
		new Notice(getTranslator(plugin.settings.language)('dashboard.openError'));
	}
}

class TraderJournalDashboardView extends ItemView {
	private root: Root | null = null;

	constructor(leaf: WorkspaceLeaf, private readonly plugin: TraderJournalPlugin) {
		super(leaf);
		this.navigation = false;
		this.icon = TRADER_JOURNAL_DASHBOARD_ICON;
	}

	getViewType(): string { return TRADER_JOURNAL_DASHBOARD_VIEW_TYPE; }
	getDisplayText(): string { return 'ژورنال معاملات'; }
	getIcon(): string { return TRADER_JOURNAL_DASHBOARD_ICON; }

	async onOpen(): Promise<void> {
		this.contentEl.empty();
		this.contentEl.addClass('trader-journal-dashboard-view');
		this.root = createRoot(this.contentEl);
		this.root.render(<StrictMode><JournalDashboardV2 plugin={this.plugin} /></StrictMode>);
	}

	async onClose(): Promise<void> {
		this.root?.unmount();
		this.root = null;
		this.contentEl.removeClass('trader-journal-dashboard-view');
		this.contentEl.empty();
	}
}
