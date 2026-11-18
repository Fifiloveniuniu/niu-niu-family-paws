import React from 'react';
import { useTranslation } from 'react-i18next';
import { localeFor, uiText } from './i18n.ts';
import CustomDateInput from './custom-date-input';
import CustomAutocomplete from './custom-autocomplete';
import CustomSelect from './custom-select';
import Modal from './modal';
import UnsavedChanges, { confirmDiscardChanges, markFormSaved } from './unsaved-changes';
import { apiJson, ApiError } from './api-client';
import { petKey, roomKey, type WorkspaceData, type Booking } from './workspace-data';
import { PetOption } from './workspace-photos';
import { useWorkspaceText } from './workspace-text';
import { resolveWallTime, zonedValue, zoneOffset, startOfZonedDay, shiftDay } from './wall-time';
import type { components } from '../../../packages/contracts/generated';
type Available = components['schemas']['AvailabilityResult'];
export function selectedInstant(value: string, zone: string, choice: string) {
  const result = resolveWallTime(value, zone);
  return result.choices.length === 1
    ? result.choices[0]
    : result.choices.includes(choice)
      ? choice
      : '';
}
function initialChoice(instant: string | undefined, zone: string) {
  if (!instant) return '';
  const choices = resolveWallTime(zonedValue(instant, zone), zone).choices;
  return choices.find((choice) => Math.abs(Date.parse(choice) - Date.parse(instant)) < 60000) ?? '';
}
export function ZonedField({
  label,
  value,
  onChange,
  zone,
  choice,
  onChoice,
  disabled = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  zone: string;
  choice: string;
  onChoice: (value: string) => void;
  disabled?: boolean;
}) {
  const t = useWorkspaceText();
  const { i18n } = useTranslation();
  const result = React.useMemo(() => resolveWallTime(value, zone), [value, zone]);
  const errorId = React.useId();
  return (
    <div className="workspace-zoned-field">
      <label>
        {label}
        <CustomDateInput
          type="datetime-local"
          timeZone={zone}
          required
          value={value}
          disabled={disabled}
          aria-invalid={(!!value && !!result.error) || undefined}
          aria-describedby={value && result.error ? errorId : undefined}
          onChange={(next) => {
            onChange(next);
            onChoice('');
          }}
        />
      </label>
      {value && result.error && (
        <p id={errorId} className="workspace-field-note" role="status">
          {t(result.error === 'gap' ? 'timeGap' : 'invalidDates')}
        </p>
      )}
      {result.choices.length > 1 && (
        <label>
          {t('timeChoice', { field: label })}
          <CustomSelect
            aria-label={t('timeChoice', { field: label })}
            required
            disabled={disabled}
            value={choice}
            onChange={(event) => onChoice(event.target.value)}
          >
            <option value="">{uiText('common.notAvailable')}</option>
            {result.choices.map((instant, index) => (
              <option key={instant} value={instant}>
                {t(index === 0 ? 'firstTime' : 'secondTime', {
                  offset: zoneOffset(instant, zone, localeFor(i18n.language)),
                })}
              </option>
            ))}
          </CustomSelect>
        </label>
      )}
    </div>
  );
}
export function formatInstant(value: string, zone: string, locale: string) {
  try {
    return new Intl.DateTimeFormat(locale, {
      timeZone: zone,
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZoneName: 'shortOffset',
    }).format(new Date(value));
  } catch {
    return value;
  }
}
export default function WorkspaceBooking({
  data,
  existing,
  initialRoom,
  onClose,
  onSaved,
}: {
  data: WorkspaceData;
  existing?: Booking;
  initialRoom?: { houseId: string; roomId: string };
  onClose: () => void;
  onSaved: (booking: Booking) => void;
}) {
  const t = useWorkspaceText();
  const { i18n } = useTranslation();
  const browserZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const initialZone =
    existing?.timezone ??
    data.locations.find((item) => item.house.id === initialRoom?.houseId)?.house.timezone ??
    browserZone;
  const [zone, setZone] = React.useState(initialZone);
  const [customer, setCustomer] = React.useState(existing?.customerId ?? data.customer?.id ?? '');
  const [pet, setPet] = React.useState(existing?.petId ?? '');
  const [start, setStart] = React.useState(
    existing ? zonedValue(existing.arrival, initialZone) : '',
  );
  const [end, setEnd] = React.useState(existing ? zonedValue(existing.pickup, initialZone) : '');
  const [startChoice, setStartChoice] = React.useState(
    initialChoice(existing?.arrival, initialZone),
  );
  const [endChoice, setEndChoice] = React.useState(initialChoice(existing?.pickup, initialZone));
  const [selected, setSelected] = React.useState(
    existing
      ? roomKey(existing.houseId, existing.roomId)
      : initialRoom
        ? roomKey(initialRoom.houseId, initialRoom.roomId)
        : '',
  );
  const [step, setStep] = React.useState(1);
  const [week, setWeek] = React.useState(0);
  const [available, setAvailable] = React.useState<Available | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [uncertain, setUncertain] = React.useState(false);
  const [error, setError] = React.useState('');
  const [stale, setStale] = React.useState(false);
  const operation = React.useRef(crypto.randomUUID());
  const id = React.useRef(existing?.id ?? crypto.randomUUID());
  const generation = React.useRef(0);
  const form = React.useRef<HTMLFormElement>(null);
  const row = data.rows.find((item) => item.customer.id === customer && item.pet.id === pet);
  const resolvedStart = selectedInstant(start, zone, startChoice),
    resolvedEnd = selectedInstant(end, zone, endChoice);
  const preserve = (original: string | undefined, wall: string, resolved: string) =>
    original &&
    zone === initialZone &&
    zonedValue(original, zone) === wall &&
    Math.abs(Date.parse(original) - Date.parse(resolved)) < 60000
      ? original
      : resolved;
  const arrival = preserve(existing?.arrival, start, resolvedStart),
    pickup = preserve(existing?.pickup, end, resolvedEnd);
  const valid = !!row && !!arrival && !!pickup && pickup > arrival;
  const blocked = saving || uncertain;
  const inCare = existing?.status === 'in_care';
  const chosen = available?.rooms.find(
    (room) => roomKey(room.houseId, room.roomId) === selected && room.available,
  );
  const baseline = React.useRef(
    JSON.stringify([customer, pet, start, end, zone, startChoice, endChoice, selected]),
  );
  const dirty =
    JSON.stringify([customer, pet, start, end, zone, startChoice, endChoice, selected]) !==
    baseline.current;
  const zones = React.useMemo(
    () => [...new Set([initialZone, browserZone, 'UTC', ...Intl.supportedValuesOf('timeZone')])],
    [initialZone, browserZone],
  );
  const locale = localeFor(i18n.language);
  React.useEffect(
    () => () => {
      generation.current++;
    },
    [],
  );
  function close() {
    if (!blocked && confirmDiscardChanges(i18n.language, form.current)) onClose();
  }
  function invalidate() {
    setAvailable(null);
    setSelected('');
    setError('');
    setWeek(0);
  }
  async function loadAvailability(
    offset = week,
    startAt = arrival,
    endAt = pickup,
    preferred = selected,
  ) {
    if (!row || !startAt || !endAt) return;
    const request = ++generation.current;
    setLoading(true);
    setError('');
    try {
      const day = shiftDay(zonedValue(startAt, zone).slice(0, 10), offset * 7);
      const windowFrom = startOfZonedDay(day, zone),
        windowThrough = startOfZonedDay(shiftDay(day, 7), zone);
      if (!windowFrom || !windowThrough) throw new ApiError(400);
      const result = await apiJson<Available>('/availability', {
        method: 'POST',
        body: {
          customerId: customer,
          petId: pet,
          arrival: startAt,
          pickup: endAt,
          windowFrom,
          windowThrough,
          ...(existing ? { bookingId: existing.id } : {}),
        },
      });
      if (request !== generation.current) return;
      setAvailable(result);
      setSelected(
        result.rooms.some(
          (room) => roomKey(room.houseId, room.roomId) === preferred && room.available,
        )
          ? preferred
          : '',
      );
    } catch (error) {
      if (request === generation.current)
        setError(
          error instanceof ApiError && [401, 403].includes(error.status) ? 'denied' : 'loadError',
        );
    } finally {
      if (request === generation.current) setLoading(false);
    }
  }
  async function save(event: React.FormEvent) {
    event.preventDefault();
    if (step !== 3) {
      if (step === 1 && valid) {
        setStep(2);
        void loadAvailability(0);
      } else if (step === 2 && chosen) setStep(3);
      return;
    }
    if (!data.admin || !valid || !chosen || saving) return;
    setSaving(true);
    setError('');
    try {
      const booking = await apiJson<Booking>('/bookings/' + id.current, {
        body: {
          operationId: operation.current,
          version: existing?.version ?? 0,
          customerId: customer,
          petId: pet,
          houseId: chosen.houseId,
          roomId: chosen.roomId,
          arrival,
          pickup,
        },
      });
      markFormSaved(form.current);
      onSaved(booking);
    } catch (error) {
      if (error instanceof ApiError && error.code === 'booking_conflict') {
        const recoverable = [
          'pet_overlap',
          'species',
          'overdue',
          'turnover_unconfigured',
          'capacity',
          'room_setup',
          'pet_setup',
          'house_setup',
        ].includes(error.issue);
        if (recoverable) {
          setStep(2);
          await loadAvailability();
        } else setStale(true);
        setError('issue.' + error.issue);
      } else {
        const value =
          error instanceof ApiError
            ? error.status === 409
              ? 'conflict'
              : [401, 403].includes(error.status)
                ? 'denied'
                : error.status === 400
                  ? 'invalid'
                  : 'loadError'
            : 'loadError';
        setError(value);
        setStale(value === 'conflict' || value === 'denied');
      }
      setUncertain(!(error instanceof ApiError) || error.status >= 500 || error.status === 429);
    } finally {
      setSaving(false);
    }
  }
  function chooseSpan(room: Available['rooms'][number], from: number, through: number) {
    const startAt = new Date(from).toISOString(),
      endAt = new Date(through).toISOString();
    setStart(zonedValue(startAt, zone));
    setEnd(zonedValue(endAt, zone));
    setStartChoice(initialChoice(startAt, zone));
    setEndChoice(initialChoice(endAt, zone));
    void loadAvailability(week, startAt, endAt, roomKey(room.houseId, room.roomId));
  }
  const heading = existing ? t('editBooking') : data.admin ? t('addBooking') : t('availability');
  return (
    <Modal title={heading} onClose={close} disabled={blocked} className="hc-assignment-dialog">
      <form
        ref={form}
        className="hc-settings-form hc-wizard"
        onSubmit={(event) => void save(event)}
      >
        <UnsavedChanges active={dirty || blocked} />
        <ol className="hc-wizard-progress">
          {['details', 'chooseRoom', 'review'].map((label, index) => (
            <li key={label} aria-current={step === index + 1 ? 'step' : undefined}>
              <span>{index + 1}</span>
              {t(label)}
            </li>
          ))}
        </ol>
        {error && (
          <p className="workspace-form-error" role="alert">
            {t(error)}
          </p>
        )}
        {uncertain && <p role="alert">{t('uncertain')}</p>}
        <fieldset
          className="hc-wizard-step"
          data-booking-step="1"
          hidden={step !== 1}
          disabled={blocked}
        >
          <div className="hc-step-intro">
            <h3>{t('details')}</h3>
            <p>{t('bookingIntro')}</p>
          </div>
          <label>
            {t('customer')}
            <CustomAutocomplete
              label={t('customer')}
              required
              disabled={!!data.customer || !!existing}
              value={customer}
              options={data.customers.map((item) => ({
                value: item.id,
                label: item.name,
                search: [item.name, item.email, item.phone, item.loginEmail]
                  .filter(Boolean)
                  .join(' '),
              }))}
              onChange={(value) => {
                setCustomer(value);
                setPet('');
                invalidate();
              }}
            />
          </label>
          <label>
            {t('pet')}
            <CustomAutocomplete
              label={t('pet')}
              required
              disabled={!customer || !!existing}
              value={pet}
              options={data.rows
                .filter((item) => item.customer.id === customer)
                .map((item) => ({
                  value: item.pet.id,
                  label: item.pet.name,
                  content: <PetOption row={item} />,
                }))}
              onChange={(value) => {
                setPet(value);
                invalidate();
              }}
            />
          </label>
          <label>
            {t('dateTimezone')}
            <CustomAutocomplete
              label={t('dateTimezone')}
              required
              disabled={!row || inCare}
              value={zone}
              options={zones.map((value) => ({ value, label: value }))}
              onChange={(value) => {
                setZone(value);
                setStartChoice('');
                setEndChoice('');
                invalidate();
              }}
            />
          </label>
          <div className="hc-time-fields">
            <ZonedField
              label={t('arrival')}
              value={start}
              onChange={(value) => {
                setStart(value);
                invalidate();
              }}
              zone={zone}
              choice={startChoice}
              onChoice={(value) => {
                setStartChoice(value);
                invalidate();
              }}
              disabled={!row || inCare}
            />
            <ZonedField
              label={t('pickup')}
              value={end}
              onChange={(value) => {
                setEnd(value);
                invalidate();
              }}
              zone={zone}
              choice={endChoice}
              onChoice={(value) => {
                setEndChoice(value);
                invalidate();
              }}
              disabled={!row}
            />
          </div>
          {arrival && pickup && pickup <= arrival && <p role="status">{t('timeOrder')}</p>}
        </fieldset>
        <section
          className="hc-wizard-step"
          data-booking-step="2"
          hidden={step !== 2}
          aria-label={t('roomCalendar')}
        >
          <div className="hc-step-intro">
            <h3>{t('freeSpace')}</h3>
            <p>{t('availabilityHint')}</p>
          </div>
          <div className="workspace-availability-navigation">
            <button
              type="button"
              className="icon-button"
              aria-label={t('previousWeek')}
              disabled={loading || blocked}
              onClick={() => {
                setWeek((value) => value - 1);
                void loadAvailability(week - 1);
              }}
            >
              ‹
            </button>
            <span>
              {available
                ? `${formatInstant(available.from, zone, locale)} – ${formatInstant(available.through, zone, locale)}`
                : uiText('common.notAvailable')}
            </span>
            <button
              type="button"
              className="icon-button"
              aria-label={t('nextWeek')}
              disabled={loading || blocked}
              onClick={() => {
                setWeek((value) => value + 1);
                void loadAvailability(week + 1);
              }}
            >
              ›
            </button>
          </div>
          {loading && <p role="status">{t('loading')}</p>}
          {!loading && error === 'loadError' && (
            <button type="button" className="language" onClick={() => void loadAvailability()}>
              {t('retry')}
            </button>
          )}
          <div className="hc-schedule-scroll" tabIndex={0} aria-label={t('roomCalendar')}>
            <div className="hc-range-calendar">
              {available && (
                <div className="workspace-availability-axis">
                  <strong>{t('room')}</strong>
                  <div>
                    {Array.from({ length: 7 }, (_, index) => {
                      const day = shiftDay(zonedValue(available.from, zone).slice(0, 10), index);
                      const instant = startOfZonedDay(day, zone);
                      return (
                        <span key={day}>
                          {instant
                            ? new Intl.DateTimeFormat(localeFor(i18n.language), {
                                timeZone: zone,
                                month: 'short',
                                day: 'numeric',
                                weekday: 'short',
                              }).format(new Date(instant))
                            : day}
                        </span>
                      );
                    })}
                  </div>
                </div>
              )}

              {available &&
                available.rooms
                  .filter(
                    (room) =>
                      !inCare ||
                      roomKey(room.houseId, room.roomId) ===
                        roomKey(existing!.houseId, existing!.roomId),
                  )
                  .map((room) => {
                    const viewFrom = Date.parse(available.from),
                      viewTo = Date.parse(available.through);
                    const pos = (at: number) => ((at - viewFrom) / (viewTo - viewFrom)) * 100;
                    const duration = Date.parse(pickup) - Date.parse(arrival);
                    const spans: { from: number; through: number }[] = [];
                    let cursor = viewFrom;
                    for (const range of [...room.blocked].sort((a, b) =>
                      a.from.localeCompare(b.from),
                    )) {
                      const from = Math.max(viewFrom, Date.parse(range.from)),
                        through = Math.min(viewTo, Date.parse(range.through));
                      if (from > cursor) spans.push({ from: cursor, through: from });
                      cursor = Math.max(cursor, through);
                    }
                    if (cursor < viewTo) spans.push({ from: cursor, through: viewTo });
                    const picked = selected === roomKey(room.houseId, room.roomId);
                    return (
                      <React.Fragment key={roomKey(room.houseId, room.roomId)}>
                        <div className="hc-range-house">
                          {room.houseName} · {room.timezone}
                        </div>
                        <div className="hc-range-room">
                          <div className="hc-range-room-name">
                            <strong>{room.roomName}</strong>
                            <button
                              type="button"
                              disabled={!room.available || loading || blocked}
                              aria-pressed={picked}
                              aria-label={`${t('choose')} ${room.houseName} · ${room.roomName}`}
                              onClick={() => setSelected(roomKey(room.houseId, room.roomId))}
                            >
                              {picked ? t('selected') : t('chooseRoom')}
                            </button>
                            {room.issue && <small>{t('issue.' + room.issue)}</small>}
                          </div>
                          <div className="hc-time-track">
                            {spans.map((span, index) => {
                              const existingStart = Date.parse(arrival),
                                existingEnd = Date.parse(pickup);
                              const from =
                                existingStart >= span.from && existingEnd <= span.through
                                  ? existingStart
                                  : Math.round(
                                      (span.from + (span.through - span.from - duration) / 2) /
                                        60000,
                                    ) * 60000;
                              const fits =
                                duration > 0 &&
                                from >= span.from &&
                                from + duration <= span.through;
                              return (
                                <button
                                  key={'free-' + index}
                                  type="button"
                                  className="hc-time-available"
                                  style={{
                                    left: `${pos(span.from)}%`,
                                    width: `${pos(span.through) - pos(span.from)}%`,
                                  }}
                                  disabled={!fits || loading || blocked || inCare}
                                  aria-label={`${t('freeSpace')}: ${room.houseName} · ${room.roomName}`}
                                  title={`${formatInstant(new Date(span.from).toISOString(), zone, locale)} – ${formatInstant(new Date(span.through).toISOString(), zone, locale)}`}
                                  onClick={() => chooseSpan(room, from, from + duration)}
                                >
                                  {t('freeSpace')}
                                </button>
                              );
                            })}
                            {room.blocked.map((span, index) => (
                              <span
                                key={index}
                                className="hc-time-unavailable"
                                style={{
                                  left: `${pos(Date.parse(span.from))}%`,
                                  width: `${pos(Date.parse(span.through)) - pos(Date.parse(span.from))}%`,
                                }}
                                title={t('issue.' + span.issue)}
                              >
                                <span>{t('blockedSpace')}</span>
                              </span>
                            ))}
                            {valid &&
                              room.available &&
                              Date.parse(pickup) > viewFrom &&
                              Date.parse(arrival) < viewTo && (
                                <button
                                  type="button"
                                  className={'hc-time-request' + (picked ? ' picked' : '')}
                                  style={{
                                    left: `${Math.max(0, pos(Date.parse(arrival)))}%`,
                                    width: `${Math.min(100, pos(Date.parse(pickup))) - Math.max(0, pos(Date.parse(arrival)))}%`,
                                  }}
                                  aria-label={`${t('choose')} ${room.houseName} · ${room.roomName} · ${formatInstant(arrival, zone, locale)}`}
                                  onClick={() => setSelected(roomKey(room.houseId, room.roomId))}
                                >
                                  {picked ? t('selected') : t('choose')}
                                </button>
                              )}
                          </div>
                        </div>
                      </React.Fragment>
                    );
                  })}
            </div>
          </div>
          {available && !available.rooms.length && <p>{t('noRooms')}</p>}
        </section>
        <section
          className="hc-wizard-step"
          data-booking-step="3"
          hidden={step !== 3}
          aria-label={t('review')}
        >
          <div className="hc-step-intro">
            <h3>{t('review')}</h3>
          </div>
          {row && (
            <div className="hc-review-guest">
              <PetOption row={row} />
              <strong>{row.customer.name}</strong>
            </div>
          )}
          <dl className="workspace-details hc-review-card">
            {[
              [t('house'), chosen?.houseName],
              [t('room'), chosen?.roomName],
              [t('houseAddress'), chosen?.address],
              [t('dateTimezone'), chosen?.timezone],
              [
                t('arrival'),
                chosen && arrival ? formatInstant(arrival, chosen.timezone, locale) : '',
              ],
              [t('pickup'), chosen && pickup ? formatInstant(pickup, chosen.timezone, locale) : ''],
              [t('balance'), row?.account ? `${row.account.days} ${t('days')}` : ''],
              [t('validFrom'), row?.account?.validFrom],
              [t('validThrough'), row?.account?.validThrough],
              [t('creditUsage'), uiText('common.notAvailable')],
            ].map(([label, value]) => (
              <div key={label}>
                <dt>{label}</dt>
                <dd>{value || uiText('common.notAvailable')}</dd>
              </div>
            ))}
          </dl>
          <p className="hc-review-note">{t(data.admin ? 'unbilled' : 'customerBookingPending')}</p>
        </section>
        <footer className="hc-wizard-footer">
          <button type="button" className="hc-manage" disabled={blocked} onClick={close}>
            {t('cancel')}
          </button>
          <span>{t('step', { step })}</span>
          <div>
            {step > 1 && (
              <button
                type="button"
                className="hc-manage"
                disabled={blocked}
                onClick={() => setStep((value) => value - 1)}
              >
                {t('back')}
              </button>
            )}
            {step < 3 ? (
              <button
                type="button"
                className="hc-apply"
                disabled={blocked || loading || (step === 1 ? !valid : !chosen)}
                onClick={(event) => {
                  event.preventDefault();
                  if (step === 1) {
                    setStep(2);
                    void loadAvailability(0);
                  } else setStep(3);
                }}
              >
                {t(step === 1 ? 'chooseRoom' : 'reviewBooking')}
              </button>
            ) : (
              <button
                type="submit"
                className="hc-apply"
                disabled={saving || stale || !data.admin || !chosen || !valid}
              >
                {t(saving ? 'saving' : uncertain ? 'retry' : 'confirmPlan')}
              </button>
            )}
          </div>
        </footer>
      </form>
    </Modal>
  );
}
