import type TraderJournalPlugin from '../../../main';
import type { TradingAccount } from '../../../accounts/types';
import { TRADING_ACCOUNT_TYPE_LABELS } from '../../../accounts/types';
import { buildRiskRecommendationReasons } from '../../../risk/explanation';
import type { RiskPolicyEvaluation } from '../../../risk/policy';
import { AccountManagerModal } from '../../AccountManagerModal';

interface Props {
	plugin: TraderJournalPlugin;
	accountId: string;
	tradeDate?: string;
	selectedAccount: TradingAccount | null;
	evaluation: RiskPolicyEvaluation | null;
	ruleWarnings: string[];
	onAccountChange: (accountId: string) => void;
	onAccountsChanged: () => void;
}

export function TradeAccountFields({
	plugin,
	accountId,
	tradeDate,
	selectedAccount,
	evaluation,
	ruleWarnings,
	onAccountChange,
	onAccountsChanged,
}: Props) {
	const accounts = plugin.settings.accounts.filter((account) => account.enabled || account.id === accountId);
	const allTrades = Object.values(plugin.journalDataService.getSnapshot().trades.daysByDate)
		.flatMap((day) => day.trades.map((entry) => entry.trade));
	const riskReasons = selectedAccount && evaluation
		? buildRiskRecommendationReasons({
			evaluation,
			policy: plugin.settings.riskPolicy,
			account: selectedAccount,
			date: tradeDate || localDateKey(),
			trades: allTrades,
		})
		: [];
	return (
		<section className="trader-journal-review-form trader-journal-account-panel">
			<div className="trader-journal-review-form__header trader-journal-account-panel__header">
				<div>
					<h3>حساب و موتور مدیریت سرمایه</h3>
					<p>حساب را یک‌بار بساز؛ از این به بعد آخرین حساب انتخاب‌شده به‌صورت پیش‌فرض برمی‌گردد و موجودی بسته‌شدن معاملات را دنبال می‌کند.</p>
				</div>
				<button type="button" onClick={() => new AccountManagerModal(plugin.app, plugin, onAccountsChanged).open()}>
					مدیریت حساب‌ها و قوانین
				</button>
			</div>

			<div className="trader-journal-form__grid">
				<label className="trader-journal-field">
					<span>حساب معامله</span>
					<select value={accountId} onChange={(event) => onAccountChange(event.target.value)}>
						<option value="">بدون حساب ذخیره‌شده</option>
						{accounts.map((account) => (
							<option key={account.id} value={account.id}>
								{account.name} · {TRADING_ACCOUNT_TYPE_LABELS[account.type]} · {formatMoney(account.currentBalance, account.currency)}
							</option>
						))}
					</select>
				</label>
				<div className="trader-journal-field trader-journal-field--readonly">
					<span>نوع حساب</span>
					<strong>{selectedAccount ? TRADING_ACCOUNT_TYPE_LABELS[selectedAccount.type] : '-'}</strong>
				</div>
				<div className="trader-journal-field trader-journal-field--readonly">
					<span>موجودی فعلی</span>
					<strong>{selectedAccount ? formatMoney(selectedAccount.currentBalance, selectedAccount.currency) : '-'}</strong>
				</div>
				<div className="trader-journal-field trader-journal-field--readonly">
					<span>کد حساب</span>
					<strong>{selectedAccount?.code || '-'}</strong>
				</div>
				<div className="trader-journal-field trader-journal-field--readonly">
					<span>شماره معامله امروز</span>
					<strong>{evaluation ? evaluation.tradeNumber : '-'}</strong>
				</div>
				<div className="trader-journal-field trader-journal-field--readonly">
					<span>ریسک پیشنهادی موتور</span>
					<strong>{evaluation ? `${formatPct(evaluation.recommendedRiskPct)}%` : '-'}</strong>
				</div>
			</div>

			{evaluation ? (
				<div className="trader-journal-account-panel__metrics">
					<span>پایه هفته: <b>{formatPct(evaluation.weekBaseRiskPct)}%</b></span>
					<span>پایه امروز: <b>{formatPct(evaluation.dayBaseRiskPct)}%</b></span>
					<span>PnL امروز: <b>{formatPct(evaluation.dailyPnlPct)}%</b></span>
					<span>باخت امروز: <b>{evaluation.lossesToday}</b></span>
					<span>حداقل RR: <b>{evaluation.minPlannedRr}R</b></span>
					<span>هدف فعلی: <b>{evaluation.targetR}R</b></span>
				</div>
			) : null}

			{riskReasons.length > 0 ? (
				<details className="trader-journal-plan-linked-trades" open>
					<summary>چرا این درصد ریسک پیشنهاد شده؟</summary>
					<ol>
						{riskReasons.map((reason) => <li key={reason}>{reason}</li>)}
					</ol>
				</details>
			) : null}

			{selectedAccount?.type === 'backtest' ? (
				<div className="trader-journal-account-panel__training">حساب بک‌تست: سقف ۴ معامله و توقف بعد از دو باخت اعمال نمی‌شود؛ ثبت داده برای تمرین محدود نمی‌شود.</div>
			) : null}
			{ruleWarnings.map((warning, index) => (
				<div key={`${warning}-${index}`} className="trader-journal-form__error trader-journal-rule-warning">
					⚠️ {warning} ثبت معامله همچنان ممکن است؛ اگر ادامه بدهی، تخطی در داده معامله ذخیره می‌شود.
				</div>
			))}
		</section>
	);
}

function localDateKey(date = new Date()): string {
	const year = date.getFullYear();
	const month = String(date.getMonth() + 1).padStart(2, '0');
	const day = String(date.getDate()).padStart(2, '0');
	return `${year}-${month}-${day}`;
}

function formatMoney(value: number, currency: string): string {
	return `${new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 }).format(value)} ${currency}`;
}

function formatPct(value: number): string {
	return Number(value.toFixed(4)).toString();
}
