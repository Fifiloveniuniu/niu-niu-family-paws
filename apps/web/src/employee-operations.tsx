import Button from './button';
import './house-calendar.css';
import './workspace.css';
import './saved-workspace.css';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { MarketingHeader } from './marketing-shell';
import type { Language } from './i18n.ts';
import { uiText, localeFor } from './i18n.ts';
import { apiJson, apiBlob, ApiError } from './api-client';
import { currentRoute, updateQuery } from './routing';
import CustomSelect from './custom-select';
import CustomDateInput from './custom-date-input';
import Modal from './modal';
import Profile from './profile';
import UnsavedChanges, { confirmDiscardChanges, markFormSaved } from './unsaved-changes';
import { useCursorPage, Pagination } from './pagination';
import { ZonedField, selectedInstant } from './workspace-booking';
import {
  zonedValue,
  resolveWallTime,
  wallDateKey,
  wallNow,
  startOfZonedDay,
  shiftDay,
} from './wall-time';
import type { components } from '../../../packages/contracts/generated';
type Row = components['schemas']['OperationsPage']['items'][number];
type House = components['schemas']['OperationsHouses']['items'][number];
const useText = () => {
  const { i18n } = useTranslation();
  return (key: string) => uiText('ui.operations.' + key, {}, i18n.language);
};
function Photo({ row }: { row: Row }) {
  const [src, setSrc] = React.useState('');
  React.useEffect(() => {
    let live = true,
      url = '';
    setSrc('');
    void apiBlob(`/customers/${row.booking.customerId}/pets/${row.pet.id}/photo`)
      .then((blob) => {
        if (live) {
          url = URL.createObjectURL(blob);
          setSrc(url);
        }
      })
      .catch(() => {});
    return () => {
      live = false;
      if (url) URL.revokeObjectURL(url);
    };
  }, [row.booking.id, row.pet.photo, row.booking.status]);
  return src ? (
    <img className="workspace-avatar" src={src} alt="" />
  ) : (
    <span className="workspace-avatar" aria-hidden="true">
      ◇
    </span>
  );
}
function ActionEditor({
  row,
  mode,
  onClose,
  onSaved,
}: {
  row: Row;
  mode: 'check_in' | 'check_out' | 'verify' | 'correct';
  onClose: () => void;
  onSaved: () => void;
}) {
  const t = useText(),
    { i18n } = useTranslation(),
    booking = row.booking;
  const initial = mode === 'correct' ? booking.actualArrival! : new Date().toISOString();
  const [arrival, setArrival] = React.useState(zonedValue(initial, booking.timezone));
  const [pickup, setPickup] = React.useState(
    booking.actualPickup ? zonedValue(booking.actualPickup, booking.timezone) : '',
  );
  const [arrivalChoice, setArrivalChoice] = React.useState(
    resolveWallTime(zonedValue(initial, booking.timezone), booking.timezone).choices.find(
      (value) => Math.abs(Date.parse(value) - Date.parse(initial)) < 60000,
    ) ?? '',
  );
  const [pickupChoice, setPickupChoice] = React.useState(
    booking.actualPickup
      ? (resolveWallTime(pickup, booking.timezone).choices.find(
          (value) => Math.abs(Date.parse(value) - Date.parse(booking.actualPickup!)) < 60000,
        ) ?? '')
      : '',
  );
  const [weight, setWeight] = React.useState(String(row.pet.weightKg ?? ''));
  const [saving, setSaving] = React.useState(false),
    [uncertain, setUncertain] = React.useState(false),
    [error, setError] = React.useState('');
  const form = React.useRef<HTMLFormElement>(null),
    operation = React.useRef(crypto.randomUUID());
  const baseline = React.useRef(
    JSON.stringify([arrival, pickup, arrivalChoice, pickupChoice, weight]),
  );
  const blocked = saving || uncertain,
    dirty =
      JSON.stringify([arrival, pickup, arrivalChoice, pickupChoice, weight]) !== baseline.current;
  const at = selectedInstant(arrival, booking.timezone, arrivalChoice),
    end = selectedInstant(pickup, booking.timezone, pickupChoice);
  const valid =
    mode === 'verify'
      ? weight !== '' && Number(weight) > 0 && Number(weight) <= 1000
      : !!at &&
        Date.parse(at) <= Date.now() &&
        (mode !== 'correct' ||
          !booking.actualPickup ||
          (!!end && end > at && Date.parse(end) <= Date.now()));
  function close() {
    if (!blocked && confirmDiscardChanges(i18n.language, form.current)) onClose();
  }
  async function save(event: React.FormEvent) {
    event.preventDefault();
    if (!valid || saving) return;
    setSaving(true);
    setError('');
    const path =
      mode === 'verify'
        ? `/operations/${booking.id}/weight`
        : mode === 'correct'
          ? `/operations/${booking.id}/handoff`
          : `/bookings/${booking.id}/actions`;
    const body = {
      operationId: operation.current,
      version: mode === 'verify' ? row.pet.version : booking.version,
      ...(mode === 'verify'
        ? { weightKg: Number(weight) }
        : mode === 'correct'
          ? { actualArrival: at, actualPickup: booking.actualPickup ? end : null }
          : { action: mode, at }),
    };
    try {
      await apiJson(path, {
        method: mode === 'check_in' || mode === 'check_out' ? 'POST' : 'PUT',
        body,
      });
      markFormSaved(form.current);
      onSaved();
    } catch (e) {
      setError(
        e instanceof ApiError && e.status === 409
          ? 'conflict'
          : e instanceof ApiError && [401, 403].includes(e.status)
            ? 'denied'
            : 'error',
      );
      setUncertain(!(e instanceof ApiError) || e.status >= 500 || e.status === 429);
    } finally {
      setSaving(false);
    }
  }
  return (
    <Modal title={t(mode)} onClose={close} disabled={blocked}>
      <form
        ref={form}
        className="customer-form workspace-form"
        onSubmit={(event) => void save(event)}
      >
        <UnsavedChanges active={dirty || blocked} />
        <strong>{row.pet.name}</strong>
        {error && <p role="alert">{t(error)}</p>}
        {uncertain && <p role="alert">{uiText('ui.workspace.uncertain')}</p>}
        <fieldset disabled={blocked}>
          {mode === 'verify' ? (
            <label>
              {t('weight')}
              <input
                required
                type="number"
                min="0.001"
                max="1000"
                step="0.001"
                value={weight}
                onChange={(event) => setWeight(event.target.value)}
              />
            </label>
          ) : (
            <>
              <ZonedField
                label={t(mode === 'correct' ? 'actualArrival' : 'recordTime')}
                value={arrival}
                onChange={setArrival}
                zone={booking.timezone}
                choice={arrivalChoice}
                onChoice={setArrivalChoice}
                disabled={blocked}
              />
              {mode === 'correct' && booking.actualPickup && (
                <ZonedField
                  label={t('actualPickup')}
                  value={pickup}
                  onChange={setPickup}
                  zone={booking.timezone}
                  choice={pickupChoice}
                  onChoice={setPickupChoice}
                  disabled={blocked}
                />
              )}
            </>
          )}
          <p>{t('auditHint')}</p>
        </fieldset>
        <div className="portal-actions">
          <Button
            variant="primary"
            disabled={!valid || saving || error === 'conflict' || error === 'denied'}
          >
            {uiText('ui.workspace.' + (saving ? 'saving' : uncertain ? 'retry' : 'save'))}
          </Button>
          <Button variant="secondary" type="button" disabled={blocked} onClick={close}>
            {uiText('ui.workspace.cancel')}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
export default function EmployeeOperations({
  admin = false,
  onLanguageChange,
  account,
}: {
  admin?: boolean;
  onLanguageChange: (language: Language) => void;
  account: React.ReactNode;
}) {
  const t = useText(),
    { i18n } = useTranslation();
  const route = currentRoute(),
    params = new URLSearchParams(route.search);
  const [houses, setHouses] = React.useState<House[]>([]),
    [error, setError] = React.useState(false),
    [loading, setLoading] = React.useState(true);
  const [revision, reload] = React.useReducer((value) => value + 1, 0),
    [editor, setEditor] = React.useState<{
      row: Row;
      mode: 'check_in' | 'check_out' | 'verify' | 'correct';
    } | null>(null);
  React.useEffect(() => {
    const abort = new AbortController();
    setLoading(true);
    setError(false);
    setHouses([]);
    void apiJson<{ items: House[] }>('/operations/houses', { signal: abort.signal })
      .then((result) => {
        if (!abort.signal.aborted) setHouses(result.items);
      })
      .catch(() => {
        if (!abort.signal.aborted) setError(true);
      })
      .finally(() => {
        if (!abort.signal.aborted) setLoading(false);
      });
    return () => abort.abort();
  }, [revision]);
  React.useEffect(() => {
    const refresh = () => {
      if (document.visibilityState === 'visible' && !document.querySelector('dialog[open]'))
        reload();
    };
    window.addEventListener('focus', refresh);
    document.addEventListener('visibilitychange', refresh);
    const timer = window.setInterval(refresh, 60000);
    return () => {
      window.removeEventListener('focus', refresh);
      document.removeEventListener('visibilitychange', refresh);
      clearInterval(timer);
    };
  }, []);
  const house =
    houses.find((item) => item.id === params.get('house')) ??
    (!params.has('house') ? houses[0] : undefined);
  const date = params.get('date') ?? wallDateKey(wallNow(house?.timezone));
  const from = house ? startOfZonedDay(date, house.timezone) : null,
    through = house ? startOfZonedDay(shiftDay(date, 1), house.timezone) : null;
  const query = new URLSearchParams({
    houseId: house?.id ?? '',
    from: from ?? '',
    through: through ?? '',
  });
  const page = useCursorPage<Row>('/operations?' + query, revision, !!house && !!from && !!through);
  const format = (instant: string | null, zone: string) =>
    instant
      ? new Intl.DateTimeFormat(localeFor(i18n.language), {
          dateStyle: 'medium',
          timeStyle: 'short',
          timeZone: zone,
        }).format(new Date(instant))
      : uiText('common.notAvailable');
  return (
    <div className="hc saved-workspace">
      <MarketingHeader
        page="app"
        showNavigation={false}
        onLanguageChange={onLanguageChange}
        account={account}
        navigation={
          <nav
            className="app-header-nav"
            aria-label={admin ? uiText('ui.houseCalendar.workspace') : t('title')}
          >
            {admin ? (
              ['calendar', 'balances', 'customers', 'pricing'].map((view) => (
                <a key={view} href={'/app/' + view + '/'}>
                  {uiText('ui.workspace.' + view)}
                </a>
              ))
            ) : (
              <a
                href="/app/operations/"
                aria-current={route.kind === 'operations' ? 'page' : undefined}
              >
                {t('title')}
              </a>
            )}
          </nav>
        }
      />
      <main className="hc-content">
        {route.kind === 'personal' ? (
          <Profile onSaved={() => {}} />
        ) : (
          <>
            <h1>{t('title')}</h1>
            <p>{t('scopeHint')}</p>
            {loading && <p role="status">{uiText('ui.workspace.loading')}</p>}
            {error && (
              <p role="alert">
                {t('error')}{' '}
                <Button variant="secondary" onClick={reload}>
                  {uiText('ui.workspace.retry')}
                </Button>
              </p>
            )}
            {!loading && !error && !houses.length && <p>{t('noAssignments')}</p>}
            {houses.length > 0 && (
              <>
                <div className="workspace-filters">
                  <label>
                    {t('house')}
                    <CustomSelect
                      value={house?.id ?? ''}
                      onChange={(event) => updateQuery({ house: event.target.value })}
                    >
                      <option value="">{uiText('common.notAvailable')}</option>
                      {houses.map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.name}
                        </option>
                      ))}
                    </CustomSelect>
                  </label>
                  <label>
                    {t('date')}
                    <CustomDateInput
                      value={date}
                      onChange={(value) => updateQuery({ date: value })}
                    />
                  </label>
                  <Button variant="secondary" onClick={reload}>
                    {uiText('ui.operations.refresh')}
                  </Button>
                </div>
                {house && (
                  <p>
                    {house.timezone} · {house.address}
                  </p>
                )}
                {!house && <p role="alert">{t('denied')}</p>}
                <div className="operations-cards">
                  {page.items.map((row) => (
                    <article key={row.booking.id}>
                      <div className="workspace-table-pet">
                        <Photo row={row} />
                        <h2>{row.pet.name}</h2>
                      </div>
                      <p>{uiText('ui.workspace.' + row.booking.status)}</p>
                      <dl>
                        <dt>{t('plannedArrival')}</dt>
                        <dd>{format(row.booking.arrival, row.booking.timezone)}</dd>
                        <dt>{t('plannedPickup')}</dt>
                        <dd>{format(row.booking.pickup, row.booking.timezone)}</dd>
                        <dt>{t('actualArrival')}</dt>
                        <dd>{format(row.booking.actualArrival, row.booking.timezone)}</dd>
                        <dt>{t('actualPickup')}</dt>
                        <dd>{format(row.booking.actualPickup, row.booking.timezone)}</dd>
                        <dt>{t('weight')}</dt>
                        <dd>
                          {row.pet.weightKg ?? uiText('common.notAvailable')} ·{' '}
                          {t(
                            row.pet.weightVerification?.weightKg === row.pet.weightKg
                              ? 'verified'
                              : 'entered',
                          )}
                          {row.pet.weightVerification?.weightKg === row.pet.weightKg &&
                            ' · ' + format(row.pet.weightVerification!.at, row.booking.timezone)}
                        </dd>
                      </dl>
                      <div className="portal-actions">
                        {row.booking.status === 'planned' && (
                          <Button
                            variant="primary"
                            onClick={() => setEditor({ row, mode: 'check_in' })}
                          >
                            {t('check_in')}
                          </Button>
                        )}
                        {row.booking.status === 'in_care' && (
                          <>
                            <Button
                              variant="primary"
                              onClick={() => setEditor({ row, mode: 'check_out' })}
                            >
                              {t('check_out')}
                            </Button>
                            <Button
                              variant="secondary"
                              onClick={() => setEditor({ row, mode: 'verify' })}
                            >
                              {t('verify')}
                            </Button>
                          </>
                        )}
                        {row.booking.actualArrival && (
                          <Button
                            variant="secondary"
                            onClick={() => setEditor({ row, mode: 'correct' })}
                          >
                            {t('correct')}
                          </Button>
                        )}
                      </div>
                    </article>
                  ))}
                </div>
                <Pagination page={page} label={t('pages')} />
                {!page.loading && !page.error && house && !page.items.length && <p>{t('empty')}</p>}
              </>
            )}
          </>
        )}
        {editor && (
          <ActionEditor
            {...editor}
            onClose={() => setEditor(null)}
            onSaved={() => {
              setEditor(null);
              reload();
            }}
          />
        )}
      </main>
    </div>
  );
}
