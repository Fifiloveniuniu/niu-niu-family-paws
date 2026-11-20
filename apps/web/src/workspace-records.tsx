import Button from './button';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { localeFor, supportedLanguages, languageName, uiText, uiValue } from './i18n.ts';
import CustomSelect from './custom-select';
import Modal from './modal';
import Icon from './icons';
import UnsavedChanges, { confirmDiscardChanges, markFormSaved } from './unsaved-changes';
import { apiJson, ApiError } from './api-client';
import { useWorkspaceText } from './workspace-text';
import { PetOption } from './workspace-photos';
import { ZonedField, selectedInstant, formatInstant } from './workspace-booking';
import { zonedValue, resolveWallTime } from './wall-time';
import { bookingStatus } from './workspace-calendar';
import type { Customer, Booking, PetRow, LocationRow } from './workspace-data';
import type { components } from '../../../packages/contracts/generated';
export function CustomerEditor({
  customer,
  onClose,
  onSaved,
}: {
  customer: Customer;
  onClose: () => void;
  onSaved: () => void;
}) {
  const t = useWorkspaceText();
  const { i18n } = useTranslation();
  const labels = uiValue('ui.customers.labels', i18n.language);
  const [input, setInput] = React.useState<components['schemas']['CustomerWrite']>({
    name: customer.name,
    email: customer.email,
    phone: customer.phone,
    language: customer.language,
    version: customer.version,
  });
  const baseline = React.useRef(JSON.stringify(input));
  const [saving, setSaving] = React.useState(false),
    [uncertain, setUncertain] = React.useState(false),
    [error, setError] = React.useState('');
  const form = React.useRef<HTMLFormElement>(null);
  const blocked = saving || uncertain;
  function close() {
    if (!blocked && confirmDiscardChanges(i18n.language, form.current)) onClose();
  }
  async function save(event: React.FormEvent) {
    event.preventDefault();
    if (saving) return;
    setSaving(true);
    setError('');
    try {
      await apiJson('/customers/' + customer.id, { body: input });
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
    <Modal title={t('editCustomer')} onClose={close} disabled={blocked}>
      <form
        ref={form}
        className="customer-form workspace-form"
        onSubmit={(event) => void save(event)}
      >
        <UnsavedChanges active={JSON.stringify(input) !== baseline.current || blocked} />
        {error && <p role="alert">{t(error)}</p>}
        {uncertain && <p role="alert">{t('uncertain')}</p>}
        <fieldset disabled={blocked}>
          <label>
            {labels.name}
            <input
              required
              maxLength={120}
              value={input.name}
              onChange={(event) => setInput({ ...input, name: event.target.value })}
            />
          </label>
          <label>
            {labels.email}
            <input
              type="email"
              maxLength={254}
              value={input.email}
              onChange={(event) => setInput({ ...input, email: event.target.value })}
            />
          </label>
          <label>
            {labels.phone}
            <input
              type="tel"
              maxLength={40}
              value={input.phone}
              onChange={(event) => setInput({ ...input, phone: event.target.value })}
            />
          </label>
          <label>
            {labels.language}
            <CustomSelect
              value={input.language}
              onChange={(event) => setInput({ ...input, language: event.target.value })}
            >
              {!supportedLanguages.some((item) => item.code === input.language) && (
                <option value={input.language}>{languageName(input.language)}</option>
              )}
              {supportedLanguages.map((item) => (
                <option value={item.code} key={item.code}>
                  {item.name}
                </option>
              ))}
            </CustomSelect>
          </label>
          <p>
            {labels.loginEmail}: {customer.loginEmail || uiText('common.notAvailable')}
          </p>
        </fieldset>
        <div className="portal-actions">
          <Button
            icon="check"
            variant="primary"
            disabled={saving || error === 'conflict' || error === 'denied'}
          >
            {t(saving ? 'saving' : uncertain ? 'retry' : 'save')}
          </Button>
          <Button icon="close" variant="secondary" type="button" onClick={close} disabled={blocked}>
            {t('cancel')}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
export function BookingDetails({
  booking,
  row,
  house,
  roomName,
  admin,
  onClose,
  onEdit,
  onAction,
}: {
  booking: Booking;
  row: PetRow;
  house?: LocationRow['house'];
  roomName?: string;
  admin: boolean;
  onClose: () => void;
  onEdit: () => void;
  onAction: (action: 'check_in' | 'check_out' | 'cancel') => void;
}) {
  const t = useWorkspaceText();
  const { i18n } = useTranslation();
  const locale = localeFor(i18n.language);
  return (
    <Modal title={t('booking')} onClose={onClose}>
      <div className="workspace-booking-detail">
        <PetOption row={row} />
        <dl className="workspace-details">
          {[
            [t('customer'), row.customer.name],
            [t('status'), t(bookingStatus(booking, Date.now()))],
            [t('house'), house?.name],
            [t('room'), roomName],
            [t('houseAddress'), house?.address],
            [t('arrival'), formatInstant(booking.arrival, booking.timezone, locale)],
            [t('pickup'), formatInstant(booking.pickup, booking.timezone, locale)],
            [
              t('actualArrival'),
              booking.actualArrival
                ? formatInstant(booking.actualArrival, booking.timezone, locale)
                : '',
            ],
            [
              t('actualPickup'),
              booking.actualPickup
                ? formatInstant(booking.actualPickup, booking.timezone, locale)
                : '',
            ],
            [t('balance'), row.account ? `${row.account.days} ${t('days')}` : ''],
          ].map(([label, value]) => (
            <div key={label}>
              <dt>{label}</dt>
              <dd>{value || uiText('common.notAvailable')}</dd>
            </div>
          ))}
        </dl>
        <p>{t('unbilled')}</p>
        {admin && ['planned', 'in_care'].includes(booking.status) && (
          <div className="portal-actions">
            <Button variant="secondary" onClick={onEdit}>
              <Icon name="edit" />
              {t('editBooking')}
            </Button>
            {booking.status === 'planned' ? (
              <>
                <Button variant="primary" onClick={() => onAction('check_in')}>
                  {t('checkIn')}
                </Button>
                <Button icon="close" variant="secondary" onClick={() => onAction('cancel')}>
                  {t('cancelPlan')}
                </Button>
              </>
            ) : (
              <Button variant="primary" onClick={() => onAction('check_out')}>
                {t('checkOut')}
              </Button>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
}
export function BookingAction({
  booking,
  row,
  action,
  onClose,
  onSaved,
}: {
  booking: Booking;
  row: PetRow;
  action: 'check_in' | 'check_out' | 'cancel';
  onClose: () => void;
  onSaved: (booking: Booking) => void;
}) {
  const t = useWorkspaceText();
  const { i18n } = useTranslation();
  const [at, setAt] = React.useState(() => zonedValue(new Date().toISOString(), booking.timezone));
  const [choice, setChoice] = React.useState(() => {
    const now = Date.now();
    return (
      resolveWallTime(
        zonedValue(new Date(now).toISOString(), booking.timezone),
        booking.timezone,
      ).choices.find((value) => Math.abs(Date.parse(value) - now) < 60000) ?? ''
    );
  });
  const [saving, setSaving] = React.useState(false),
    [uncertain, setUncertain] = React.useState(false),
    [error, setError] = React.useState('');
  const operation = React.useRef(crypto.randomUUID());
  const cancelAt = React.useRef(new Date().toISOString());
  const form = React.useRef<HTMLFormElement>(null);
  const baseline = React.useRef(JSON.stringify([at, choice]));
  const blocked = saving || uncertain;
  const instant = selectedInstant(at, booking.timezone, choice);
  const valid =
    action === 'cancel' ||
    (!!instant &&
      Date.parse(instant) <= Date.now() &&
      (!booking.actualArrival || instant >= booking.actualArrival));
  function close() {
    if (!blocked && confirmDiscardChanges(i18n.language, form.current)) onClose();
  }
  async function save(event: React.FormEvent) {
    event.preventDefault();
    if (saving || !valid) return;
    setSaving(true);
    setError('');
    try {
      const result = await apiJson<Booking>('/bookings/' + booking.id + '/actions', {
        method: 'POST',
        body: {
          operationId: operation.current,
          version: booking.version,
          action,
          at: action === 'cancel' ? cancelAt.current : instant,
        },
      });
      markFormSaved(form.current);
      onSaved(result);
    } catch (error) {
      setError(
        error instanceof ApiError
          ? error.status === 409
            ? 'conflict'
            : [401, 403].includes(error.status)
              ? 'denied'
              : 'invalid'
          : 'loadError',
      );
      setUncertain(!(error instanceof ApiError) || error.status >= 500 || error.status === 429);
    } finally {
      setSaving(false);
    }
  }
  return (
    <Modal
      title={t(action === 'cancel' ? 'cancelPlan' : action === 'check_in' ? 'checkIn' : 'checkOut')}
      onClose={close}
      disabled={blocked}
    >
      <form
        ref={form}
        className="customer-form workspace-form"
        onSubmit={(event) => void save(event)}
      >
        <UnsavedChanges active={JSON.stringify([at, choice]) !== baseline.current || blocked} />
        <PetOption row={row} />
        <p>{t(action === 'cancel' ? 'cancelHint' : 'handoffHint')}</p>
        {error && <p role="alert">{t(error)}</p>}
        {uncertain && <p role="alert">{t('uncertain')}</p>}
        {action !== 'cancel' && (
          <ZonedField
            label={t('recordTime')}
            value={at}
            onChange={setAt}
            zone={booking.timezone}
            choice={choice}
            onChoice={setChoice}
            disabled={blocked}
          />
        )}
        <div className="portal-actions">
          <Button
            icon="check"
            variant="primary"
            disabled={!valid || saving || error === 'conflict' || error === 'denied'}
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
