import BookingCost from './booking-cost';
import CalendarControls from './calendar-controls';
import { calendarRange, type CalendarView } from './workspace-calendar';
import Button from './button';
import IconButton from './icon-button';
import Icon from './icons';
import LocationLabel from './location-label';
import { CalendarAxis, CalendarTrack, CalendarFrame, CalendarViewport } from './calendar-timeline';
import { timelineSpan, timelineRangeLabel } from './timeline-layout';
import { petTypes, petTypeChoice, PetTypeIcon } from './pet-type';
import { speciesText } from './i18n.ts';
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
import { WorkspaceAvatar, PetOption } from './workspace-photos';
import { useWorkspaceText } from './workspace-text';
import { parseWallInput, resolveWallTime, zonedValue, zoneOffset, shiftDay } from './wall-time';
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
  const incomplete = !!value && !!parseWallInput(value, false);
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
          aria-invalid={(!!value && !incomplete && !!result.error) || undefined}
          aria-describedby={value && !incomplete && result.error ? errorId : undefined}
          onChange={(next) => {
            onChange(next);
            onChoice('');
          }}
        />
      </label>
      {value && !incomplete && result.error && (
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
  const [calendarZone, setCalendarZone] = React.useState(initialZone);
  const [customer, setCustomer] = React.useState(existing?.customerId ?? data.customer?.id ?? '');
  const [pet, setPet] = React.useState(existing?.petId ?? '');
  const [petType, setPetType] = React.useState(
    data.rows.find(
      (item) => item.customer.id === existing?.customerId && item.pet.id === existing?.petId,
    )?.pet.species ?? '',
  );
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
  const [view, setView] = React.useState<CalendarView>('week');
  const [calendarDate, setCalendarDate] = React.useState('');
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
  React.useEffect(() => {
    form.current?.closest('dialog')?.scrollTo({ top: 0 });
  }, [step]);
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
    setCalendarDate('');
  }
  async function loadAvailability(
    offset = week,
    startAt = arrival,
    endAt = pickup,
    preferred = selected,
    nextView = view,
    nextDate = calendarDate,
    nextZone = calendarZone,
  ) {
    if (!row || !startAt || !endAt) return;
    const request = ++generation.current;
    setLoading(true);
    setError('');
    try {
      const day = nextDate || shiftDay(zonedValue(startAt, nextZone).slice(0, 10), offset * 14);
      const range = calendarRange(day, nextView, nextZone);
      const windowFrom = range.from,
        windowThrough = range.through;
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
  const ticks = available
    ? calendarRange(zonedValue(available.from, calendarZone).slice(0, 10), view, calendarZone).ticks
    : [];
  function changeCalendar(nextDate: string, nextView = view, nextZone = calendarZone) {
    setCalendarDate(nextDate);
    setView(nextView);
    void loadAvailability(week, arrival, pickup, selected, nextView, nextDate, nextZone);
  }
  function shiftCalendar(direction: number) {
    const date = new Date(
      (calendarDate || zonedValue(available?.from || arrival, calendarZone).slice(0, 10)) +
        'T12:00:00Z',
    );
    if (view === 'year') date.setUTCFullYear(date.getUTCFullYear() + direction);
    else if (view === 'month') {
      date.setUTCDate(1);
      date.setUTCMonth(date.getUTCMonth() + direction);
    } else date.setUTCDate(date.getUTCDate() + direction * (view === 'week' ? 14 : 1));
    changeCalendar(date.toISOString().slice(0, 10));
  }
  const heading = existing ? t('editBooking') : data.admin ? t('addBooking') : t('availability');
  return (
    <Modal
      title={heading}
      onClose={close}
      disabled={blocked}
      className="hc-assignment-dialog hc-booking-dialog"
      header={
        <ol className="hc-wizard-progress">
          {['details', 'chooseRoom', 'review'].map((label, index) => (
            <li
              key={label}
              aria-current={step === index + 1 ? 'step' : undefined}
              data-step-state={
                step > index + 1 ? 'completed' : step === index + 1 ? 'current' : 'upcoming'
              }
            >
              <span className="hc-step-marker">{index + 1}</span>
              <span className="hc-step-label">{t(label)}</span>
            </li>
          ))}
        </ol>
      }
    >
      <form
        ref={form}
        className="hc-settings-form hc-wizard"
        onSubmit={(event) => void save(event)}
      >
        <UnsavedChanges active={dirty || blocked} />
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
            <h3 className="sr-only">{t('details')}</h3>
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
            {t('type')}
            <CustomAutocomplete
              label={t('type')}
              value={petType}
              disabled={!!existing}
              options={[
                { value: '', label: t('allTypes') },
                ...petTypes.map((species) => ({
                  value: species,
                  label: speciesText(species),
                  content: petTypeChoice(species),
                  adornment: <PetTypeIcon species={species} />,
                })),
              ]}
              onChange={(value) => {
                setPetType(value);
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
                .filter(
                  (item) =>
                    item.customer.id === customer && (!petType || item.pet.species === petType),
                )
                .map((item) => ({
                  value: item.pet.id,
                  label: item.pet.name,
                  content: <PetOption row={item} showType={false} />,
                  adornment: <WorkspaceAvatar row={item} />,
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
            <h3>
              <Icon name="calendar" />
              {t('roomCalendar')}
            </h3>
            <p>{t('availabilityHint')}</p>
          </div>
          <CalendarControls
            title={
              available
                ? timelineRangeLabel(available.from, available.through, calendarZone, locale)
                : uiText('common.notAvailable')
            }
            view={view}
            disabled={loading || blocked}
            onShift={shiftCalendar}
            onToday={() =>
              changeCalendar(zonedValue(new Date().toISOString(), calendarZone).slice(0, 10))
            }
            onView={(value) =>
              changeCalendar(
                calendarDate || zonedValue(available?.from || arrival, calendarZone).slice(0, 10),
                value,
              )
            }
            timezone={
              <CustomSelect
                aria-label={t('clockTimezone')}
                value={calendarZone}
                disabled={loading || blocked}
                onChange={(event) => {
                  const next = event.target.value;
                  setCalendarZone(next);
                  changeCalendar(
                    calendarDate || zonedValue(available?.from || arrival, next).slice(0, 10),
                    view,
                    next,
                  );
                }}
              >
                {zones.map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </CustomSelect>
            }
          />
          {loading && <p role="status">{t('loading')}</p>}
          {!loading && error === 'loadError' && (
            <Button
              icon="reset"
              type="button"
              variant="secondary"
              onClick={() => void loadAvailability()}
            >
              {t('retry')}
            </Button>
          )}
          <ul className="booking-calendar-legend" aria-label={t('calendarLegend')}>
            <li>
              <span className="booking-calendar-swatch unavailable" aria-hidden="true" />
              {t('blockedSpace')}
            </li>
            <li>
              <span className="booking-calendar-swatch requested" aria-hidden="true" />
              {t('requestedStay')}
            </li>
          </ul>
          <CalendarViewport
            className="hc-schedule-scroll"
            label={t('roomCalendar')}
            hint={uiText('ui.calendarTimeline.panHint')}
          >
            <CalendarFrame
              className="hc-range-calendar"
              ticks={ticks}
              view={view}
              minColumnWidth={84}
              timeline={available ?? undefined}
              zone={calendarZone}
            >
              {available && (
                <CalendarAxis
                  from={available.from}
                  through={available.through}
                  ticks={ticks}
                  label={t('room')}
                  zone={calendarZone}
                  locale={locale}
                  view={view}
                  className="workspace-availability-axis"
                />
              )}

              {available &&
                available.rooms
                  .filter(
                    (room) =>
                      !inCare ||
                      roomKey(room.houseId, room.roomId) ===
                        roomKey(existing!.houseId, existing!.roomId),
                  )
                  .map((room, roomIndex, rooms) => {
                    const viewFrom = Date.parse(available.from),
                      viewTo = Date.parse(available.through);
                    const spanStyle = (from: number, through: number) =>
                      timelineSpan(from, through, available.from, available.through);
                    const picked = selected === roomKey(room.houseId, room.roomId);
                    return (
                      <React.Fragment key={roomKey(room.houseId, room.roomId)}>
                        {(roomIndex === 0 || rooms[roomIndex - 1].houseId !== room.houseId) && (
                          <div className="hc-range-house">
                            <LocationLabel
                              kind="house"
                              name={`${room.houseName} · ${room.timezone}`}
                            />
                          </div>
                        )}
                        <div className="hc-range-room" data-selected={picked}>
                          <div className="hc-range-room-name">
                            <LocationLabel kind="room" name={room.roomName} />
                            {room.available && (
                              <button
                                type="button"
                                disabled={!room.available || loading || blocked}
                                className="booking-room-choice"
                                aria-pressed={picked}
                                aria-label={`${t('choose')} ${room.houseName} · ${room.roomName}`}
                                onClick={() => setSelected(roomKey(room.houseId, room.roomId))}
                              >
                                <Icon name="check" />
                                {picked ? t('selected') : t('choose')}
                              </button>
                            )}
                            {room.issue && <small>{t('issue.' + room.issue)}</small>}
                          </div>
                          <CalendarTrack
                            from={available.from}
                            through={available.through}
                            ticks={ticks}
                            className="hc-time-track"
                            gridOverContent
                          >
                            {room.blocked.map((span, index) => {
                              const style = spanStyle(
                                Date.parse(span.from),
                                Date.parse(span.through),
                              );
                              return (
                                style && (
                                  <span
                                    key={index}
                                    className="hc-time-unavailable"
                                    style={style}
                                    title={t('issue.' + span.issue)}
                                    role="img"
                                    aria-label={t('blockedSpace') + ': ' + t('issue.' + span.issue)}
                                  />
                                )
                              );
                            })}
                            {valid &&
                              room.available &&
                              Date.parse(pickup) > viewFrom &&
                              Date.parse(arrival) < viewTo && (
                                <button
                                  type="button"
                                  className={'hc-time-request' + (picked ? ' picked' : '')}
                                  disabled={!room.available || loading || blocked || inCare}
                                  style={spanStyle(Date.parse(arrival), Date.parse(pickup))!}
                                  aria-label={`${t('choose')} ${room.houseName} · ${room.roomName} · ${formatInstant(arrival, zone, locale)}`}
                                  title={`${t('requestedStay')}: ${formatInstant(arrival, zone, locale)} – ${formatInstant(pickup, zone, locale)}`}
                                  aria-pressed={picked}
                                  onClick={() => setSelected(roomKey(room.houseId, room.roomId))}
                                >
                                  <span className="calendar-span-label">{t('requestedStay')}</span>
                                </button>
                              )}
                          </CalendarTrack>
                        </div>
                      </React.Fragment>
                    );
                  })}
            </CalendarFrame>
          </CalendarViewport>
          {available && !available.rooms.length && <p>{t('noRooms')}</p>}
        </section>
        <section
          className="hc-wizard-step"
          data-booking-step="3"
          hidden={step !== 3}
          aria-label={t('review')}
        >
          <div className="hc-step-intro">
            <h3 className="sr-only">{t('review')}</h3>
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
          {step === 3 && (
            <BookingCost
              row={row}
              arrival={arrival}
              pickup={pickup}
              zone={chosen?.timezone || zone}
            />
          )}
          <p className="hc-review-note">{t(data.admin ? 'unbilled' : 'customerBookingPending')}</p>
        </section>
        <footer className="hc-wizard-footer">
          <Button
            icon="close"
            variant="secondary"
            type="button"
            className="hc-manage"
            disabled={blocked}
            onClick={close}
          >
            {t('cancel')}
          </Button>
          <div>
            {step > 1 && (
              <Button
                icon="chevron-left"
                variant="secondary"
                type="button"
                className="hc-manage"
                disabled={blocked}
                onClick={() => setStep((value) => value - 1)}
              >
                {t('back')}
              </Button>
            )}
            {step < 3 ? (
              <Button
                icon="chevron-right"
                variant="primary"
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
                {t(step === 1 ? 'choose' : 'reviewBooking')}
              </Button>
            ) : (
              <Button
                variant="primary"
                icon="check"
                type="submit"
                className="hc-apply"
                disabled={saving || stale || !data.admin || !chosen || !valid}
              >
                {t(saving ? 'saving' : uncertain ? 'retry' : 'confirmPlan')}
              </Button>
            )}
          </div>
        </footer>
      </form>
    </Modal>
  );
}
