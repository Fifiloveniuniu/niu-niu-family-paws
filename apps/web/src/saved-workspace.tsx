import { CustomerPicker } from './workspace-pickers';
import EmployeeAssignments from './employee-assignments';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { MarketingHeader } from './marketing-shell';
import type { Language } from './i18n.ts';
import { uiText, localeFor } from './i18n.ts';
import { currentRoute, navigate, updateQuery } from './routing';
import { apiJson, ApiError } from './api-client';
import CustomAutocomplete from './custom-autocomplete';
import CustomSelect from './custom-select';
import CustomDateInput from './custom-date-input';
import Icon from './icons';
import Modal from './modal';
import { confirmDiscardChanges } from './unsaved-changes';
import Customers from './customers';
import Pets from './pets';
import Profile from './profile';
import Houses from './houses';
import {
  useWorkspaceData,
  petKey,
  scopedUrl,
  type PetRow,
  type Booking,
  type Customer,
  type LocationRow,
} from './workspace-data';
import { WorkspacePhotos } from './workspace-photos';
import WorkspaceCalendar, { calendarRange, type CalendarView } from './workspace-calendar';
import WorkspaceBalances, { BalanceEditor } from './workspace-balances';
import WorkspaceBooking from './workspace-booking';
import { CustomerEditor, BookingDetails, BookingAction } from './workspace-records';
import { useWorkspaceText } from './workspace-text';
import { wallDateKey, wallNow, zonedValue } from './wall-time';
import './house-calendar.css';
import './workspace.css';
import './saved-workspace.css';
function WorkspaceClock() {
  const t = useWorkspaceText();
  const { i18n } = useTranslation();
  const [zone, setZone] = React.useState(Intl.DateTimeFormat().resolvedOptions().timeZone);
  const [now, setNow] = React.useState(new Date());
  React.useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(timer);
  }, []);
  const zones = React.useMemo(
    () => [...new Set([zone, 'UTC', ...Intl.supportedValuesOf('timeZone')])],
    [zone],
  );
  return (
    <div className="workspace-clock">
      <label>
        {t('timezone')}
        <CustomSelect
          aria-label={t('clockTimezone')}
          value={zone}
          onChange={(event) => setZone(event.target.value)}
        >
          {zones.map((value) => (
            <option key={value} value={value}>
              {value.replaceAll('_', ' ')}
            </option>
          ))}
        </CustomSelect>
      </label>
      <time dateTime={now.toISOString()}>
        {new Intl.DateTimeFormat(localeFor(i18n.language), {
          timeZone: zone,
          hour: '2-digit',
          minute: '2-digit',
        }).format(now)}
      </time>
    </div>
  );
}
export default function SavedWorkspace({
  identityKey,
  onLanguageChange,
  account,
  initialAdmin,
  active = true,
}: {
  identityKey: string;
  onLanguageChange: (language: Language) => void;
  account: React.ReactNode;
  initialAdmin: boolean;
  active?: boolean;
}) {
  const t = useWorkspaceText();
  const { i18n } = useTranslation();
  const route = currentRoute();
  const params = new URLSearchParams(route.search);
  const scope = params.get('asCustomer') || undefined;
  const view = route.kind;
  const browserZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const initialDay = React.useRef(wallDateKey(wallNow(browserZone)));
  const date = params.get('date') || initialDay.current;
  const scale = (
    ['day', 'week', 'month', 'year'].includes(params.get('view') ?? '')
      ? params.get('view')
      : 'week'
  ) as CalendarView;
  const range = React.useMemo(
    () => calendarRange(date, scale, browserZone),
    [date, scale, browserZone],
  );
  const { data, loading, error, refresh } = useWorkspaceData(
    identityKey,
    scope,
    range,
    active,
    view === 'balances',
  );
  const admin = data?.admin ?? initialAdmin;
  const [adding, setAdding] = React.useState<
    false | { houseId: string; roomId: string } | undefined
  >(false);
  const [editing, setEditing] = React.useState<Booking | null>(null);
  const [balance, setBalance] = React.useState<false | PetRow | undefined>(false);
  const [address, setAddress] = React.useState<LocationRow['house'] | null>(null);
  const [contact, setContact] = React.useState<Customer | null>(null);
  const [employeeAssignments, setEmployeeAssignments] = React.useState(false);
  const [ownEditor, setOwnEditor] = React.useState(false);
  const [detail, setDetail] = React.useState<Booking | null>(null);
  const [detailError, setDetailError] = React.useState(false);
  const [action, setAction] = React.useState<'check_in' | 'check_out' | 'cancel' | null>(null);
  const [notice, setNotice] = React.useState('');
  const [directoryRevision, setDirectoryRevision] = React.useState(0);
  const visitedCustomers = React.useRef(view === 'customers');
  const visitedProfile = React.useRef(view === 'personal');
  if (view === 'customers') visitedCustomers.current = true;
  if (view === 'personal') visitedProfile.current = true;
  const calendarSearch = React.useRef('');
  if (view === 'calendar') calendarSearch.current = route.search;
  const changed = React.useCallback(() => {
    setDirectoryRevision((value) => value + 1);
    void refresh(true);
  }, [refresh]);
  const href = (path: string) => {
    if (path === '/app/calendar/') {
      const query = new URLSearchParams(calendarSearch.current);
      query.delete('asCustomer');
      if (scope) query.set('asCustomer', scope);
      return path + (query.size ? '?' + query : '');
    }
    return scopedUrl(path, scope);
  };
  React.useEffect(() => {
    setAdding(false);
    setEditing(null);
    setBalance(false);
    setContact(null);
    setOwnEditor(false);
    setEmployeeAssignments(false);
    setAction(null);
    setDetail(null);
    setNotice('');
  }, [scope, identityKey]);
  React.useEffect(() => {
    let live = true;
    setDetail(null);
    setDetailError(false);
    if (route.bookingId && active)
      void apiJson<Booking>('/bookings/' + encodeURIComponent(route.bookingId))
        .then((booking) => {
          if (live) {
            if (scope && booking.customerId !== scope) setDetailError(true);
            else setDetail(booking);
          }
        })
        .catch(() => {
          if (live) setDetailError(true);
        });
    return () => {
      live = false;
    };
  }, [route.bookingId, scope, active]);
  const closeRecord = () => navigate('/app/calendar/' + route.search);
  const showBooking = (id: string) =>
    navigate('/app/calendar/bookings/' + encodeURIComponent(id) + '/' + route.search);
  function savedBooking(booking: Booking) {
    setAdding(false);
    setEditing(null);
    setAction(null);
    setDetail(null);
    setNotice(t('saved'));
    void refresh(true);
    const query = new URLSearchParams();
    if (scope) query.set('asCustomer', scope);
    query.set('date', zonedValue(booking.occupancyFrom, browserZone).slice(0, 10));
    query.set('view', 'week');
    query.set('house', booking.houseId);
    navigate('/app/calendar/?' + query);
  }
  const detailRow =
    detail &&
    data?.rows.find((row) => row.customer.id === detail.customerId && row.pet.id === detail.petId);
  const detailHouse = detail && data?.locations.find((item) => item.house.id === detail.houseId);
  const selected = params.get('pet') ?? '';
  const showScopedPets =
    data?.customer && (!route.customerId || route.customerId === data.customer.id);
  return (
    <WorkspacePhotos key={identityKey}>
      <div className="hc saved-workspace">
        <MarketingHeader
          page="app"
          showNavigation={false}
          onLanguageChange={onLanguageChange}
          account={
            <div className="workspace-account-actions">
              {admin && (
                <a
                  className="icon-button"
                  href={href('/app/settings/')}
                  title={t('settings')}
                  aria-label={t('settings')}
                >
                  <Icon name="settings" />
                </a>
              )}
              {account}
            </div>
          }
          navigation={
            <nav className="app-header-nav" aria-label={uiText('ui.houseCalendar.workspace')}>
              {[
                ['/app/calendar/', 'calendar', 'calendar'],
                ['/app/balances/', 'balances', 'balance'],
                ['/app/customers/', data?.customer || !admin ? 'pets' : 'customers', 'customers'],
              ].map(([path, label, icon]) => (
                <a
                  key={path}
                  href={href(path)}
                  aria-current={
                    view === (label === 'pets' ? 'customers' : label) ? 'page' : undefined
                  }
                >
                  <Icon name={icon as 'calendar' | 'balance' | 'customers'} />
                  <span>{t(label)}</span>
                </a>
              ))}
            </nav>
          }
        />
        <div className="hc-body">
          <main className="hc-content" id="main">
            <div className="workspace-topbar">
              {view === 'calendar' ? <WorkspaceClock /> : <span />}
              <div className="workspace-primary-actions">
                {view === 'calendar' && (
                  <button
                    className="hc-apply"
                    disabled={!data || !data.rows.length}
                    onClick={() => setAdding(undefined)}
                  >
                    <Icon name="plus" />
                    {t(admin ? 'addBooking' : 'availability')}
                  </button>
                )}
              </div>
            </div>
            {data?.admin && !data.customer && ['calendar', 'customers'].includes(view) && (
              <div className="workspace-customer-filter">
                <label>
                  {t('customer')}
                  <CustomerPicker
                    label={t('allCustomers')}
                    value=""
                    initial={data.customers}
                    onChange={(value) => {
                      if (value)
                        navigate(
                          scopedUrl(
                            view === 'customers'
                              ? '/app/customers/'
                              : view === 'balances'
                                ? '/app/balances/'
                                : '/app/calendar/',
                            value,
                          ),
                        );
                    }}
                  />
                </label>
              </div>
            )}
            {data?.admin && scope && data.customer && (
              <div className="workspace-context" role="status">
                <strong>{t('viewingAs', { name: data.customer.name })}</strong>
                <button
                  className="language"
                  onClick={() =>
                    navigate(
                      view === 'balances'
                        ? '/app/balances/'
                        : view === 'customers'
                          ? '/app/customers/'
                          : '/app/calendar/',
                    )
                  }
                >
                  {t('exitView')}
                </button>
              </div>
            )}
            {notice && <p role="status">{notice}</p>}
            {visitedProfile.current && (
              <div hidden={view !== 'personal'} data-retained-workspace>
                <Profile onSaved={changed} />
              </div>
            )}
            {view !== 'personal' && (
              <>
                {error && (
                  <div className="workspace-error" role="alert">
                    <p>
                      {t(
                        error instanceof ApiError && [401, 403].includes(error.status)
                          ? 'denied'
                          : 'loadError',
                      )}
                    </p>
                    <button className="language" onClick={() => void refresh(true)}>
                      {t('retry')}
                    </button>
                    <a href="/app/calendar/">{t('resetView')}</a>
                  </div>
                )}
                {!data && loading && <p role="status">{t('loading')}</p>}
                {data && (
                  <>
                    {!data.admin && !data.customer ? (
                      <div data-retained-workspace>
                        <Profile onSaved={changed} />
                      </div>
                    ) : (
                      <>
                        {data.admin && !data.customer && visitedCustomers.current && (
                          <div
                            data-retained-workspace
                            data-customer-workspace
                            hidden={view !== 'customers'}
                          >
                            <Customers
                              refreshKey={directoryRevision}
                              onChanged={changed}
                              onViewAs={(customer) =>
                                navigate(scopedUrl('/app/calendar/', customer.id))
                              }
                            />
                          </div>
                        )}
                        {view === 'customers' && data.customer && (
                          <>
                            {showScopedPets ? (
                              <section className="workspace-customer-record">
                                <div className="customer-heading">
                                  <div>
                                    <h2>{data.customer.name}</h2>
                                    <p>
                                      {[data.customer.email, data.customer.phone]
                                        .filter(Boolean)
                                        .join(' · ') || uiText('common.notAvailable')}
                                    </p>
                                  </div>
                                  <button
                                    className="icon-button"
                                    title={t(data.admin ? 'editCustomer' : 'editProfile')}
                                    aria-label={t(data.admin ? 'editCustomer' : 'editProfile')}
                                    onClick={() =>
                                      data.admin ? setContact(data.customer) : setOwnEditor(true)
                                    }
                                  >
                                    <Icon name="edit" />
                                  </button>
                                </div>
                                <Pets
                                  customerId={data.customer.id}
                                  selectedPetId={route.petId}
                                  title={t('pets')}
                                  onChanged={changed}
                                />
                              </section>
                            ) : (
                              <p role="alert">{t('notFound')}</p>
                            )}
                          </>
                        )}
                        {view === 'calendar' &&
                          (range.valid ? (
                            <WorkspaceCalendar
                              data={data}
                              scope={scope}
                              range={range}
                              params={params}
                              onQuery={(values) => updateQuery(values)}
                              onBooking={showBooking}
                              onAdd={(room) => setAdding(room)}
                              onAddress={setAddress}
                              loading={loading}
                            />
                          ) : (
                            <section>
                              <label>
                                {t('period')}
                                <CustomDateInput
                                  value={date}
                                  onChange={(value) => updateQuery({ date: value })}
                                />
                              </label>
                              <p role="alert">{t('invalidDates')}</p>
                            </section>
                          ))}
                        {view === 'balances' && (
                          <WorkspaceBalances
                            data={data}
                            scope={scope}
                            selected={selected}
                            search={params}
                            onFilters={(values) => updateQuery(values)}
                            onSelect={(key) => updateQuery({ pet: key })}
                            onCustomer={(id) => navigate(scopedUrl('/app/balances/', id))}
                            onAdjust={(row) => setBalance(row)}
                          />
                        )}
                        {view === 'settings' &&
                          (data.admin ? (
                            <section className="workspace-settings">
                              <div className="customer-heading">
                                <h2>{t('manageLocations')}</h2>
                                <button
                                  className="language"
                                  onClick={() => setEmployeeAssignments(true)}
                                >
                                  {uiText('ui.employeeAssignments.title')}
                                </button>
                                <a className="language" href="/pricing/#cancellation-policy">
                                  {uiText('ui.houseCalendar.cancellationPolicy')}
                                </a>
                              </div>
                              <Houses
                                initialSelected={route.locationId}
                                routable={route.locations}
                                onChanged={changed}
                              />
                            </section>
                          ) : (
                            <p>{t('denied')}</p>
                          ))}
                      </>
                    )}
                  </>
                )}
              </>
            )}
            {employeeAssignments && data?.admin && (
              <EmployeeAssignments onClose={() => setEmployeeAssignments(false)} />
            )}
            {data && adding !== false && (
              <WorkspaceBooking
                data={data}
                initialRoom={adding}
                onClose={() => setAdding(false)}
                onSaved={savedBooking}
              />
            )}
            {data && editing && (
              <WorkspaceBooking
                key={editing.id}
                data={data}
                existing={editing}
                onClose={() => setEditing(null)}
                onSaved={savedBooking}
              />
            )}
            {data && balance !== false && (
              <BalanceEditor
                data={data}
                initial={balance}
                onClose={() => setBalance(false)}
                onSaved={() => {
                  setBalance(false);
                  setNotice(t('saved'));
                  changed();
                }}
              />
            )}
            {contact && (
              <CustomerEditor
                customer={contact}
                onClose={() => setContact(null)}
                onSaved={() => {
                  setContact(null);
                  changed();
                }}
              />
            )}
            {ownEditor && (
              <Modal
                title={t('editProfile')}
                onClose={() => {
                  if (
                    confirmDiscardChanges(
                      i18n.language,
                      document.querySelector('[data-own-profile-editor]'),
                    )
                  )
                    setOwnEditor(false);
                  setEmployeeAssignments(false);
                }}
              >
                <div data-own-profile-editor>
                  <Profile
                    showPets={false}
                    showHeading={false}
                    onSaved={() => {
                      setOwnEditor(false);
                      setEmployeeAssignments(false);
                      changed();
                    }}
                  />
                </div>
              </Modal>
            )}
            {address && (
              <Modal title={t('houseAddress')} onClose={() => setAddress(null)}>
                <h3>{address.name}</h3>
                <p className="workspace-address">
                  {address.address || uiText('common.notAvailable')}
                </p>
                {!address.address && <p>{uiText('ui.houses.addressMissing')}</p>}
              </Modal>
            )}
            {route.bookingId && detailError && (
              <Modal title={t('booking')} onClose={closeRecord}>
                <p role="alert">{t('notFound')}</p>
              </Modal>
            )}
            {detail && detailRow && !editing && !action && (
              <BookingDetails
                booking={detail}
                row={detailRow}
                house={detailHouse?.house}
                roomName={detailHouse?.rooms.find((room) => room.id === detail.roomId)?.name}
                admin={admin}
                onClose={closeRecord}
                onEdit={() => setEditing(detail)}
                onAction={setAction}
              />
            )}
            {detail && detailRow && action && (
              <BookingAction
                booking={detail}
                row={detailRow}
                action={action}
                onClose={() => setAction(null)}
                onSaved={savedBooking}
              />
            )}
          </main>
        </div>
      </div>
    </WorkspacePhotos>
  );
}
