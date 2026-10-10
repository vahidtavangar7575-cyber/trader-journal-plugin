import type { App } from 'obsidian';
import { Modal } from 'obsidian';
import { StrictMode, useState } from 'react';
import { createRoot } from 'react-dom/client';
import type { Root } from 'react-dom/client';
import type TraderJournalPlugin from '../main';
import { createTradingAccountId, TRADING_ACCOUNT_TYPE_LABELS } from '../accounts/types';
import type { TradingAccount, TradingAccountType } from '../accounts/types';
import { normalizeRiskPolicy } from '../risk/policy';
import type { RiskPolicySettings } from '../risk/policy';

interface Props {
	plugin: TraderJournalPlugin;
	onChanged?: () => void;
}

interface DraftAccount {
	id: string;
	name: string;
	type: TradingAccountType;
	code: string;
	currency: string;
	initialBalance: string;
	currentBalance: string;
}

function emptyDraft(): DraftAccount {
	return {
		id: '',
		name: '',
		type: 'demo',
		code: '',
		currency: 'USD',
		initialBalance: '',
		currentBalance: '',
	};
}

function AccountManagerContent({ plugin, onChanged }: Props) {
	const [accounts, setAccounts] = useState(() => plugin.settings.accounts.map((account) => ({ ...account })));
	const [draft, setDraft] = useState<DraftAccount>(emptyDraft);
	const [policy, setPolicy] = useState<RiskPolicySettings>(() => ({ ...plugin.settings.riskPolicy }));
	const [message, setMessage] = useState('');

	const persistAccounts = async (nextAccounts: TradingAccount[]) => {
		setAccounts(nextAccounts);
		plugin.settings.accounts = nextAccounts;
		if (plugin.settings.lastSelectedAccountId && !nextAccounts.some((account) => account.id === plugin.settings.lastSelectedAccountId)) {
			plugin.settings.lastSelectedAccountId = '';
		}
		await plugin.saveSettings();
		onChanged?.();
	};

	const saveDraft = async () => {
		const initialBalance = Number(draft.initialBalance);
		const currentBalance = draft.currentBalance.trim() ? Number(draft.currentBalance) : initialBalance;
		if (!draft.name.trim() || !Number.isFinite(initialBalance) || initialBalance < 0 || !Number.isFinite(currentBalance) || currentBalance < 0) {
			setMessage('نام حساب و موجودی معتبر لازم است.');
			return;
		}
		const now = new Date().toISOString();
		const existing = accounts.find((account) => account.id === draft.id);
		const account: TradingAccount = {
			id: existing?.id ?? createTradingAccountId(),
			name: draft.name.trim(),
			type: draft.type,
			...(draft.code.trim() ? { code: draft.code.trim() } : {}),
			currency: draft.currency.trim().toUpperCase() || 'USD',
			initialBalance,
			currentBalance,
			enabled: existing?.enabled ?? true,
			createdAt: existing?.createdAt ?? now,
			updatedAt: now,
		};
		const next = existing
			? accounts.map((item) => item.id === existing.id ? account : item)
			: [...accounts, account];
		await persistAccounts(next);
		setDraft(emptyDraft());
		setMessage('حساب ذخیره شد.');
	};

	const editAccount = (account: TradingAccount) => {
		setDraft({
			id: account.id,
			name: account.name,
			type: account.type,
			code: account.code ?? '',
			currency: account.currency,
			initialBalance: String(account.initialBalance),
			currentBalance: String(account.currentBalance),
		});
		setMessage('');
	};

	const removeAccount = async (account: TradingAccount) => {
		await persistAccounts(accounts.filter((item) => item.id !== account.id));
		if (draft.id === account.id) setDraft(emptyDraft());
	};

	const toggleAccount = async (account: TradingAccount) => {
		await persistAccounts(accounts.map((item) => item.id === account.id
			? { ...item, enabled: !item.enabled, updatedAt: new Date().toISOString() }
			: item));
	};

	const savePolicy = async () => {
		const normalized = normalizeRiskPolicy(policy);
		setPolicy(normalized);
		plugin.settings.riskPolicy = normalized;
		await plugin.saveSettings();
		onChanged?.();
		setMessage('قوانین مدیریت سرمایه ذخیره شد.');
	};

	const setPolicyNumber = (key: keyof RiskPolicySettings, raw: string) => {
		const value = Number(raw);
		setPolicy((current) => ({ ...current, [key]: Number.isFinite(value) ? value : current[key] }));
	};

	return (
		<div className="account-manager" dir="rtl">
			<header className="account-manager__hero">
				<div>
					<div className="khan-kicker">Accounts & Risk Engine</div>
					<h2>حساب‌ها و قوانین مدیریت سرمایه</h2>
					<p>هر معامله به یک حساب متصل می‌شود؛ موجودی حساب بعد از ثبت نتیجه به‌روز می‌شود و حساب بک‌تست از محدودیت روزانه مستثناست.</p>
				</div>
			</header>

			<section className="account-manager__section">
				<div className="account-manager__section-title"><h3>حساب‌های ذخیره‌شده</h3><span>{accounts.length} حساب</span></div>
				<div className="account-manager__cards">
					{accounts.length === 0 ? <div className="account-manager__empty">هنوز حسابی نساخته‌ای. حساب بک‌تست، دمو، پراپ یا مسابقه را از فرم پایین اضافه کن.</div> : null}
					{accounts.map((account) => (
						<article className={`account-card${account.enabled ? '' : ' is-disabled'}`} key={account.id}>
							<div className="account-card__head">
								<div><strong>{account.name}</strong><span>{TRADING_ACCOUNT_TYPE_LABELS[account.type]}{account.code ? ` · ${account.code}` : ''}</span></div>
								<b>{formatMoney(account.currentBalance, account.currency)}</b>
							</div>
							<div className="account-card__meta"><span>شروع: {formatMoney(account.initialBalance, account.currency)}</span><span>{account.enabled ? 'فعال' : 'غیرفعال'}</span></div>
							<div className="account-card__actions">
								<button type="button" onClick={() => editAccount(account)}>ویرایش</button>
								<button type="button" onClick={() => void toggleAccount(account)}>{account.enabled ? 'غیرفعال کن' : 'فعال کن'}</button>
								<button type="button" className="mod-warning" onClick={() => void removeAccount(account)}>حذف</button>
							</div>
						</article>
					))}
				</div>
			</section>

			<section className="account-manager__section account-manager__editor">
				<div className="account-manager__section-title"><h3>{draft.id ? 'ویرایش حساب' : 'ساخت حساب جدید'}</h3></div>
				<div className="account-manager__form-grid">
					<label><span>نام حساب</span><input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} placeholder="مثلاً Demo 100K" /></label>
					<label><span>نوع حساب</span><select value={draft.type} onChange={(e) => setDraft({ ...draft, type: e.target.value as TradingAccountType })}>{Object.entries(TRADING_ACCOUNT_TYPE_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
					<label><span>کد / شناسه حساب</span><input value={draft.code} onChange={(e) => setDraft({ ...draft, code: e.target.value })} placeholder="اختیاری" /></label>
					<label><span>ارز</span><input value={draft.currency} onChange={(e) => setDraft({ ...draft, currency: e.target.value })} placeholder="USD" /></label>
					<label><span>موجودی شروع</span><input type="number" min="0" step="any" value={draft.initialBalance} onChange={(e) => setDraft({ ...draft, initialBalance: e.target.value })} placeholder="100000" /></label>
					<label><span>موجودی فعلی</span><input type="number" min="0" step="any" value={draft.currentBalance} onChange={(e) => setDraft({ ...draft, currentBalance: e.target.value })} placeholder="اگر خالی باشد = موجودی شروع" /></label>
				</div>
				<div className="account-manager__actions"><button type="button" onClick={() => setDraft(emptyDraft())}>پاک کردن فرم</button><button type="button" className="mod-cta" onClick={() => void saveDraft()}>{draft.id ? 'ذخیره تغییرات' : 'افزودن حساب'}</button></div>
			</section>

			<section className="account-manager__section account-manager__policy">
				<div className="account-manager__section-title"><div><h3>قوانین فعلی مدیریت سرمایه</h3><p>همه این اعداد بعداً قابل تغییرند. حساب بک‌تست از سقف تعداد معاملات و توقف بعد از باخت‌ها مستثناست.</p></div></div>
				<div className="account-manager__policy-grid">
					<PolicyInput label="ریسک معامله ۱ و ۲ (%)" value={policy.baseFirstTwoRiskPct} onChange={(v) => setPolicyNumber('baseFirstTwoRiskPct', v)} />
					<PolicyInput label="ریسک تمرینی بک‌تست (%)" value={policy.backtestRiskPct} onChange={(v) => setPolicyNumber('backtestRiskPct', v)} />
					<PolicyInput label="تقسیم سود دو معامله اول برای معامله ۳" value={policy.thirdTradeProfitDivisor} onChange={(v) => setPolicyNumber('thirdTradeProfitDivisor', v)} />
					<PolicyInput label="ریسک معامله ۴ (%)" value={policy.fourthTradeRiskPct} onChange={(v) => setPolicyNumber('fourthTradeRiskPct', v)} />
					<PolicyInput label="حداکثر معامله روزانه" value={policy.maxDailyTrades} onChange={(v) => setPolicyNumber('maxDailyTrades', v)} />
					<PolicyInput label="توقف بعد از چند باخت" value={policy.stopAfterLosses} onChange={(v) => setPolicyNumber('stopAfterLosses', v)} />
					<PolicyInput label="حداقل RR ورود" value={policy.minPlannedRr} onChange={(v) => setPolicyNumber('minPlannedRr', v)} />
					<PolicyInput label="هدف فعلی خروج (R)" value={policy.targetR} onChange={(v) => setPolicyNumber('targetR', v)} />
					<PolicyInput label="تقسیم سود روز قبل" value={policy.dailyProfitDivisor} onChange={(v) => setPolicyNumber('dailyProfitDivisor', v)} />
					<PolicyInput label="تقسیم سود هفته قبل" value={policy.weeklyProfitDivisor} onChange={(v) => setPolicyNumber('weeklyProfitDivisor', v)} />
				</div>
				<div className="account-manager__policy-explain">فرمول فعلی: معامله ۱ و ۲ = پایه روز؛ معامله ۳ = سود خالص دو معامله اول ÷ ۴؛ معامله ۴ = ۰٫۱۵٪. هر روز سود مثبت روزهای قبل همان هفته ÷ ۴ به پایه اضافه می‌شود و در شروع هفته جدید سود مثبت هفته قبل ÷ ۱۶ به پایه هفتگی افزوده می‌شود.</div>
				<div className="account-manager__actions"><button type="button" className="mod-cta" onClick={() => void savePolicy()}>ذخیره قوانین</button></div>
			</section>
			{message ? <div className="account-manager__message">{message}</div> : null}
		</div>
	);
}

function PolicyInput({ label, value, onChange }: { label: string; value: number; onChange: (value: string) => void }) {
	return <label><span>{label}</span><input type="number" min="0" step="0.01" value={value} onChange={(event) => onChange(event.target.value)} /></label>;
}

function formatMoney(value: number, currency: string): string {
	return `${new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 }).format(value)} ${currency}`;
}

export class AccountManagerModal extends Modal {
	private root: Root | null = null;

	constructor(app: App, private readonly plugin: TraderJournalPlugin, private readonly onChanged?: () => void) {
		super(app);
	}

	onOpen() {
		this.modalEl.addClass('account-manager-modal-shell');
		this.contentEl.empty();
		this.contentEl.addClass('account-manager-modal-content');
		this.root = createRoot(this.contentEl);
		this.root.render(<StrictMode><AccountManagerContent plugin={this.plugin} onChanged={this.onChanged} /></StrictMode>);
	}

	onClose() {
		this.root?.unmount();
		this.root = null;
		this.contentEl.empty();
	}
}
