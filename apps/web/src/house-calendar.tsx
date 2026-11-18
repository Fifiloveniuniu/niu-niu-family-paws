import { initialStays } from './calendar-fixtures';
import { sampleDateAtOffset, MILLISECONDS_PER_DAY } from './calendar-time';
import { localDateKey } from './date-utils';
import React from 'react';
import { currentRoute, routeUrl, navigate, closeRecord, updateQuery } from './routing';
import { useTranslation } from 'react-i18next';
import { MarketingHeader } from './marketing-shell';
import Houses from './houses';
import CalendarSettingsDialog, { type CalendarSettings } from './calendar-settings';
import Icon from './icons';
import AssignmentDialog from './calendar-assignment';
import BalancesPage from './balances-page';
import PetBalances from './pet-balances';
import type { BalancePolicyTemplate } from './pet-balance';
import {
  CalendarPhotoProvider,
  PetProfileAvatar,
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

export default function HouseCalendar({
  onLanguageChange,
  customers,
  personal,
  account,
  identityEpoch = 0,
}: {
  onLanguageChange: (lang: 'en' | 'zh') => void;
  customers?: React.ReactNode;
  personal?: React.ReactNode;
  account?: React.ReactNode;
  identityEpoch?: number;
}) {
  const { i18n } = useTranslation();
  const isChinese = i18n.language === 'zh';
  const translate = (en: string, cn: string) => (isChinese ? cn : en);
  const route = routeUrl();
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
    { id: 1, rooms: [1, 2, 3] },
    { id: 2, rooms: [1, 2] },
  ]);
  const [assignment, setAssignment] = React.useState<
    { house: number; room: number } | null | false
  >(false);
  const [balanceTemplates, setBalanceTemplates] = React.useState<BalancePolicyTemplate[]>([]);
  const [balances, setBalances] = React.useState<Record<string, PetBalance>>({});
  const pendingBalance = React.useRef<{ pet: string; service: BalanceService } | null>(null);
  const [balanceView, setBalanceView] = React.useState<{
    pet: string;
    service: BalanceService;
    fromStay?: boolean;
  } | null>(null);
  const [notice, setNotice] = React.useState('');
  const nextId = React.useRef(10);
  const [customerFilter, setCustomerFilter] = React.useState('all');
  const customerFor = (name: string) => {
    const index = initialStays.findIndex((petProfile) => petProfile.name === name);
    return index < 0 ? '4' : String(Math.floor(index / 3) + 1);
  };
  const customerName = (id: string) => translate('Family', '家庭') + ' ' + id;
  const [config, setConfig] = React.useState<Record<string, CalendarSettings>>({});
  const [roomFilter, setRoomFilter] = React.useState('all');
  const [speciesFilter, setSpeciesFilter] = React.useState('all');
  const [statusFilter, setStatusFilter] = React.useState('all');
  const [settings, setSettings] = React.useState<{
    house: number;
    room?: number;
    creating?: boolean;
  } | null>(null);
  const [manage, setManage] = React.useState(false);
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
  React.useEffect(() => {
    if (!admin) setManage(false);
  }, [admin]);
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
  const [selected, setSelected] = React.useState<Stay | null>(null);
  const dialog = React.useRef<HTMLDialogElement>(null);
  React.useEffect(() => {
    document.querySelector<HTMLDetailsElement>('.hc-account-menu')?.removeAttribute('open');
    window.scrollTo({ top: 0, behavior: 'instant' });
    setBalanceView(pendingBalance.current);
    pendingBalance.current = null;
    setAssignment(false);
    setSettings(null);
    setManage(false);
    const selectedStay = parsed.bookingId
      ? stays.find((stay) => stay.id === parsed.bookingId) || null
      : null;
    setSelected(selectedStay);
    if (!selectedStay) dialog.current?.close();
  }, [route]);
  React.useEffect(() => {
    if (selected) dialog.current?.showModal();
  }, [selected]);
  const span = { day: 1, week: 14, month: 35, year: 365 }[scale];
  const before = { day: 0, week: 3, month: 7, year: 30 }[scale];
  const from = new Date(focusDate.getTime() + (offset * span - before) * MILLISECONDS_PER_DAY);
  const to = new Date(from.getTime() + span * MILLISECONDS_PER_DAY);
  const locale = isChinese ? 'zh-CN' : 'en-US';
  const date = (
    value: Date,
    options: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' },
  ) => value.toLocaleDateString(locale, options);
  const dateAtOffset = (dayOffset: number) => sampleDateAtOffset(anchor, dayOffset);
  const status = (stay: Stay) =>
    stay.status === 'in'
      ? translate('Checked in', '已入住')
      : stay.status === 'out'
        ? translate('Checked out', '已离店')
        : translate('Not checked in', '未入住');
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
    config['h' + h]?.name || translate('House', '房屋') + ' ' + (h === 1 ? 'A' : 'B');
  const roomName = (h: number, r: number) =>
    config[h + '-' + r]?.name || translate('Room', '房间') + ' ' + r;
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
      setConfig({});
      setStays(initialStays.map((stay, i) => ({ ...stay, id: 'sample-' + i, units: 1 })));
      setLocations([
        { id: 1, rooms: [1, 2, 3] },
        { id: 2, rooms: [1, 2] },
      ]);
      setBalanceView(null);
      setAssignment(false);
      setSettings(null);
      setManage(false);
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
    <div className="hc-scales" role="tablist" aria-label={translate('Calendar view', '日历视图')}>
      {scaleValues.map((v, i) => (
        <button
          key={v}
          id={'hc-tab-' + v}
          role="tab"
          aria-selected={scale === v}
          aria-controls="hc-timeline-panel"
          tabIndex={scale === v ? 0 : -1}
          onClick={() => changeScale(v)}
          onKeyDown={(event) => {
            let next = i;
            if (event.key === 'ArrowRight') next = (i + 1) % 4;
            else if (event.key === 'ArrowLeft') next = (i + 3) % 4;
            else if (event.key === 'Home') next = 0;
            else if (event.key === 'End') next = 3;
            else return;
            event.preventDefault();
            changeScale(scaleValues[next]);
            document.getElementById('hc-tab-' + scaleValues[next])?.focus();
          }}
        >
          {translate(['Day', 'Weeks', 'Month', 'Year'][i], ['日', '周', '月', '年'][i])}
        </button>
      ))}
    </div>
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
            <nav className="app-header-nav" aria-label={translate('Workspace', '工作区')}>
              {[
                ['/app/calendar/', 'Calendar', '日历', 'calendar'],
                ['/app/customers/', 'Customers', '客户', 'customers'],
                ['/app/balances/', 'Balances', '寄养余额', 'balances'],
                ['/app/settings/', 'Settings', '设置', 'settings'],
              ].map(([href, en, cn, key]) => (
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
                  <span>{translate(en, cn)}</span>
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
                  {translate('Sign in to manage customers', '登录以管理客户')}
                </a>
              )}
            </div>
            <div data-retained-workspace hidden={view !== 'personal'}>
              <h1>{translate('My profile', '我的资料')}</h1>
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
            <div hidden={view !== 'settings'}>
              {parsed.locations ? (
                <div className="hc-settings-locations">
                  <a href="/app/settings/">← {translate('Settings', '设置')}</a>
                  <Houses key={route} initialSelected={parsed.locationId} routable />
                </div>
              ) : (
                <div className="hc-settings-cards">
                  <section>
                    <h2>{translate('Locations and timezones', '房屋与时区')}</h2>
                    <p>
                      {translate(
                        'Manage saved house details and each location’s local timezone.',
                        '管理已保存的房屋资料及各处房屋的当地时区。',
                      )}
                    </p>
                    {admin ? (
                      <a className="hc-manage" href="/app/settings/locations/">
                        {translate('Manage locations', '管理房屋')}
                      </a>
                    ) : (
                      <a href="/app/sign-in/">
                        {translate('Sign in to manage houses', '登录以管理房屋')}
                      </a>
                    )}
                  </section>
                  <section>
                    <h2>{translate('Cancellation policy', '取消政策')}</h2>
                    <p>
                      {translate(
                        'Review notice periods and credit restoration terms.',
                        '查看取消期限及额度返还规则。',
                      )}
                    </p>
                    <a className="hc-manage" href="/cancellation-policy/">
                      {translate('Cancellation policy', '取消政策')}
                    </a>
                  </section>
                </div>
              )}
            </div>

            <div hidden={view !== 'calendar'}>
              {parsed.bookingId && !stays.some((stay) => stay.id === parsed.bookingId) && (
                <p role="alert">{translate('Booking not found.', '未找到该预约。')}</p>
              )}
              <div className="hc-page-toolbar">
                <div className="hc-page-toolbar-actions">
                  <div className="hc-main-actions">
                    <button
                      className="hc-apply hc-add-placement"
                      onClick={() => setAssignment(null)}
                    >
                      <Icon name="plus" />
                      {translate('Add booking', '添加预约')}
                    </button>
                    <button
                      className="hc-manage hc-add-house"
                      title={translate('Add house', '添加房屋')}
                      aria-label={translate('Add house', '添加房屋')}
                      onClick={() => setSettings({ house: nextId.current++, creating: true })}
                    >
                      <Icon name="plus" />
                      {translate('Add house', '添加房屋')}
                    </button>
                    {admin ? (
                      <button
                        className="hc-settings hc-top-icon"
                        title={translate('Manage houses & rooms', '管理房屋与房间')}
                        aria-label={translate('Manage houses & rooms', '管理房屋与房间')}
                        onClick={() => setManage(true)}
                      >
                        <Icon name="settings" />
                      </button>
                    ) : (
                      <a className="hc-manage" href="/app/sign-in/">
                        {translate('Sign in to manage houses', '登录以管理房屋')}
                      </a>
                    )}
                  </div>
                  <div className="hc-clock-controls">
                    <label>
                      <span>{translate('Timezone', '时区')}</span>
                      <select
                        aria-label={translate('Clock timezone', '时钟时区')}
                        value={clockTimezone}
                        onChange={(event) => setClockTimezone(event.target.value)}
                      >
                        {clockTimezones.map((zone) => (
                          <option key={zone} value={zone}>
                            {zone.replaceAll('_', ' ')}
                          </option>
                        ))}
                      </select>
                    </label>
                    <time>
                      {now.toLocaleTimeString(locale, {
                        hour: '2-digit',
                        minute: '2-digit',
                        timeZone: clockTimezone,
                      })}
                    </time>
                  </div>
                </div>
              </div>
              {notice && (
                <p className="hc-notice" role="status">
                  {notice}
                </p>
              )}
              <section className="hc-filters" aria-label={translate('Filters', '筛选')}>
                <div className="hc-filters-heading">
                  <h2>{translate('Filters', '筛选')}</h2>
                  <button
                    className="hc-clear"
                    title={translate('Clear filters', '清除筛选')}
                    aria-label={translate('Clear filters', '清除筛选')}
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
                    <Icon name="reset" />
                  </button>
                </div>
                <div className="hc-filter-fields">
                  <label>
                    {translate('House', '房屋')}
                    <select
                      aria-label={translate('House', '房屋')}
                      value={house}
                      onChange={(event) => {
                        setHouse(event.target.value);
                        setRoomFilter('all');
                        updateQuery({ house: event.target.value, room: null });
                      }}
                    >
                      <option value="all">{translate('All houses', '全部房屋')}</option>
                      {locations.map(({ id: h }) => (
                        <option key={h} value={h}>
                          {houseName(h)}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    {translate('Room', '房间')}
                    <select
                      aria-label={translate('Room', '房间')}
                      value={roomFilter}
                      onChange={(event) => {
                        setRoomFilter(event.target.value);
                        updateQuery({ room: event.target.value });
                      }}
                    >
                      <option value="all">{translate('All rooms', '全部房间')}</option>
                      {locations
                        .filter((h) => house === 'all' || house === String(h.id))
                        .flatMap(({ id: h, rooms }) =>
                          rooms.map((r) => (
                            <option key={h + '-' + r} value={h + '-' + r}>
                              {houseName(h)} · {roomName(h, r)}
                            </option>
                          )),
                        )}
                    </select>
                  </label>
                  <label>
                    {translate('Pet type', '宠物种类')}
                    <select
                      aria-label={translate('Pet type', '宠物种类')}
                      value={speciesFilter}
                      onChange={(event) => {
                        setSpeciesFilter(event.target.value);
                        updateQuery({ species: event.target.value });
                      }}
                    >
                      <option value="all">{translate('All types', '全部种类')}</option>
                      <option value="dog">{translate('Dog', '狗')}</option>
                      <option value="cat">{translate('Cat', '猫')}</option>
                      <option value="rabbit">{translate('Rabbit', '兔')}</option>
                    </select>
                  </label>
                  <label>
                    {translate('Status', '状态')}
                    <select
                      aria-label={translate('Status', '状态')}
                      value={statusFilter}
                      onChange={(event) => {
                        setStatusFilter(event.target.value);
                        updateQuery({ status: event.target.value });
                      }}
                    >
                      <option value="all">{translate('All statuses', '全部状态')}</option>
                      <option value="in">{translate('Checked in', '已入住')}</option>
                      <option value="upcoming">{translate('Not checked in', '未入住')}</option>
                      <option value="out">{translate('Checked out', '已离店')}</option>
                      <option value="overdue">{translate('Pickup overdue', '接回逾期')}</option>
                    </select>
                  </label>
                  <label>
                    {translate('Customer', '客户')}
                    <select
                      aria-label={translate('Customer', '客户')}
                      value={customerFilter}
                      onChange={(event) => {
                        setCustomerFilter(event.target.value);
                        updateQuery({ customer: event.target.value });
                      }}
                    >
                      <option value="all">{translate('All customers', '全部客户')}</option>
                      {['1', '2', '3', '4'].map((id) => (
                        <option key={id} value={id}>
                          {customerName(id)}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="hc-search">
                    {translate('Find a pet', '查找宠物')}
                    <input
                      placeholder={translate('Search pet name…', '搜索宠物名字…')}
                      value={query}
                      onChange={(event) => {
                        setQuery(event.target.value);
                        updateQuery({ q: event.target.value });
                      }}
                    />
                  </label>
                </div>
              </section>

              <section
                className="hc-calendar"
                aria-label={translate('Pet stay timeline', '宠物托管时间轴')}
              >
                <div className="hc-range">
                  <div>
                    <button
                      title={translate('Previous period', '上一时段')}
                      aria-label={translate('Previous period', '上一时段')}
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
                      {translate('Today', '今天')}
                    </button>
                    <button
                      title={translate('Next period', '下一时段')}
                      aria-label={translate('Next period', '下一时段')}
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
                  aria-label={translate('Scroll timeline horizontally', '可横向滚动时间轴')}
                >
                  <div className={'hc-grid hc-' + scale}>
                    {nowPos >= 0 && nowPos <= 100 && (
                      <div className="hc-now-overlay">
                        <div style={{ left: `${nowPos}%` }}>
                          <span className="hc-now-badge">{translate('Now', '现在')}</span>
                        </div>
                      </div>
                    )}
                    <div className="hc-axis">
                      <div className="hc-label">
                        {translate('House / room / pet', '房屋 / 房间 / 宠物')}
                      </div>
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
                              {translate('in care', '只在店')}
                            </small>
                            <button
                              className="hc-settings"
                              title={translate('House settings', '房屋设置')}
                              aria-label={`${translate('House settings', '房屋设置')}: ${houseName(h)}`}
                              onClick={() => setSettings({ house: h })}
                            >
                              <Icon name="settings" />
                            </button>
                            <button
                              className="hc-settings"
                              title={translate('Add room', '添加房间')}
                              aria-label={translate('Add room', '添加房间')}
                              onClick={() =>
                                setSettings({ house: h, room: nextId.current++, creating: true })
                              }
                            >
                              <Icon name="plus" />
                            </button>
                          </div>
                          {!rooms.length && (
                            <p className="hc-empty">
                              {translate(
                                'No rooms yet. Add a room to place pets.',
                                '暂无房间，添加后可安排宠物。',
                              )}
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
                                        {rows.length} {translate('pets', '只宠物')}
                                      </small>
                                    </button>
                                    <button
                                      className="hc-settings"
                                      title={translate('Room settings', '房间设置')}
                                      aria-label={`${translate('Room settings', '房间设置')}: ${houseName(h)} · ${roomName(h, r)}`}
                                      onClick={() => setSettings({ house: h, room: r })}
                                    >
                                      <Icon name="settings" />
                                    </button>
                                    <button
                                      className="hc-settings"
                                      title={translate('Add pet', '添加宠物')}
                                      aria-label={`${translate('Add pet', '添加宠物')}: ${houseName(h)} · ${roomName(h, r)}`}
                                      onClick={() => setAssignment({ house: h, room: r })}
                                    >
                                      <Icon name="plus" />
                                    </button>
                                  </div>
                                  {!closed && !rows.length && (
                                    <p className="hc-room-empty">
                                      {translate('No stays assigned', '尚未安排托管')}
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
                                            <PetProfileAvatar
                                              name={stay.name}
                                              className={'hc-avatar ' + stay.species}
                                            />
                                            <div>
                                              <strong title={customerName(customerFor(stay.name))}>
                                                {stay.name}
                                              </strong>
                                              <small className={'hc-status ' + stay.status}>
                                                {status(stay)}
                                              </small>
                                            </div>
                                            <button
                                              className="hc-remove-pet"
                                              title={
                                                stay.status === 'in'
                                                  ? translate(
                                                      'Record pickup before removing an in-care pet',
                                                      '在店宠物需先记录接回',
                                                    )
                                                  : translate('Remove placement', '移除安排')
                                              }
                                              aria-label={`${translate('Remove placement', '移除安排')}: ${stay.name}`}
                                              disabled={stay.status === 'in'}
                                              onClick={() => {
                                                if (
                                                  window.confirm(
                                                    translate(
                                                      'Remove this placement? The pet profile is kept.',
                                                      '移除此安排？宠物档案会保留。',
                                                    ),
                                                  )
                                                ) {
                                                  setStays((previous) =>
                                                    previous.filter(
                                                      (petProfile) => petProfile.id !== stay.id,
                                                    ),
                                                  );
                                                  setNotice(
                                                    translate(
                                                      'Placement removed. Pet profile kept.',
                                                      '已移除安排，宠物档案保留。',
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
                                                aria-label={`${stay.name}: ${status(stay)}, ${date(dateAtOffset(stay.start))} – ${date(dateAtOffset(stay.end))}${stay.overdue ? ' · ' + translate('Pickup overdue', '接回逾期') : ''}`}
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
                                                    ? translate('Pickup overdue', '接回逾期')
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
                        {translate('No pets match these filters.', '没有符合筛选条件的宠物。')}
                      </p>
                    )}
                  </div>
                </div>
                <div className="hc-legend">
                  <span>
                    <i className="in" />
                    {translate('Checked in', '已入住')}
                  </span>
                  <span>
                    <i className="upcoming" />
                    {translate('Upcoming · not checked in', '即将到来 · 未入住')}
                  </span>
                  <span>
                    <i className="out" />
                    {translate('Checked out', '已离店')}
                  </span>
                  <span>
                    <i className="overdue" />
                    {translate('Pickup overdue · still in care', '接回逾期 · 仍在店')}
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
                pets={roster}
                balances={balances}
                balancePlans={balancePlans}
                onManageBalance={(pet, service) => setBalanceView({ pet, service, fromStay: true })}
                anchor={anchor}
                initial={assignment || undefined}
                onClose={() => setAssignment(false)}
                onApply={(stay) => {
                  if (
                    !stay.coverage ||
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
                    setNotice(
                      translate(
                        'Review this pet’s balance before adding the stay.',
                        '请先核对该宠物的余额。',
                      ),
                    );
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
                  setNotice(translate('Pet added to the schedule.', '宠物已添加至日程。'));
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
                      ? translate(
                          'Remove placements first. In-care pets cannot be removed.',
                          '请先移除安排。在店宠物不能移除。',
                        )
                      : undefined
                    : locations.find((h) => h.id === settings.house)?.rooms.length
                      ? translate('Remove this house’s rooms first.', '请先移除此房屋的房间。')
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
            {manage && admin && (
              <Modal
                title={translate('Manage houses & rooms', '管理房屋与房间')}
                onClose={() => {
                  if (confirmDiscardChanges(i18n.language)) setManage(false);
                }}
              >
                <div className="hc-setup">
                  <p className="hc-setup-note">
                    {translate(
                      'Saved house settings are separate from the calendar. Room setup is still in progress.',
                      '保存的房屋设置与日历分开。房间设置仍在开发中。',
                    )}
                  </p>
                  <Houses />
                </div>
              </Modal>
            )}
            <dialog
              ref={dialog}
              aria-label={selected?.name}
              className="hc-dialog hc-stay-drawer"
              onClose={() => {
                setSelected(null);
                if (currentRoute().bookingId) closeRecord('/app/calendar/' + parsed.search);
              }}
            >
              {selected && (
                <>
                  <div className="hc-dialog-title">
                    <h2>{selected.name}</h2>
                    <button
                      onClick={() => dialog.current?.close()}
                      aria-label={translate('Close', '关闭')}
                    >
                      ×
                    </button>
                  </div>
                  <p className={'hc-status ' + selected.status}>
                    {status(selected)}
                    {selected.overdue ? ' · ' + translate('Pickup overdue', '接回逾期') : ''}
                  </p>
                  <dl>
                    <dt>{translate('Customer', '客户')}</dt>
                    <dd>{customerName(customerFor(selected.name))}</dd>
                    <dt>{translate('Location', '位置')}</dt>
                    <dd>
                      {houseName(selected.house)} · {roomName(selected.house, selected.room)}
                    </dd>
                    <dt>{translate('Planned arrival', '计划到店')}</dt>
                    <dd>{dateAtOffset(selected.start).toLocaleString(locale)}</dd>
                    <dt>{translate('Planned pickup', '计划接回')}</dt>
                    <dd>{dateAtOffset(selected.end).toLocaleString(locale)}</dd>
                    <dt>{translate('Actual arrival', '实际到店')}</dt>
                    <dd>
                      {selected.status === 'upcoming'
                        ? translate('Not recorded', '未记录')
                        : dateAtOffset(selected.start).toLocaleString(locale)}
                    </dd>
                    <dt>{translate('Actual pickup', '实际接回')}</dt>
                    <dd>
                      {selected.status === 'out'
                        ? dateAtOffset(selected.end).toLocaleString(locale)
                        : translate('Not recorded', '未记录')}
                    </dd>
                  </dl>
                  <CalendarProfileLink name={selected.name} />
                  <button
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
                    {translate('View pet balance', '查看宠物余额')}
                  </button>
                  <p>
                    {translate('No booking or attendance data is saved.', '不保存预约或交接记录。')}
                  </p>
                </>
              )}
            </dialog>
          </main>
        </div>
      </div>
    </CalendarPhotoProvider>
  );
}
