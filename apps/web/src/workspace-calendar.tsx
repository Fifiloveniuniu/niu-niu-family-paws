import Button from './button';
import SearchInput from './search-input';
import IconButton from './icon-button';
import CalendarControls from './calendar-controls';
import LocationLabel from './location-label';
import { CalendarAxis, CalendarTrack, CalendarFrame, CalendarViewport } from './calendar-timeline';
import {
  timelinePosition,
  timelineSpan,
  dailyTimelineTicks,
  timelineRangeLabel,
} from './timeline-layout';
import { petTypeChoice } from './pet-type';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { localeFor, speciesText, uiText, uiValue } from './i18n.ts';
import CustomSelect from './custom-select';
import Icon from './icons';
import { useWorkspaceText } from './workspace-text';
import {
  petKey,
  roomKey,
  type WorkspaceData,
  type LocationRow,
  type Booking,
} from './workspace-data';
import {
  wallNow,
  wallDateKey,
  wallDay,
  parseWallInput,
  shiftDay,
  startOfZonedDay,
} from './wall-time';
import { PetInfo } from './workspace-photos';
export type CalendarView = 'day' | 'week' | 'month' | 'year';
export type CalendarRange = {
  from: string;
  through: string;
  ticks: { at: string; key: string }[];
  date: string;
  view: CalendarView;
  zone: string;
  valid: boolean;
};
export function calendarRange(key: string, view: CalendarView, zone: string): CalendarRange {
  const selected = parseWallInput(key, false)?.date ?? wallNow(zone);
  let first = wallDateKey(selected),
    last = shiftDay(first, 1);
  if (view === 'week') {
    first = shiftDay(first, -selected.getUTCDay());
    last = shiftDay(first, 14);
  } else if (view === 'month') {
    first = wallDateKey(wallDay(selected.getUTCFullYear(), selected.getUTCMonth(), 1));
    last = wallDateKey(wallDay(selected.getUTCFullYear(), selected.getUTCMonth() + 1, 1));
  } else if (view === 'year') {
    first = wallDateKey(wallDay(selected.getUTCFullYear(), 0, 1));
    last = wallDateKey(wallDay(selected.getUTCFullYear() + 1, 0, 1));
  }
  const from = startOfZonedDay(first, zone) ?? '',
    through = startOfZonedDay(last, zone) ?? '';
  const valid = !!(from && through);
  const ticks: { at: string; key: string }[] = [];
  if (!valid) return { from, through, ticks, date: wallDateKey(selected), view, zone, valid };
  if (view === 'day') {
    for (let at = Date.parse(from); at < Date.parse(through); at += 3600000)
      ticks.push({ at: new Date(at).toISOString(), key: String(at) });
  } else if (view === 'year') {
    for (let month = 0; month < 12; month++) {
      const day = wallDateKey(wallDay(selected.getUTCFullYear(), month, 1));
      ticks.push({ at: startOfZonedDay(day, zone)!, key: day });
    }
  } else {
    ticks.push(...dailyTimelineTicks(from, through, zone));
  }
  return { from, through, ticks, date: wallDateKey(selected), view, zone, valid };
}
export function bookingStatus(booking: Booking, now: number) {
  return booking.status === 'in_care' && !booking.actualPickup && Date.parse(booking.pickup) < now
    ? 'overdue'
    : booking.status;
}
export default function WorkspaceCalendar({
  data,
  scope,
  range,
  params,
  onQuery,
  onBooking,
  onAdd,
  onAddress,
  onManage,
  loading,
  timeZoneControl,
  filterCustomer,
}: {
  data: WorkspaceData;
  scope?: string;
  range: CalendarRange;
  params: URLSearchParams;
  onQuery: (values: Record<string, string>) => void;
  onBooking: (id: string) => void;
  onAdd: (room?: { houseId: string; roomId: string }) => void;
  onAddress: (house: LocationRow['house']) => void;
  onManage: (target: { houseId: string; roomId?: string; addRoom?: boolean }) => void;
  loading: boolean;
  timeZoneControl?: React.ReactNode;
  filterCustomer?: React.ReactNode;
}) {
  const t = useWorkspaceText();
  const { i18n } = useTranslation();
  const [filtersOpen, setFiltersOpen] = React.useState(true);
  const [now, setNow] = React.useState(Date.now());
  React.useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);
  const locale = localeFor(i18n.language);
  const dtf = React.useMemo(
    () =>
      new Intl.DateTimeFormat(locale, {
        timeZone: range.zone,
        month: 'short',
        day: 'numeric',
        year: range.view === 'year' ? 'numeric' : undefined,
      }),
    [locale, range.zone, range.view],
  );
  const rows = React.useMemo(
    () => new Map(data.rows.map((row) => [petKey(row.customer.id, row.pet.id), row])),
    [data.rows],
  );
  const house = params.get('house') ?? '',
    room = params.get('room') ?? '',
    type = params.get('species') ?? '',
    status = params.get('status') ?? '',
    query = params.get('q') ?? '';
  const visible = data.bookings.filter((booking) => {
    const row = rows.get(petKey(booking.customerId, booking.petId));
    return (
      row &&
      (!house || booking.houseId === house) &&
      (!room || roomKey(booking.houseId, booking.roomId) === room) &&
      (!type || row.pet.species === type) &&
      (!status || bookingStatus(booking, now) === status) &&
      row.pet.name.toLocaleLowerCase().includes(query.toLocaleLowerCase())
    );
  });
  const position = (at: number) => timelinePosition(at, range.from, range.through);
  const locations = data.locations.filter(
    (item) =>
      (!house || item.house.id === house) &&
      (!room || item.rooms.some((candidate) => roomKey(item.house.id, candidate.id) === room)),
  );
  const title = timelineRangeLabel(range.from, range.through, range.zone, locale);
  const filtered = !!(house || room || type || status || query);
  const shift = (direction: number) => {
    const date = parseWallInput(range.date, false)!.date;
    if (range.view === 'year') date.setUTCFullYear(date.getUTCFullYear() + direction);
    else if (range.view === 'month') {
      const day = date.getUTCDate();
      date.setUTCDate(1);
      date.setUTCMonth(date.getUTCMonth() + direction);
      const last = wallDay(date.getUTCFullYear(), date.getUTCMonth() + 1, 0).getUTCDate();
      date.setUTCDate(Math.min(day, last));
    } else date.setUTCDate(date.getUTCDate() + direction * (range.view === 'week' ? 14 : 1));
    onQuery({ date: wallDateKey(date) });
  };
  return (
    <section className="hc-calendar-workspace saved-calendar" aria-label={t('calendar')}>
      <section className="calendar-filter-panel" aria-label={uiText('ui.houseCalendar.filters')}>
        <div className="calendar-filter-heading">
          <h2>
            <Icon name="search" />
            {uiText('ui.calendarFilters.title')}
          </h2>{' '}
          <div className="calendar-filter-actions">
            <IconButton
              title={t('clearFilters')}
              aria-label={t('clearFilters')}
              disabled={!filtered}
              onClick={() => onQuery({ house: '', room: '', species: '', status: '', q: '' })}
            >
              <Icon name="reset" />
            </IconButton>
            <IconButton
              type="button"

              title={uiText(filtersOpen ? 'ui.calendarFilters.hide' : 'ui.calendarFilters.show')}
              aria-label={uiText(
                filtersOpen ? 'ui.calendarFilters.hide' : 'ui.calendarFilters.show',
              )}
              aria-expanded={filtersOpen}
              aria-controls="calendar-filter-fields"
              onClick={() => setFiltersOpen((v) => !v)}
            >
              <Icon name="chevron-down" className={filtersOpen ? 'filter-chevron-open' : ''} />
            </IconButton>
          </div>
        </div>
        <div
          id="calendar-filter-fields"
          className="workspace-filters calendar-filter-groups"
          hidden={!filtersOpen}
        >
          <fieldset>
            <legend>{uiText('ui.calendarFilters.people')}</legend>
            {filterCustomer}{' '}
            <label className="workspace-search">
              {t('searchPets')}
              <SearchInput value={query} onChange={(event) => onQuery({ q: event.target.value })} />
            </label>
            <label>
              {t('type')}
              <CustomSelect
                renderChoice={petTypeChoice}
                value={type}
                onChange={(event) => onQuery({ species: event.target.value })}
              >
                <option value="">{t('allTypes')}</option>
                {['dog', 'cat', 'rabbit'].map((species) => (
                  <option key={species} value={species}>
                    {speciesText(species)}
                  </option>
                ))}
              </CustomSelect>
            </label>
            <label>
              {t('status')}
              <CustomSelect
                value={status}
                onChange={(event) => onQuery({ status: event.target.value })}
              >
                <option value="">{t('allStatuses')}</option>
                {['planned', 'in_care', 'overdue', 'completed', 'cancelled'].map((value) => (
                  <option key={value} value={value}>
                    {t(value)}
                  </option>
                ))}
              </CustomSelect>
            </label>
          </fieldset>
          <fieldset>
            <legend>{uiText('ui.calendarFilters.location')}</legend>{' '}
            <label>
              {t('house')}
              <CustomSelect
                value={house}
                onChange={(event) => onQuery({ house: event.target.value, room: '' })}
              >
                <option value="">{t('allHouses')}</option>
                {data.locations.map((item) => (
                  <option key={item.house.id} value={item.house.id}>
                    {item.house.name}
                  </option>
                ))}
              </CustomSelect>
            </label>
            <label>
              {t('room')}
              <CustomSelect
                value={room}
                onChange={(event) => onQuery({ room: event.target.value })}
              >
                <option value="">{t('allRooms')}</option>
                {data.locations
                  .filter((item) => !house || item.house.id === house)
                  .flatMap((item) =>
                    item.rooms.map((candidate) => (
                      <option
                        key={roomKey(item.house.id, candidate.id)}
                        value={roomKey(item.house.id, candidate.id)}
                      >
                        {item.house.name} · {candidate.name}
                      </option>
                    )),
                  )}
              </CustomSelect>
            </label>
          </fieldset>
        </div>
      </section>
      <section className="calendar-results" aria-label={t('calendar')}>
        <div className="hc-toolbar">
          <CalendarControls
            title={title}
            view={range.view}
            onShift={shift}
            onToday={() => onQuery({ date: wallDateKey(wallNow(range.zone)) })}
            onView={(view) => onQuery({ view })}
            timezone={timeZoneControl}
          />
          <div className="calendar-toolbar-actions">
            <Button
              variant="primary"
              className="hc-apply"
              disabled={!data.rows.length}
              onClick={() => onAdd()}
            >
              <Icon name="plus" />
              {t(data.admin ? 'addBooking' : 'availability')}
            </Button>
          </div>
        </div>
        <ul className="calendar-annotations" aria-label={uiText('ui.calendarAnnotations.legend')}>
          {['planned', 'in_care', 'completed', 'cancelled', 'overdue'].map((status) => (
            <li key={status}>
              <span className={'calendar-status-dot ' + status} aria-hidden="true" />
              {t(status)}
            </li>
          ))}
        </ul>
        {loading && <p role="status">{t('loading')}</p>}
        <CalendarViewport
          className="hc-scroll"
          label={t('timeline')}
          hint={uiText('ui.calendarTimeline.panHint')}
        >
          <CalendarFrame
            className="hc-calendar saved-calendar-grid"
            ticks={range.ticks}
            timeline={range}
            zone={range.zone}
            view={range.view}
            role="tabpanel"
            aria-label={t(range.view)}
          >
            <CalendarAxis
              {...range}
              label={t('houseRoomPet')}
              locale={locale}
              className="hc-axis"
            />
            {locations.map((item) => (
              <React.Fragment key={item.house.id}>
                <div className="hc-house">
                  <button
                    type="button"
                    className="workspace-house-address"
                    title={t('viewAddress')}
                    aria-label={`${t('viewAddress')}: ${item.house.name}`}
                    onClick={() => onAddress(item.house)}
                  >
                    <LocationLabel kind="house" name={item.house.name} />
                  </button>
                  {item.house.timezone !== range.zone && (
                    <small>{item.house.timezone || uiText('common.notAvailable')}</small>
                  )}
                  <div className="workspace-row-actions">
                    {data.admin && (
                      <button
                        type="button"
                        className="hc-settings"
                        title={uiValue('ui.houses.labels', i18n.language).edit}
                        aria-label={
                          uiValue('ui.houses.labels', i18n.language).edit + ': ' + item.house.name
                        }
                        onClick={() => onManage({ houseId: item.house.id })}
                      >
                        <Icon name="settings" />
                      </button>
                    )}
                    {data.admin && (
                      <button
                        className="hc-settings"
                        type="button"
                        title={
                          item.house.address?.trim()
                            ? uiText('ui.rooms.add')
                            : uiText('ui.houses.addressMissing')
                        }
                        aria-label={`${uiText('ui.rooms.add')}: ${item.house.name}`}
                        disabled={!item.house.address?.trim()}
                        onClick={() => onManage({ houseId: item.house.id, addRoom: true })}
                      >
                        <Icon name="plus" />
                      </button>
                    )}
                  </div>
                </div>
                {item.rooms
                  .filter((candidate) => !room || roomKey(item.house.id, candidate.id) === room)
                  .map((candidate) => {
                    const stays = visible.filter(
                      (b) => b.houseId === item.house.id && b.roomId === candidate.id,
                    );
                    const groups = new Map<string, Booking[]>();
                    for (const stay of stays) {
                      const key = petKey(stay.customerId, stay.petId);
                      groups.set(key, [...(groups.get(key) ?? []), stay]);
                    }
                    return (
                      <React.Fragment key={candidate.id}>
                        <div className="hc-room" data-room-id={candidate.id}>
                          <LocationLabel kind="room" name={candidate.name} />
                          <div className="workspace-row-actions">
                            {data.admin && (
                              <button
                                type="button"
                                className="hc-settings"
                                title={uiText('ui.rooms.edit')}
                                aria-label={uiText('ui.rooms.edit') + ': ' + candidate.name}
                                onClick={() =>
                                  onManage({ houseId: item.house.id, roomId: candidate.id })
                                }
                              >
                                <Icon name="settings" />
                              </button>
                            )}
                            <button
                              type="button"
                              className="hc-settings"
                              title={t('addBooking')}
                              aria-label={`${t('addBooking')}: ${item.house.name} · ${candidate.name}`}
                              onClick={() =>
                                onAdd({ houseId: item.house.id, roomId: candidate.id })
                              }
                            >
                              <Icon name="plus" />
                            </button>
                          </div>
                        </div>
                        {(data.busy ?? []).some(
                          (span) => span.houseId === item.house.id && span.roomId === candidate.id,
                        ) && (
                          <div className="hc-pet saved-busy-room">
                            <div className="hc-label">
                              <Icon name="calendar" />
                              {t('busy')}
                            </div>
                            <CalendarTrack {...range} className="hc-track">
                              {(data.busy ?? [])
                                .filter(
                                  (span) =>
                                    span.houseId === item.house.id && span.roomId === candidate.id,
                                )
                                .map((span, index) => (
                                  <span
                                    key={index}
                                    className="hc-stay busy"
                                    style={timelineSpan(
                                      Date.parse(span.from),
                                      Date.parse(span.through),
                                      range.from,
                                      range.through,
                                    )!}
                                    title={`${t('busy')} · ${new Date(span.from).toLocaleString(locale, { timeZone: range.zone })} – ${new Date(span.through).toLocaleString(locale, { timeZone: range.zone })}`}
                                  >
                                    <Icon name="calendar" />
                                    {t('busy')}
                                  </span>
                                ))}
                            </CalendarTrack>
                          </div>
                        )}
                        {!groups.size &&
                          !(data.busy ?? []).some(
                            (span) =>
                              span.houseId === item.house.id && span.roomId === candidate.id,
                          ) && (
                            <div className="hc-pet saved-empty-room">
                              <div className="hc-label">{t('emptyBookings')}</div>
                              <CalendarTrack {...range} className="hc-track" />
                            </div>
                          )}
                        {[...groups].map(([key, bookings]) => {
                          const row = rows.get(key)!;
                          const current =
                            bookings.find((b) => b.status === 'in_care') ?? bookings[0];
                          return (
                            <div className="hc-pet" data-room-id={candidate.id} key={key}>
                              <div className="hc-label">
                                <PetInfo
                                  row={row}
                                  scope={scope}
                                  status={t(bookingStatus(current, now))}
                                  location={`${item.house.name} · ${candidate.name}`}
                                />
                                <div>
                                  <strong title={row.pet.name}>{row.pet.name}</strong>
                                  <small>
                                    {row.pet.species ? petTypeChoice(row.pet.species) : ''}
                                  </small>
                                </div>
                              </div>
                              <CalendarTrack {...range} className="hc-track">
                                {bookings.map((booking) => {
                                  const start = Date.parse(booking.occupancyFrom),
                                    end =
                                      bookingStatus(booking, now) === 'overdue'
                                        ? Date.parse(range.through)
                                        : Date.parse(booking.occupancyThrough);
                                  const span = timelineSpan(start, end, range.from, range.through);
                                  if (!span) return null;
                                  const description = new Intl.DateTimeFormat(locale, {
                                    timeZone: booking.timezone,
                                    dateStyle: 'medium',
                                    timeStyle: 'short',
                                  });
                                  const label = `${row.pet.name} · ${description.format(new Date(booking.arrival))} – ${description.format(new Date(booking.pickup))} · ${t(bookingStatus(booking, now))}`;
                                  return (
                                    <button
                                      key={booking.id}
                                      type="button"
                                      className={`hc-stay ${booking.status === 'in_care' ? 'in' : booking.status === 'planned' ? 'upcoming' : 'out'} ${bookingStatus(booking, now) === 'overdue' ? 'overdue' : ''} ${booking.status === 'cancelled' ? 'cancelled' : ''}`}
                                      style={span}
                                      title={label}
                                      aria-label={label}
                                      onClick={() => onBooking(booking.id)}
                                    >
                                      <span>
                                        {t(bookingStatus(booking, now))} ·{' '}
                                        {dtf.format(new Date(booking.arrival))} –{' '}
                                        {dtf.format(new Date(booking.pickup))}
                                      </span>
                                    </button>
                                  );
                                })}
                              </CalendarTrack>
                            </div>
                          );
                        })}
                      </React.Fragment>
                    );
                  })}
              </React.Fragment>
            ))}
          </CalendarFrame>
        </CalendarViewport>
        {!locations.length && !loading && <p className="hc-empty">{t('noRooms')}</p>}
      </section>
    </section>
  );
}
