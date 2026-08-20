import type { App } from 'obsidian';
import { Modal } from 'obsidian';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import type { Root } from 'react-dom/client';
import type TraderJournalPlugin from '../main';
import type { TradeEntry, TradeJournalType } from '../trades/types';
import { TraderJournalForm } from './traderJournal/TraderJournalForm';

export class TraderJournalModal extends Modal {
	private readonly plugin: TraderJournalPlugin;
	private readonly journalType: TradeJournalType;
	private readonly initialTrade: TradeEntry | undefined;
	private readonly targetFilePath: string | undefined;
	private root: Root | null = null;

	constructor(
		app: App,
		plugin: TraderJournalPlugin,
		journalType: TradeJournalType = 'backtest',
		initialTrade?: TradeEntry,
		targetFilePath?: string,
	) {
		super(app);
		this.plugin = plugin;
		this.journalType = journalType;
		this.initialTrade = initialTrade;
		this.targetFilePath = targetFilePath;
	}

	onOpen() {
		this.titleEl.empty();
		this.modalEl.addClass('trader-journal-modal-shell');
		this.contentEl.addClass('trader-journal-modal-content');
		this.contentEl.empty();
		this.root = createRoot(this.contentEl);
		this.root.render(
			<StrictMode>
				<TraderJournalForm
					plugin={this.plugin}
					journalType={this.journalType}
					initialTrade={this.initialTrade}
					targetFilePath={this.targetFilePath}
					closeModal={() => this.close()}
				/>
			</StrictMode>,
		);
	}

	onClose() {
		this.root?.unmount();
		this.root = null;
		this.modalEl.removeClass('trader-journal-modal-shell');
		this.contentEl.removeClass('trader-journal-modal-content');
		this.contentEl.empty();
	}
}
