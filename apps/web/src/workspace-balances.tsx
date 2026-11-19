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
            <a className="language" href="/app/settings/cancellation/">
              {uiText('ui.houseCalendar.cancellationPolicy')}
            </a>
            <button className="language" onClick={() => setTemplates(true)}>
              {uiText('ui.templates.title')}
            </button>
            <button className="hc-apply" disabled={false} onClick={() => onAdjust(undefined)}>
              <Icon name="plus" />
              {t('addBalance')}
            </button>
          </div>
        )}
      </div>
      <div className="workspace-table-scroll">
        <table className="workspace-table">
          <caption className="sr-only">{t('balances')}</caption>
          <thead>
            <tr>
              <th>{t('pet')}</th>
              {!data.customer && <th>{t('customer')}</th>}
              <th>{t('balance')}</th>
              <th>{t('validFrom')}</th>
              <th>{t('validThrough')}</th>
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
                <td>
                  <span className="workspace-table-pet">
                    <PetInfo row={row} scope={scope} />
                    <strong>{row.pet.name}</strong>
                  </span>
                </td>
                {!data.customer && <td>{row.customer.name}</td>}
                <td>
                  {row.account ? `${row.account.days} ${t('days')}` : uiText('common.notAvailable')}
                </td>
                <td>{row.account?.validFrom ?? uiText('common.notAvailable')}</td>
                <td>{row.account?.validThrough ?? uiText('common.notAvailable')}</td>
                {data.admin && (
                  <td>
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
      <section className="workspace-statement" aria-label={t('history')}>
        <div className="customer-heading">
          <h2>{t('history')}</h2>
          <button
            className="language"
            disabled={!valid || exporting}
            onClick={() => void exportCsv()}
          >
            {t(exporting ? 'exporting' : 'exportCsv')}
          </button>
        </div>
        <div className="workspace-filters">
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
        <p className="workspace-time-note">{t('timesIn', { zone })}</p>
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
        <div className="workspace-metrics">
          <span>
            {t('shownAdded')}:{' '}
            <strong>{valid ? totals.added : uiText('common.notAvailable')}</strong>
          </span>
          <span>
            {t('shownRemoved')}:{' '}
            <strong>{valid ? totals.removed : uiText('common.notAvailable')}</strong>
          </span>
        </div>
        {!loading && !error && valid && !events.length && <p>{t('emptyActivity')}</p>}
        <div className="workspace-table-scroll">
          <table className="workspace-table">
            <caption className="sr-only">{t('history')}</caption>
            <thead>
              <tr>
                <th>{t('date')}</th>
                <th>{t('pet')}</th>
                <th>{t('activity')}</th>
                <th>{t('change')}</th>
                <th>{t('balanceAfter')}</th>
                <th>
                  <span className="sr-only">{t('entryDetails')}</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {events.map((row) => (
                <tr key={row.event.id}>
                  <td>{formatter.format(new Date(row.event.at))}</td>
                  <td>{row.pet.name}</td>
                  <td>
                    {t(
                      row.event.delta > 0 ? 'added' : row.event.delta < 0 ? 'correction' : 'terms',
                    )}
                  </td>
                  <td>
                    {row.event.delta > 0 ? '+' : ''}
                    {row.event.delta}
                  </td>
                  <td>{row.event.daysAfter}</td>
                  <td>
                    <button
                      className="language"
                      aria-label={`${t('entryDetails')}: ${row.pet.name} · ${row.event.at}`}
                      onClick={() => setDetail(row)}
                    >
                      {t('entryDetails')}
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
