import { useDialogState } from './dialog-routing';
import { updateQuery } from './routing';
import { RecordList, useRecordList } from './record-list';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { apiJson } from './api-client';
import { uiText, localeFor } from './i18n';
import { CustomerPicker } from './workspace-pickers';
import type { WorkspaceData } from './workspace-data';
import type { TestPaymentRead, TestCard, TestCharge } from '../../../packages/payments/types';
import Button from './button';
import Modal from './modal';
import CustomSelect from './custom-select';
import CustomDateInput from './custom-date-input';
import SearchInput from './search-input';
import { parseWallInput, shiftDay, startOfZonedDay } from './wall-time';
import './payments.css';
const paymentBatch = (response: TestPaymentRead) => ({
  items: response.charges,
  nextCursor: response.nextCursor,
});
export default function Payments({
  data,
  search,
  zone,
}: {
  data: WorkspaceData;
  search: URLSearchParams;
  zone: string;
}) {
  const { i18n } = useTranslation();
  const t = (key: string) => uiText('ui.payments.' + key);
  const customer = data.customer?.id ?? (data.admin ? (search.get('customer') ?? '') : '');
  const from = search.get('paymentFrom') ?? '',
    through = search.get('paymentThrough') ?? '';
  const query = search.get('paymentSearch') ?? '';
  const [searchInput, setSearchInput] = React.useState(query);
  React.useEffect(() => setSearchInput(query), [query]);
  React.useEffect(() => {
    const timer = setTimeout(() => {
      if (searchInput.trim() !== query) updateQuery({ paymentSearch: searchInput.trim() || null });
    }, 250);
    return () => clearTimeout(timer);
  }, [searchInput, query]);
  const start = from && parseWallInput(from, false) ? startOfZonedDay(from, zone) : null;
  const end =
    through && parseWallInput(through, false) ? startOfZonedDay(shiftDay(through, 1), zone) : null;
  const valid = (!from || !!start) && (!through || !!end) && (!start || !end || start < end);
  const filters = new URLSearchParams();
  if (start) filters.set('from', start);
  if (end) filters.set('through', end);
  if (query) filters.set('search', query);
  const [enabled, setEnabled] = React.useState<boolean | null>(null);
  const [error, setError] = React.useState(false),
    [busy, setBusy] = React.useState(false),
    [editing, setEditing] = useDialogState('test-card', false);
  const [saveError, setSaveError] = React.useState(false);
  const [scenario, setScenario] = React.useState<TestCard['scenario']>('approved');
  const [revision, setRevision] = React.useState(0);
  const charges = useRecordList<TestCharge, TestPaymentRead>(
    `/customers/${customer}/test-payments?${filters}`,
    revision,
    !!customer && enabled === true && valid,
    paymentBatch,
  );
  const [cachedCard, setCachedCard] = React.useState<{ customer: string; card: TestCard } | null>(
    null,
  );
  React.useEffect(() => {
    if (charges.response) setCachedCard({ customer, card: charges.response.card });
  }, [charges.response, customer]);
  const card =
    charges.response?.card ?? (cachedCard?.customer === customer ? cachedCard.card : null);
  const result = card ? { card } : undefined;
  React.useEffect(() => {
    setError(false);
    const abort = new AbortController();
    void apiJson<{ testMode: boolean }>('/payment-capabilities', { signal: abort.signal })
      .then((r) => setEnabled(r.testMode))
      .catch(() => {
        if (!abort.signal.aborted) setError(true);
      });
    return () => abort.abort();
  }, [revision]);
  React.useEffect(() => {
    if (editing && result)
      setScenario(result.card.scenario === 'none' ? 'approved' : result.card.scenario);
  }, [editing, result?.card.version]);
  async function save() {
    if (!result || busy) return;
    setBusy(true);
    setError(false);
    setSaveError(false);
    try {
      await apiJson(`/customers/${customer}/test-payments`, {
        body: { version: result.card.version, scenario },
      });
      setEditing(false);
      setRevision((v) => v + 1);
    } catch {
      setSaveError(true);
      setEditing(false);
      setRevision((v) => v + 1);
    } finally {
      setBusy(false);
    }
  }
  const money = (cents: number) =>
    new Intl.NumberFormat(localeFor(i18n.language), { style: 'currency', currency: 'USD' }).format(
      cents / 100,
    );
  return (
    <section className="payments-page record-workspace tab-workspace" aria-label={t('title')}>
      {enabled === true && <p className="payments-notice">{t('testMode')}</p>}
      {enabled === false ? (
        <p role="status">{t('unavailable')}</p>
      ) : (
        <>
          <div className="payments-filters">
            {data.admin && !data.customer && (
              <label>
                {uiText('ui.workspace.customer')}
                <CustomerPicker
                  label={uiText('ui.workspace.customer')}
                  value={customer}
                  onChange={(id) => {
                    updateQuery({ customer: id });
                    setSaveError(false);
                    setEditing(false);
                  }}
                  initial={data.rows.map((r) => r.customer)}
                />
              </label>
            )}
            <label>
              {t('searchPayments')}
              <SearchInput
                value={searchInput}
                maxLength={80}
                onChange={(event) => setSearchInput(event.target.value)}
              />
            </label>
            <label>
              {uiText('ui.workspace.from')}
              <CustomDateInput
                value={from}
                onChange={(value) => updateQuery({ paymentFrom: value || null })}
              />
            </label>
            <label>
              {uiText('ui.workspace.through')}
              <CustomDateInput
                value={through}
                onChange={(value) => updateQuery({ paymentThrough: value || null })}
              />
            </label>
          </div>
          <p className="payments-timezone">{uiText('ui.workspace.timesIn', { zone })}</p>
          {!valid && <p role="alert">{uiText('ui.workspace.invalidDates')}</p>}
          {!customer && <p>{t('chooseCustomer')}</p>}
          {customer && enabled && valid && !result && !charges.error && !error && (
            <p role="status">{uiText('ui.workspace.loading')}</p>
          )}
          {result && (
            <>
              <div className="payments-method">
                <PaymentCard card={result.card} />
                <Button
                  icon="edit"
                  variant="secondary"
                  onClick={() => {
                    setScenario(
                      result.card.scenario === 'none' ? 'approved' : result.card.scenario,
                    );
                    setEditing(true);
                  }}
                >
                  {t(result.card.scenario === 'none' ? 'addCard' : 'manageCard')}
                </Button>
              </div>
              <h2>{t('charges')}</h2>
              <RecordList
                list={charges}
                label={t('charges')}
                resetKey={customer + filters.toString()}
              >
                {!charges.items.length && !charges.loading && !charges.error && valid ? (
                  <p>{t(query || from || through ? 'noMatchingCharges' : 'noCharges')}</p>
                ) : (
                  <div className="payments-table">
                    <table>
                      <thead>
                        <tr>
                          <th>{t('date')}</th>
                          <th>{t('booking')}</th>
                          <th>{t('card')}</th>
                          <th>{t('amount')}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {charges.items.map((c) => (
                          <tr key={c.id}>
                            <td data-label={t('date')}>
                              {new Intl.DateTimeFormat(localeFor(i18n.language), {
                                dateStyle: 'medium',
                                timeStyle: 'short',
                                timeZone: zone,
                              }).format(new Date(c.at))}
                            </td>
                            <td data-label={t('booking')}>
                              <a
                                href={
                                  '/app/calendar/bookings/' +
                                  c.bookingId +
                                  '/' +
                                  (data.admin
                                    ? '?' + new URLSearchParams({ asCustomer: customer })
                                    : '')
                                }
                              >
                                {c.bookingId.slice(0, 8)}
                              </a>
                            </td>
                            <td data-label={t('card')}>•••• {c.last4}</td>
                            <td data-label={t('amount')}>{money(c.amountCents)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </RecordList>
            </>
          )}
        </>
      )}
      {charges.error && !result && (
        <RecordList list={charges} label={t('charges')}>
          {null}
        </RecordList>
      )}
      {(error || saveError) && (
        <div role="alert">
          <p>{uiText('ui.workspace.loadError')}</p>
          <Button variant="secondary" onClick={() => setRevision((v) => v + 1)}>
            {uiText('ui.workspace.retry')}
          </Button>
        </div>
      )}
      {editing && result && (
        <Modal
          title={t('manageCard')}
          onClose={() => {
            if (!busy) setEditing(false);
          }}
          disabled={busy}
        >
          <PaymentCard
            card={{
              ...result.card,
              scenario,
              last4: scenario === 'none' ? null : scenario === 'approved' ? '4242' : '0002',
            }}
          />
          <p>{t('testNotice')}</p>
          <label>
            {t('testOutcome')}
            <CustomSelect
              value={scenario}
              disabled={busy}
              onChange={(e) => setScenario(e.target.value as TestCard['scenario'])}
            >
              <option value="approved">{t('approved')}</option>
              <option value="declined">{t('declined')}</option>
              <option value="none">{t('remove')}</option>
            </CustomSelect>
          </label>
          <div className="payments-actions">
            <Button variant="secondary" disabled={busy} onClick={() => setEditing(false)}>
              {uiText('ui.workspace.cancel')}
            </Button>
            <Button icon="check" disabled={busy} onClick={() => void save()}>
              {uiText('ui.workspace.save')}
            </Button>
          </div>
        </Modal>
      )}
    </section>
  );
}

function PaymentCard({ card }: { card: TestCard }) {
  const t = (key: string) => uiText('ui.payments.' + key);
  return (
    <div className="payments-card" data-empty={card.scenario === 'none'} aria-label={t('testCard')}>
      <div className="payments-card-top">
        <strong>{t('paymentCard')}</strong>
        <span className="payments-card-badge">{t('testCard')}</span>
      </div>
      <div className="payments-card-symbols" aria-hidden="true">
        <svg className="payments-chip" viewBox="0 0 48 36">
          <rect x="1" y="1" width="46" height="34" rx="7" />
          <path d="M17 1v10H1m46 0H31V1M1 25h16v10m14 0V25h16M17 11h14v14H17zM1 18h16m14 0h16" />
        </svg>
        <svg className="payments-contactless" viewBox="0 0 28 36">
          <path d="M7 12a11 11 0 0 1 0 12m6-18a21 21 0 0 1 0 24M19 1a31 31 0 0 1 0 34" />
        </svg>
      </div>
      <span className="payments-card-number">
        {card.last4 ? '•••• •••• •••• ' + card.last4 : t('noCard')}
      </span>
      <div className="payments-card-bottom">
        <span>
          {t(
            card.scenario === 'approved'
              ? 'approved'
              : card.scenario === 'declined'
                ? 'declined'
                : 'noCard',
          )}
        </span>
        <span>{t('sampleOnly')}</span>
      </div>
    </div>
  );
}
