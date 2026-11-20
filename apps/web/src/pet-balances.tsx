import Button from './button';
import CustomDateInput from './custom-date-input';
import { localeFor, uiText } from './i18n.ts';
import CustomSelect from './custom-select';
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
    adjustment: uiText('ui.petBalances.enterAWholeNumberOfDays'),
    terms: uiText('ui.petBalances.chooseAValidDateRange'),
    negative: uiText('ui.petBalances.theBalanceCannotGoBelowZero'),
    planned: uiText('ui.petBalances.thisWouldLeaveAPlannedStayWithoutCoverageReview'),
    version: uiText('ui.petBalances.theBalanceChangedCloseTheEditorAndTryAgain'),
    operation: uiText('ui.petBalances.thisAdjustmentWasAlreadyRecordedDifferentlyReopenTheEditor'),
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
      setError(uiText('ui.petBalances.nameTheTemplateAndChooseAValidDateRange'));
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
        <h4>{uiText('ui.petBalances.addBalance')}</h4>
        <p>{uiText('ui.petBalances.boardingCreditForThisPet')}</p>
      </div>
      {error && (
        <p className="hc-range-feedback" role="alert">
          {error}
        </p>
      )}
      <div className="hc-time-fields">
        {account && (
          <label>
            {uiText('ui.petBalances.adjustment')}
            <CustomSelect
              aria-label={uiText('ui.petBalances.adjustment')}
              value={mode}
              onChange={(event) => setMode(event.target.value)}
            >
              <option value="add">{uiText('ui.petBalances.addDays')}</option>
              {account && <option value="remove">{uiText('ui.petBalances.removeDays')}</option>}
            </CustomSelect>
          </label>
        )}
        <label>
          {mode === 'remove'
            ? uiText('ui.petBalances.daysToRemove')
            : uiText('ui.petBalances.daysToAdd')}
          <input
            aria-label={uiText('ui.petBalances.days')}
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
        {uiText('ui.petBalances.reasonOptional')}
        <input
          aria-label={uiText('ui.petBalances.reason')}
          maxLength={500}
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          placeholder={uiText('ui.petBalances.whyIsThisBalanceChanging')}
        />
      </label>
      <details className="hc-balance-policy" key={`${pet}-${service}-${editing}`} open={!account}>
        <summary>
          {uiText('ui.petBalances.coveragePolicy')}
          <small>{uiText('ui.petBalances.chooseATemplateOrSetDates')}</small>
        </summary>
        <label>
          {uiText('ui.petBalances.policyTemplate')}
          <CustomSelect
            aria-label={uiText('ui.petBalances.policyTemplate')}
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
            <option value="">{uiText('ui.petBalances.customDates')}</option>
            {templates
              .filter((p) => p.service === service)
              .map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
          </CustomSelect>
        </label>
        <div className="hc-time-fields">
          <label>
            {uiText('ui.petBalances.validFrom')}
            <CustomDateInput
              required
              type="date"
              value={from}
              onChange={(value) => {
                setFrom(value);
                setTemplate('');
              }}
            />
          </label>
          <label>
            {uiText('ui.petBalances.validThrough')}
            <CustomDateInput
              required
              type="date"
              min={from}
              value={through}
              onChange={(value) => {
                setThrough(value);
                setTemplate('');
              }}
            />
          </label>
        </div>
        <details className="hc-template-create">
          <summary>{uiText('ui.petBalances.saveDatesAsATemplate')}</summary>
          <div className="hc-template-save">
            <label>
              {uiText('ui.petBalances.newTemplateName')}
              <input
                maxLength={80}
                value={templateName}
                onChange={(event) => setTemplateName(event.target.value)}
                placeholder={uiText('ui.petBalances.nameThisDateRange')}
              />
            </label>
            <Button
              icon="check"
              variant="secondary"
              type="button"
              className="hc-manage"
              onClick={saveTemplate}
            >
              {uiText('ui.petBalances.saveTemplate')}
            </Button>
          </div>
        </details>
        <p className="hc-balance-preview">
          {uiText('ui.petBalances.templatesCopyDatesIntoThisBalanceLaterChangesDo')}
        </p>
      </details>
      <div className="hc-settings-actions">
        <Button
          icon="close"
          variant="secondary"
          className="hc-manage"
          type="button"
          onClick={closeEditor}
        >
          {uiText('ui.petBalances.cancel')}
        </Button>
        <Button variant="primary" icon="check" className="hc-apply" type="submit">
          {mode === 'remove'
            ? uiText('ui.petBalances.saveAdjustment')
            : uiText('ui.petBalances.addBalance')}
        </Button>
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
                  {uiText('ui.petBalances.viewStatement')} ↗
                </a>
                <a className="hc-finance-link" href="/cancellation-policy/">
                  {uiText('ui.petBalances.cancellationPolicy')} ↗
                </a>
              </>
            )}
            {embedded && (
              <div className="hc-balance-sidebar-heading">
                <h2>{uiText('ui.petBalances.pets')}</h2>
                <span>
                  {pets.filter((p) => customer === 'all' || p.customer === customer).length}
                </span>
              </div>
            )}
            <label>
              {uiText('ui.petBalances.customer')}
              <CustomSelect
                aria-label={uiText('ui.petBalances.balanceCustomer')}
                value={customer}
                onChange={(event) => {
                  if (!confirmDiscardChanges(i18n.language, form.current)) return;
                  const value = event.target.value;
                  setCustomer(value);
                  setPet(pets.find((p) => value === 'all' || p.customer === value)?.name || '');
                  setEditing(false);
                }}
              >
                <option value="all">{uiText('ui.petBalances.allCustomers')}</option>
                {[...new Map(pets.map((p) => [p.customer, p.customerName])).entries()].map(
                  ([id, name]) => (
                    <option key={id} value={id}>
                      {name}
                    </option>
                  ),
                )}
              </CustomSelect>
            </label>
            <div
              className="hc-balance-pets"
              role="group"
              aria-label={uiText('ui.petBalances.chooseAPet')}
            >
              {pets
                .filter((p) => customer === 'all' || p.customer === customer)
                .map((p) => (
                  <button
                    type="button"
                    key={p.name}
                    aria-label={`${uiText('ui.petBalances.balance')}: ${p.name}`}
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
                  {uiText('ui.petBalances.viewStatement')} ↗
                </a>
                <a className="hc-finance-link" href="/cancellation-policy/">
                  {uiText('ui.petBalances.cancellationPolicy')} ↗
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
              <Button icon="plus" variant="primary" className="hc-apply" onClick={open}>
                {uiText('ui.petBalances.addBalance')}
              </Button>
            )}
          </div>

          <p className="hc-balance-preview">
            {uiText('ui.petBalances.noPaymentsDeductionsOrReservationsAreSaved')}
          </p>
          {(!editing || embedded) && (
            <div className="hc-balance-metrics">
              <div>
                <small>{uiText('ui.petBalances.recordedDays')}</small>
                <strong>{account ? account.days : 'N/A'}</strong>
              </div>
              <div>
                <small>{uiText('ui.petBalances.plannedHere')}</small>
                <strong>{planned}</strong>
              </div>
              <div>
                <small>{uiText('ui.petBalances.availableToPlan')}</small>
                <strong>{account ? account.days - planned : 'N/A'}</strong>
              </div>
            </div>
          )}
          {account && (!editing || embedded) && (
            <div className="hc-balance-terms">
              <span>
                {uiText('ui.petBalances.coverage')}{' '}
                <strong>
                  {account.validFrom} → {account.validThrough}
                </strong>
              </span>
            </div>
          )}
          {!account && (!editing || embedded) && (
            <div className="hc-balance-empty">
              <h4>{uiText('ui.petBalances.noBoardingBalanceYet')}</h4>
              <p>{uiText('ui.petBalances.addBoardingDaysAndChooseAPolicyTemplateOr')}</p>
            </div>
          )}
          {!embedded && editing
            ? editorForm
            : account &&
              !summaryOnly && (
                <div className="hc-balance-history">
                  <h4>{uiText('ui.petBalances.adjustmentHistory')}</h4>
                  {[...account.history].reverse().map((entry) => (
                    <div key={entry.id}>
                      <span className={entry.delta > 0 ? 'positive' : ''}>
                        {entry.delta > 0 ? '+' : ''}
                        {entry.delta} {uiText('ui.petBalances.days2')}
                      </span>
                      <div>
                        <strong>
                          {entry.reason || uiText('ui.petBalances.balanceAdjustment')}
                        </strong>
                        <small>
                          {new Date(entry.at).toLocaleString(localeFor(i18n.language))} ·{' '}
                          {uiText('ui.petBalances.adjustment2')}
                        </small>
                      </div>
                      <small>
                        {entry.after} {uiText('ui.petBalances.remaining')}
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
          title={uiText('ui.petBalances.addBalance')}
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
      title={uiText('ui.petBalances.boardingBalances')}
      onClose={leave}
    >
      {content}
    </Modal>
  );
}
