import { englishCatalog, localeFor, type Language, uiText, uiValue } from './i18n.ts';
import { useDropdownState } from './dropdown-state';
import React from 'react';
import { currentRoute, navigate, safeReturnTo } from './routing';
import {
  browserSessionPersistence,
  GoogleAuthProvider,
  onIdTokenChanged,
  setPersistence,
  signInWithPopup,
  signOut,
  type User,
} from 'firebase/auth';
import { useTranslation } from 'react-i18next';
import { getPortalAccess } from './admin-access';
import { auth } from './auth-client';
import Customers from './customers';
import Houses from './houses';
const HouseCalendar = React.lazy(() => import('./house-calendar'));
import './workspace.css';
import Profile from './profile';
import { MarketingHeader } from './marketing-shell';
import Icon from './icons';
import { confirmDiscardChanges } from './unsaved-changes';

const provider = new GoogleAuthProvider();
provider.setCustomParameters({ prompt: 'select_account' });
const englishMessages = englishCatalog['ui.portal.labels'];

export default function Portal({
  onLanguageChange,
  active = true,
}: {
  active?: boolean;
  onLanguageChange: (language: Language) => void;
}) {
  const { i18n } = useTranslation();

  const labels = uiValue('ui.portal.labels', i18n.language);
  const [user, setUser] = React.useState<User | null>(null);
  const [access, setAccess] = React.useState<
    'checking' | 'signed-out' | 'denied' | 'admin' | 'employee' | 'customer'
  >('checking');
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<keyof typeof englishMessages | null>(null);
  const generation = React.useRef(0);
  const previousUid = React.useRef<string | null | undefined>(undefined);
  const [directoryRefresh, setDirectoryRefresh] = React.useState(0);
  const [workspace, setWorkspace] = React.useState<'customers' | 'personal' | 'houses'>(
    'customers',
  );
  const personal = workspace === 'personal';
  const verify = React.useCallback(async (current: User | null, force = false) => {
    const request = ++generation.current;
    if (previousUid.current !== (current?.uid ?? null)) {
      setAccess('checking');
      setWorkspace('customers');
    }
    previousUid.current = current?.uid ?? null;
    setError(null);
    setUser(current);
    if (!current) {
      setAccess('signed-out');
      return;
    }
    try {
      const token = await current.getIdTokenResult(force);
      if (request === generation.current) setAccess(getPortalAccess(token.claims));
    } catch {
      if (request === generation.current) {
        setAccess('denied');
        setError('network');
      }
    }
  }, []);
  React.useEffect(() => {
    const unsubscribe = onIdTokenChanged(auth, (current) => {
      void verify(current);
    });
    const refresh = () => {
      if (document.visibilityState === 'visible') void verify(auth.currentUser, true);
    };
    document.addEventListener('visibilitychange', refresh);
    return () => {
      unsubscribe();
      ++generation.current;
      document.removeEventListener('visibilitychange', refresh);
    };
  }, [verify]);
  async function run(action: () => Promise<unknown>) {
    setBusy(true);
    setError(null);
    try {
      await action();
    } catch (e) {
      const code = (e as { code?: string }).code;
      if (code !== 'auth/popup-closed-by-user' && code !== 'auth/cancelled-popup-request') {
        setError(
          code === 'auth/popup-blocked'
            ? 'popup'
            : code === 'auth/network-request-failed'
              ? 'network'
              : 'error',
        );
      }
    } finally {
      setBusy(false);
    }
  }
  async function login() {
    auth.languageCode = i18n.language;
    await setPersistence(auth, browserSessionPersistence);
    await signInWithPopup(auth, provider);
  }
  React.useEffect(() => {
    if (currentRoute().kind === 'login' && ['admin', 'customer', 'employee'].includes(access)) {
      const target = safeReturnTo(new URLSearchParams(location.search).get('returnTo'));
      navigate(target || (access === 'admin' ? '/app/calendar/' : '/app/account/profile/'), true);
    }
  }, [access]);
  const [formEpoch, setFormEpoch] = React.useState(0);
  React.useEffect(() => {
    if (!active) setFormEpoch((value) => value + 1);
  }, [active]);
  const route = currentRoute();
  React.useEffect(() => {
    if (
      active &&
      ['customer', 'employee'].includes(access) &&
      !['login', 'personal'].includes(route.kind)
    )
      navigate('/app/account/profile/', true);
  }, [access, route.path, active]);
  React.useEffect(() => {
    if (!import.meta.env.DEV)
      setWorkspace(
        route.kind === 'personal' ? 'personal' : route.kind === 'settings' ? 'houses' : 'customers',
      );
  }, [route.kind]);
  const hadSession = React.useRef(false);
  React.useEffect(() => {
    if (user) hadSession.current = true;
    else if (access === 'signed-out' && hadSession.current) {
      hadSession.current = false;
      if (active) navigate('/app/sign-in/', true);
    }
  }, [user, access, active]);
  const previewIdentity = React.useRef({ adminUid: null as string | null, epoch: 0 });
  if (
    previewIdentity.current.adminUid &&
    (access === 'signed-out' ||
      access === 'denied' ||
      access === 'customer' ||
      access === 'employee' ||
      (user && user.uid !== previewIdentity.current.adminUid))
  ) {
    previewIdentity.current.epoch++;
    previewIdentity.current.adminUid = null;
  }
  if (access === 'admin') previewIdentity.current.adminUid = user?.uid || null;
  const previewRoute = import.meta.env.DEV && currentRoute().kind !== 'login';
  const [accountOpen, setAccountOpen] = useDropdownState(false);
  React.useEffect(() => {
    const outside = (event: PointerEvent) => {
      if (!(event.target as Element).closest('.hc-account-menu')) setAccountOpen(false);
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setAccountOpen(false);
    };
    document.addEventListener('pointerdown', outside);
    document.addEventListener('keydown', escape);
    return () => {
      document.removeEventListener('pointerdown', outside);
      document.removeEventListener('keydown', escape);
    };
  }, [setAccountOpen]);
  const accountControls = (
    <details
      className="hc-account-menu"
      open={accountOpen}
      onToggle={(event) => {
        if (event.currentTarget.open !== accountOpen) setAccountOpen(event.currentTarget.open);
      }}
    >
      <summary>
        <Icon name="account" />
        <span>{uiText('ui.portal.account')}</span>
      </summary>
      <div>
        <p>{user?.email}</p>
        <a href="/app/account/profile/">{uiText('ui.portal.myProfile')}</a>
        <button
          disabled={busy}
          onClick={() => {
            if (confirmDiscardChanges(i18n.language)) void run(() => signOut(auth));
          }}
        >
          <Icon name="logout" />
          {labels.logout}
        </button>
      </div>
    </details>
  );

  if (import.meta.env.DEV && access === 'admin')
    return (
      <HouseCalendar
        identityEpoch={previewIdentity.current.epoch}
        onLanguageChange={onLanguageChange}
        account={accountControls}
        customers={
          <div className="portal-admin">
            <Customers key={formEpoch} refreshKey={directoryRefresh} />
          </div>
        }
        personal={
          <Profile
            key={formEpoch}
            showPets={false}
            onSaved={() => setDirectoryRefresh((value) => value + 1)}
          />
        }
      />
    );
  if (previewRoute)
    return (
      <HouseCalendar
        identityEpoch={previewIdentity.current.epoch}
        onLanguageChange={onLanguageChange}
        personal={
          user && (access === 'customer' || access === 'employee') ? (
            <Profile key={formEpoch} onSaved={() => setDirectoryRefresh((value) => value + 1)} />
          ) : undefined
        }
        account={
          ['customer', 'employee'].includes(access) ? (
            accountControls
          ) : (
            <a
              className="hc-back"
              href={
                '/app/sign-in/?returnTo=' + encodeURIComponent(location.pathname + location.search)
              }
            >
              {uiText('ui.portal.signIn')}
            </a>
          )
        }
        customers={
          <section>
            <h1>{uiText('ui.portal.customers')}</h1>
            <p>{uiText('ui.portal.signInWithAnAdministratorAccountToManageCustomers')}</p>
            <a
              className="hc-manage"
              href={
                '/app/sign-in/?returnTo=' + encodeURIComponent(location.pathname + location.search)
              }
            >
              {uiText('ui.portal.signIn')}
            </a>
          </section>
        }
      />
    );
  return (
    <>
      <MarketingHeader
        showNavigation={false}
        page="app"
        onLanguageChange={onLanguageChange}
        account={user ? accountControls : undefined}
      />
      <main className={`portal${access === 'admin' ? ' portal-admin' : ''}`} id="main">
        <a className="portal-back" href="/home/">
          ← {labels.home}
        </a>
        <p className="eyebrow">{labels.label}</p>
        <h1>
          {access === 'admin'
            ? personal
              ? labels.personalTitle
              : workspace === 'houses'
                ? uiText('ui.portal.houses')
                : labels.dashboard
            : access === 'employee'
              ? labels.employeeTitle
              : access === 'customer'
                ? labels.customerTitle
                : labels.title}
        </h1>
        <div className="portal-card" aria-busy={busy || access === 'checking'}>
          {access === 'checking' ? (
            <p role="status">{labels.checking}</p>
          ) : access === 'signed-out' ? (
            <>
              <p>{labels.intro}</p>
              <button className="button" disabled={busy} onClick={() => void run(login)}>
                {busy ? labels.busy : labels.login}
              </button>
            </>
          ) : (
            <>
              {access === 'denied' && <h2>{labels.denied}</h2>}
              <div className="portal-identity-row">
                <p className="portal-account">
                  <span>{labels.account}</span>
                  <strong>{user?.email}</strong>
                </p>
                {access !== 'denied' && (
                  <span className="portal-role">
                    {access === 'admin'
                      ? labels.role
                      : access === 'employee'
                        ? labels.employeeRole
                        : labels.customerRole}
                  </span>
                )}
              </div>
              {access !== 'admin' && (
                <p className="customer-intro">
                  {access === 'denied'
                    ? labels.deniedBody
                    : access === 'employee'
                      ? labels.employeeNext
                      : labels.customerNext}
                </p>
              )}
              <div className="portal-actions session-actions">
                {access !== 'denied' && (
                  <a className="language" href="/app/account/profile/">
                    {uiText('ui.portal.myProfile')}
                  </a>
                )}
                {access === 'denied' && (
                  <button
                    className="language"
                    disabled={busy}
                    onClick={() => void run(() => verify(auth.currentUser, true))}
                  >
                    {labels.refresh}
                  </button>
                )}
                <button
                  className="icon-button"
                  aria-label={labels.logout}
                  title={labels.logout}
                  disabled={busy}
                  onClick={() => {
                    if (confirmDiscardChanges(i18n.language)) void run(() => signOut(auth));
                  }}
                >
                  <Icon name="logout" />
                </button>
              </div>
            </>
          )}
          {error && <p role="alert">{labels[error]}</p>}
        </div>
        {access === 'admin' && (
          <>
            <section className="portal-workspace" aria-label={labels.workspace}>
              <p className="eyebrow">{labels.workspace}</p>
              <nav className="workspace-buttons" aria-label={labels.workspace}>
                {[
                  ['/app/calendar/', 'calendar'],
                  ['/app/customers/', 'customers'],
                  ['/app/balances/', 'balances'],
                  ['/app/settings/', 'settings'],
                ].map(([href, kind]) => (
                  <a
                    key={kind}
                    className="language"
                    href={href}
                    aria-current={route.kind === kind ? 'page' : undefined}
                  >
                    {uiText('common.navigation.' + kind)}
                  </a>
                ))}
              </nav>
            </section>
            {!import.meta.env.DEV && ['calendar', 'balances'].includes(route.kind) && (
              <section className="customer-section">
                <h2>{uiText('ui.portal.planningToolsAreNotYetAvailable')}</h2>
                <p>{uiText('ui.portal.calendarAndBalancePlanningAreNotYetReleasedAs')}</p>
                <a href="/app/customers/">{uiText('ui.portal.manageCustomers')}</a>
              </section>
            )}
            <div
              hidden={
                workspace !== 'customers' ||
                (!import.meta.env.DEV && ['calendar', 'balances'].includes(route.kind))
              }
            >
              <Customers key={user?.uid + '-' + formEpoch} refreshKey={directoryRefresh} />
            </div>
            {!import.meta.env.DEV && (
              <div hidden={workspace !== 'houses'}>
                <Houses key={user?.uid} initialSelected={route.locationId} routable />
              </div>
            )}
          </>
        )}
        {(access === 'admin' || access === 'customer' || access === 'employee') && (
          <div hidden={access === 'admin' && !personal}>
            <Profile
              key={user?.uid + '-' + formEpoch}
              onSaved={() => setDirectoryRefresh((value) => value + 1)}
            />
          </div>
        )}
        <p className="portal-session">{labels.session}</p>
      </main>
    </>
  );
}
