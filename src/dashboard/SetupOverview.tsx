import { Notice } from 'obsidian';
import { useEffect, useMemo, useState } from 'react';
import { getTranslator } from '../i18n';
import type TraderJournalPlugin from '../main';
import type { TradeSetupDefinition } from '../setups/types';
import type { TraderJournalLanguage } from '../settings';
import { TradeSetupModal } from '../ui/TradeSetupModal';
import { DashboardIconButton } from './DashboardIconButton';
import { ensureAllKhanSetups } from '../khan/setups';
import { KHAN_SETUP_NAMES } from '../khan/rules';

interface SetupOverviewProps {
	language: TraderJournalLanguage;
	plugin: TraderJournalPlugin;
}

const KHAN_NAMES = new Set(Object.values(KHAN_SETUP_NAMES));
const ENTRY_MODULES = ['SCOB', 'CHOCH', 'Flip', 'SCM', 'OF / OB'];

export function SetupOverview({ language, plugin }: SetupOverviewProps) {
	const [setups, setSetups] = useState<TradeSetupDefinition[]>([]);
	const [isLoading, setIsLoading] = useState(true);
	const [hasLoadError, setHasLoadError] = useState(false);
	const [isSyncingKhan, setIsSyncingKhan] = useState(false);
	const tr = getTranslator(language);
	const activeCount = useMemo(() => setups.filter((setup) => setup.status === 'active').length, [setups]);
	const khanCount = useMemo(() => setups.filter((setup) => KHAN_NAMES.has(setup.name)).length, [setups]);

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

	const syncKhan = async () => {
		if (isSyncingKhan) return;
		try {
			setIsSyncingKhan(true);
			await ensureAllKhanSetups(plugin);
			new Notice('هر ۶ ستاپ منبع خان در ژورنال آماده‌اند.');
		} catch (error) {
			console.error('Trader Journal failed to sync Khan setups from dashboard', error);
			new Notice('همگام‌سازی ستاپ‌های خان انجام نشد.');
		} finally {
			setIsSyncingKhan(false);
		}
	};

	return (
		<section className="trader-journal-dashboard__panel trader-journal-dashboard__setup-overview">
			<div className="trader-journal-dashboard__section-header">
				<div style={{ minWidth: 0 }}>
					<h3>{tr('dashboard.setups')}</h3>
					<p style={{ whiteSpace: 'normal', overflowWrap: 'anywhere', lineHeight: 1.55 }}>{tr('dashboard.setupOverviewSubtitle')}</p>
				</div>
				<DashboardIconButton icon="plus" label={tr('command.addTradeSetup')} primary size="compact" onClick={() => new TradeSetupModal(plugin.app, plugin).open()} />
			</div>

			<div className="trader-journal-dashboard__setup-metrics">
				<SetupMetric label={tr('dashboard.activeSetups')} value={activeCount} />
				<SetupMetric label={tr('dashboard.archivedSetups')} value={setups.length - activeCount} />
			</div>

			<div style={{
				display: 'grid', gap: '10px', marginBlock: '12px', padding: '12px', border: '1px solid var(--interactive-accent)',
				borderRadius: '10px', background: 'color-mix(in srgb, var(--interactive-accent) 7%, var(--background-secondary))',
			}}>
				<div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center', justifyContent: 'space-between' }}>
					<div style={{ minWidth: 0 }}>
						<strong style={{ display: 'block', fontSize: '1.02em' }}>ستاپ‌های منبع خان: {khanCount}/6</strong>
						<span style={{ display: 'block', marginTop: '3px', color: 'var(--text-muted)', lineHeight: 1.55, overflowWrap: 'anywhere' }}>
							هر شش Setup باید در داشبورد حاضر باشند. SCOB، CHOCH، Flip، SCM و OF/OB «ماژول ورود/تأیید» هستند، نه Setup هفتم.
						</span>
					</div>
					<button type="button" className="mod-cta" disabled={isSyncingKhan} onClick={() => void syncKhan()}>
						{isSyncingKhan ? 'در حال همگام‌سازی…' : khanCount === 6 ? 'بازبینی ۶ ستاپ خان' : 'تکمیل ۶ ستاپ خان'}
					</button>
				</div>
				<div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
					{ENTRY_MODULES.map((module) => <span key={module} style={{ border: '1px solid var(--background-modifier-border)', borderRadius: '999px', padding: '3px 8px', fontSize: 'var(--font-ui-smaller)' }}>{module}</span>)}
				</div>
				<div style={{ color: 'var(--text-muted)', lineHeight: 1.55 }}>
					<b>بعد از برخورد به POI:</b> اگر شاخه Presentation تو را به Setup 1 می‌برد، مرحله بعدی باید Refinement در M1، وضعیت IDM/CHOCH و سپس واکنش SCOB به Decisional/Extreme را دنبال کند؛ صرف برخورد POI به‌تنهایی ورود نیست.
				</div>
			</div>

			{isLoading ? (
				<p className="trader-journal-dashboard__empty">{tr('placeholder.loadingSetups')}</p>
			) : hasLoadError ? (
				<p className="trader-journal-dashboard__empty">{tr('dashboard.loadSetupsError')}</p>
			) : setups.length ? (
				<div className="trader-journal-dashboard__setup-list">
					{setups.map((setup) => <SetupRow language={language} plugin={plugin} setup={setup} key={setup.id} />)}
				</div>
			) : (
				<p className="trader-journal-dashboard__empty">{tr('dashboard.emptySetups')}</p>
			)}
		</section>
	);
}

function SetupMetric({ label, value }: { label: string; value: number }) {
	return <div className="trader-journal-dashboard-setup-metric"><strong>{value}</strong><span>{label}</span></div>;
}

function SetupRow({ language, plugin, setup }: { language: TraderJournalLanguage; plugin: TraderJournalPlugin; setup: TradeSetupDefinition }) {
	const tr = getTranslator(language);
	const openSetup = async () => {
		try {
			await plugin.app.workspace.openLinkText(setup.filePath, '', false);
		} catch (error) {
			console.error('Trader Journal failed to open setup note from dashboard', error);
			new Notice(tr('dashboard.openSetupError'));
		}
	};
	const isKhan = KHAN_NAMES.has(setup.name);

	return (
		<div className="trader-journal-dashboard-setup-item" style={{ minWidth: 0 }}>
			<button type="button" className="trader-journal-dashboard-setup-row" onClick={() => void openSetup()} style={{ minWidth: 0, height: 'auto', whiteSpace: 'normal' }}>
				<span className="trader-journal-dashboard-setup-row__identity" style={{ minWidth: 0 }}>
					<strong style={{ whiteSpace: 'normal', overflowWrap: 'anywhere' }}>{setup.name}{isKhan ? ' · منبع خان' : ''}</strong>
					<span style={{ whiteSpace: 'normal', overflowWrap: 'anywhere' }}>
						{setup.symbols.length ? setup.symbols.join(', ') : tr('dashboard.allSymbols')} {' · '} {setup.timeframes.join(', ') || '—'}
					</span>
				</span>
				<span className={`trader-journal-dashboard-setup-row__status trader-journal-dashboard-setup-row__status--${setup.status}`}>
					{tr(setup.status === 'archived' ? 'option.archived' : 'option.active')}
				</span>
			</button>
			<DashboardIconButton icon="pencil" label={tr('dashboard.editSetup')} size="compact" onClick={() => new TradeSetupModal(plugin.app, plugin, { initialSetup: setup, openAfterSave: false }).open()} />
		</div>
	);
}
