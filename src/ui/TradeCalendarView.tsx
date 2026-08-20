import type { WorkspaceLeaf } from 'obsidian';
import { ItemView, Notice } from 'obsidian';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import type { Root } from 'react-dom/client';
import type TraderJournalPlugin from '../main';
import { getTranslator } from '../i18n';
import { TradeCalendar } from './tradeCalendar/TradeCalendar';

export const TRADER_JOURNAL_CALENDAR_VIEW_TYPE = 'trader-journal-calendar';
export const TRADER_JOURNAL_CALENDAR_ICON = 'calendar-clock';

export function registerTraderJournalCalendarView(plugin: TraderJournalPlugin): void {
	plugin.registerView(
		TRADER_JOURNAL_CALENDAR_VIEW_TYPE,
		(leaf) => new TraderJournalCalendarView(leaf, plugin),
	);
}

export async function openTraderJournalCalendar(plugin: TraderJournalPlugin): Promise<void> {
	let leaf = plugin.app.workspace.getLeavesOfType(TRADER_JOURNAL_CALENDAR_VIEW_TYPE)[0];
	if (!leaf) {
		leaf = plugin.app.workspace.getRightLeaf(false) ?? undefined;
	}
	if (!leaf) {
		new Notice(getTranslator(plugin.settings.language)('calendar.openError'));
		return;
	}

	await leaf.setViewState({ type: TRADER_JOURNAL_CALENDAR_VIEW_TYPE, active: true });
	plugin.app.workspace.rightSplit.expand();
	plugin.app.workspace.setActiveLeaf(leaf, { focus: true });
}

export class TraderJournalCalendarView extends ItemView {
	private readonly plugin: TraderJournalPlugin;
	private root: Root | null = null;

	constructor(leaf: WorkspaceLeaf, plugin: TraderJournalPlugin) {
		super(leaf);
		this.plugin = plugin;
		this.navigation = false;
		this.icon = TRADER_JOURNAL_CALENDAR_ICON;
	}

	getViewType(): string {
		return TRADER_JOURNAL_CALENDAR_VIEW_TYPE;
	}

	getDisplayText(): string {
		return getTranslator(this.plugin.settings.language)('calendar.displayText');
	}

	getIcon(): string {
		return TRADER_JOURNAL_CALENDAR_ICON;
	}

	async onOpen(): Promise<void> {
		this.contentEl.empty();
		this.contentEl.addClass('trader-journal-calendar-view');
		this.root = createRoot(this.contentEl);
		this.root.render(
			<StrictMode>
				<TradeCalendar plugin={this.plugin} />
			</StrictMode>,
		);
	}

	async onClose(): Promise<void> {
		this.root?.unmount();
		this.root = null;
		this.contentEl.removeClass('trader-journal-calendar-view');
		this.contentEl.empty();
	}
}
