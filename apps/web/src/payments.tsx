import { useDialogState } from './dialog-routing';
import { updateQuery } from './routing';
import { Pagination } from './pagination';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { apiJson } from './api-client';
import { uiText, localeFor } from './i18n';
import { CustomerPicker } from './workspace-pickers';
import type { WorkspaceData } from './workspace-data';
import type { TestPaymentRead, TestCard } from '../../../packages/payments/types';
import Button from './button';
import Modal from './modal';
import CustomSelect from './custom-select';
import './payments.css';
export default function Payments({ data }: { data: WorkspaceData }) {
  const { i18n } = useTranslation();
  const t = (key: string) => uiText('ui.payments.' + key);
  const [customer, setCustomer] = React.useState(
    data.customer?.id ??
      (data.admin ? (new URLSearchParams(location.search).get('customer') ?? '') : ''),
  );
  const [enabled, setEnabled] = React.useState<boolean | null>(null);
  const [state, setState] = React.useState<{ key: string; data: TestPaymentRead } | null>(null);
  const [error, setError] = React.useState(false),
    [busy, setBusy] = React.useState(false),
    [editing, setEditing] = useDialogState('test-card', false);
  const [saveError, setSaveError] = React.useState(false);
  const [scenario, setScenario] = React.useState<TestCard['scenario']>('approved');
  const [size, setSize] = React.useState('25');
  const [cursors, setCursors] = React.useState<string[]>(['']);
  const [revision, setRevision] = React.useState(0);
  const cursor = cursors.at(-1)!;
  const key = customer + ':' + cursor + ':' + size + ':' + revision;
  const result = state?.key === key ? state.data : null;
  React.useEffect(() => {
    const abort = new AbortController();
    void apiJson<{ testMode: boolean }>('/payment-capabilities', { signal: abort.signal })
      .then((r) => setEnabled(r.testMode))
      .catch(() => {
        if (!abort.signal.aborted) setError(true);
      });
    return () => abort.abort();
  }, [revision]);
  React.useEffect(() => {
    setError(false);
    if (!customer || !enabled) return;
    const abort = new AbortController();
    void apiJson<TestPaymentRead>(
      `/customers/${customer}/test-payments?` +
        new URLSearchParams({ pageSize: size, ...(cursor ? { cursor } : {}) }),
      { signal: abort.signal },
    )
      .then((data) => setState({ key, data }))
      .catch(() => {
        if (!abort.signal.aborted) setError(true);
      });
    return () => abort.abort();
  }, [key, enabled]);
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
    <section className="payments-page">
      <h1>{t('title')}</h1>
      <p className="payments-notice">{t('testNotice')}</p>
      {enabled === false ? (
        <p role="status">{t('unavailable')}</p>
      ) : (
        <>
          {data.admin && !data.customer && (
            <CustomerPicker
              label={uiText('ui.workspace.customer')}
              value={customer}
              onChange={(id) => {
                setCustomer(id);
                updateQuery({ customer: id });
                setSaveError(false);
                setCursors(['']);
                setEditing(false);
              }}
              initial={data.rows.map((r) => r.customer)}
            />
          )}
          {!customer && <p>{t('chooseCustomer')}</p>}
          {customer && enabled && !result && !error && (
            <p role="status">{uiText('ui.workspace.loading')}</p>
          )}
          {result && (
            <>
              <div className="payments-card" aria-label={t('testCard')}>
                <strong>{t('testCard')}</strong>
                <span className="payments-card-number">
                  {result.card.last4 ? '•••• •••• •••• ' + result.card.last4 : t('noCard')}
                </span>
                <span>
                  {t(
                    result.card.scenario === 'approved'
                      ? 'approved'
                      : result.card.scenario === 'declined'
                        ? 'declined'
                        : 'noCard',
                  )}
                </span>
              </div>
              <Button
                icon="edit"
                variant="secondary"
                onClick={() => {
                  setScenario(result.card.scenario === 'none' ? 'approved' : result.card.scenario);
                  setEditing(true);
                }}
              >
                {t(result.card.scenario === 'none' ? 'addCard' : 'manageCard')}
              </Button>
              <h2>{t('charges')}</h2>
              {!result.charges.length ? (
                <p>{t('noCharges')}</p>
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
                      {result.charges.map((c) => (
                        <tr key={c.id}>
                          <td>
                            {new Intl.DateTimeFormat(localeFor(i18n.language), {
                              dateStyle: 'medium',
                              timeStyle: 'short',
                            }).format(new Date(c.at))}
                          </td>
                          <td>
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
                          <td>•••• {c.last4}</td>
                          <td>{money(c.amountCents)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              <Pagination
                label={t('charges')}
                page={{
                  items: result.charges,
                  nextCursor: result.nextCursor,
                  index: cursors.length - 1,
                  size,
                  loading: false,
                  error: false,
                  reload: () => setRevision((v) => v + 1),
                  previous: () => setCursors((v) => v.slice(0, -1)),
                  next: () => {
                    if (result.nextCursor) setCursors((v) => [...v, result.nextCursor!]);
                  },
                  setSize: (value) => {
                    setSize(value);
                    setCursors(['']);
                  },
                  reset: () => setCursors(['']),
                }}
              />
            </>
          )}
        </>
      )}
      {(error || saveError) && (
        <div role="alert">
          <p>{uiText('ui.workspace.loadError')}</p>
          <Button variant="secondary" icon="reset" onClick={() => setRevision((v) => v + 1)}>
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
