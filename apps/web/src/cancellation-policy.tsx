import { ApiError } from './api-client';
import { uiText } from './i18n.ts';
import CustomSelect from './custom-select';
import React from 'react';
import { useTranslation } from 'react-i18next';
import Modal from './modal';
import Icon from './icons';
import UnsavedChanges, { confirmDiscardChanges, markFormSaved } from './unsaved-changes';
export type CancellationPolicy = {
  name: string;
  fullDays: number;
  halfDays: number;
  shortPercent: string;
  basis: '' | 'hours' | 'calendar';
};
export const initialCancellationPolicy: CancellationPolicy = {
  name: '',
  fullDays: 14,
  halfDays: 7,
  shortPercent: '0',
  basis: '',
};
export default function CancellationPolicyPage({
  policy,
  onSave,
  onEditorClosed,
}: {
  policy: CancellationPolicy;
  onSave: (value: CancellationPolicy) => void | Promise<void>;
  onEditorClosed?: () => void;
}) {
  const { i18n } = useTranslation();

  const [editing, setEditing] = React.useState(false);
  const [draft, setDraft] = React.useState(policy);
  const [error, setError] = React.useState('');
  const [saved, setSaved] = React.useState(false);
  const [saving, setSaving] = React.useState(false),
    [uncertain, setUncertain] = React.useState(false),
    [stale, setStale] = React.useState(false);
  const blocked = saving || uncertain;
  const form = React.useRef<HTMLFormElement>(null);
  const dirty = JSON.stringify(draft) !== JSON.stringify(policy);
  function close() {
    if (!blocked && confirmDiscardChanges(i18n.language, form.current)) {
      setEditing(false);
      onEditorClosed?.();
    }
  }
  async function save(event: React.FormEvent) {
    event.preventDefault();
    if (saving || stale) return;
    if (
      !Number.isSafeInteger(draft.fullDays) ||
      !Number.isSafeInteger(draft.halfDays) ||
      draft.halfDays < 1 ||
      draft.fullDays <= draft.halfDays ||
      (draft.shortPercent !== '' &&
        (!Number.isFinite(Number(draft.shortPercent)) ||
          Number(draft.shortPercent) < 0 ||
          Number(draft.shortPercent) > 100))
    ) {
      setError(uiText('ui.cancellationPolicy.useWholeNoticeDaysWithTheFullRefundCutoff'));
      return;
    }
    setSaving(true);
    setError('');
    try {
      await onSave({ ...draft, name: draft.name.trim() });
      markFormSaved(form.current);
      setEditing(false);
      setSaved(true);
    } catch (error) {
      const conflict = error instanceof ApiError && error.status === 409,
        denied = error instanceof ApiError && [401, 403].includes(error.status);
      setStale(conflict || denied);
      setError(
        uiText(
          conflict
            ? 'ui.workspace.conflict'
            : denied
              ? 'ui.workspace.denied'
              : 'ui.workspace.loadError',
        ),
      );
      setUncertain(!(error instanceof ApiError) || error.status >= 500 || error.status === 429);
    } finally {
      setSaving(false);
    }
  }
  const basis =
    policy.basis === 'hours'
      ? uiText('ui.cancellationPolicy.elapsedTime24HoursPerDay')
      : policy.basis === 'calendar'
        ? uiText('ui.cancellationPolicy.calendarDaysHouseTimezone')
        : uiText('ui.cancellationPolicy.cutoffCalculationPending');
  return (
    <section className="hc-finance-page">
      <div className="hc-page-toolbar">
        <button
          className="hc-apply"
          onClick={() => {
            setDraft(policy);
            setError('');
            setStale(false);
            setUncertain(false);
            setEditing(true);
          }}
        >
          <Icon name="edit" />
          {uiText('ui.cancellationPolicy.editPolicy')}
        </button>
      </div>
      <div className="hc-policy-summary">
        <div>
          <span className="hc-draft-badge">{uiText('ui.cancellationPolicy.draft')}</span>
          <h2>{policy.name || uiText('ui.cancellationPolicy.boardingCancellation')}</h2>
          <p>{basis}</p>
        </div>
        <span>{uiText('ui.cancellationPolicy.appliesToBoardingBalance')}</span>
      </div>
      {saved && (
        <p className="hc-notice" role="status">
          {uiText('ui.cancellationPolicy.policyDraftSaved')}
        </p>
      )}
      <div className="hc-policy-cards">
        <article>
          <small>{uiText('ui.cancellationPolicy.fullRestoration')}</small>
          <strong>
            100<span>%</span>
          </strong>
          <h3>
            {uiText('ui.cancellationPolicy.daysBeforeArrival', { fullDays: policy.fullDays })}
          </h3>
          <p>{uiText('ui.cancellationPolicy.returnTheFullEligibleBookingBalance')}</p>
        </article>
        <article>
          <small>{uiText('ui.cancellationPolicy.partialRestoration')}</small>
          <strong>
            50<span>%</span>
          </strong>
          <h3>
            {uiText('ui.cancellationPolicy.daysBeforeArrival2', { halfDays: policy.halfDays })}
          </h3>
          <p>{uiText('ui.cancellationPolicy.returnHalfOfTheEligibleBookingBalance')}</p>
        </article>
        <article className="hc-policy-pending">
          <small>{uiText('ui.cancellationPolicy.shortNotice')}</small>
          <strong>
            {policy.shortPercent === '' ? 'N/A' : policy.shortPercent}
            <span>{policy.shortPercent === '' ? '' : '%'}</span>
          </strong>
          <h3>
            {uiText('ui.cancellationPolicy.lessThanDaysBeforeArrival', {
              halfDays: policy.halfDays,
            })}
          </h3>
          <p>
            {policy.shortPercent === ''
              ? uiText('ui.cancellationPolicy.restorationPercentageHasNotBeenSet')
              : uiText('ui.cancellationPolicy.draftPercentageAwaitingActivation')}
          </p>
        </article>
      </div>
      <div className="hc-policy-details">
        <section>
          <h2>{uiText('ui.cancellationPolicy.howBalanceIsRestored')}</h2>
          <p>
            {uiText('ui.cancellationPolicy.theIntendedWorkflowReturnsEligibleCreditToTheOriginal')}
          </p>
          <p>
            {uiText('ui.cancellationPolicy.thisPolicyDoesNotActivateAutomaticDeductionsOrRefunds')}
          </p>
        </section>
        <section>
          <h2>{uiText('ui.cancellationPolicy.stillToConfirm')}</h2>
          <ul>
            <li>{uiText('ui.cancellationPolicy.balanceUnitAndTreatmentOfFractionalRefunds')}</li>
            <li>{uiText('ui.cancellationPolicy.exactCutoffBoundariesAndBusinessTimezone')}</li>
            <li>{uiText('ui.cancellationPolicy.noShowsUsedCreditAndExpiredCredit')}</li>
          </ul>
        </section>
      </div>
      {editing && (
        <Modal
          title={uiText('ui.cancellationPolicy.editCancellationPolicy')}
          onClose={close}
          disabled={blocked}
          className="hc-policy-dialog"
        >
          <form ref={form} className="hc-settings-form" onSubmit={(event) => void save(event)}>
            <UnsavedChanges active={dirty || blocked} />
            {uncertain && <p role="alert">{uiText('ui.workspace.uncertain')}</p>}
            <p className="hc-balance-preview">
              {uiText('ui.cancellationPolicy.saveADraftForReviewLeavingAFieldUnconfigured')}
            </p>
            {error && (
              <p role="alert" className="hc-range-feedback">
                {error}
              </p>
            )}
            <fieldset disabled={blocked}>
              <label>
                {uiText('ui.cancellationPolicy.policyNameOptional')}
                <input
                  maxLength={80}
                  value={draft.name}
                  onChange={(event) => setDraft({ ...draft, name: event.target.value })}
                />
              </label>
              <div className="hc-time-fields">
                <label>
                  {uiText('ui.cancellationPolicy.fullRestorationNoticeDays')}
                  <input
                    required
                    type="number"
                    min="2"
                    step="1"
                    value={draft.fullDays}
                    onChange={(event) =>
                      setDraft({ ...draft, fullDays: Number(event.target.value) })
                    }
                  />
                </label>
                <label>
                  {uiText('ui.cancellationPolicy.halfRestorationNoticeDays')}
                  <input
                    required
                    type="number"
                    min="1"
                    step="1"
                    value={draft.halfDays}
                    onChange={(event) =>
                      setDraft({ ...draft, halfDays: Number(event.target.value) })
                    }
                  />
                </label>
              </div>
              <label>
                {uiText('ui.cancellationPolicy.shortNoticeRestoration')}
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.01"
                  placeholder={uiText('ui.cancellationPolicy.notConfigured')}
                  value={draft.shortPercent}
                  onChange={(event) => setDraft({ ...draft, shortPercent: event.target.value })}
                />
              </label>
              <label>
                {uiText('ui.cancellationPolicy.noticeCalculation')}
                <CustomSelect
                  value={draft.basis}
                  onChange={(event) =>
                    setDraft({ ...draft, basis: event.target.value as CancellationPolicy['basis'] })
                  }
                >
                  <option value="">{uiText('ui.cancellationPolicy.notConfigured')}</option>
                  <option value="hours">
                    {uiText('ui.cancellationPolicy.elapsedTime24HoursPerDay2')}
                  </option>
                  <option value="calendar">
                    {uiText('ui.cancellationPolicy.calendarDaysInTheHouseTimezone')}
                  </option>
                </CustomSelect>
              </label>
            </fieldset>
            <div className="hc-settings-actions">
              <button type="button" className="hc-manage" disabled={blocked} onClick={close}>
                {uiText('ui.cancellationPolicy.cancel')}
              </button>
              <button className="hc-apply" type="submit" disabled={saving || stale}>
                {uiText(
                  saving
                    ? 'ui.workspace.saving'
                    : uncertain
                      ? 'ui.workspace.retry'
                      : 'ui.cancellationPolicy.savePolicyDraft',
                )}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </section>
  );
}
