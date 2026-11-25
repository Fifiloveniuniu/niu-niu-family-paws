import { useDialogState } from './dialog-routing';
import { dialogCustomer } from './dialog-records';
import Button from './button';
import SearchInput from './search-input';
import IconButton from './icon-button';
import './customer-workspace.css';
import LoadMore from './load-more';
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
import { currentRoute, routeUrl, navigate } from './routing';
import { useTranslation } from 'react-i18next';
import { auth } from './auth-client';
import Pets from './pets';
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
  const petLabels = uiValue('ui.pets.labels', i18n.language);
  const petSearchId = React.useId();
  const [onlyMine, setOnlyMine] = React.useState(false);
  const [ownCustomer, setOwnCustomer] = React.useState<Customer | null>(null);
  const [ownLoading, setOwnLoading] = React.useState(false);
  const [ownError, setOwnError] = React.useState(false);
  const ownGeneration = React.useRef(0);
  const [items, setItems] = React.useState<Customer[]>([]);
  const listScroll = React.useRef<HTMLDivElement>(null);
  const loadingRequest = React.useRef(false);
  const nextCursor = React.useRef<string | null>(null);
  const [cursor, setCursor] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [loaded, setLoaded] = React.useState(false);
  const [message, setMessage] = React.useState<keyof typeof englishMessages | null>(null);
  const [error, setError] = React.useState<keyof typeof englishMessages | null>(null);
  const [editor, setEditor] = useDialogState<{ id: string; input: CustomerWrite } | null>(
    'customer-edit',
    null,
    {
      encode: (value) => (value ? (value.input.version ? value.id : 'new') : null),
      decode: async (raw, signal) => {
        const customer = raw === 'new' ? null : await dialogCustomer(raw, signal);
        const input: CustomerWrite = customer
          ? {
              name: customer.name,
              email: customer.email,
              phone: customer.phone,
              language: customer.language,
              version: customer.version,
            }
          : {
              name: '',
              email: '',
              phone: '',
              language: profileLanguage(i18n.language),
              version: 0,
            };
        baseline.current = JSON.stringify(input);
        return { id: customer?.id ?? crypto.randomUUID(), input };
      },
    },
  );
  const [uncertain, setUncertain] = React.useState(false);
  const [search, setSearch] = React.useState(
    () => new URLSearchParams(location.search).get('customerSearch') || '',
  );
  const [activeSearch, setActiveSearch] = React.useState(
    () => new URLSearchParams(location.search).get('customerSearch') || '',
  );
  const [petSearch, setPetSearch] = React.useState(
    () => new URLSearchParams(location.search).get('petSearch') || '',
  );
  const [activePetSearch, setActivePetSearch] = React.useState(
    () => new URLSearchParams(location.search).get('petSearch') || '',
  );
  const [petCustomer, setPetCustomer] = React.useState<
    (Pick<Customer, 'id' | 'name' | 'loginEmail'> & Partial<Customer>) | null
  >(null);
  const [linkBusy, setLinkBusy] = React.useState(false);
  const [linkCustomer, setLinkCustomer] = useDialogState<string | null>('customer-link', null, {
    encode: (value) => value,
    decode: async (raw, signal) => (await dialogCustomer(raw, signal)).id,
  });
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
  async function load(next?: string, query = activeSearch, petQuery = activePetSearch) {
    if (!alive.current) return;
    if (onlyMine && !ownCustomer) {
      ++request.current;
      loadingRequest.current = false;
      nextCursor.current = null;
      setItems([]);
      setCursor(null);
      setLoading(false);
      return;
    }
    if (next && (loadingRequest.current || next !== nextCursor.current)) return;
    loadingRequest.current = true;
    const generation = ++request.current;
    setLoading(true);
    if (!next) {
      setItems([]);
      nextCursor.current = null;
      setCursor(null);
      listScroll.current?.scrollTo({ top: 0 });
    }
    setError(null);
    try {
      const params = new URLSearchParams();
      params.set('pageSize', '25');
      if (next) params.set('cursor', next);
      if (query.trim()) params.set('search', query.trim());
      if (petQuery.trim()) params.set('petSearch', petQuery.trim());
      if (onlyMine && ownCustomer) params.set('customerId', ownCustomer.id);
      const page = await customerRequest<components['schemas']['CustomerPage']>('?' + params);
      if (!alive.current || generation !== request.current) return;
      setItems((previous) =>
        next
          ? [...new Map([...previous, ...page.items].map((item) => [item.id, item])).values()]
          : page.items,
      );
      setPetCustomer((previous) =>
        previous ? (page.items.find((item) => item.id === previous.id) ?? previous) : previous,
      );
      nextCursor.current = page.nextCursor;
      setCursor(page.nextCursor);
      setLoaded(true);
    } catch (error) {
      if (alive.current && generation === request.current) report(error);
    } finally {
      if (alive.current && generation === request.current) {
        loadingRequest.current = false;
        setLoading(false);
      }
    }
  }
  React.useEffect(() => {
    alive.current = true;
    void load();
    return () => {
      alive.current = false;
      ++request.current;
    };
  }, [refreshKey, onlyMine, ownCustomer?.id]);
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
        if (lookup) await findPetCustomer(customer, pet, lookup, token, controller.signal);
        const customerRecord = await findCustomerById(customer, token, controller.signal);
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
    const petQuery = queryParameters.get('petSearch') || '';
    if (query !== activeSearch || petQuery !== activePetSearch) {
      setSearch(query);
      setPetSearch(petQuery);
      setActiveSearch(query);
      setActivePetSearch(petQuery);
      void load(undefined, query, petQuery);
    }
    if ((queryParameters.get('ownership') === 'mine') !== onlyMine)
      void setOwnershipFilter(queryParameters.get('ownership') === 'mine');
  }, [parsedRoute.kind, parsedRoute.search]);
  React.useEffect(() => {
    const query = search.trim();
    const petQuery = petSearch.trim();
    if (query === activeSearch && petQuery === activePetSearch) return;
    const timer = window.setTimeout(() => {
      setActiveSearch(query);
      setActivePetSearch(petQuery);
      const params = new URLSearchParams(location.search);
      if (query) params.set('customerSearch', query);
      else params.delete('customerSearch');
      if (petQuery) params.set('petSearch', petQuery);
      else params.delete('petSearch');
      navigate(location.pathname + (params.size ? '?' + params : ''), true);
      void load(undefined, query, petQuery);
    }, 250);
    return () => window.clearTimeout(timer);
  }, [search, petSearch, activeSearch, activePetSearch]);
  React.useEffect(() => {
    if (onlyMine && ownCustomer && !loading && !error && !items.length && cursor) void load(cursor);
  }, [onlyMine, ownCustomer?.id, loading, error, items.length, cursor]);
  React.useEffect(() => {
    if (!petCustomer || (!activeSearch && !activePetSearch)) return;
    const selectedId = petCustomer.id;
    const controller = new AbortController();
    let current = true;
    void (async () => {
      try {
        let cursor: string | null = null;
        do {
          const params = new URLSearchParams({ customerId: selectedId, pageSize: '25' });
          if (activeSearch) params.set('search', activeSearch);
          if (activePetSearch) params.set('petSearch', activePetSearch);
          if (cursor) params.set('cursor', cursor);
          const page = await apiJson<components['schemas']['CustomerPage']>(
            '/customers?' + params,
            { signal: controller.signal },
          );
          if (!current) return;
          const selected = page.items.find((item) => item.id === selectedId);
          if (selected) {
            setPetCustomer(selected);
            return;
          }
          cursor = page.nextCursor;
        } while (cursor);
        if (current) {
          setPetCustomer(null);
          const params = new URLSearchParams(location.search);
          for (const key of ['customer', 'pet', 'lookup']) params.delete(key);
          navigate('/app/customers/' + (params.size ? '?' + params : ''), true);
        }
      } catch (error) {
        if (current) {
          setPetCustomer(null);
          report(error);
        }
      }
    })();
    return () => {
      current = false;
      controller.abort();
    };
  }, [activeSearch, activePetSearch, petCustomer?.id]);
  const visibleItems = onlyMine ? items.filter((item) => item.id === ownCustomer?.id) : items;
  return (
    <section
      className="customer-section customer-workspace tab-workspace"
      data-selected={petCustomer ? 'true' : 'false'}
      aria-label={labels.title}
    >
      <section className="customer-filters" aria-label={uiText('ui.customers.customerFilters')}>
        <div className="customer-filter-toolbar">
          <div className="customer-filter-fields">
            <form
              className="customer-search"
              role="search"
              onSubmit={(event) => event.preventDefault()}
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
              </div>
            </form>
            <div className="pet-search">
              <form
                className="customer-search"
                role="search"
                onSubmit={(event) => event.preventDefault()}
              >
                <label htmlFor={petSearchId}>{petLabels.searchHint}</label>
                <div className="portal-actions">
                  <SearchInput
                    id={petSearchId}
                    maxLength={120}
                    value={petSearch}
                    onChange={(event) => setPetSearch(event.target.value)}
                  />
                </div>
              </form>
            </div>
          </div>
        </div>
        <label className="customer-ownership-filter">
          <input
            type="checkbox"
            checked={onlyMine}
            onChange={(event) => void setOwnershipFilter(event.target.checked)}
          />
          {uiText('ui.customers.onlyMyPets')}
        </label>
        <div className="customer-add-action">
          <Button
            icon="plus"
            variant="primary"
            disabled={saving || uncertain}
            onClick={() => open()}
          >
            {labels.add}
          </Button>
        </div>
        {ownLoading && <p role="status">{uiText('ui.customers.loadingYourOwnProfile')}</p>}
        {ownError && (
          <p role="alert">
            {uiText('ui.customers.couldNotLoadYourProfileTryAgain')}
            <Button variant="secondary" onClick={() => void setOwnershipFilter(true)}>
              {labels.reload}
            </Button>
          </p>
        )}
        {onlyMine && !ownLoading && !ownError && !ownCustomer && (
          <p>{uiText('ui.customers.saveYourProfileFromTheAccountMenuToFind')}</p>
        )}
      </section>
      {message && <p role="status">{labels[message]}</p>}
      {!editor && error && <p role="alert">{labels[error]}</p>}
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
            {error && <p role="alert">{labels[error]}</p>}
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
      <div className="customer-pet-layout">
        <div
          ref={directoryPanel}
          tabIndex={-1}
          className="customer-directory-panel"
          role="region"
          aria-label={uiText('ui.customers.customerList')}
        >
          <div className="customer-heading directory-toolbar">
            <p>
              {loaded && !visibleItems.length && !loading && !cursor
                ? activeSearch.trim()
                  ? labels.noMatches
                  : labels.empty
                : loaded
                  ? uiText('ui.customers.customersShown', { count: visibleItems.length })
                  : ''}
            </p>
            {(error === 'error' || error === 'conflict') && !uncertain && (
              <Button variant="secondary" disabled={loading || saving} onClick={() => void load()}>
                {labels.reload}
              </Button>
            )}
          </div>
          <div ref={listScroll} className="customer-list-scroll">
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
                  <Icon name="chevron-right" className="customer-row-chevron" />
                </li>
              ))}
            </ul>

            {!onlyMine && (
              <LoadMore
                hasMore={!!cursor}
                loading={loading}
                error={!!error && !editor}
                disabled={saving || uncertain || !!editor || !!linkCustomer}
                label={labels.more}
                loadingLabel={labels.loading}
                retryLabel={labels.reload}
                onLoad={() => void load(cursor ?? undefined)}
              />
            )}
          </div>
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
                <div className="customer-profile-summary">
                  <span className="customer-profile-avatar" aria-hidden="true">
                    <Icon name="account" />
                  </span>
                  <div className="customer-profile-copy">
                    <p className="customer-profile-label">{labels.title}</p>
                    <h3>{petCustomer.name}</h3>
                    <div className="customer-profile-meta">
                      <p>
                        {[petCustomer.email, petCustomer.phone].filter(Boolean).join(' · ') ||
                          labels.noContact}
                      </p>
                      {petCustomer.language && (
                        <span className="customer-profile-language">
                          {languageName(petCustomer.language)}
                        </span>
                      )}
                    </div>
                    {petCustomer.loginEmail && (
                      <p>
                        {labels.loginEmail}: {petCustomer.loginEmail}
                      </p>
                    )}
                  </div>
                  <div className="customer-profile-actions">
                    {petCustomer.version != null && (
                      <IconButton
                        title={labels.edit}
                        aria-label={`${labels.edit}: ${petCustomer.name}`}
                        disabled={saving || uncertain}
                        onClick={() => open(petCustomer as Customer)}
                      >
                        <Icon name="edit" />
                      </IconButton>
                    )}
                    {!petCustomer.loginEmail && (
                      <IconButton
                        title={uiText('ui.customers.linkGoogleAccount')}
                        aria-label={uiText('ui.customers.linkGoogleAccount')}
                        onClick={() => setLinkCustomer(petCustomer.id)}
                      >
                        <Icon name="link" />
                      </IconButton>
                    )}
                    {onViewAs && petCustomer.version != null && (
                      <IconButton
                        title={uiText('ui.workspace.viewAs')}
                        aria-label={uiText('ui.workspace.viewAs')}
                        onClick={() => onViewAs(petCustomer as Customer)}
                      >
                        <Icon name="account" />
                      </IconButton>
                    )}
                  </div>
                </div>
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
                nameFilter={activePetSearch}
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
