import './workspace-views.css';
import { CustomerPicker, PetPicker } from './workspace-pickers';
import { useCursorPage, Pagination } from './pagination';
import ValidityTemplates, { TemplatePicker } from './validity-templates';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { localeFor, uiText } from './i18n.ts';
import CustomAutocomplete from './custom-autocomplete';
import CustomSelect from './custom-select';
import CustomDateInput from './custom-date-input';
import Modal from './modal';
import Icon from './icons';
import UnsavedChanges, { confirmDiscardChanges, markFormSaved } from './unsaved-changes';
import { apiJson, ApiError } from './api-client';
import { PetOption, PetInfo, WorkspaceAvatar } from './workspace-photos';
import { petKey, type WorkspaceData, type PetRow, type EventRow } from './workspace-data';
import { useWorkspaceText } from './workspace-text';
import { parseWallInput, shiftDay, startOfZonedDay } from './wall-time';
import { statementCsv, statementTotals, type StatementEntry } from './boarding-statement';
import type { components } from '../../../packages/contracts/generated';
export function BalanceEditor({
  data,
  initial,
  onClose,
  onSaved,
}: {
  data: WorkspaceData;
  initial?: PetRow;
  onClose: () => void;
  onSaved: () => void;
}) {
  const t = useWorkspaceText();
  const { i18n } = useTranslation();
  const [customer, setCustomer] = React.useState(initial?.customer.id ?? data.customer?.id ?? '');
  const [pet, setPet] = React.useState(initial?.pet.id ?? '');
  const [pickedRow, setPickedRow] = React.useState<PetRow | undefined>(initial);
  const row =
    pickedRow?.customer.id === customer && pickedRow.pet.id === pet
      ? pickedRow
      : data.rows.find((item) => item.customer.id === customer && item.pet.id === pet);
  const [delta, setDelta] = React.useState('');
  const [from, setFrom] = React.useState(initial?.account?.validFrom ?? '');
  const [through, setThrough] = React.useState(initial?.account?.validThrough ?? '');
  const [reason, setReason] = React.useState('');
  const [saving, setSaving] = React.useState(false);
  const [uncertain, setUncertain] = React.useState(false);
  const [error, setError] = React.useState('');
  const operation = React.useRef(crypto.randomUUID());
  const form = React.useRef<HTMLFormElement>(null);
  const baseline = React.useRef(JSON.stringify([customer, pet, delta, from, through, reason]));
  const blocked = saving || uncertain;
  const dirty = JSON.stringify([customer, pet, delta, from, through, reason]) !== baseline.current;
  const days =
    delta !== '' && Number.isSafeInteger(Number(delta))
      ? (row?.account?.days ?? 0) + Number(delta)
      : null;
  const valid =
    !!row &&
    days !== null &&
    days >= 0 &&
    Number.isSafeInteger(days) &&
    !!parseWallInput(from, false) &&
    !!parseWallInput(through, false) &&
    through >= from &&
    (!!row.account || Number(delta) > 0);
  function close() {
    if (!blocked && confirmDiscardChanges(i18n.language, form.current)) onClose();
  }
  async function save(event: React.FormEvent) {
    event.preventDefault();
    if (!valid || !row || saving) return;
    setSaving(true);
    setError('');
    try {
      await apiJson(`/customers/${customer}/pets/${pet}/balance`, {
        body: {
          operationId: operation.current,
          version: row.account?.version ?? 0,
          delta: Number(delta),
          validFrom: from,
          validThrough: through,
          reason,
        },
      });
      markFormSaved(form.current);
      onSaved();
    } catch (error) {
      setError(
        error instanceof ApiError
          ? error.status === 409
            ? 'conflict'
            : [401, 403].includes(error.status)
              ? 'denied'
              : error.status === 400
                ? 'invalid'
                : 'loadError'
          : 'loadError',
      );
      setUncertain(!(error instanceof ApiError) || error.status >= 500 || error.status === 429);
    } finally {
      setSaving(false);
    }
  }
  return (
    <Modal
      title={row?.account ? t('editBalance') : t('addBalance')}
      onClose={close}
      disabled={blocked}
    >
      <form
        ref={form}
        className="customer-form workspace-form"
        onSubmit={(event) => void save(event)}
      >
        <UnsavedChanges active={dirty || blocked} />
        <p>{t('balanceHint')}</p>
        {error && <p role="alert">{t(error)}</p>}
        {uncertain && <p role="alert">{t('uncertain')}</p>}
        <fieldset disabled={blocked}>
          <label>
            {t('customer')}
            <CustomerPicker
              label={t('customer')}
              required
              disabled={!!data.customer || !!initial}
              value={customer}
              initial={initial ? [initial.customer] : data.customers}
              onChange={(value) => {
                setCustomer(value);
                setPet('');
                setPickedRow(undefined);
                setFrom('');
                setThrough('');
                operation.current = crypto.randomUUID();
              }}
            />
          </label>
          <label>
            {t('pet')}
            <PetPicker
              label={t('pet')}
              required
              disabled={!customer || !!initial}
              scope={customer || undefined}
              initial={
                initial ? [initial] : data.rows.filter((row) => row.customer.id === customer)
              }
              value={pet && customer ? petKey(customer, pet) : ''}
              onChange={(_key, selected) => {
                setPet(selected?.pet.id ?? '');
                setPickedRow(selected);
                setFrom(selected?.account?.validFrom ?? '');
                setThrough(selected?.account?.validThrough ?? '');
                operation.current = crypto.randomUUID();
              }}
            />
          </label>
          <p className="workspace-current-balance">
            {t('balance')}:{' '}
            <strong>
              {row?.account ? `${row.account.days} ${t('days')}` : uiText('common.notAvailable')}
            </strong>
          </p>
          <label>
            {t('delta')}
            <input
              required
              type="number"
              step="1"
              min={row?.account ? -row.account.days : 1}
              max="1000000"
              value={delta}
              onChange={(event) => setDelta(event.target.value)}
            />
          </label>
          <TemplatePicker
            disabled={!row}
            onSelect={(template) => {
              setFrom(template.validFrom);
              setThrough(template.validThrough);
            }}
          />
          <div className="workspace-field-pair">
            <label>
              {t('validFrom')}
              <CustomDateInput required value={from} onChange={setFrom} />
            </label>
            <label>
              {t('validThrough')}
              <CustomDateInput required value={through} onChange={setThrough} />
            </label>
          </div>
          <label>
            {t('reason')}
            <input
              maxLength={1000}
              value={reason}
              onChange={(event) => setReason(event.target.value)}
            />
          </label>
          <p>
            {t('afterBalance')}:{' '}
            <strong>
              {days === null ? uiText('common.notAvailable') : `${days} ${t('days')}`}
            </strong>
          </p>
        </fieldset>
        <div className="portal-actions">
          <button
            className="button"
            type="submit"
            disabled={saving || !valid || error === 'conflict' || error === 'denied'}
          >
            {t(saving ? 'saving' : uncertain ? 'retry' : 'save')}
          </button>
          <button className="language" type="button" disabled={blocked} onClick={close}>
            {t('cancel')}
          </button>
        </div>
      </form>
    </Modal>
  );
}
export default function WorkspaceBalances({
  data,
  scope,
  selected,
  onSelect,
  onAdjust,
  search,
  onFilters,
  onCustomer,
}: {
  data: WorkspaceData;
  scope?: string;
  selected: string;
  onSelect: (key: string) => void;
  onAdjust: (row?: PetRow) => void;
  search: URLSearchParams;
  onFilters: (values: Record<string, string>) => void;
  onCustomer: (id: string) => void;
}) {
  const t = useWorkspaceText();
  const [templates, setTemplates] = React.useState(false);
  const { i18n } = useTranslation();

  const activity = search.get('panel') === 'activity';
  const b = (key: string) => uiText('ui.balanceView.' + key);
  const kind = search.get('kind') ?? '',
    from = search.get('from') ?? '',
    through = search.get('through') ?? '';

  const [error, setError] = React.useState(false);
  const [exporting, setExporting] = React.useState(false);
  const [detail, setDetail] = React.useState<EventRow | null>(null);
  const zone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const pair = selected.split('/');
  const chosen =
    pair.length === 2 ? { customer: { id: pair[0] }, pet: { id: pair[1] } } : undefined;
  const valid =
    (!selected || !!chosen) &&
    (!from || (!!parseWallInput(from, false) && !!startOfZonedDay(from, zone))) &&
    (!through ||
      (!!parseWallInput(through, false) && !!startOfZonedDay(shiftDay(through, 1), zone))) &&
    (!from || !through || through >= from);
  const params = React.useMemo(() => {
    const result = new URLSearchParams();
    if (scope) result.set('customerId', scope);
    if (chosen) {
      result.set('customerId', chosen.customer.id);
      result.set('petId', chosen.pet.id);
    }
    if (kind) result.set('kind', kind);
    if (from) {
      const value = startOfZonedDay(from, zone);
      if (value) result.set('from', value);
    }
    if (through) {
      const value = startOfZonedDay(shiftDay(through, 1), zone);
      if (value) result.set('through', value);
    }
    return result;
  }, [scope, chosen?.customer.id, chosen?.pet.id, kind, from, through, zone]);
  const history = useCursorPage<EventRow>('/workspace/events?' + params, data.rows, valid);
  const events = history.items,
    loading = history.loading;
  const balanceParams = new URLSearchParams();
  if (scope) balanceParams.set('customerId', scope);
  if (chosen) {
    balanceParams.set('customerId', chosen.customer.id);
    balanceParams.set('petId', chosen.pet.id);
  }
  const balances = useCursorPage<PetRow>('/workspace/pets?' + balanceParams, data.rows);
  const entries = (rows: EventRow[]): StatementEntry[] =>
    rows.map(({ customer, pet, event }) => ({
      id: event.id,
      pet: pet.name,
      customer: customer.id,
      customerName: customer.name,
      at: event.at,
      kind: event.delta > 0 ? 'added' : event.delta < 0 ? 'correction' : 'terms',
      delta: event.delta,
      before: event.daysAfter - event.delta,
      after: event.daysAfter,
      reason: event.reason,
      sequence: event.version,
    }));
  const totals = statementTotals(entries(events));
  const locale = localeFor(i18n.language);
  const formatter = React.useMemo(
    () =>
      new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short', timeZone: zone }),
    [locale, zone],
  );
  async function exportCsv() {
    if (exporting || !valid) return;
    setExporting(true);
    setError(false);
    try {
      let next: string | null = null;
      const all: EventRow[] = [];
      const seen = new Set<string>();
      do {
        const query = new URLSearchParams(params);
        if (next) query.set('cursor', next);
        const page = await apiJson<components['schemas']['WorkspaceEvents']>(
          '/workspace/events?' + query,
        );
        all.push(...page.items);
        next = page.nextCursor;
        if (next) {
          if (seen.has(next)) throw Error('Invalid pagination');
          seen.add(next);
        }
      } while (next);
      const csv = statementCsv(
        entries(all),
        [
          t('date'),
          t('reference'),
          t('customer'),
          t('pet'),
          t('activity'),
          t('change'),
          t('before'),
          t('balanceAfter'),
          t('reason'),
        ],
        { added: t('added'), correction: t('correction'), terms: t('terms') },
      );
      const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = t('statementFile');
      anchor.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch {
      setError(true);
    } finally {
      setExporting(false);
    }
  }
  const rows = balances.items;
  return (
    <section className="saved-balances">
      <div className="workspace-view-heading">
        <h1>{t('balances')}</h1>
        <p>{b('intro')}</p>
      </div>
      <div className="hc-scales workspace-view-tabs" role="tablist" aria-label={t('balances')}>
        {[false, true].map((value) => (
          <button
            key={String(value)}
            type="button"
            role="tab"
            id={value ? 'activity-tab' : 'balances-tab'}
            aria-selected={activity === value}
            tabIndex={activity === value ? 0 : -1}
            onKeyDown={(event) => {
              if (['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) {
                event.preventDefault();
                const next = event.key === 'Home' ? false : event.key === 'End' ? true : !value;
                onFilters({ panel: next ? 'activity' : '' });
                document.getElementById(next ? 'activity-tab' : 'balances-tab')?.focus();
              }
            }}
            aria-controls={value ? 'activity-panel' : 'balances-panel'}
            onClick={() => onFilters({ panel: value ? 'activity' : '' })}
          >
            <Icon name={value ? 'clock' : 'balance'} />
            {b(value ? 'activity' : 'current')}
          </button>
        ))}
      </div>
      {templates && <ValidityTemplates onClose={() => setTemplates(false)} />}
      <div className="workspace-section-actions workspace-balance-toolbar">
        {data.admin && !data.customer && (
          <label>
            {t('customer')}
            <CustomerPicker
              label={t('allCustomers')}
              value=""
              initial={data.customers}
              onChange={(id) => {
                if (id) onCustomer(id);
              }}
            />
          </label>
        )}
        <label>
          {t('pet')}
          <PetPicker
            label={t('allPets')}
            value={selected}
            scope={scope}
            initial={rows}
            onChange={onSelect}
          />
        </label>
        {selected && (
          <button
            className="icon-button"
            aria-label={t('clearFilters')}
            title={t('clearFilters')}
            onClick={() => onSelect('')}
          >
            <Icon name="reset" />
          </button>
        )}
        {data.admin && (
          <div className="workspace-primary-actions">
            <a
              className="icon-button"
              title={uiText('ui.houseCalendar.cancellationPolicy')}
              aria-label={uiText('ui.houseCalendar.cancellationPolicy')}
              href="/app/settings/cancellation/"
            >
              <Icon name="settings" />
            </a>
            <button
              className="icon-button"
              title={uiText('ui.templates.title')}
              aria-label={uiText('ui.templates.title')}
              onClick={() => setTemplates(true)}
            >
              <Icon name="calendar" />
            </button>
            <button className="hc-apply" disabled={false} onClick={() => onAdjust(undefined)}>
              <Icon name="plus" />
              {t('addBalance')}
            </button>
          </div>
        )}
      </div>
      <section id="balances-panel" role="tabpanel" aria-labelledby="balances-tab" hidden={activity}>
        <p className="workspace-view-hint">{b('currentHint')}</p>
        <div className="workspace-table-scroll">
          <table className="workspace-table">
            <caption className="sr-only">{t('balances')}</caption>
            <thead>
              <tr>
                <th>{t('pet')}</th>
                {!data.customer && <th>{t('customer')}</th>}
                <th>{t('balance')}</th>
                <th>{b('validity')}</th>
                <th>
                  <span className="sr-only">{b('petActivity')}</span>
                </th>
                {data.admin && (
                  <th>
                    <span className="sr-only">{t('editBalance')}</span>
                  </th>
                )}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={petKey(row.customer.id, row.pet.id)}>
                  <td className="balance-pet-cell">
                    <span className="workspace-table-pet">
                      <PetInfo row={row} scope={scope} />
                      <strong>{row.pet.name}</strong>
                    </span>
                  </td>
                  {!data.customer && <td className="balance-customer-cell">{row.customer.name}</td>}
                  <td className="balance-days-cell">
                    {row.account ? (
                      <strong className="balance-days">
                        {row.account.days} <small>{t('days')}</small>
                      </strong>
                    ) : (
                      <span className="workspace-muted">{b('noBalance')}</span>
                    )}
                  </td>
                  <td className="balance-validity-cell">
                    {row.account ? (
                      <span className="balance-validity">
                        <span>{row.account.validFrom}</span>
                        <span>– {row.account.validThrough}</span>
                      </span>
                    ) : (
                      '—'
                    )}
                  </td>
                  <td className="balance-history-cell">
                    <button
                      type="button"
                      className="icon-button"
                      title={b('petActivity')}
                      aria-label={`${b('petActivity')}: ${row.pet.name}`}
                      onClick={() =>
                        onFilters({ pet: petKey(row.customer.id, row.pet.id), panel: 'activity' })
                      }
                    >
                      <Icon name="clock" />
                    </button>
                  </td>
                  {data.admin && (
                    <td className="balance-edit-cell">
                      <button
                        className="icon-button"
                        title={t('editBalance')}
                        aria-label={`${t('editBalance')}: ${row.pet.name}`}
                        onClick={() => onAdjust(row)}
                      >
                        <Icon name="edit" />
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {balances.loading && <p role="status">{t('loading')}</p>}
        <Pagination page={balances} label={uiText('ui.pagination.balances')} />
        {!balances.loading && !balances.error && !rows.length && <p>{t('emptyMatches')}</p>}
      </section>
      <section
        id="activity-panel"
        role="tabpanel"
        aria-labelledby="activity-tab"
        hidden={!activity}
        className="workspace-statement"
        aria-label={t('history')}
      >
        <div className="activity-heading">
          <div>
            <h2>{b('activity')}</h2>
            <p className="workspace-view-hint">{b('activityHint')}</p>
          </div>
          <button
            className="icon-button"
            title={t(exporting ? 'exporting' : 'exportCsv')}
            aria-label={t(exporting ? 'exporting' : 'exportCsv')}
            disabled={!valid || exporting}
            onClick={() => void exportCsv()}
          >
            <Icon name="download" />
          </button>
        </div>
        <div className="workspace-filters activity-filter-bar">
          <label>
            {t('activity')}
            <CustomSelect
              value={kind}
              onChange={(event) => onFilters({ kind: event.target.value })}
            >
              <option value="">{t('allActivity')}</option>
              {['added', 'correction', 'terms'].map((value) => (
                <option key={value} value={value}>
                  {t(value)}
                </option>
              ))}
            </CustomSelect>
          </label>
          <label>
            {t('from')}
            <CustomDateInput value={from} onChange={(value) => onFilters({ from: value })} />
          </label>
          <label>
            {t('through')}
            <CustomDateInput value={through} onChange={(value) => onFilters({ through: value })} />
          </label>
        </div>
        <div className="activity-filter-note">
          <span>{t('timesIn', { zone })}</span>
          <button
            type="button"
            className="icon-button"
            title={t('clearFilters')}
            aria-label={t('clearFilters')}
            disabled={!kind && !from && !through}
            onClick={() => onFilters({ kind: '', from: '', through: '' })}
          >
            <Icon name="reset" />
          </button>
        </div>
        {!valid && <p role="alert">{t('invalidDates')}</p>}
        {error && (
          <p role="alert">
            {t('loadError')}{' '}
            <button className="language" onClick={history.reload}>
              {t('retry')}
            </button>
          </p>
        )}
        {loading && <p role="status">{t('loading')}</p>}
        <div className="activity-page-summary" aria-label={b('pageSummary')}>
          <span>{b('pageSummary')}</span>
          <span>
            <Icon name="plus" />
            {t('shownAdded')} <strong>{valid ? totals.added : '—'}</strong>
          </span>
          <span>
            <Icon name="edit" />
            {t('shownRemoved')} <strong>{valid ? totals.removed : '—'}</strong>
          </span>
          <span>
            {b('netChange')}{' '}
            <strong>{valid ? (totals.net > 0 ? '+' : '') + totals.net : '—'}</strong>
          </span>
        </div>
        {!loading && !error && valid && !events.length && (
          <div className="activity-empty">
            <Icon name="clock" />
            <p>{t('emptyActivity')}</p>
          </div>
        )}
        <div className="workspace-table-scroll" hidden={!events.length}>
          <table className="workspace-table">
            <caption className="sr-only">{t('history')}</caption>
            <thead>
              <tr>
                <th>{t('date')}</th>
                <th>{t('pet')}</th>
                <th>{t('activity')}</th>
                <th>{t('change')}</th>
                <th>{b('balanceTransition')}</th>
                <th>
                  <span className="sr-only">{t('entryDetails')}</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {events.map((row) => (
                <tr key={row.event.id}>
                  <td className="activity-date-cell">{formatter.format(new Date(row.event.at))}</td>
                  <td className="activity-pet-cell">
                    <span className="activity-identity">
                      <WorkspaceAvatar
                        row={{ customer: row.customer, pet: row.pet, account: null }}
                      />
                      <strong>{row.pet.name}</strong>
                    </span>
                    {!data.customer && (
                      <small className="activity-customer">{row.customer.name}</small>
                    )}
                  </td>
                  <td className="activity-kind-cell">
                    <span className="activity-event-kind">
                      <Icon
                        name={
                          row.event.delta > 0 ? 'plus' : row.event.delta < 0 ? 'edit' : 'calendar'
                        }
                      />
                      {t(
                        row.event.delta > 0
                          ? 'added'
                          : row.event.delta < 0
                            ? 'correction'
                            : 'terms',
                      )}
                    </span>
                  </td>
                  <td className="activity-delta-cell">
                    <strong
                      className="activity-change"
                      data-direction={
                        row.event.delta > 0 ? 'added' : row.event.delta < 0 ? 'removed' : 'terms'
                      }
                    >
                      {row.event.delta > 0 ? '+' : ''}
                      {row.event.delta} <small>{t('days')}</small>
                    </strong>
                  </td>
                  <td className="activity-after-cell" data-label={b('balanceTransition')}>
                    <span className="activity-running-balance">
                      <span>{row.event.daysAfter - row.event.delta}</span>
                      <Icon name="chevron-right" />
                      <strong>{row.event.daysAfter}</strong>
                    </span>
                    <small className="activity-note">
                      {row.event.reason ||
                        (row.event.delta === 0
                          ? `${row.event.validFrom} – ${row.event.validThrough}`
                          : '')}
                    </small>
                  </td>
                  <td className="activity-detail-cell">
                    <button
                      className="icon-button"
                      title={t('entryDetails')}
                      aria-label={`${t('entryDetails')}: ${row.pet.name} · ${row.event.at}`}
                      onClick={() => setDetail(row)}
                    >
                      <Icon name="search" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p>{t('shown', { count: events.length })}</p>
        <Pagination page={history} label={uiText('ui.pagination.history')} />
      </section>
      {detail && (
        <Modal title={t('history')} onClose={() => setDetail(null)}>
          <dl className="workspace-details">
            {[
              [t('customer'), detail.customer.name],
              [t('pet'), detail.pet.name],
              [t('date'), formatter.format(new Date(detail.event.at))],
              [t('change'), String(detail.event.delta)],
              [t('balanceAfter'), String(detail.event.daysAfter)],
              [t('validFrom'), detail.event.validFrom],
              [t('validThrough'), detail.event.validThrough],
              [t('reason'), detail.event.reason || uiText('common.notAvailable')],
            ].map(([label, value]) => (
              <div key={label}>
                <dt>{label}</dt>
                <dd>{value}</dd>
              </div>
            ))}
          </dl>
        </Modal>
      )}
    </section>
  );
}
