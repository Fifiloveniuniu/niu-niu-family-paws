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
const englishMessages = {
  title: 'Customers',
  intro: 'Choose a customer to view and manage their pets.',
  add: 'Add customer',
  edit: 'Edit customer',
  name: 'Customer name',
  email: 'Email (optional)',
  phone: 'Phone (optional)',
  language: 'Preferred language',
  save: 'Save customer',
  cancel: 'Cancel',
  loading: 'Loading customers…',
  saving: 'Saving…',
  empty: 'No customers yet. Add your first customer to get started.',
  more: 'Load more customers',
  reload: 'Try again',
  saved: 'Customer saved.',
  error: 'Couldn’t load or save customers. Please try again.',
  conflict:
    'This record changed since you opened it. Your edits are kept below. Choose Try again, compare the latest record, and reopen it before saving.',
  forbidden: 'Administrator access is required. Sign out and sign in again.',
  invalid: 'Check the name, email, and field lengths, then try again.',
  retry: 'Retry save',
  noContact: 'No contact details added',
  search: 'Search customers',
  searchHint: 'Customer name or email (starts with)',
  noMatches: 'No matching customers.',
  loginEmail: 'Google sign-in email',
};
const chineseMessages: typeof englishMessages = {
  title: '客户',
  intro: '选择客户，即可查看和管理其宠物。',
  add: '添加客户',
  edit: '编辑客户',
  name: '客户姓名',
  email: '邮箱（选填）',
  phone: '电话（选填）',
  language: '首选语言',
  save: '保存客户',
  cancel: '取消',
  loading: '正在加载客户…',
  saving: '正在保存…',
  empty: '暂无客户。请添加第一位客户。',
  more: '加载更多客户',
  reload: '重试',
  saved: '客户已保存。',
  error: '未能加载或保存客户，请重试。',
  conflict:
    '客户资料已在其他页面更新，您还没保存的修改仍保留在这里。请点击“重试”，核对最新资料后重新打开编辑。',
  forbidden: '需要管理员权限。请退出后重新登录。',
  invalid: '请检查姓名、邮箱格式和内容长度，然后重试。',
  retry: '重试保存',
  noContact: '尚未填写联系方式',
  search: '搜索客户',
  searchHint: '输入姓名或邮箱的开头',
  noMatches: '没有找到匹配的客户。',
  loginEmail: 'Google 登录邮箱',
};
function customerRequest<T>(path: string, body?: CustomerWrite) {
  return apiJson<T>('/customers' + path, { body });
}
export default function Customers({ refreshKey = 0 }: { refreshKey?: number }) {
  const { i18n } = useTranslation();
  const chinese = i18n.language === 'zh';
  const labels = chinese ? chineseMessages : englishMessages;
  const [onlyMine, setOnlyMine] = React.useState(false);
  const [ownCustomer, setOwnCustomer] = React.useState<Customer | null>(null);
  const [ownLoading, setOwnLoading] = React.useState(false);
  const [ownError, setOwnError] = React.useState(false);
  const [filterReset, setFilterReset] = React.useState(0);
  const ownGeneration = React.useRef(0);
  const [items, setItems] = React.useState<Customer[]>([]);
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
  async function load(next?: string, query = activeSearch) {
    const generation = ++request.current;
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (next) params.set('cursor', next);
      if (query.trim()) params.set('search', query.trim());
      const page = await customerRequest<components['schemas']['CustomerPage']>('?' + params);
      if (!alive.current || generation !== request.current) return;
      setItems((previous) =>
        next
          ? [...new Map([...previous, ...page.items].map((item) => [item.id, item])).values()]
          : page.items,
      );
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
      : { name: '', email: '', phone: '', language: chinese ? 'zh' : 'en', version: 0 };
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
  const route = routeUrl();
  const parsedRoute = currentRoute();
  React.useEffect(() => {
    const params = new URLSearchParams(route.split('?')[1] || '');
    const customer = parsedRoute.customerId || params.get('customer');
    const pet = parsedRoute.petId || params.get('pet');
    const lookup = params.get('lookup');
    if (!customer) return;
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
    <section className="customer-section" aria-labelledby="customers-title">
      <div className="customer-heading">
        <div>
          <h2 id="customers-title">{labels.title}</h2>
        </div>
        <button className="button" disabled={saving || uncertain} onClick={() => open()}>
          {labels.add}
        </button>
      </div>
      <p className="customer-intro">{labels.intro}</p>
      <section className="customer-filters" aria-label={chinese ? '客户筛选' : 'Customer filters'}>
        <div className="hc-filters-heading">
          <h2>{chinese ? '筛选' : 'Filters'}</h2>
          <button
            className="icon-button"
            title={chinese ? '清除客户筛选' : 'Clear customer filters'}
            aria-label={chinese ? '清除客户筛选' : 'Clear customer filters'}
            onClick={resetFilters}
          >
            <Icon name="reset" />
          </button>
        </div>
        <div className="customer-filter-fields">
          {' '}
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
              <input
                id="customer-search"
                type="search"
                maxLength={254}
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
              <button className="language" disabled={loading || saving} type="submit">
                {labels.search}
              </button>
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
          {chinese ? '只看我的宠物' : 'Only my pets'}
        </label>
        {ownLoading && (
          <p role="status">{chinese ? '正在加载自己的资料…' : 'Loading your own profile…'}</p>
        )}
        {ownError && (
          <p role="alert">
            {chinese ? '无法加载自己的资料，请重试。' : 'Could not load your profile. Try again.'}
            <button className="language" onClick={() => void setOwnershipFilter(true)}>
              {labels.reload}
            </button>
          </p>
        )}
        {onlyMine && !ownLoading && !ownError && !ownCustomer && (
          <p>
            {chinese
              ? '请先在账号菜单中保存个人资料。'
              : 'Save your profile from the Account menu to find your own pets.'}
          </p>
        )}
      </section>
      <div className="customer-pet-layout">
        <div
          ref={directoryPanel}
          tabIndex={-1}
          className="customer-directory-panel"
          role="region"
          aria-label={chinese ? '客户列表' : 'Customer list'}
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
                    {chinese
                      ? '保存联系方式不会创建登录账号或发送邮件。'
                      : 'Saving contact details does not create a login or send an email.'}
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
                          input: { ...editor.input, language: event.target.value as 'en' | 'zh' },
                        })
                      }
                    >
                      <option value="en">English</option>
                      <option value="zh">简体中文</option>
                    </CustomSelect>
                  </label>
                </fieldset>
                <div className="portal-actions">
                  <button
                    className="button"
                    disabled={saving || error === 'conflict' || error === 'forbidden'}
                    type="submit"
                  >
                    {saving ? labels.saving : uncertain ? labels.retry : labels.save}
                  </button>
                  <button
                    className="language"
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
                  </button>
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
                  ? chinese
                    ? `已显示 ${visibleItems.length} 位客户`
                    : `${visibleItems.length} customers shown`
                  : ''}
            </p>
            {(error === 'error' || error === 'conflict') && !uncertain && (
              <button className="language" disabled={loading || saving} onClick={() => void load()}>
                {labels.reload}
              </button>
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
                    lang={customer.language === 'zh' ? 'zh-Hans' : 'en'}
                  >
                    {customer.language === 'zh' ? '简体中文' : 'English'}
                  </span>
                </div>
                <div className="customer-row-actions">
                  <button
                    className="icon-button"
                    title={labels.edit}
                    aria-label={`${labels.edit}: ${customer.name}`}
                    disabled={saving || uncertain}
                    onClick={() => open(customer)}
                  >
                    <Icon name="edit" />
                  </button>
                  {!customer.loginEmail && (
                    <button
                      className="icon-button"
                      title={chinese ? '关联 Google 账号' : 'Link Google account'}
                      aria-label={`${chinese ? '关联 Google 账号' : 'Link Google account'}: ${customer.name}`}
                      onClick={() => setLinkCustomer(customer.id)}
                    >
                      <Icon name="link" />
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
          {linkCustomer && (
            <Modal
              title={chinese ? '关联 Google 账号' : 'Link a Google account'}
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
          {cursor && !onlyMine && (
            <button
              className="language"
              disabled={loading || saving}
              onClick={() => void load(cursor)}
            >
              {labels.more}
            </button>
          )}
        </div>
        <div
          ref={petsPanel}
          tabIndex={-1}
          className="admin-pets"
          role="region"
          aria-label={chinese ? '所选客户的宠物' : 'Selected customer pets'}
        >
          {petCustomer ? (
            <>
              <div className="selected-customer-heading">
                <button
                  className="back-to-customers"
                  onClick={() => {
                    directoryPanel.current?.focus({ preventScroll: true });
                    directoryPanel.current?.scrollIntoView({ block: 'start', behavior: 'instant' });
                  }}
                >
                  {chinese ? '← 客户列表' : '← Customers'}
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
                title={chinese ? '客户的宠物' : 'Customer’s pets'}
              />
            </>
          ) : (
            <div className="pet-selection-empty">
              <h3>{chinese ? '客户的宠物' : 'Customer’s pets'}</h3>
              <p>
                {chinese
                  ? '从客户列表中选择一位客户，查看和管理其宠物。'
                  : 'Select a customer from the list to view and manage their pets.'}
              </p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
