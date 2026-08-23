import { Notice } from 'obsidian';
import { useEffect, useMemo, useState } from 'react';
import { getTranslator } from '../i18n';
import type TraderJournalPlugin from '../main';
import type { TradeSetupDefinition } from '../setups/types';
import type { TraderJournalLanguage } from '../settings';
import { TradeSetupModal } from '../ui/TradeSetupModal';
import { DashboardIconButton } from './DashboardIconButton';

interface SetupOverviewProps {
	language: TraderJournalLanguage;
	plugin: TraderJournalPlugin;
}

export function SetupOverview({ language, plugin }: SetupOverviewProps) {
	const [setups, setSetups] = useState<TradeSetupDefinition[]>([]);
	const [isLoading, setIsLoading] = useState(true);
	const [hasLoadError, setHasLoadError] = useState(false);
	const tr = getTranslator(language);
	const activeCount = useMemo(
		() => setups.filter((setup) => setup.status === 'active').length,
		[setups],
	);

	useEffect(() => {
		setIsLoading(true);
		setHasLoadError(false);
		return plugin.referenceDataService.subscribeSetups(
			(nextSetups) => {
				setSetups(nextSetups);
				setHasLoadError(false);
				setIsLoading(false);
			},
			() => {
				setHasLoadError(true);
				setIsLoading(false);
			},
		);
	}, [plugin]);

	return (
		<section className="trader-journal-dashboard__panel trader-journal-dashboard__setup-overview">
			<div className="trader-journal-dashboard__section-header">
				<div>
					<h3>{tr('dashboard.setups')}</h3>
					<p>{tr('dashboard.setupOverviewSubtitle')}</p>
				</div>
				<DashboardIconButton
					icon="plus"
					label={tr('command.addTradeSetup')}
					primary
					size="compact"
					onClick={() => new TradeSetupModal(plugin.app, plugin).open()}
				/>
			</div>

			<div className="trader-journal-dashboard__setup-metrics">
				<SetupMetric label={tr('dashboard.activeSetups')} value={activeCount} />
				<SetupMetric label={tr('dashboard.archivedSetups')} value={setups.length - activeCount} />
			</div>

			{isLoading ? (
				<p className="trader-journal-dashboard__empty">{tr('placeholder.loadingSetups')}</p>
			) : hasLoadError ? (
				<p className="trader-journal-dashboard__empty">{tr('dashboard.loadSetupsError')}</p>
			) : setups.length ? (
				<div className="trader-journal-dashboard__setup-list">
					{setups.map((setup) => (
						<SetupRow language={language} plugin={plugin} setup={setup} key={setup.id} />
					))}
				</div>
			) : (
				<p className="trader-journal-dashboard__empty">{tr('dashboard.emptySetups')}</p>
			)}
		</section>
	);
}

function SetupMetric({ label, value }: { label: string; value: number }) {
	return (
		<div className="trader-journal-dashboard-setup-metric">
			<strong>{value}</strong>
			<span>{label}</span>
		</div>
	);
}

function SetupRow({
	language,
	plugin,
	setup,
}: {
	language: TraderJournalLanguage;
	plugin: TraderJournalPlugin;
	setup: TradeSetupDefinition;
}) {
	const tr = getTranslator(language);
	const openSetup = async () => {
		try {
			await plugin.app.workspace.openLinkText(setup.filePath, '', false);
		} catch (error) {
			console.error('Trader Journal failed to open setup note from dashboard', error);
			new Notice(tr('dashboard.openSetupError'));
		}
	};

	return (
		<div className="trader-journal-dashboard-setup-item">
			<button type="button" className="trader-journal-dashboard-setup-row" onClick={() => void openSetup()}>
				<span className="trader-journal-dashboard-setup-row__identity">
					<strong>{setup.name}</strong>
					<span>
						{setup.symbols.length ? setup.symbols.join(', ') : tr('dashboard.allSymbols')}
						{' · '}
						{setup.timeframes.join(', ') || '—'}
					</span>
				</span>
				<span className={`trader-journal-dashboard-setup-row__status trader-journal-dashboard-setup-row__status--${setup.status}`}>
					{tr(setup.status === 'archived' ? 'option.archived' : 'option.active')}
				</span>
			</button>
			<DashboardIconButton
				icon="pencil"
				label={tr('dashboard.editSetup')}
				size="compact"
				onClick={() => new TradeSetupModal(plugin.app, plugin, { initialSetup: setup, openAfterSave: false }).open()}
			/>
		</div>
	);
}
