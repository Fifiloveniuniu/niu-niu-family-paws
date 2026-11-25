import { useDialogState } from './dialog-routing';
import Button from './button';
import SegmentedTabs from './segmented-tabs';
import { petTypeChoice } from './pet-type';
import { withoutLanguage } from './language-url.ts';
import { localeFor, type Language, uiText } from './i18n.ts';
import CalendarPetPreview from './calendar-pet-preview';
import CustomSelect from './custom-select';
import CustomAutocomplete from './custom-autocomplete';
import { initialStays } from './calendar-fixtures';
import { sampleDateAtOffset, MILLISECONDS_PER_DAY } from './calendar-time';
import { localDateKey } from './date-utils';
import React from 'react';
import { currentRoute, routeUrl, navigate, closeRecord, updateQuery } from './routing';
import { useTranslation } from 'react-i18next';
import { MarketingHeader } from './marketing-shell';
import CalendarSettingsDialog, { type CalendarSettings } from './calendar-settings';
import Icon from './icons';
import AssignmentDialog from './calendar-assignment';
import BalancesPage from './balances-page';
import PetBalances from './pet-balances';
import type { BalancePolicyTemplate } from './pet-balance';
import {
  CalendarPhotoProvider,
  CalendarPhotoStatus,
  CalendarProfileLink,
} from './calendar-pet-photos';
import {
  balanceKey,
  changePetBalance,
  validatePetCoverage,
  type PetBalance,
  type BalanceChange,
  type BalanceService,
  type PlannedCoverage,
} from './pet-balance';
import type { Placement } from './calendar-placement';
import Modal from './modal';
import { auth } from './auth-client';
import { onIdTokenChanged } from 'firebase/auth';
import { confirmDiscardChanges } from './unsaved-changes';
import './house-calendar.css';

type Scale = 'day' | 'week' | 'month' | 'year';
type Stay = Placement;

