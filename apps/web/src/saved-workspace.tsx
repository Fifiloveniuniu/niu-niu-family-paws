import { useDialogState } from './dialog-routing';
import { dialogBooking, dialogCustomer, dialogHouse, dialogPetRow } from './dialog-records';
import Button from './button';
import IconButton from './icon-button';
import BusinessMetrics from './business-metrics';
import { CustomerPicker } from './workspace-pickers';
import AdminPricing from './admin-pricing';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { MarketingHeader } from './marketing-shell';
import type { Language } from './i18n.ts';
import { uiText, uiValue } from './i18n.ts';
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
import Rooms from './rooms';
import SavedCancellationPolicy from './saved-cancellation-policy';
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
function WorkspaceClock({ zone, onChange }: { zone: string; onChange: (zone: string) => void }) {
  const t = useWorkspaceText();
  const zones = React.useMemo(
    () => [...new Set([zone, 'UTC', ...Intl.supportedValuesOf('timeZone')])],
    [zone],
  );
  return (
    <div className="workspace-clock">
      <CustomSelect
        aria-label={t('clockTimezone')}
        value={zone}
        onChange={(event) => onChange(event.target.value)}
      >
        {zones.map((value) => (
          <option key={value} value={value}>
            {value.replaceAll('_', ' ')}
          </option>
        ))}
      </CustomSelect>
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
  const requestedZone = params.get('zone');
  const zone =
    requestedZone &&
    (requestedZone === browserZone ||
      requestedZone === 'UTC' ||
      Intl.supportedValuesOf('timeZone').includes(requestedZone))
      ? requestedZone
      : browserZone;
  const date = params.get('date') || wallDateKey(wallNow(zone));
  const scale = (
    ['day', 'week', 'month', 'year'].includes(params.get('view') ?? '')
      ? params.get('view')
      : 'week'
  ) as CalendarView;
  const range = React.useMemo(() => calendarRange(date, scale, zone), [date, scale, zone]);
  const { data, loading, error, refresh } = useWorkspaceData(
    identityKey,
    scope,
    range,
    active && view !== 'business-metrics',
    view === 'balances' || view === 'admin-pricing',
  );
  const admin = data?.admin ?? initialAdmin;
  // The mounted workspace is keyed by actual identity; names never cross signed-in accounts.
  const customerNames = React.useRef(new Map<string, string>());
  if (scope && data?.customer?.id === scope) customerNames.current.set(scope, data.customer.name);
  const viewingName = scope ? customerNames.current.get(scope) : undefined;

  const [adding, setAdding] = useDialogState<
    false | { houseId: string; roomId: string } | undefined
  >('booking-add', false, {
    encode: (value) => (value === false ? null : value ? JSON.stringify(value) : 'new'),
    decode: (raw) => (raw === 'new' ? undefined : JSON.parse(raw)),
  });
  const [editing, setEditing] = useDialogState<Booking | null>('booking-edit', null, {
    encode: (value) => value?.id ?? null,
    decode: (raw, signal) => {
      if (!admin) throw Error('Administrator required');
      return dialogBooking(raw, signal);
    },
  });
  const [balance, setBalance] = useDialogState<false | PetRow | undefined>('balance-edit', false, {
    encode: (value) =>
      value === false ? null : value ? value.customer.id + '/' + value.pet.id : 'new',
    decode: (raw, signal) => {
      if (!admin) throw Error('Administrator required');
      return raw === 'new' ? undefined : dialogPetRow(raw, signal);
    },
  });
  const [manageLocation, setManageLocation] = useDialogState<{
    houseId: string;
    roomId?: string;
    addRoom?: boolean;
  } | null>('location-edit', null, {
    decode: (raw) => {
      if (!admin) throw Error('Administrator required');
      const value = JSON.parse(raw);
      if (!value || typeof value.houseId !== 'string' || !/^[A-Za-z0-9_-]+$/.test(value.houseId))
        throw Error('Invalid house');
      if (value.roomId && !/^[A-Za-z0-9_-]+$/.test(value.roomId)) throw Error('Invalid room');
      return {
        houseId: value.houseId,
        ...(value.roomId ? { roomId: value.roomId } : {}),
        ...(value.addRoom ? { addRoom: true } : {}),
      };
    },
  });
  const managementRoot = React.useRef<HTMLDivElement>(null);
  const [locationBusy, setLocationBusy] = React.useState(false);
  const [address, setAddress] = useDialogState<LocationRow['house'] | null>('house-address', null, {
    encode: (value) => value?.id ?? null,
    decode: dialogHouse,
  });
  const [contact, setContact] = useDialogState<Customer | null>('customer-contact', null, {
    encode: (value) => value?.id ?? null,
    decode: (raw, signal) => {
      if (!admin) throw Error('Administrator required');
      return dialogCustomer(raw, signal);
    },
  });
  const [ownEditor, setOwnEditor] = useDialogState('own-profile-edit', false);
  const [detail, setDetail] = React.useState<Booking | null>(null);
  const [detailError, setDetailError] = React.useState(false);
  const [action, setAction] = useDialogState<'check_in' | 'check_out' | 'cancel' | null>(
    'booking-action',
    null,
    {
      decode: (raw) => {
        if (!admin) throw Error('Administrator required');
        const value = JSON.parse(raw);
        if (!['check_in', 'check_out', 'cancel'].includes(value))
          throw Error('Invalid booking action');
        return value;
      },
    },
  );
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
  const initialDialogScope = React.useRef(identityKey + ':' + (scope ?? ''));
  React.useEffect(() => {
    const key = identityKey + ':' + (scope ?? '');
    if (initialDialogScope.current === key) return;
    initialDialogScope.current = key;
    setAdding(false);
    setEditing(null);
    setBalance(false);
    setContact(null);
    setManageLocation(null);
    setOwnEditor(false);
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
    query.set('zone', zone);
    query.set('date', zonedValue(booking.occupancyFrom, zone).slice(0, 10));
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
          account={account}
          navigation={
            <nav className="app-header-nav" aria-label={uiText('ui.houseCalendar.workspace')}>
              {[
                ['/app/calendar/', 'calendar', 'calendar'],
                ['/app/balances/', 'balances', 'balance'],
                ['/app/customers/', data?.customer || !admin ? 'pets' : 'customers', 'customers'],
                ...(admin && !scope
                  ? [
                      ['/app/pricing/', 'pricing', 'balance'],
                      ['/app/metrics/', 'businessMetrics', 'metrics'],
                    ]
                  : []),
              ].map(([path, label, icon]) => (
                <a
                  key={path}
                  href={href(path)}
                  aria-current={
                    view ===
                    (label === 'pets'
                      ? 'customers'
                      : label === 'pricing'
                        ? 'admin-pricing'
                        : label === 'businessMetrics'
                          ? 'business-metrics'
                          : label)
                      ? 'page'
                      : undefined
                  }
                >
                  <Icon name={icon as 'calendar' | 'balance' | 'customers' | 'metrics'} />
                  <span>{t(label)}</span>
                </a>
              ))}
            </nav>
          }
        />
        {admin && scope && (
          <aside className="workspace-context" role="status" aria-label={t('customerView')}>
            <div className="workspace-context-identity">
              <Icon name="account" />
              <div>
                <strong>
                  {viewingName ? t('viewingAs', { name: viewingName }) : t('customerView')}
                </strong>
                <small>{t('adminSession')}</small>
              </div>
            </div>
            <Button
              icon="chevron-left"
              variant="secondary"
              onClick={() => navigate('/app/metrics/')}
            >
              {t('backToAdmin')}
            </Button>
          </aside>
        )}
        <div className="hc-body">
          <main className="hc-content" id="main">
            {notice && <p role="status">{notice}</p>}
            {visitedProfile.current && (
              <div hidden={view !== 'personal'} data-retained-workspace>
                <Profile onSaved={changed} />
              </div>
            )}
            {view === 'admin-pricing' &&
              (admin && !scope ? <AdminPricing /> : <p role="alert">{t('denied')}</p>)}
            {view === 'business-metrics' &&
              (admin && !scope ? (
                <BusinessMetrics zone={zone} search={params} />
              ) : (
                <p role="alert">{t('denied')}</p>
              ))}
            {view !== 'personal' && view !== 'admin-pricing' && view !== 'business-metrics' && (
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
                    <Button icon="reset" variant="secondary" onClick={() => void refresh(true)}>
                      {t('retry')}
                    </Button>
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
                                  <IconButton
                                    title={t(data.admin ? 'editCustomer' : 'editProfile')}
                                    aria-label={t(data.admin ? 'editCustomer' : 'editProfile')}
                                    onClick={() =>
                                      data.admin ? setContact(data.customer) : setOwnEditor(true)
                                    }
                                  >
                                    <Icon name="edit" />
                                  </IconButton>
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
                              timeZoneControl={
                                <WorkspaceClock
                                  zone={zone}
                                  onChange={(nextZone) =>
                                    updateQuery({
                                      zone: nextZone,
                                      date:
                                        date === wallDateKey(wallNow(zone))
                                          ? wallDateKey(wallNow(nextZone))
                                          : date,
                                    })
                                  }
                                />
                              }
                              filterCustomer={
                                data.admin && !data.customer ? (
                                  <label>
                                    {t('customer')}
                                    <CustomerPicker
                                      allowAll
                                      label={t('allCustomers')}
                                      value={params.get('customer') ?? ''}
                                      initial={data.customers}
                                      onChange={(value) => {
                                        updateQuery({
                                          customer: value,
                                          pet: '',
                                          q: '',
                                          locations: value ? 'matching' : 'all-locations',
                                        });
                                      }}
                                    />
                                  </label>
                                ) : undefined
                              }
                              data={data}
                              scope={scope}
                              range={range}
                              params={params}
                              onQuery={(values) => updateQuery(values)}
                              onBooking={showBooking}
                              onAdd={(room) => setAdding(room)}
                              onAddress={setAddress}
                              onManage={setManageLocation}
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
                          (data.admin ? <SavedCancellationPolicy /> : <p>{t('denied')}</p>)}
                      </>
                    )}
                  </>
                )}
              </>
            )}
            {data && adding !== false && (
              <WorkspaceBooking
                key={JSON.stringify(adding) ?? 'new'}
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
                key={balance ? petKey(balance.customer.id, balance.pet.id) : 'new'}
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
                key={contact.id}
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
                }}
              >
                <div data-own-profile-editor>
                  <Profile
                    showPets={false}
                    showHeading={false}
                    onSaved={() => {
                      setOwnEditor(false);
                      changed();
                    }}
                  />
                </div>
              </Modal>
            )}
            {manageLocation && data?.admin && (
              <Modal
                title={
                  manageLocation.addRoom
                    ? uiText('ui.rooms.add')
                    : manageLocation.roomId
                      ? uiText('ui.rooms.edit')
                      : uiValue('ui.houses.labels', i18n.language).edit
                }
                disabled={locationBusy}
                onClose={() => {
                  if (confirmDiscardChanges(i18n.language, managementRoot.current))
                    setManageLocation(null);
                }}
              >
                <div key={JSON.stringify(manageLocation)} ref={managementRoot}>
                  {manageLocation.roomId || manageLocation.addRoom ? (
                    <Rooms
                      houseId={manageLocation.houseId}
                      addressReady={
                        !!data.locations
                          .find((item) => item.house.id === manageLocation.houseId)
                          ?.house.address?.trim()
                      }
                      embedded
                      onBusyChange={setLocationBusy}
                      initialEditId={manageLocation.roomId}
                      initialCreate={manageLocation.addRoom}
                      onChanged={changed}
                      onEditorClosed={() => {
                        setLocationBusy(false);
                        setManageLocation(null);
                      }}
                    />
                  ) : (
                    <Houses
                      embedded
                      onBusyChange={setLocationBusy}
                      initialSelected={manageLocation.houseId}
                      initialEdit
                      onChanged={changed}
                      onEditorClosed={() => {
                        setLocationBusy(false);
                        setManageLocation(null);
                      }}
                    />
                  )}
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
                key={detail.id + ':' + action}
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
