import React from 'react';
import { useTranslation } from 'react-i18next';
import Modal from './modal';
import { PetProfileAvatar, PhotoSignIn, CalendarProfileLink } from './calendar-pet-photos';
import UnsavedChanges, { confirmDiscardChanges } from './unsaved-changes';
import {
  balanceKey,
  changePetBalance,
  plannedDays,
  validBalanceDates,
  type BalancePolicyTemplate,
  type PetBalance,
  type BalanceService,
  type BalanceChange,
  type PlannedCoverage,
} from './pet-balance';
export type BalancePet = { name: string; customer: string; customerName: string; species: string };
export default function PetBalances({
  pets,
  accounts,
  plans,
  initial,
  onClose,
  onSave,
  templates,
  onSaveTemplate,
  embedded = false,
  onSelectPet,
  summaryOnly = false,
}: {
  summaryOnly?: boolean;
  onSelectPet?: (pet: string) => void;
  embedded?: boolean;
  templates: BalancePolicyTemplate[];
  onSaveTemplate: (template: BalancePolicyTemplate) => void;
  pets: BalancePet[];
  accounts: Record<string, PetBalance>;
  plans: PlannedCoverage[];
  initial?: { pet: string; service: BalanceService };
  onClose: () => void;
  onSave: (change: BalanceChange) => void;
}) {
  const { i18n } = useTranslation();
  const isChinese = i18n.language === 'zh';
  const translate = (en: string, cn: string) => (isChinese ? cn : en);
  const [customer, setCustomer] = React.useState(
    embedded
      ? 'all'
      : initial
        ? pets.find((p) => p.name === initial.pet)?.customer || 'all'
        : 'all',
  );
  const [pet, setPet] = React.useState(initial?.pet || pets[0]?.name || '');
  const [service] = React.useState<BalanceService>('boarding');
  const [editing, setEditing] = React.useState(false);
  const [mode, setMode] = React.useState('add');
  const [amount, setAmount] = React.useState('');
  const [reason, setReason] = React.useState('');
  const [from, setFrom] = React.useState('');
  const [through, setThrough] = React.useState('');
  const [template, setTemplate] = React.useState('');
  const [templateName, setTemplateName] = React.useState('');
  const [error, setError] = React.useState('');
  const form = React.useRef<HTMLFormElement>(null);
  const operationId = React.useRef('');
  const version = React.useRef(0);
  const account = accounts[balanceKey(pet, service)];
  const planned = plannedDays(plans, pet, service);
  const dirty =
    editing &&
    !!(
      amount ||
      reason ||
      from !== (account?.validFrom || '') ||
      through !== (account?.validThrough || '') ||
      templateName
    );
  const messages: Record<string, string> = {
    adjustment: translate('Enter a whole number of days.', '请填写整数天数。'),
    terms: translate('Choose a valid date range.', '请选择有效日期范围。'),
    negative: translate('The balance cannot go below zero.', '余额不能小于零。'),
    planned: translate(
      'This would leave a planned stay without coverage. Review those stays first.',
      '此修改会使计划中的托管余额不足或失去覆盖，请先检查相关安排。',
    ),
    version: translate(
      'The balance changed. Close the editor and try again.',
      '余额已更新，请关闭编辑后重试。',
    ),
    operation: translate(
      'This adjustment was already recorded differently. Reopen the editor.',
      '此调整已以其他内容记录，请重新打开编辑。',
    ),
  };
  function open() {
    operationId.current = crypto.randomUUID();
    version.current = account?.version || 0;
    setAmount('');
    setReason('');
    setMode('add');
    setFrom(account?.validFrom || '');
    setThrough(account?.validThrough || '');
    setTemplate('');
    setTemplateName('');
    setEditing(true);
    setError('');
  }
  function leave() {
    if (confirmDiscardChanges(i18n.language, form.current)) onClose();
  }
  function switchPet(next: string) {
    if (!confirmDiscardChanges(i18n.language, form.current)) return;
    setPet(next);
    setEditing(false);
    setError('');
  }
  function closeEditor() {
    if (confirmDiscardChanges(i18n.language, form.current)) setEditing(false);
  }
  function save(event: React.FormEvent) {
    event.preventDefault();
    const delta = (mode === 'remove' ? -1 : 1) * Number(amount);
    const change: BalanceChange = {
      id: operationId.current,
      pet,
      service,
      version: version.current,
      delta,
      reason,
      validFrom: from,
      validThrough: through,
    };
    try {
      changePetBalance(account, change, plans, new Date().toISOString());
      onSave(change);
      setEditing(false);
      setError('');
    } catch (error) {
      setError(messages[(error as Error).message] || messages.adjustment);
    }
  }
  function saveTemplate() {
    if (!templateName.trim() || !validBalanceDates(from, through)) {
      setError(
        translate(
          'Name the template and choose a valid date range.',
          '请填写模板名称及有效日期范围。',
        ),
      );
      return;
    }
    const item = {
      id: crypto.randomUUID(),
      name: templateName.trim(),
      service,
      validFrom: from,
      validThrough: through,
    };
    onSaveTemplate(item);
    setTemplate(item.id);
    setTemplateName('');
    setError('');
  }
  React.useEffect(() => {
    onSelectPet?.(pet);
  }, [pet, onSelectPet]);
  const selectedPet = pets.find((p) => p.name === pet);
  const editorForm = (
    <form
      ref={form}
      className="hc-settings-form hc-balance-editor"
      onInvalidCapture={(event) => {
        const policy = (event.target as HTMLElement).closest('details');
        if (policy) policy.open = true;
      }}
      onSubmit={save}
    >
      <UnsavedChanges active={dirty} />
      <div className="hc-balance-editor-heading">
        <h4>{translate('Add balance', '增加余额')}</h4>
        <p>{translate('Boarding credit for this pet.', '此宠物的寄养额度。')}</p>
      </div>
      {error && (
        <p className="hc-range-feedback" role="alert">
          {error}
        </p>
      )}
      <div className="hc-time-fields">
        {account && (
          <label>
            {translate('Adjustment', '调整方式')}
            <select
              aria-label={translate('Adjustment', '调整方式')}
              value={mode}
              onChange={(event) => setMode(event.target.value)}
            >
              <option value="add">{translate('Add days', '增加天数')}</option>
              {account && <option value="remove">{translate('Remove days', '减少天数')}</option>}
            </select>
          </label>
        )}
        <label>
          {mode === 'remove'
            ? translate('Days to remove', '减少天数')
            : translate('Days to add', '增加天数')}
          <input
            aria-label={translate('Days', '天数')}
            type="number"
            required
            min={account ? 0 : 1}
            step="1"
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
          />
        </label>
      </div>
      <label>
        {translate('Reason (optional)', '原因（选填）')}
        <input
          aria-label={translate('Reason', '原因')}
          maxLength={500}
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          placeholder={translate('Why is this balance changing?', '此次余额调整的原因是什么？')}
        />
      </label>
      <details className="hc-balance-policy" key={`${pet}-${service}-${editing}`} open={!account}>
        <summary>
          {translate('Coverage policy', '使用规则')}
          <small>{translate('Choose a template or set dates', '选择模板或填写日期')}</small>
        </summary>
        <label>
          {translate('Policy template', '规则模板')}
          <select
            aria-label={translate('Policy template', '规则模板')}
            value={template}
            onChange={(event) => {
              setTemplate(event.target.value);
              const item = templates.find((p) => p.id === event.target.value);
              if (item) {
                setFrom(item.validFrom);
                setThrough(item.validThrough);
              }
            }}
          >
            <option value="">{translate('Custom dates', '自定义日期')}</option>
            {templates
              .filter((p) => p.service === service)
              .map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
          </select>
        </label>
        <div className="hc-time-fields">
          <label>
            {translate('Valid from', '有效起始日')}
            <input
              required
              type="date"
              value={from}
              onChange={(event) => {
                setFrom(event.target.value);
                setTemplate('');
              }}
            />
          </label>
          <label>
            {translate('Valid through', '有效截止日')}
            <input
              required
              type="date"
              min={from}
              value={through}
              onChange={(event) => {
                setThrough(event.target.value);
                setTemplate('');
              }}
            />
          </label>
        </div>
        <details className="hc-template-create">
          <summary>{translate('Save dates as a template', '将日期保存为模板')}</summary>
          <div className="hc-template-save">
            <label>
              {translate('New template name', '新模板名称')}
              <input
                maxLength={80}
                value={templateName}
                onChange={(event) => setTemplateName(event.target.value)}
                placeholder={translate('Name this date range', '为此日期范围命名')}
              />
            </label>
            <button type="button" className="hc-manage" onClick={saveTemplate}>
              {translate('Save template', '保存模板')}
            </button>
          </div>
        </details>
        <p className="hc-balance-preview">
          {translate(
            'Templates copy dates into this balance. Later changes do not alter other balances.',
            '模板将日期复制到当前余额，后续修改不影响其他余额。',
          )}
        </p>
      </details>
      <div className="hc-settings-actions">
        <button className="hc-manage" type="button" onClick={closeEditor}>
          {translate('Cancel', '取消')}
        </button>
        <button className="hc-apply" type="submit">
          {mode === 'remove'
            ? translate('Save adjustment', '保存调整')
            : translate('Add balance', '增加余额')}
        </button>
      </div>
    </form>
  );
  const content = (
    <>
      <div className="hc-balance-layout">
        {!summaryOnly && (
          <aside className="hc-balance-sidebar">
            {!embedded && (
              <>
                <PhotoSignIn />
                <a
                  className="hc-finance-link"
                  href={'/app/balances/?pet=' + encodeURIComponent(pet)}
                  onClick={(event) => {
                    if (
                      window.location.pathname + window.location.search ===
                      '/app/balances/?pet=' + encodeURIComponent(pet)
                    ) {
                      event.preventDefault();
                      leave();
                    }
                  }}
                >
                  {translate('View statement', '查看交易明细')} ↗
                </a>
                <a className="hc-finance-link" href="/cancellation-policy/">
                  {translate('Cancellation policy', '取消政策')} ↗
                </a>
              </>
            )}
            {embedded && (
              <div className="hc-balance-sidebar-heading">
                <h2>{translate('Pets', '宠物')}</h2>
                <span>
                  {pets.filter((p) => customer === 'all' || p.customer === customer).length}
                </span>
              </div>
            )}
            <label>
              {translate('Customer', '客户')}
              <select
                aria-label={translate('Balance customer', '余额客户')}
                value={customer}
                onChange={(event) => {
                  if (!confirmDiscardChanges(i18n.language, form.current)) return;
                  const value = event.target.value;
                  setCustomer(value);
                  setPet(pets.find((p) => value === 'all' || p.customer === value)?.name || '');
                  setEditing(false);
                }}
              >
                <option value="all">{translate('All customers', '全部客户')}</option>
                {[...new Map(pets.map((p) => [p.customer, p.customerName])).entries()].map(
                  ([id, name]) => (
                    <option key={id} value={id}>
                      {name}
                    </option>
                  ),
                )}
              </select>
            </label>
            <div
              className="hc-balance-pets"
              role="group"
              aria-label={translate('Choose a pet', '选择宠物')}
            >
              {pets
                .filter((p) => customer === 'all' || p.customer === customer)
                .map((p) => (
                  <button
                    type="button"
                    key={p.name}
                    aria-label={`${translate('Balance', '余额')}: ${p.name}`}
                    aria-pressed={pet === p.name}
                    onClick={() => switchPet(p.name)}
                  >
                    <PetProfileAvatar name={p.name} className="hc-guest-avatar" />
                    <span>
                      <strong>{p.name}</strong>
                      <small>{p.customerName}</small>
                    </span>
                  </button>
                ))}
            </div>
            {embedded && (
              <div className="hc-balance-sidebar-footer">
                <PhotoSignIn />
                <a
                  className="hc-finance-link"
                  href={'/app/balances/?pet=' + encodeURIComponent(pet)}
                  onClick={(event) => {
                    if (
                      window.location.pathname + window.location.search ===
                      '/app/balances/?pet=' + encodeURIComponent(pet)
                    ) {
                      event.preventDefault();
                      leave();
                    }
                  }}
                >
                  {translate('View statement', '查看交易明细')} ↗
                </a>
                <a className="hc-finance-link" href="/cancellation-policy/">
                  {translate('Cancellation policy', '取消政策')} ↗
                </a>
              </div>
            )}
          </aside>
        )}
        <section className="hc-balance-content">
          <div className="hc-balance-title">
            <div className="hc-balance-pet-heading">
              {embedded && <PetProfileAvatar name={pet} className="hc-balance-selected-photo" />}
              <div>
                <p>{selectedPet?.customerName}</p>
                <h3>{pet}</h3>
              </div>
            </div>
            {summaryOnly && <CalendarProfileLink name={pet} />}
            {(!editing || embedded) && (
              <button className="hc-apply" onClick={open}>
                {translate('Add balance', '增加余额')}
              </button>
            )}
          </div>

          <p className="hc-balance-preview">
            {translate(
              'Planning preview · No payments, deductions or reservations are saved.',
              '规划预览 · 不保存付款、扣减或预留记录。',
            )}
          </p>
          {(!editing || embedded) && (
            <div className="hc-balance-metrics">
              <div>
                <small>{translate('Recorded days', '记录天数')}</small>
                <strong>{account ? account.days : '—'}</strong>
              </div>
              <div>
                <small>{translate('Planned here', '本页已计划')}</small>
                <strong>{planned}</strong>
              </div>
              <div>
                <small>{translate('Available to plan', '可计划天数')}</small>
                <strong>{account ? account.days - planned : '—'}</strong>
              </div>
            </div>
          )}
          {account && (!editing || embedded) && (
            <div className="hc-balance-terms">
              <span>
                {translate('Coverage', '覆盖日期')}{' '}
                <strong>
                  {account.validFrom} → {account.validThrough}
                </strong>
              </span>
            </div>
          )}
          {!account && (!editing || embedded) && (
            <div className="hc-balance-empty">
              <h4>{translate('No boarding balance yet', '暂无寄养余额')}</h4>
              <p>
                {translate(
                  'Add boarding days and choose a policy template or date range.',
                  '增加寄养天数，并选择规则模板或有效日期。',
                )}
              </p>
            </div>
          )}
          {!embedded && editing
            ? editorForm
            : account &&
              !summaryOnly && (
                <div className="hc-balance-history">
                  <h4>{translate('Adjustment history', '调整记录')}</h4>
                  {[...account.history].reverse().map((entry) => (
                    <div key={entry.id}>
                      <span className={entry.delta > 0 ? 'positive' : ''}>
                        {entry.delta > 0 ? '+' : ''}
                        {entry.delta} {translate('days', '天')}
                      </span>
                      <div>
                        <strong>
                          {entry.reason || translate('Balance adjustment', '余额调整')}
                        </strong>
                        <small>
                          {new Date(entry.at).toLocaleString(isChinese ? 'zh-CN' : 'en-US')} ·{' '}
                          {translate('Preview adjustment', '预览调整')}
                        </small>
                      </div>
                      <small>
                        {entry.after} {translate('remaining', '剩余')}
                      </small>
                    </div>
                  ))}
                </div>
              )}
        </section>
      </div>
      {embedded && editing && (
        <Modal
          className="hc-balance-edit-dialog"
          title={translate('Add balance', '增加余额')}
          onClose={closeEditor}
        >
          {editorForm}
        </Modal>
      )}
    </>
  );
  return embedded ? (
    <div className={'hc-balance-page' + (summaryOnly ? ' hc-balance-summary' : '')}>{content}</div>
  ) : (
    <Modal
      className="hc-balance-dialog"
      title={translate('Boarding balances', '寄养余额')}
      onClose={leave}
    >
      {content}
    </Modal>
  );
}