// Isolated preview fixture only; never production house/capacity configuration.
function practiceRoomSettings(): Record<string, CalendarSettings> {
  return import.meta.env.MODE === 'test'
    ? {
        '1-4': {
          name: '',
          address: '',
          timezone: '',
          capacity: '2',
          costs: { dog: '1', cat: '1', rabbit: '1' },
        },
      }
    : {};
}
export default function HouseCalendar({
  onLanguageChange,
  customers,
  personal,
  account,
  identityEpoch = 0,
}: {
  onLanguageChange: (lang: Language) => void;
  customers?: React.ReactNode;
  personal?: React.ReactNode;
  account?: React.ReactNode;
  identityEpoch?: number;
}) {
  const { i18n } = useTranslation();

  const route = withoutLanguage(routeUrl());
  const parsed = currentRoute();
  const path = parsed.path;
  const routeParams = new URLSearchParams(parsed.search);
  const view =
    parsed.kind === 'balances'
      ? 'balances'
      : parsed.kind === 'customers'
        ? 'customers'
        : parsed.kind === 'settings'
          ? 'settings'
          : parsed.kind === 'personal'
            ? 'personal'
            : 'calendar';
  const [balancePagePet, setBalancePagePet] = React.useState('');
  const [stays, setStays] = React.useState<Stay[]>(() =>
    initialStays.map((stay, i) => ({ ...stay, id: 'sample-' + i, units: 1 })),
  );
  const [locations, setLocations] = React.useState([
    { id: 1, rooms: [1, 2, 3, ...(import.meta.env.MODE === 'test' ? [4] : [])] },
    { id: 2, rooms: [1, 2] },
  ]);
  const [assignment, setAssignment] = useDialogState<
    { house: number; room: number } | null | false
  >('preview-booking-add', false, {
    encode: (value) => (value === false ? null : value === null ? 'new' : JSON.stringify(value)),
    decode: (raw) => (raw === 'new' ? null : JSON.parse(raw)),
  });
  const [balanceTemplates, setBalanceTemplates] = React.useState<BalancePolicyTemplate[]>([]);
  const [balances, setBalances] = React.useState<Record<string, PetBalance>>({});
  const pendingBalance = React.useRef<{ pet: string; service: BalanceService } | null>(null);
  const [balanceView, setBalanceView] = useDialogState<{
    pet: string;
    service: BalanceService;
    fromStay?: boolean;
  } | null>('preview-balance', null, {
    encode: (value) =>
      value
        ? JSON.stringify({
            pet: initialStays.findIndex((item) => item.name === value.pet),
            service: value.service,
            fromStay: value.fromStay,
          })
        : null,
    decode: (raw) => {
      const value = JSON.parse(raw);
      const pet = initialStays[value.pet];
      if (!pet) throw Error('Pet unavailable');
      return { pet: pet.name, service: 'boarding', fromStay: !!value.fromStay };
    },
  });
  const [notice, setNotice] = React.useState('');
  const nextId = React.useRef(10);
  const [customerFilter, setCustomerFilter] = React.useState('all');
  const customerFor = (name: string) => {
    const index = initialStays.findIndex((petProfile) => petProfile.name === name);
    return index < 0 ? '4' : String(Math.floor(index / 3) + 1);
  };
  const customerName = (id: string) => uiText('ui.houseCalendar.family') + ' ' + id;
  const [config, setConfig] = React.useState<Record<string, CalendarSettings>>(() =>
    practiceRoomSettings(),
  );
  const [roomFilter, setRoomFilter] = React.useState('all');
  const [speciesFilter, setSpeciesFilter] = React.useState('all');
  const [statusFilter, setStatusFilter] = React.useState('all');
  const [settings, setSettings] = useDialogState<{
    house: number;
    room?: number;
    creating?: boolean;
  } | null>('preview-location-edit', null);
  const [addressHouse, setAddressHouse] = useDialogState<number | null>('preview-address', null);
  const [admin, setAdmin] = React.useState(false);
  React.useEffect(
    () =>
      onIdTokenChanged(auth, (user) => {
        setAdmin(false);
        if (user)
          void user
            .getIdTokenResult()
            .then((token) => {
              if (auth.currentUser === user) setAdmin(token.claims.admin === true);
            })
            .catch(() => {});
      }),
    [],
  );
  React.useEffect(() => {}, [admin]);
  const [clockTimezone, setClockTimezone] = React.useState(
    () => Intl.DateTimeFormat().resolvedOptions().timeZone,
  );
  const clockTimezones = Array.from(
    new Set([clockTimezone, ...Intl.supportedValuesOf('timeZone')]),
  );
  const [now, setNow] = React.useState(() => new Date());
  React.useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);
  const anchor = React.useRef(new Date(new Date().setHours(0, 0, 0, 0))).current;
  const [focusDate, setFocusDate] = React.useState(anchor);
  const [scale, setScale] = React.useState<Scale>('week');
  const [offset, setOffset] = React.useState(0);
  const [house, setHouse] = React.useState('all');
  const [query, setQuery] = React.useState('');
  const [collapsed, setCollapsed] = React.useState<string[]>([]);
  const [selected, setSelected] = useDialogState<Stay | null>(
    'preview-booking',
    null,
    {
      encode: (value) => value?.id ?? null,
      decode: (raw) => {
        const item = stays.find((item) => item.id === raw);
        if (!item) throw Error('Stay unavailable');
        return item;
      },
    },
    [stays],
  );
  React.useEffect(() => {
    if ([...new URLSearchParams(location.search).keys()].some((key) => key.startsWith('dialog.')))
      return;
    document.querySelector<HTMLDetailsElement>('.hc-account-menu')?.removeAttribute('open');
    window.scrollTo({ top: 0, behavior: 'instant' });
    setBalanceView(pendingBalance.current);
    pendingBalance.current = null;
    setAssignment(false);
    setSettings(null);
    const selectedStay = parsed.bookingId
      ? stays.find((stay) => stay.id === parsed.bookingId) || null
      : null;
    setSelected(selectedStay);
  }, [route]);
  const span = { day: 1, week: 14, month: 35, year: 365 }[scale];
  const before = { day: 0, week: 3, month: 7, year: 30 }[scale];
  const from = new Date(focusDate.getTime() + (offset * span - before) * MILLISECONDS_PER_DAY);
  const to = new Date(from.getTime() + span * MILLISECONDS_PER_DAY);
  const locale = localeFor(i18n.language);
  const date = (
    value: Date,
    options: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' },
  ) => value.toLocaleDateString(locale, options);
  const dateAtOffset = (dayOffset: number) => sampleDateAtOffset(anchor, dayOffset);
  const status = (stay: Stay) =>
    stay.status === 'in'
      ? uiText('ui.houseCalendar.checkedIn')
      : stay.status === 'out'
        ? uiText('ui.houseCalendar.checkedOut')
        : uiText('ui.houseCalendar.notCheckedIn');
  const ticks =
    scale === 'day'
      ? Array.from({ length: 12 }, (_, i) => new Date(from.getTime() + i * 2 * 3600000))
      : scale === 'year'
        ? Array.from(
            { length: 12 },
            (_, i) => new Date(from.getTime() + ((i * span) / 12) * MILLISECONDS_PER_DAY),
          )
        : Array.from(
            { length: span },
            (_, i) => new Date(from.getTime() + i * MILLISECONDS_PER_DAY),
          );
  const timelinePercent = (dateValue: Date) =>
    ((dateValue.getTime() - from.getTime()) / (span * MILLISECONDS_PER_DAY)) * 100;
  const houseName = (h: number) =>
    config['h' + h]?.name || uiText('ui.houseCalendar.house') + ' ' + (h === 1 ? 'A' : 'B');
  const roomName = (h: number, r: number) =>
    config[h + '-' + r]?.name ||
    (import.meta.env.MODE === 'test' && h === 1 && r === 4
      ? uiText('ui.houseCalendar.practiceRoom')
      : uiText('ui.houseCalendar.room') + ' ' + r);
  const roster = [
    ...initialStays.map((stay) => ({ name: stay.name, species: stay.species })),
    { name: 'Willow', species: 'dog' },
    { name: 'Pebble', species: 'rabbit' },
    { name: 'Miso', species: 'cat' },
  ].map((petProfile) => ({
    ...petProfile,
    customer: customerFor(petProfile.name),
    customerName: customerName(customerFor(petProfile.name)),
  }));
  const dateKey = (dateValue: Date) => localDateKey(dateValue);
  const balancePlans: PlannedCoverage[] = stays
    .filter((stay) => stay.coverage && stay.status !== 'out')
    .map((stay) => ({
      id: stay.id,
      pet: stay.name,
      service: stay.coverage!.service,
      days: stay.coverage!.days,
      startDate: dateKey(dateAtOffset(stay.start)),
      endDate: dateKey(dateAtOffset(stay.end)),
    }));
  function saveBalance(change: BalanceChange) {
    const key = balanceKey(change.pet, change.service);
    const account = changePetBalance(balances[key], change, balancePlans, new Date().toISOString());
    setBalances((previous) => ({ ...previous, [key]: account }));
    if (balanceView?.fromStay) setBalanceView(null);
  }
  React.useEffect(() => {
    if (identityEpoch) {
      setBalances({});
      setBalanceTemplates([]);
      setConfig(practiceRoomSettings());
      setStays(initialStays.map((stay, i) => ({ ...stay, id: 'sample-' + i, units: 1 })));
      setLocations([
        { id: 1, rooms: [1, 2, 3, ...(import.meta.env.MODE === 'test' ? [4] : [])] },
        { id: 2, rooms: [1, 2] },
      ]);
      setBalanceView(null);
      setAssignment(false);
      setSettings(null);
    }
  }, [identityEpoch]);
  const nowPos = timelinePercent(now);
  const visible = stays.filter(
    (stay) =>
      (house === 'all' || String(stay.house) === house) &&
      (roomFilter === 'all' || stay.house + '-' + stay.room === roomFilter) &&
      (speciesFilter === 'all' || stay.species === speciesFilter) &&
      (statusFilter === 'all' ||
        (statusFilter === 'overdue' ? stay.overdue : stay.status === statusFilter)) &&
      (customerFilter === 'all' || customerFor(stay.name) === customerFilter) &&
      stay.name.toLowerCase().includes(query.trim().toLowerCase()),
  );
  const settingKey = settings
    ? settings.room
      ? settings.house + '-' + settings.room
      : 'h' + settings.house
    : '';
  const settingValue = settings
    ? config[settingKey] || {
        name: settings.creating
          ? ''
          : settings.room
            ? roomName(settings.house, settings.room)
            : houseName(settings.house),
        address: '',
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        capacity: '',
      }
    : null;
  React.useEffect(() => {
    if (parsed.kind !== 'calendar') return;
    const queryParameters = new URLSearchParams(parsed.search);
    const dateValue = queryParameters.get('date');
    const date =
      dateValue && /^\d{4}-\d{2}-\d{2}$/.test(dateValue)
        ? new Date(dateValue + 'T00:00:00')
        : anchor;
    setFocusDate(date && !Number.isNaN(date.getTime()) ? date : anchor);
    setOffset(0);
    const v = queryParameters.get('view');
    setScale(v && ['day', 'week', 'month', 'year'].includes(v) ? (v as Scale) : 'week');
    setHouse(queryParameters.get('house') || 'all');
    setRoomFilter(queryParameters.get('room') || 'all');
    setCustomerFilter(queryParameters.get('customer') || 'all');
    setSpeciesFilter(queryParameters.get('species') || 'all');
    setStatusFilter(queryParameters.get('status') || 'all');
    setQuery(queryParameters.get('q') || '');
  }, [parsed.search, parsed.kind]);
  const scaleValues: Scale[] = ['day', 'week', 'month', 'year'];
  function changeScale(value: Scale) {
    setScale(value);
    setOffset(0);
    updateQuery({ view: value });
  }
  const scales = (
    <SegmentedTabs
      label={uiText('ui.houseCalendar.calendarView')}
      value={scale}
      onChange={changeScale}
      items={scaleValues.map((value) => ({
        value,
        id: 'hc-tab-' + value,
        panelId: 'hc-timeline-panel',
        label: uiText('ui.houseCalendar.scale.' + value),
      }))}
    />
  );

  return (
    <CalendarPhotoProvider>
      <div className="hc">
        <MarketingHeader
          showNavigation={false}
          page="app"
          onLanguageChange={onLanguageChange}
          account={account}
          navigation={
            <nav className="app-header-nav" aria-label={uiText('ui.houseCalendar.workspace')}>
              {[
                ['/app/calendar/', 'calendar'],
                ['/app/customers/', 'customers'],
                ['/app/balances/', 'balances'],
              ].map(([href, key]) => (
                <a
                  key={key}
                  href={
                    key === 'balances' && balancePagePet && balancePagePet !== 'all'
                      ? href + '?pet=' + encodeURIComponent(balancePagePet)
                      : href
                  }
                  aria-current={view === key ? 'page' : undefined}
                >
                  <Icon
                    name={
                      key === 'calendar'
                        ? 'calendar'
                        : key === 'customers'
                          ? 'customers'
                          : key === 'balances'
                            ? 'balance'
                            : 'settings'
                    }
                  />
                  <span>{uiText('common.navigation.' + key)}</span>
                </a>
              ))}
            </nav>
          }
        />
        <div className="hc-body">
          <main className="hc-content" id="main">
            <div data-retained-workspace data-customer-workspace hidden={view !== 'customers'}>
              {customers || (
                <a className="hc-manage" href="/app/sign-in/">
                  {uiText('ui.houseCalendar.signInToManageCustomers')}
                </a>
              )}
            </div>
            <div data-retained-workspace hidden={view !== 'personal'}>
              {personal}
            </div>
            {view === 'balances' && (
              <BalancesPage
                key={path}
                search={parsed.search}
                accounts={balances}
                pets={roster}
                plans={balancePlans}
                templates={balanceTemplates}
                onSaveTemplate={(item) => setBalanceTemplates((previous) => [...previous, item])}
                initialPet={routeParams.get('pet') || 'all'}
                onSelectPet={setBalancePagePet}
                onSave={saveBalance}
                onManageBalance={(pet) => setBalanceView({ pet, service: 'boarding' })}
              />
            )}
            <div className="hc-calendar-workspace" hidden={view !== 'calendar'}>
              {parsed.bookingId && !stays.some((stay) => stay.id === parsed.bookingId) && (
                <p role="alert">{uiText('ui.houseCalendar.bookingNotFound')}</p>
              )}
              <div className="hc-page-toolbar">
                <div className="hc-page-toolbar-actions">
                  <div className="hc-main-actions">
                    <Button
                      variant="primary"
                      className="hc-apply hc-add-placement"
                      onClick={() => setAssignment(null)}
                    >
                      <Icon name="plus" />
                      {uiText('ui.houseCalendar.addBooking')}
                    </Button>
                    <Button
                      variant="secondary"
                      className="hc-manage hc-add-house"
                      title={uiText('ui.houseCalendar.addHouse')}
                      aria-label={uiText('ui.houseCalendar.addHouse')}
                      onClick={() => setSettings({ house: nextId.current++, creating: true })}
                    >
                      <Icon name="plus" />
                      {uiText('ui.houseCalendar.addHouse')}
                    </Button>
                  </div>
                  <div className="hc-clock-controls">
                    <label>
                      <span>{uiText('ui.houseCalendar.timezone')}</span>
                      <CustomSelect
                        aria-label={uiText('ui.houseCalendar.clockTimezone')}
                        value={clockTimezone}
                        onChange={(event) => setClockTimezone(event.target.value)}
                      >
                        {clockTimezones.map((zone) => (
                          <option key={zone} value={zone}>
                            {zone.replaceAll('_', ' ')}
                          </option>
                        ))}
                      </CustomSelect>
                    </label>
                  </div>
                </div>
              </div>
              {notice && (
                <p className="hc-notice" role="status">
                  {notice}
                </p>
              )}
              <section className="hc-filters" aria-label={uiText('ui.houseCalendar.filters')}>
                <div className="hc-filters-heading">
                  <h2>{uiText('ui.houseCalendar.filters')}</h2>
                  <button
                    className="hc-clear"
                    title={uiText('ui.houseCalendar.clearFilters')}
                    aria-label={uiText('ui.houseCalendar.clearFilters')}
                    disabled={
                      house === 'all' &&
                      roomFilter === 'all' &&
                      speciesFilter === 'all' &&
                      statusFilter === 'all' &&
                      customerFilter === 'all' &&
                      !query
                    }
                    onClick={() => {
                      setHouse('all');
                      setRoomFilter('all');
                      setSpeciesFilter('all');
                      setStatusFilter('all');
                      setCustomerFilter('all');
                      setQuery('');
                      updateQuery({
                        house: null,
                        room: null,
                        customer: null,
                        species: null,
                        status: null,
                        q: null,
                      });
                    }}
                  >
                    <Icon name="close" />
                  </button>
                </div>
                <div className="hc-filter-fields">
                  <label>
                    {uiText('ui.houseCalendar.house')}
                    <CustomSelect
                      aria-label={uiText('ui.houseCalendar.house')}
                      value={house}
                      onChange={(event) => {
                        setHouse(event.target.value);
                        setRoomFilter('all');
                        updateQuery({ house: event.target.value, room: null });
                      }}
                    >
                      <option value="all">{uiText('ui.houseCalendar.allHouses')}</option>
                      {locations.map(({ id: h }) => (
                        <option key={h} value={h}>
                          {houseName(h)}
                        </option>
                      ))}
                    </CustomSelect>
                  </label>
                  <label>
                    {uiText('ui.houseCalendar.room')}
                    <CustomSelect
                      aria-label={uiText('ui.houseCalendar.room')}
                      value={roomFilter}
                      onChange={(event) => {
                        setRoomFilter(event.target.value);
                        updateQuery({ room: event.target.value });
                      }}
                    >
                      <option value="all">{uiText('ui.houseCalendar.allRooms')}</option>
                      {locations
                        .filter((h) => house === 'all' || house === String(h.id))
                        .flatMap(({ id: h, rooms }) =>
                          rooms.map((r) => (
                            <option key={h + '-' + r} value={h + '-' + r}>
                              {houseName(h)} · {roomName(h, r)}
                            </option>
                          )),
                        )}
                    </CustomSelect>
                  </label>
                  <label>
                    {uiText('ui.houseCalendar.petType')}
                    <CustomSelect
                      aria-label={uiText('ui.houseCalendar.petType')}
                      renderChoice={petTypeChoice}
                      value={speciesFilter}
                      onChange={(event) => {
                        setSpeciesFilter(event.target.value);
                        updateQuery({ species: event.target.value });
                      }}
                    >
                      <option value="all">{uiText('ui.houseCalendar.allTypes')}</option>
                      <option value="dog">{uiText('ui.houseCalendar.dog')}</option>
                      <option value="cat">{uiText('ui.houseCalendar.cat')}</option>
                      <option value="rabbit">{uiText('ui.houseCalendar.rabbit')}</option>
                    </CustomSelect>
                  </label>
                  <label>
                    {uiText('ui.houseCalendar.status')}
                    <CustomSelect
                      aria-label={uiText('ui.houseCalendar.status')}
                      value={statusFilter}
                      onChange={(event) => {
                        setStatusFilter(event.target.value);
                        updateQuery({ status: event.target.value });
                      }}
                    >
                      <option value="all">{uiText('ui.houseCalendar.allStatuses')}</option>
                      <option value="in">{uiText('ui.houseCalendar.checkedIn')}</option>
                      <option value="upcoming">{uiText('ui.houseCalendar.notCheckedIn')}</option>
                      <option value="out">{uiText('ui.houseCalendar.checkedOut')}</option>
                      <option value="overdue">{uiText('ui.houseCalendar.pickupOverdue')}</option>
                    </CustomSelect>
                  </label>
                  <label>
                    {uiText('ui.houseCalendar.customer')}
                    <CustomSelect
                      aria-label={uiText('ui.houseCalendar.customer')}
                      value={customerFilter}
                      onChange={(event) => {
                        setCustomerFilter(event.target.value);
                        updateQuery({ customer: event.target.value });
                      }}
                    >
                      <option value="all">{uiText('ui.houseCalendar.allCustomers')}</option>
                      {['1', '2', '3', '4'].map((id) => (
                        <option key={id} value={id}>
                          {customerName(id)}
                        </option>
                      ))}
                    </CustomSelect>
                  </label>
                  <label className="hc-search">
                    {uiText('ui.houseCalendar.findAPet')}
                    <CustomAutocomplete
                      label={uiText('ui.houseCalendar.findAPet')}
                      value={query}
                      options={[
                        { value: '', label: uiText('ui.workspace.allPets') },
                        ...Array.from(
                          new Set(
                            stays
                              .filter(
                                (stay) =>
                                  customerFilter === 'all' ||
                                  customerFor(stay.name) === customerFilter,
                              )
                              .map((stay) => stay.name),
                          ),
                        ).map((name) => ({ value: name, label: name })),
                      ]}
                      onChange={(value) => {
                        setQuery(value);
                        updateQuery({ q: value });
                      }}
                    />
                  </label>
                </div>
              </section>

              <section
                className="hc-calendar"
                aria-label={uiText('ui.houseCalendar.petStayTimeline')}
              >
                <div className="hc-range">
                  <div>
                    <button
                      title={uiText('ui.houseCalendar.previousPeriod')}
                      aria-label={uiText('ui.houseCalendar.previousPeriod')}
                      onClick={() => {
                        setOffset(offset - 1);
                        updateQuery({
                          date: dateKey(
                            new Date(
                              focusDate.getTime() + (offset - 1) * span * MILLISECONDS_PER_DAY,
                            ),
                          ),
                        });
                      }}
                    >
                      ‹
                    </button>
                    <button
                      onClick={() => {
                        setFocusDate(anchor);
                        setOffset(0);
                        updateQuery({ date: null });
                      }}
                    >
                      {uiText('ui.houseCalendar.today')}
                    </button>
                    <button
                      title={uiText('ui.houseCalendar.nextPeriod')}
                      aria-label={uiText('ui.houseCalendar.nextPeriod')}
                      onClick={() => {
                        setOffset(offset + 1);
                        updateQuery({
                          date: dateKey(
                            new Date(
                              focusDate.getTime() + (offset + 1) * span * MILLISECONDS_PER_DAY,
                            ),
                          ),
                        });
                      }}
                    >
                      ›
                    </button>
                  </div>
                  <h2>
                    {date(from)} – {date(to)} <span>{to.getFullYear()}</span>
                  </h2>
                  {scales}
                </div>
                <div
                  className="hc-scroll"
                  id="hc-timeline-panel"
                  role="tabpanel"
                  aria-labelledby={'hc-tab-' + scale}
                  tabIndex={0}
                  aria-label={uiText('ui.houseCalendar.scrollTimelineHorizontally')}
                >
                  <div className={'hc-grid hc-' + scale}>
                    {nowPos >= 0 && nowPos <= 100 && (
                      <div className="hc-now-overlay">
                        <div style={{ left: `${nowPos}%` }}>
                          <span className="hc-now-badge">{uiText('ui.houseCalendar.now')}</span>
                        </div>
                      </div>
                    )}
                    <div className="hc-axis">
                      <div className="hc-label">{uiText('ui.houseCalendar.houseRoomPet')}</div>
                      <div className="hc-track hc-ticks">
                        {ticks.map((dateValue, i) => (
                          <div
                            key={i}
                            style={{
                              left: `${(i / ticks.length) * 100}%`,
                              width: `${100 / ticks.length}%`,
                            }}
                            className={date(dateValue) === date(now) ? 'today' : ''}
                          >
                            <small>
                              {scale === 'day'
                                ? date(dateValue)
                                : scale === 'year'
                                  ? dateValue.getFullYear()
                                  : date(dateValue, { weekday: 'short' })}
                            </small>
                            <strong>
                              {scale === 'day'
                                ? dateValue.getHours() + ':00'
                                : scale === 'year'
                                  ? date(dateValue, { month: 'short' })
                                  : dateValue.getDate()}
                            </strong>
                          </div>
                        ))}
                      </div>
                    </div>
                    {locations
                      .filter(
                        (h) =>
                          (house === 'all' || house === String(h.id)) &&
                          ((!query &&
                            speciesFilter === 'all' &&
                            statusFilter === 'all' &&
                            customerFilter === 'all' &&
                            roomFilter === 'all') ||
                            visible.some((stay) => stay.house === h.id)),
                      )
                      .map(({ id: h, rooms }) => (
                        <React.Fragment key={h}>
                          <div className="hc-house">
                            ⌂ &nbsp;{houseName(h)}{' '}
                            <small>
                              {
                                visible.filter((stay) => stay.house === h && stay.status === 'in')
                                  .length
                              }{' '}
                              {uiText('ui.houseCalendar.inCare')}
                            </small>
                            <button
                              className="hc-settings"
                              title={uiText('ui.houseCalendar.viewAddress')}
                              aria-label={`${uiText('ui.houseCalendar.viewAddress')}: ${houseName(h)}`}
                              onClick={() => setAddressHouse(h)}
                            >
                              <Icon name="address" />
                            </button>
                            <button
                              className="hc-settings"
                              title={uiText('ui.houseCalendar.houseSettings')}
                              aria-label={`${uiText('ui.houseCalendar.houseSettings')}: ${houseName(h)}`}
                              onClick={() => setSettings({ house: h })}
                            >
                              <Icon name="settings" />
                            </button>
                            <button
                              className="hc-settings"
                              title={uiText('ui.houseCalendar.addRoom')}
                              aria-label={uiText('ui.houseCalendar.addRoom')}
                              onClick={() =>
                                setSettings({ house: h, room: nextId.current++, creating: true })
                              }
                            >
                              <Icon name="plus" />
                            </button>
                          </div>
                          {!rooms.length && (
                            <p className="hc-empty">
                              {uiText('ui.houseCalendar.noRoomsYetAddARoomToPlacePets')}
                            </p>
                          )}
                          {rooms
                            .filter((r) => roomFilter === 'all' || roomFilter === h + '-' + r)
                            .filter(
                              (r) =>
                                (!query &&
                                  speciesFilter === 'all' &&
                                  statusFilter === 'all' &&
                                  customerFilter === 'all') ||
                                visible.some((stay) => stay.house === h && stay.room === r),
                            )
                            .map((r) => {
                              const key = h + '-' + r;
                              const rows = visible.filter(
                                (stay) => stay.house === h && stay.room === r,
                              );
                              const closed = collapsed.includes(key);
                              return (
                                <React.Fragment key={r}>
                                  <div className="hc-room-heading">
                                    <button
                                      className="hc-room"
                                      aria-expanded={!closed}
                                      onClick={() =>
                                        setCollapsed(
                                          closed
                                            ? collapsed.filter((v) => v !== key)
                                            : [...collapsed, key],
                                        )
                                      }
                                    >
                                      {closed ? '▸' : '▾'} &nbsp;{roomName(h, r)}
                                      <small>
                                        {rows.length} {uiText('ui.houseCalendar.pets')}
                                      </small>
                                    </button>
                                    <button
                                      className="hc-settings"
                                      title={uiText('ui.houseCalendar.roomSettings')}
                                      aria-label={`${uiText('ui.houseCalendar.roomSettings')}: ${houseName(h)} · ${roomName(h, r)}`}
                                      onClick={() => setSettings({ house: h, room: r })}
                                    >
                                      <Icon name="settings" />
                                    </button>
                                    <button
                                      className="hc-settings"
                                      title={uiText('ui.houseCalendar.addPet')}
                                      aria-label={`${uiText('ui.houseCalendar.addPet')}: ${houseName(h)} · ${roomName(h, r)}`}
                                      onClick={() => setAssignment({ house: h, room: r })}
                                    >
                                      <Icon name="plus" />
                                    </button>
                                  </div>
                                  {!closed && !rows.length && (
                                    <p className="hc-room-empty">
                                      {uiText('ui.houseCalendar.noStaysAssigned')}
                                    </p>
                                  )}
                                  {!closed &&
                                    rows.map((stay) => {
                                      const left = timelinePercent(dateAtOffset(stay.start));
                                      const right = timelinePercent(dateAtOffset(stay.end));
                                      const actualEnd = stay.overdue ? nowPos : right;
                                      return (
                                        <div className="hc-pet" key={stay.id}>
                                          <div className="hc-label">
                                            <CalendarPetPreview
                                              name={stay.name}
                                              species={stay.species}
                                              owner={customerName(customerFor(stay.name))}
                                              location={`${houseName(stay.house)} · ${roomName(stay.house, stay.room)}`}
                                              status={status(stay)}
                                              balance={balances[balanceKey(stay.name, 'boarding')]}
                                            />
                                            <div>
                                              <strong title={customerName(customerFor(stay.name))}>
                                                {stay.name}
                                              </strong>
                                              <small>{petTypeChoice(stay.species)}</small>
                                              <small className={'hc-status ' + stay.status}>
                                                {status(stay)}
                                              </small>
                                            </div>
                                            <button
                                              className="hc-remove-pet"
                                              title={
                                                stay.status === 'in'
                                                  ? uiText(
                                                      'ui.houseCalendar.recordPickupBeforeRemovingAnInCarePet',
                                                    )
                                                  : uiText('ui.houseCalendar.removePlacement')
                                              }
                                              aria-label={`${uiText('ui.houseCalendar.removePlacement')}: ${stay.name}`}
                                              disabled={stay.status === 'in'}
                                              onClick={() => {
                                                if (
                                                  window.confirm(
                                                    uiText(
                                                      'ui.houseCalendar.removeThisPlacementThePetProfileIsKept',
                                                    ),
                                                  )
                                                ) {
                                                  setStays((previous) =>
                                                    previous.filter(
                                                      (petProfile) => petProfile.id !== stay.id,
                                                    ),
                                                  );
                                                  setNotice(
                                                    uiText(
                                                      'ui.houseCalendar.placementRemovedPetProfileKept',
                                                    ),
                                                  );
                                                }
                                              }}
                                            >
                                              <Icon name="trash" />
                                            </button>
                                          </div>
                                          <div
                                            className="hc-track"
                                            style={{
                                              backgroundSize: `${100 / ticks.length}% 100%`,
                                            }}
                                          >
                                            {actualEnd > 0 && left < 100 && (
                                              <button
                                                className={
                                                  'hc-stay ' +
                                                  stay.status +
                                                  (stay.overdue ? ' overdue' : '')
                                                }
                                                style={{
                                                  left: `${Math.max(0, left)}%`,
                                                  width: `${Math.min(100, actualEnd) - Math.max(0, left)}%`,
                                                }}
                                                aria-label={`${stay.name}: ${status(stay)}, ${date(dateAtOffset(stay.start))} – ${date(dateAtOffset(stay.end))}${stay.overdue ? ' · ' + uiText('ui.houseCalendar.pickupOverdue') : ''}`}
                                                onClick={() =>
                                                  navigate(
                                                    '/app/calendar/bookings/' +
                                                      encodeURIComponent(stay.id) +
                                                      '/' +
                                                      parsed.search,
                                                  )
                                                }
                                              >
                                                <span>
                                                  {stay.overdue
                                                    ? uiText('ui.houseCalendar.pickupOverdue')
                                                    : date(dateAtOffset(stay.start)) +
                                                      ' – ' +
                                                      date(dateAtOffset(stay.end))}
                                                </span>
                                              </button>
                                            )}
                                          </div>
                                        </div>
                                      );
                                    })}
                                </React.Fragment>
                              );
                            })}
                        </React.Fragment>
                      ))}
                    {!visible.length && (
                      <p className="hc-empty">
                        {uiText('ui.houseCalendar.noPetsMatchTheseFilters')}
                      </p>
                    )}
                  </div>
                </div>
                <div className="hc-legend">
                  <span>
                    <i className="in" />
                    {uiText('ui.houseCalendar.checkedIn')}
                  </span>
                  <span>
                    <i className="upcoming" />
                    {uiText('ui.houseCalendar.upcomingNotCheckedIn')}
                  </span>
                  <span>
                    <i className="out" />
                    {uiText('ui.houseCalendar.checkedOut')}
                  </span>
                  <span>
                    <i className="overdue" />
                    {uiText('ui.houseCalendar.pickupOverdueStillInCare')}
                  </span>
                </div>
              </section>
              <CalendarPhotoStatus />
            </div>
            {assignment !== false && (
              <AssignmentDialog
                houses={locations.map((h) => ({
                  id: h.id,
                  name: houseName(h.id),
                  rooms: h.rooms.map((r) => ({
                    id: r,
                    name: roomName(h.id, r),
                    capacity: config[h.id + '-' + r]?.capacity || '',
                    costs: config[h.id + '-' + r]?.costs,
                  })),
                }))}
                stays={stays}
                pets={roster.map((pet) => ({ ...pet, customerId: customerFor(pet.name) }))}
                customers={[...new Set(roster.map((pet) => customerFor(pet.name)))].map((id) => ({
                  id,
                  name: customerName(id),
                }))}
                balances={balances}
                balancePlans={balancePlans}
                onManageBalance={(pet, service) => setBalanceView({ pet, service, fromStay: true })}
                anchor={anchor}
                initial={assignment || undefined}
                onClose={() => setAssignment(false)}
                onApply={(stay) => {
                  if (
                    stay.coverage &&
                    validatePetCoverage(
                      balances[balanceKey(stay.name, stay.coverage.service)],
                      stay.name,
                      stay.coverage.service,
                      stay.coverage.days,
                      dateKey(dateAtOffset(stay.start)),
                      dateKey(dateAtOffset(stay.end)),
                      balancePlans,
                    ).code !== 'ok'
                  ) {
                    setNotice(uiText('ui.houseCalendar.reviewThisPetSBalanceBeforeAddingTheStay'));
                    return;
                  }
                  setStays((previous) => [...previous, stay]);
                  setHouse('all');
                  setRoomFilter('all');
                  setSpeciesFilter('all');
                  setStatusFilter('all');
                  setCustomerFilter('all');
                  setQuery('');
                  setCollapsed((previous) =>
                    previous.filter((key) => key !== stay.house + '-' + stay.room),
                  );
                  setAssignment(false);
                  setNotice(uiText('ui.houseCalendar.petAddedToTheSchedule'));
                }}
              />
            )}
            {balanceView && (
              <PetBalances
                templates={balanceTemplates}
                onSaveTemplate={(item) => setBalanceTemplates((previous) => [...previous, item])}
                pets={roster}
                accounts={balances}
                plans={balancePlans}
                initial={balanceView}
                onClose={() => setBalanceView(null)}
                onSave={saveBalance}
              />
            )}
            {addressHouse !== null && (
              <Modal
                title={uiText('ui.houseCalendar.houseAddress')}
                onClose={() => setAddressHouse(null)}
              >
                <h3>{houseName(addressHouse)}</h3>
                <p>{config['h' + addressHouse]?.address || uiText('common.notAvailable')}</p>
                {!config['h' + addressHouse]?.address?.trim() && (
                  <p>{uiText('ui.houses.addressMissing')}</p>
                )}
              </Modal>
            )}
            {settings && settingValue && (
              <CalendarSettingsDialog
                key={settingKey}
                minimumCapacity={
                  settings.room
                    ? Math.max(
                        0,
                        ...stays
                          .filter(
                            (stay) =>
                              stay.house === settings.house &&
                              stay.room === settings.room &&
                              stay.status !== 'out',
                          )
                          .map((stay) =>
                            stays
                              .filter(
                                (petProfile) =>
                                  petProfile.house === stay.house &&
                                  petProfile.room === stay.room &&
                                  petProfile.status !== 'out' &&
                                  petProfile.start <= stay.start &&
                                  (petProfile.overdue || petProfile.end > stay.start),
                              )
                              .reduce((sum, petProfile) => sum + petProfile.units, 0),
                          ),
                      )
                    : 0
                }
                creating={settings.creating}
                onRemove={
                  settings.creating
                    ? undefined
                    : () => {
                        setLocations((previous) =>
                          settings.room
                            ? previous.map((h) =>
                                h.id === settings.house
                                  ? { ...h, rooms: h.rooms.filter((r) => r !== settings.room) }
                                  : h,
                              )
                            : previous.filter((h) => h.id !== settings.house),
                        );
                        setHouse('all');
                        setRoomFilter('all');
                        setSettings(null);
                      }
                }
                removeReason={
                  settings.room
                    ? stays.some(
                        (stay) => stay.house === settings.house && stay.room === settings.room,
                      )
                      ? uiText('ui.houseCalendar.removePlacementsFirstInCarePetsCannotBeRemoved')
                      : undefined
                    : locations.find((h) => h.id === settings.house)?.rooms.length
                      ? uiText('ui.houseCalendar.removeThisHouseSRoomsFirst')
                      : undefined
                }
                room={!!settings.room}
                houseName={houseName(settings.house)}
                value={settingValue}
                onClose={() => setSettings(null)}
                onApply={(value) => {
                  if (settings.creating)
                    setLocations((previous) =>
                      settings.room
                        ? previous.map((h) =>
                            h.id === settings.house
                              ? { ...h, rooms: [...h.rooms, settings.room!] }
                              : h,
                          )
                        : [...previous, { id: settings.house, rooms: [] }],
                    );
                  setConfig((previous) => ({ ...previous, [settingKey]: value }));
                  setSettings(null);
                }}
              />
            )}
            {selected && (
              <Modal
                title={selected.name}
                className="hc-dialog hc-stay-drawer"
                onClose={() => {
                  setSelected(null);
                  if (currentRoute().bookingId) closeRecord('/app/calendar/' + parsed.search);
                }}
              >
                <p className={'hc-status ' + selected.status}>
                  {status(selected)}
                  {selected.overdue ? ' · ' + uiText('ui.houseCalendar.pickupOverdue') : ''}
                </p>
                <dl>
                  <dt>{uiText('ui.houseCalendar.customer')}</dt>
                  <dd>{customerName(customerFor(selected.name))}</dd>
                  <dt>{uiText('ui.houseCalendar.location')}</dt>
                  <dd>
                    {houseName(selected.house)} · {roomName(selected.house, selected.room)}
                  </dd>
                  <dt>{uiText('ui.houseCalendar.plannedArrival')}</dt>
                  <dd>{dateAtOffset(selected.start).toLocaleString(locale)}</dd>
                  <dt>{uiText('ui.houseCalendar.plannedPickup')}</dt>
                  <dd>{dateAtOffset(selected.end).toLocaleString(locale)}</dd>
                  <dt>{uiText('ui.houseCalendar.actualArrival')}</dt>
                  <dd>
                    {selected.status === 'upcoming'
                      ? uiText('ui.houseCalendar.notRecorded')
                      : dateAtOffset(selected.start).toLocaleString(locale)}
                  </dd>
                  <dt>{uiText('ui.houseCalendar.actualPickup')}</dt>
                  <dd>
                    {selected.status === 'out'
                      ? dateAtOffset(selected.end).toLocaleString(locale)
                      : uiText('ui.houseCalendar.notRecorded')}
                  </dd>
                </dl>
                <CalendarProfileLink name={selected.name} />
                <Button
                  icon="balance"
                  variant="secondary"
                  className="hc-manage"
                  onClick={() => {
                    pendingBalance.current = {
                      pet: selected.name,
                      service: selected.coverage?.service || 'boarding',
                    };
                    if (!navigate('/app/calendar/' + parsed.search, true))
                      pendingBalance.current = null;
                  }}
                >
                  {uiText('ui.houseCalendar.viewPetBalance')}
                </Button>
                <p>{uiText('ui.houseCalendar.noBookingOrAttendanceDataIsSaved')}</p>
              </Modal>
            )}
          </main>
        </div>
      </div>
    </CalendarPhotoProvider>
  );
}
