import { useDialogState } from './dialog-routing';
import Button from './button';
import IconButton from './icon-button';
import SegmentedTabs from './segmented-tabs';
import './workspace-views.css';
import { CustomerPicker, PetPicker } from './workspace-pickers';
import { useRecordList, RecordList } from './record-list';
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
      className="balance-editor-dialog workflow-dialog"
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
        <div className="workflow-form-body">
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
        </div>
        <div className="portal-actions">
          <Button
            icon="check"
            variant="primary"
            type="submit"
            disabled={saving || !valid || error === 'conflict' || error === 'denied'}
          >
            {t(saving ? 'saving' : uncertain ? 'retry' : 'save')}
          </Button>
          <Button icon="close" variant="secondary" type="button" disabled={blocked} onClick={close}>
            {t('cancel')}
          </Button>
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
  const [templates, setTemplates] = useDialogState('validity-templates', false, {
    decode: (raw) => {
      if (!data.admin) throw Error('Administrator required');
      const value = JSON.parse(raw);
      if (typeof value !== 'boolean') throw Error('Invalid dialog');
      return value;
    },
  });
  const { i18n } = useTranslation();

  const activity = search.get('panel') === 'activity';
  const b = (key: string) => uiText('ui.balanceView.' + key);
  const kind = search.get('kind') ?? '',
    from = search.get('from') ?? '',
    through = search.get('through') ?? '';

  const [error, setError] = React.useState(false);
  const [exporting, setExporting] = React.useState(false);
  const [detail, setDetail] = useDialogState<EventRow | null>('activity-detail', null, {
    encode: (value) =>
      value ? value.customer.id + '/' + value.pet.id + '/' + value.event.id : null,
    decode: async (raw, signal) => {
      const [customerId, petId, id] = raw.split('/');
      let cursor: string | null = null;
      do {
        const page: components['schemas']['WorkspaceEvents'] = await apiJson<
          components['schemas']['WorkspaceEvents']
        >(
          '/workspace/events?' +
            new URLSearchParams({ customerId, petId, ...(cursor ? { cursor } : {}) }),
          { signal },
        );
        const item = page.items.find((item) => item.event.id === id);
        if (item) return item;
        cursor = page.nextCursor;
      } while (cursor);
      throw Error('Activity unavailable');
    },
  });
  const customerFilter = scope ?? data.customer?.id ?? search.get('customer') ?? '';
  const zone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const pair = selected.split('/');
  const chosen =
    pair.length === 2 ? { customer: { id: pair[0] }, pet: { id: pair[1] } } : undefined;
  const valid =
    (!selected || !!chosen) &&
    (!customerFilter || !chosen || chosen.customer.id === customerFilter) &&
    (!from || (!!parseWallInput(from, false) && !!startOfZonedDay(from, zone))) &&
    (!through ||
      (!!parseWallInput(through, false) && !!startOfZonedDay(shiftDay(through, 1), zone))) &&
    (!from || !through || through >= from);
  const params = React.useMemo(() => {
    const result = new URLSearchParams();
    if (customerFilter) result.set('customerId', customerFilter);
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
  }, [customerFilter, chosen?.customer.id, chosen?.pet.id, kind, from, through, zone]);
  const history = useRecordList<EventRow>(
    '/workspace/events?' + params,
    data.rows,
    valid && activity,
  );
  const events = history.items,
    loading = history.loading;
  const balanceParams = new URLSearchParams();
  if (customerFilter) balanceParams.set('customerId', customerFilter);
  if (chosen) {
    balanceParams.set('customerId', chosen.customer.id);
    balanceParams.set('petId', chosen.pet.id);
  }
  const balances = useRecordList<PetRow>(
    '/workspace/pets?' + balanceParams,
    data.rows,
    valid && !activity,
  );
  const entries = (rows: EventRow[]): StatementEntry[] =>
    rows
      .filter((row) => !row.event.bookingId)
      .map(({ customer, pet, event }) => ({
        id: event.id,
        pet: pet.name,
        customer: customer.id,
        customerName: customer.name,
        at: event.at,
        kind: event.delta > 0 ? 'added' : event.delta < 0 ? 'correction' : 'terms',
        delta: event.delta,
        before: (event.daysAfter ?? 0) - event.delta,
        after: event.daysAfter ?? 0,
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
        const page: components['schemas']['WorkspaceEvents'] = await apiJson<
          components['schemas']['WorkspaceEvents']
        >('/workspace/events?' + query);
        all.push(...page.items);
        next = page.nextCursor;
        if (next) {
          if (seen.has(next)) throw Error('Invalid pagination');
          seen.add(next);
        }
      } while (next);
      const csv = statementCsv(
        all.map(({ customer, pet, event }) => ({
          id: event.id,
          at: event.at,
          customer: customer.id,
          customerName: customer.name,
          pet: pet.name,
          kind:
            event.kind ?? (event.delta > 0 ? 'added' : event.delta < 0 ? 'correction' : 'terms'),
          delta: event.delta,
          before: event.daysAfter === null ? null : event.daysAfter - event.delta,
          after: event.daysAfter,
          reason: event.bookingId ? `${event.arrival} – ${event.pickup}` : event.reason,
          sequence: event.version,
        })),
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
        {
          added: t('added'),
          correction: t('correction'),
          terms: t('terms'),
          booking: t('booking'),
          cancelled: t('cancelled'),
          booking_charge: t('booking_charge'),
        },
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
    <section className="saved-balances record-workspace">
      <div className="workspace-view-heading">
        <h1>{t('balances')}</h1>
        <p>{b('intro')}</p>
      </div>
      <SegmentedTabs
        className="workspace-view-tabs"
        label={t('balances')}
        value={activity ? 'activity' : 'balances'}
        onChange={(value) => onFilters({ panel: value === 'activity' ? 'activity' : '' })}
        items={(['balances', 'activity'] as const).map((value) => ({
          value,
          id: value + '-tab',
          panelId: value + '-panel',
          label: (
            <>
              <Icon name={value === 'activity' ? 'clock' : 'balance'} />
              {b(value === 'activity' ? 'activity' : 'current')}
            </>
          ),
        }))}
      />
      {templates && <ValidityTemplates onClose={() => setTemplates(false)} />}
      <div className="workspace-section-actions workspace-balance-toolbar">
        {data.admin && !data.customer && (
          <label>
            {t('customer')}
            <CustomerPicker
              allowAll
              label={t('allCustomers')}
              value={customerFilter}
              initial={data.customers}
              onChange={(id) => onFilters({ customer: id, pet: '' })}
            />
          </label>
        )}
        <label>
          {t('pet')}
          <PetPicker
            label={t('allPets')}
            value={selected}
            scope={customerFilter || undefined}
            initial={rows}
            onChange={onSelect}
          />
        </label>
        {selected && (
          <IconButton
            aria-label={t('clearFilters')}
            title={t('clearFilters')}
            onClick={() => onSelect('')}
          >
            <Icon name="close" />
          </IconButton>
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
            <IconButton
              title={uiText('ui.templates.title')}
              aria-label={uiText('ui.templates.title')}
              onClick={() => setTemplates(true)}
            >
              <Icon name="calendar" />
            </IconButton>
            <Button
              variant="primary"
              className="hc-apply"
              disabled={false}
              onClick={() => onAdjust(undefined)}
            >
              <Icon name="plus" />
              {t('addBalance')}
            </Button>
          </div>
        )}
      </div>
      <section id="balances-panel" role="tabpanel" aria-labelledby="balances-tab" hidden={activity}>
        <p className="workspace-view-hint">{b('currentHint')}</p>
        <RecordList list={balances} label={t('balances')} resetKey={balanceParams.toString()}>
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
                    {!data.customer && (
                      <td className="balance-customer-cell">{row.customer.name}</td>
                    )}
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
                        <span className="workspace-muted">{b('noBalance')}</span>
                      )}
                    </td>
                    <td className="balance-history-cell">
                      <IconButton
                        type="button"

                        title={b('petActivity')}
                        aria-label={`${b('petActivity')}: ${row.pet.name}`}
                        onClick={() =>
                          onFilters({ pet: petKey(row.customer.id, row.pet.id), panel: 'activity' })
                        }
                      >
                        <Icon name="clock" />
                      </IconButton>
                    </td>
                    {data.admin && (
                      <td className="balance-edit-cell">
                        <IconButton
                          title={t('editBalance')}
                          aria-label={`${t('editBalance')}: ${row.pet.name}`}
                          onClick={() => onAdjust(row)}
                        >
                          <Icon name="edit" />
                        </IconButton>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {!balances.loading && !balances.error && !balances.nextCursor && !rows.length && (
            <p>{t('emptyMatches')}</p>
          )}
        </RecordList>
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
          <IconButton
            title={t(exporting ? 'exporting' : 'exportCsv')}
            aria-label={t(exporting ? 'exporting' : 'exportCsv')}
            disabled={!valid || exporting}
            onClick={() => void exportCsv()}
          >
            <Icon name="download" />
          </IconButton>
        </div>
        <div className="workspace-filters activity-filter-bar">
          <label>
            {t('activity')}
            <CustomSelect
              value={kind}
              onChange={(event) => onFilters({ kind: event.target.value })}
            >
              <option value="">{t('allActivity')}</option>
              {['added', 'correction', 'terms', 'booking', 'cancelled', 'booking_charge'].map(
                (value) => (
                  <option key={value} value={value}>
                    {t(value)}
                  </option>
                ),
              )}
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
          <IconButton
            type="button"

            title={t('clearFilters')}
            aria-label={t('clearFilters')}
            disabled={!kind && !from && !through}
            onClick={() => onFilters({ kind: '', from: '', through: '' })}
          >
            <Icon name="close" />
          </IconButton>
        </div>
        {!valid && <p role="alert">{t('invalidDates')}</p>}
        {error && (
          <p role="alert">
            {t('loadError')}{' '}
            <Button variant="secondary" onClick={() => void exportCsv()}>
              {t('retry')}
            </Button>
          </p>
        )}
        <RecordList list={history} label={t('history')} resetKey={params.toString()}>
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
          {!loading &&
            !history.error &&
            !history.nextCursor &&
            !error &&
            valid &&
            !events.length && (
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
                  <th>
                    <span className="sr-only">{t('entryDetails')}</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {events.map((row) => (
                  <tr key={(row.event.kind ?? 'balance') + ':' + row.event.id}>
                    <td className="activity-date-cell">
                      {formatter.format(new Date(row.event.at))}
                    </td>
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
                          row.event.kind ??
                            (row.event.delta > 0
                              ? 'added'
                              : row.event.delta < 0
                                ? 'correction'
                                : 'terms'),
                        )}
                      </span>
                      {row.event.bookingId && (
                        <small className="activity-note">
                          {formatter.format(new Date(row.event.arrival!))} –{' '}
                          {formatter.format(new Date(row.event.pickup!))}
                        </small>
                      )}
                      <small className="activity-note">
                        {row.event.reason ||
                          (row.event.delta === 0 && !row.event.bookingId
                            ? `${row.event.validFrom} – ${row.event.validThrough}`
                            : '')}
                      </small>
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
                    <td className="activity-detail-cell">
                      <IconButton
                        title={t('entryDetails')}
                        aria-label={`${t('entryDetails')}: ${row.pet.name} · ${row.event.at}`}
                        onClick={() => setDetail(row)}
                      >
                        <Icon name="search" />
                      </IconButton>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </RecordList>
      </section>
      {detail && (
        <Modal title={t('history')} onClose={() => setDetail(null)}>
          <dl className="workspace-details">
            {[
              [t('customer'), detail.customer.name],
              [t('pet'), detail.pet.name],
              [t('date'), formatter.format(new Date(detail.event.at))],
              [t('change'), String(detail.event.delta)],
              ...(detail.event.bookingId
                ? [
                    [t('arrival'), formatter.format(new Date(detail.event.arrival!))],
                    [t('pickup'), formatter.format(new Date(detail.event.pickup!))],
                  ]
                : [
                    [t('balanceAfter'), String(detail.event.daysAfter)],
                    [t('validFrom'), detail.event.validFrom],
                    [t('validThrough'), detail.event.validThrough],
                  ]),
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
