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
import CustomDateInput from './custom-date-input';
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
}: {
  data: WorkspaceData;
  scope?: string;
  range: CalendarRange;
  params: URLSearchParams;
  onQuery: (values: Record<string, string>) => void;
  onBooking: (id: string) => void;
  onAdd: (room?: { houseId: string; roomId: string }) => void;
  onAddress: (house: LocationRow['house']) => void;
  onManage: (target: { houseId: string; roomId?: string }) => void;
  loading: boolean;
}) {
  const t = useWorkspaceText();
  const { i18n } = useTranslation();
  const [now, setNow] = React.useState(Date.now());
  React.useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 30000);
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
      <section className="workspace-filters" aria-label={uiText('ui.houseCalendar.filters')}>
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
          <CustomSelect value={room} onChange={(event) => onQuery({ room: event.target.value })}>
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
        <label className="workspace-search">
          {t('searchPets')}
          <input
            type="search"
            value={query}
            onChange={(event) => onQuery({ q: event.target.value })}
          />
        </label>
        <button
          className="icon-button"
          title={t('clearFilters')}
          aria-label={t('clearFilters')}
          disabled={!filtered}
          onClick={() => onQuery({ house: '', room: '', species: '', status: '', q: '' })}
        >
          <Icon name="reset" />
        </button>
      </section>
      <div className="hc-toolbar">
        <div className="hc-range">
          <button type="button" aria-label={t('previous')} onClick={() => shift(-1)}>
            <Icon name="chevron-left" />
          </button>
          <button type="button" onClick={() => onQuery({ date: wallDateKey(wallNow(range.zone)) })}>
            {t('today')}
          </button>
          <button type="button" aria-label={t('next')} onClick={() => shift(1)}>
            <Icon name="chevron-right" />
          </button>
          <h2>{title}</h2>
        </div>
        <div className="workspace-range-controls">
          {data.admin && !scope && (
            <a
              className="icon-button"
              href="/app/operations/"
              title={uiText('ui.operations.title')}
              aria-label={uiText('ui.operations.title')}
            >
              <Icon name="calendar" />
            </a>
          )}
          {data.admin && (
            <a
              className="icon-button"
              href="/app/settings/locations/"
              title={t('manageLocations')}
              aria-label={t('manageLocations')}
            >
              <Icon name="settings" />
            </a>
          )}
          <CustomDateInput
            aria-label={t('period')}
            value={range.date}
            timeZone={range.zone}
            onChange={(value) => {
              if (parseWallInput(value, false)) onQuery({ date: value });
            }}
          />
          <div className="hc-scales" role="tablist" aria-label={t('calendarView')}>
            {(['day', 'week', 'month', 'year'] as const).map((view) => (
              <button
                key={view}
                type="button"
                role="tab"
                aria-selected={range.view === view}
                onClick={() => onQuery({ view })}
              >
                {t(view)}
              </button>
            ))}
          </div>
        </div>
      </div>
      <p className="workspace-time-note">{t('timesIn', { zone: range.zone })}</p>
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
          view={range.view}
          role="tabpanel"
          aria-label={t(range.view)}
        >
          <CalendarAxis {...range} label={t('houseRoomPet')} locale={locale} className="hc-axis" />
          {position(now) >= 0 && position(now) < 100 && (
            <div
              className="workspace-now-marker"
              data-label-align={position(now) > 85 ? 'end' : 'start'}
              style={{
                left: `calc(var(--label) + (100% - var(--label)) * ${position(now) / 100})`,
              }}
              aria-label={t('now')}
            >
              <span>
                {t('now')}{' '}
                <time dateTime={new Date(now).toISOString()}>
                  {new Intl.DateTimeFormat(locale, {
                    timeZone: range.zone,
                    hour: '2-digit',
                    minute: '2-digit',
                  }).format(new Date(now))}
                </time>
              </span>
            </div>
          )}
          {locations.map((item) => (
            <React.Fragment key={item.house.id}>
              <div className="hc-house">
                <LocationLabel kind="house" name={item.house.name} />
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
                  <button
                    className="hc-settings"
                    type="button"
                    title={t('viewAddress')}
                    aria-label={`${t('viewAddress')}: ${item.house.name}`}
                    onClick={() => onAddress(item.house)}
                  >
                    <Icon name="address" />
                  </button>
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
                        <small>
                          {data.admin
                            ? `${t('capacity')} ${Number.isFinite(candidate.capacity) && candidate.capacity > 0 ? candidate.capacity : uiText('common.notAvailable')}`
                            : ''}
                        </small>
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
                            onClick={() => onAdd({ houseId: item.house.id, roomId: candidate.id })}
                          >
                            <Icon name="plus" />
                          </button>
                        </div>
                      </div>
                      {!groups.size && (
                        <div className="hc-pet saved-empty-room">
                          <div className="hc-label">{t('emptyBookings')}</div>
                          <CalendarTrack {...range} className="hc-track" />
                        </div>
                      )}
                      {[...groups].map(([key, bookings]) => {
                        const row = rows.get(key)!;
                        const current = bookings.find((b) => b.status === 'in_care') ?? bookings[0];
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
                                <small>{row.pet.species ? speciesText(row.pet.species) : ''}</small>
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
  );
}
