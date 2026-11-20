import Button from './button';
import SearchInput from './search-input';
import IconButton from './icon-button';
import './customer-workspace.css';
import { Pagination } from './pagination';
import { withoutLanguage } from './language-url.ts';
import {
  englishCatalog,
  languageName,
  localeFor,
  profileLanguage,
  supportedLanguages,
  uiText,
  uiValue,
} from './i18n.ts';
import CustomSelect from './custom-select';
import { findCustomerById, findPetCustomer } from './customer-lookup';
import { ApiError, apiJson, apiOptionalJson } from './api-client';
import React from 'react';
import { currentRoute, routeUrl, navigate, updateQuery } from './routing';
import { useTranslation } from 'react-i18next';
import { auth } from './auth-client';
import Pets, { PetSearch } from './pets';
import Modal from './modal';
import Icon from './icons';
import UnsavedChanges, { confirmDiscardChanges } from './unsaved-changes';
import { AdminAccountLink } from './account-link';
import type { components } from '../../../packages/contracts/generated';
type Customer = components['schemas']['Customer'];
type CustomerWrite = components['schemas']['CustomerWrite'];
const englishMessages = englishCatalog['ui.customers.labels'];

function customerRequest<T>(path: string, body?: CustomerWrite) {
  return apiJson<T>('/customers' + path, { body });
}
export default function Customers({
  refreshKey = 0,
  onViewAs,
  onChanged,
}: {
  refreshKey?: number;
  onViewAs?: (customer: Customer) => void;
  onChanged?: () => void;
}) {
  const { i18n } = useTranslation();

  const labels = uiValue('ui.customers.labels', i18n.language);
  const [onlyMine, setOnlyMine] = React.useState(false);
  const [ownCustomer, setOwnCustomer] = React.useState<Customer | null>(null);
  const [ownLoading, setOwnLoading] = React.useState(false);
  const [ownError, setOwnError] = React.useState(false);
  const [filterReset, setFilterReset] = React.useState(0);
  const ownGeneration = React.useRef(0);
  const [items, setItems] = React.useState<Customer[]>([]);
  const [pageSize, setPageSize] = React.useState('25');
  const [pageIndex, setPageIndex] = React.useState(0);
  const cursors = React.useRef<string[]>(['']);
  const [cursor, setCursor] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [loaded, setLoaded] = React.useState(false);
  const [message, setMessage] = React.useState<keyof typeof englishMessages | null>(null);
  const [error, setError] = React.useState<keyof typeof englishMessages | null>(null);
  const [editor, setEditor] = React.useState<{ id: string; input: CustomerWrite } | null>(null);
  const [uncertain, setUncertain] = React.useState(false);
  const [search, setSearch] = React.useState(
    () => new URLSearchParams(location.search).get('customerSearch') || '',
  );
  const [activeSearch, setActiveSearch] = React.useState(
    () => new URLSearchParams(location.search).get('customerSearch') || '',
  );
  const [petCustomer, setPetCustomer] = React.useState<{
    id: string;
    name: string;
    loginEmail: string | null;
  } | null>(null);
  const [linkBusy, setLinkBusy] = React.useState(false);
  const [linkCustomer, setLinkCustomer] = React.useState<string | null>(null);
  const request = React.useRef(0);
  const alive = React.useRef(true);
  const baseline = React.useRef('');
  const form = React.useRef<HTMLFormElement>(null);
  const petsPanel = React.useRef<HTMLDivElement>(null);
  const directoryPanel = React.useRef<HTMLDivElement>(null);
  const revealPets = React.useCallback(() => {
    if (
      window.matchMedia('(max-width: 800px)').matches &&
      petsPanel.current &&
      !petsPanel.current.closest('[hidden]')
    ) {
      petsPanel.current.focus({ preventScroll: true });
      petsPanel.current.scrollIntoView({ block: 'start', behavior: 'instant' });
    }
  }, []);
  function choosePets(customer: NonNullable<typeof petCustomer>) {
    if (!onlyMine || customer.id === ownCustomer?.id) {
      if (onlyMine && customer.id !== ownCustomer?.id) return;
      if (!navigate('/app/customers/' + encodeURIComponent(customer.id) + '/' + location.search))
        return;
      setPetCustomer(customer);
      if (window.matchMedia('(max-width: 800px)').matches)
        requestAnimationFrame(() => {
          petsPanel.current?.focus({ preventScroll: true });
          petsPanel.current?.scrollIntoView({ block: 'start', behavior: 'instant' });
        });
    }
  }
  function report(event: unknown) {
    const status = event instanceof ApiError ? event.status : 0;
    setError(
      status === 409
        ? 'conflict'
        : status === 401 || status === 403
          ? 'forbidden'
          : status === 400
            ? 'invalid'
            : 'error',
    );
  }
  async function load(next?: string, query = activeSearch, index = 0, size = pageSize) {
    const generation = ++request.current;
    setLoading(true);
    setItems([]);
    setPageIndex(index);
    if (index === 0) cursors.current = [''];
    setError(null);
    try {
      const params = new URLSearchParams();
      params.set('pageSize', size);
      if (next) params.set('cursor', next);
      if (query.trim()) params.set('search', query.trim());
      const page = await customerRequest<components['schemas']['CustomerPage']>('?' + params);
      if (!alive.current || generation !== request.current) return;
      setItems(page.items);
      setCursor(page.nextCursor);
      setLoaded(true);
    } catch (error) {
      if (alive.current && generation === request.current) report(error);
    } finally {
      if (alive.current && generation === request.current) setLoading(false);
    }
  }
  React.useEffect(() => {
    alive.current = true;
    void load();
    return () => {
      alive.current = false;
      ++request.current;
    };
  }, [refreshKey]);
  function open(customer?: Customer) {
    if (!confirmDiscardChanges(i18n.language, form.current)) return;
    setError(null);
    setMessage(null);
    setUncertain(false);
    const input: CustomerWrite = customer
      ? {
          name: customer.name,
          email: customer.email,
          phone: customer.phone,
          language: customer.language,
          version: customer.version,
        }
      : { name: '', email: '', phone: '', language: profileLanguage(i18n.language), version: 0 };
    baseline.current = JSON.stringify(input);
    setEditor({ id: customer?.id ?? crypto.randomUUID(), input });
  }
  async function save(event: React.FormEvent) {
    event.preventDefault();
    if (!editor || saving) return;
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const customer = await customerRequest<Customer>('/' + editor.id, editor.input);
      if (!alive.current) return;
      // Invalidate any list response started before this write.
      ++request.current;
      setLoading(false);
      setItems((previous) => [customer, ...previous.filter((item) => item.id !== customer.id)]);
      setOwnCustomer((previous) => (previous?.id === customer.id ? customer : previous));
      setPetCustomer((previous) => (previous?.id === customer.id ? customer : previous));
      setEditor(null);
      setUncertain(false);
      setMessage('saved');
      onChanged?.();
      setLoaded(true);
      void load();
    } catch (error) {
      if (alive.current) {
        report(error);
        setUncertain(!(error instanceof ApiError) || error.status >= 500);
      }
    } finally {
      if (alive.current) setSaving(false);
    }
  }
  const route = withoutLanguage(routeUrl());
  const parsedRoute = currentRoute();
  React.useEffect(() => {
    const params = new URLSearchParams(route.split('?')[1] || '');
    const customer = parsedRoute.customerId || params.get('customer');
    const pet = parsedRoute.petId || params.get('pet');
    const lookup = params.get('lookup');
    if (!customer) {
      if (!onlyMine) setPetCustomer(null);
      return;
    }
    let active = true;
    const controller = new AbortController();
    void (async () => {
      try {
        const token = await auth.currentUser?.getIdToken();
        if (!token) return;
        const customerRecord = lookup
          ? await findPetCustomer(customer, pet, lookup, token, controller.signal)
          : await findCustomerById(customer, token, controller.signal);
        if (active) setPetCustomer(customerRecord);
      } catch {
        if (active) setError('error');
      }
    })();
    return () => {
      active = false;
      controller.abort();
    };
  }, [route]);
  async function setOwnershipFilter(next: boolean) {
    if (!confirmDiscardChanges(i18n.language, petsPanel.current)) return;
    const generation = ++ownGeneration.current;
    setOnlyMine(next);
    setOwnCustomer(null);
    setOwnError(false);
    setOwnLoading(false);
    setPetCustomer(null);
    const scope = new URLSearchParams(location.search);
    if (next) scope.set('ownership', 'mine');
    else scope.delete('ownership');
    navigate('/app/customers/' + (scope.size ? '?' + scope : ''), true);
    if (!next) return;
    setOwnLoading(true);
    try {
      const own = await apiOptionalJson<Customer>('/profile');
      if (alive.current && generation === ownGeneration.current) {
        setOwnCustomer(own);
        setPetCustomer(own);
      }
    } catch {
      if (alive.current && generation === ownGeneration.current) setOwnError(true);
    } finally {
      if (alive.current && generation === ownGeneration.current) setOwnLoading(false);
    }
  }
  React.useEffect(() => {
    if (parsedRoute.kind !== 'customers') return;
    const queryParameters = new URLSearchParams(parsedRoute.search);
    const query = queryParameters.get('customerSearch') || '';
    if (query !== activeSearch) {
      setSearch(query);
      setActiveSearch(query);
      void load(undefined, query);
    }
    if ((queryParameters.get('ownership') === 'mine') !== onlyMine)
      void setOwnershipFilter(queryParameters.get('ownership') === 'mine');
  }, [parsedRoute.kind, parsedRoute.search]);
  const visibleItems = onlyMine
    ? ownCustomer &&
      (!activeSearch.trim() ||
        [ownCustomer.name, ownCustomer.email, ownCustomer.loginEmail || ''].some((value) =>
          value.toLowerCase().startsWith(activeSearch.trim().toLowerCase()),
        ))
      ? [ownCustomer]
      : []
    : items;
  function resetFilters() {
    if (!confirmDiscardChanges(i18n.language, petsPanel.current)) return;
    ++ownGeneration.current;
    setOwnLoading(false);
    setOwnError(false);
    setOnlyMine(false);
    setSearch('');
    setActiveSearch('');
    setPetCustomer(null);
    setFilterReset((value) => value + 1);
    navigate('/app/customers/', true);
    void load(undefined, '');
  }
  return (
    <section
      className="customer-section customer-workspace"
      data-selected={petCustomer ? 'true' : 'false'}
      aria-labelledby="customers-title"
    >
      <div className="customer-heading">
        <div>
          <h2 id="customers-title">{labels.title}</h2>
        </div>
        <Button icon="plus" variant="primary" disabled={saving || uncertain} onClick={() => open()}>
          {labels.add}
        </Button>
      </div>
      <p className="customer-workspace-intro">{uiText('ui.customerView.intro')}</p>
      <section className="customer-filters" aria-label={uiText('ui.customers.customerFilters')}>
        <div className="hc-filters-heading">
          <span className="sr-only">{uiText('ui.customers.filters')}</span>
          <IconButton
            title={uiText('ui.customers.clearCustomerFilters')}
            aria-label={uiText('ui.customers.clearCustomerFilters')}
            onClick={resetFilters}
          >
            <Icon name="reset" />
          </IconButton>
        </div>
        <div className="customer-filter-fields">
          <form
            className="customer-search"
            role="search"
            onSubmit={(event) => {
              event.preventDefault();
              setActiveSearch(search);
              updateQuery({ customerSearch: search.trim() || null });
              void load(undefined, search);
            }}
          >
            <label htmlFor="customer-search">{labels.searchHint}</label>
            <div className="portal-actions">
              <SearchInput
                id="customer-search"

                placeholder={uiText('ui.customerView.search')}
                maxLength={254}
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
              <IconButton
                title={labels.search}
                aria-label={labels.search}
                disabled={loading || saving}
                type="submit"
              >
                <Icon name="search" />
              </IconButton>
            </div>
          </form>
          <PetSearch
            key={filterReset}
            onChoose={choosePets}
            customerScope={onlyMine ? ownCustomer?.id || 'none' : undefined}
          />
        </div>
        <label className="customer-ownership-filter">
          <input
            type="checkbox"
            checked={onlyMine}
            onChange={(event) => void setOwnershipFilter(event.target.checked)}
          />
          {uiText('ui.customers.onlyMyPets')}
        </label>
        {ownLoading && <p role="status">{uiText('ui.customers.loadingYourOwnProfile')}</p>}
        {ownError && (
          <p role="alert">
            {uiText('ui.customers.couldNotLoadYourProfileTryAgain')}
            <Button icon="reset" variant="secondary" onClick={() => void setOwnershipFilter(true)}>
              {labels.reload}
            </Button>
          </p>
        )}
        {onlyMine && !ownLoading && !ownError && !ownCustomer && (
          <p>{uiText('ui.customers.saveYourProfileFromTheAccountMenuToFind')}</p>
        )}
      </section>
      <div className="customer-pet-layout">
        <div
          ref={directoryPanel}
          tabIndex={-1}
          className="customer-directory-panel"
          role="region"
          aria-label={uiText('ui.customers.customerList')}
        >
          {message && <p role="status">{labels[message]}</p>}
          {error && <p role="alert">{labels[error]}</p>}
          {editor && (
            <Modal
              title={editor.input.version ? labels.edit : labels.add}
              disabled={saving || uncertain}
              onClose={() => {
                if (confirmDiscardChanges(i18n.language, form.current)) {
                  setEditor(null);
                  setError(null);
                }
              }}
            >
              <form ref={form} className="customer-form" onSubmit={(event) => void save(event)}>
                <UnsavedChanges
                  active={JSON.stringify(editor.input) !== baseline.current || saving || uncertain}
                />
                {!editor.input.version && (
                  <p className="customer-intro">
                    {uiText('ui.customers.savingContactDetailsDoesNotCreateALoginOr')}
                  </p>
                )}
                <fieldset disabled={saving || uncertain}>
                  <label>
                    {labels.name}
                    <input
                      name="name"
                      autoComplete="name"
                      required
                      maxLength={120}
                      value={editor.input.name}
                      onChange={(event) =>
                        setEditor({
                          ...editor,
                          input: { ...editor.input, name: event.target.value },
                        })
                      }
                    />
                  </label>
                  <label>
                    {labels.email}
                    <input
                      name="email"
                      type="email"
                      autoComplete="email"
                      maxLength={254}
                      value={editor.input.email}
                      onChange={(event) =>
                        setEditor({
                          ...editor,
                          input: { ...editor.input, email: event.target.value },
                        })
                      }
                    />
                  </label>
                  <label>
                    {labels.phone}
                    <input
                      name="phone"
                      type="tel"
                      autoComplete="tel"
                      maxLength={40}
                      value={editor.input.phone}
                      onChange={(event) =>
                        setEditor({
                          ...editor,
                          input: { ...editor.input, phone: event.target.value },
                        })
                      }
                    />
                  </label>
                  <label>
                    {labels.language}
                    <CustomSelect
                      value={editor.input.language}
                      onChange={(event) =>
                        setEditor({
                          ...editor,
                          input: { ...editor.input, language: event.target.value },
                        })
                      }
                    >
                      {supportedLanguages.map(({ code, name, htmlLang }) => (
                        <option key={code} value={code} lang={htmlLang}>
                          {name}
                        </option>
                      ))}
                    </CustomSelect>
                  </label>
                </fieldset>
                <div className="portal-actions">
                  <Button
                    icon="check"
                    variant="primary"
                    disabled={saving || error === 'conflict' || error === 'forbidden'}
                    type="submit"
                  >
                    {saving ? labels.saving : uncertain ? labels.retry : labels.save}
                  </Button>
                  <Button
                    icon="close"
                    variant="secondary"
                    type="button"
                    disabled={saving || uncertain}
                    onClick={() => {
                      if (confirmDiscardChanges(i18n.language, form.current)) {
                        setEditor(null);
                        setError(null);
                      }
                    }}
                  >
                    {labels.cancel}
                  </Button>
                </div>
              </form>
            </Modal>
          )}
          <div className="customer-heading directory-toolbar">
            <p>
              {loaded && !visibleItems.length && !loading
                ? activeSearch.trim()
                  ? labels.noMatches
                  : labels.empty
                : loaded
                  ? uiText('ui.customers.customersShown', { count: visibleItems.length })
                  : ''}
            </p>
            {(error === 'error' || error === 'conflict') && !uncertain && (
              <Button
                icon="reset"
                variant="secondary"
                disabled={loading || saving}
                onClick={() => void load()}
              >
                {labels.reload}
              </Button>
            )}
          </div>
          <ul className="customer-list">
            {visibleItems.map((customer) => (
              <li
                key={customer.id}
                className={petCustomer?.id === customer.id ? 'selected-customer' : undefined}
              >
                <div>
                  <h3>
                    <button
                      className="customer-select"
                      aria-label={customer.name}
                      aria-pressed={petCustomer?.id === customer.id}
                      onClick={() => choosePets(customer)}
                    >
                      <span className="customer-name">{customer.name}</span>
                    </button>
                  </h3>
                  <p>
                    {customer.email || customer.phone
                      ? [customer.email, customer.phone].filter(Boolean).join(' · ')
                      : labels.noContact}
                  </p>
                  {customer.loginEmail && (
                    <p>
                      {labels.loginEmail}: {customer.loginEmail}
                    </p>
                  )}
                  <span
                    className="customer-language"
                    lang={customer.language}
                    title={labels.language}
                  >
                    {languageName(customer.language)}
                  </span>
                </div>
                <div className="customer-row-actions">
                  {onViewAs && (
                    <IconButton
                      type="button"
                      title={uiText('ui.workspace.viewAs')}
                      aria-label={`${uiText('ui.workspace.viewAs')}: ${customer.name}`}
                      onClick={() => onViewAs(customer)}
                    >
                      <Icon name="account" />
                    </IconButton>
                  )}
                  <IconButton
                    title={labels.edit}
                    aria-label={`${labels.edit}: ${customer.name}`}
                    disabled={saving || uncertain}
                    onClick={() => open(customer)}
                  >
                    <Icon name="edit" />
                  </IconButton>
                  {!customer.loginEmail && (
                    <IconButton
                      title={uiText('ui.customers.linkGoogleAccount')}
                      aria-label={`${uiText('ui.customers.linkGoogleAccount')}: ${customer.name}`}
                      onClick={() => setLinkCustomer(customer.id)}
                    >
                      <Icon name="link" />
                    </IconButton>
                  )}
                </div>
              </li>
            ))}
          </ul>
          {linkCustomer && (
            <Modal
              title={uiText('ui.customers.linkAGoogleAccount')}
              disabled={linkBusy}
              onClose={() => setLinkCustomer(null)}
            >
              <AdminAccountLink
                key={linkCustomer}
                customerId={linkCustomer}
                onBusyChange={setLinkBusy}
                onLinked={() => void load()}
              />
            </Modal>
          )}

          {loading && <p role="status">{labels.loading}</p>}
          {!onlyMine && (
            <Pagination
              label={uiText('ui.pagination.customers')}
              page={{
                items,
                index: pageIndex,
                size: pageSize,
                loading: loading || saving,
                error: !!error,
                nextCursor: cursor,
                reload: () => void load(cursors.current[pageIndex], activeSearch, pageIndex),
                reset: () => void load(),
                previous: () =>
                  void load(cursors.current[pageIndex - 1], activeSearch, pageIndex - 1),
                next: () => {
                  if (cursor) {
                    cursors.current = [...cursors.current.slice(0, pageIndex + 1), cursor];
                    void load(cursor, activeSearch, pageIndex + 1);
                  }
                },
                setSize: (size) => {
                  setPageSize(size);
                  void load(undefined, activeSearch, 0, size);
                },
              }}
            />
          )}
        </div>
        <div
          ref={petsPanel}
          tabIndex={-1}
          className="admin-pets"
          role="region"
          aria-label={uiText('ui.customers.selectedCustomerPets')}
        >
          {petCustomer ? (
            <>
              <div className="selected-customer-heading">
                <button
                  className="back-to-customers"
                  onClick={() => {
                    if (!navigate('/app/customers/' + location.search)) return;
                    setPetCustomer(null);
                    requestAnimationFrame(() => {
                      directoryPanel.current?.focus({ preventScroll: true });
                      directoryPanel.current?.scrollIntoView({
                        block: 'start',
                        behavior: 'instant',
                      });
                    });
                  }}
                >
                  {uiText('ui.customers.customers')}
                </button>
                <h3>{petCustomer.name}</h3>
                {petCustomer.loginEmail && <p>{petCustomer.loginEmail}</p>}
              </div>
              <Pets
                routable
                selectedPetId={
                  parsedRoute.petId ||
                  new URLSearchParams(route.split('?')[1] || '').get('pet') ||
                  undefined
                }
                key={petCustomer.id}
                customerId={petCustomer.id}
                onReady={revealPets}
                title={uiText('ui.customers.customerSPets')}
              />
            </>
          ) : (
            <div className="pet-selection-empty">
              <Icon name="customers" />
              <h3>{uiText('ui.customerView.choose')}</h3>
              <p>{uiText('ui.customers.selectACustomerFromTheListToViewAnd')}</p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
