import React from 'react';
import { useTranslation } from 'react-i18next';
import { auth } from './auth-client';
import Pets, { PetSearch } from './pets';
import Modal from './modal';
import Icon from './icons';
import UnsavedChanges, { confirmDiscardChanges } from './unsaved-changes';
import {AdminAccountLink} from './account-link';
import type { components } from '../../../packages/contracts/generated';
type Customer = components['schemas']['Customer'];
type CustomerWrite = components['schemas']['CustomerWrite'];
const en = {
  title: 'Customers', intro: 'Choose a customer to view and manage their pets.',
  add: 'Add customer', edit: 'Edit customer', name: 'Customer name', email: 'Email (optional)', phone: 'Phone (optional)', language: 'Preferred language',
  save: 'Save customer', cancel: 'Cancel', loading: 'Loading customers…', saving: 'Saving…', empty: 'No customers yet. Add your first customer to get started.',
  more: 'Load more customers', reload: 'Try again', saved: 'Customer saved.', error: 'Couldn’t load or save customers. Please try again.',
  conflict: 'This record changed since you opened it. Your edits are kept below. Choose Try again, compare the latest record, and reopen it before saving.',
  forbidden: 'Administrator access is required. Sign out and sign in again.',
  invalid: 'Check the name, email, and field lengths, then try again.', retry: 'Retry save', noContact: 'No contact details added',
  search: 'Search customers', searchHint: 'Customer name or email (starts with)', noMatches: 'No matching customers.', loginEmail: 'Google sign-in email',
};
const zh: typeof en = {
  title: '客户', intro: '选择客户，即可查看和管理其宠物。',
  add: '添加客户', edit: '编辑客户', name: '客户姓名', email: '邮箱（选填）', phone: '电话（选填）', language: '首选语言',
  save: '保存客户', cancel: '取消', loading: '正在加载客户…', saving: '正在保存…', empty: '暂无客户。请添加第一位客户。',
  more: '加载更多客户', reload: '重试', saved: '客户已保存。', error: '未能加载或保存客户，请重试。',
  conflict: '客户资料已在其他页面更新，您还没保存的修改仍保留在这里。请点击“重试”，核对最新资料后重新打开编辑。',
  forbidden: '需要管理员权限。请退出后重新登录。',
  invalid: '请检查姓名、邮箱格式和内容长度，然后重试。', retry: '重试保存', noContact: '尚未填写联系方式',
  search: '搜索客户', searchHint: '输入姓名或邮箱的开头', noMatches: '没有找到匹配的客户。', loginEmail: 'Google 登录邮箱',
};
class ApiError extends Error { constructor(public status: number) { super('API request failed'); } }
async function api<T>(path: string, body?: CustomerWrite): Promise<T> {
  const user = auth.currentUser;
  if (!user) throw new ApiError(401);
  const token = await user.getIdToken();
  const response = await fetch('/api/customers' + path, {
    method: body ? 'PUT' : 'GET', headers: { Authorization: `Bearer ${token}`, ...(body ? { 'Content-Type': 'application/json' } : {}) },
    ...(body ? { body: JSON.stringify(body) } : {}), cache: 'no-store',
  });
  if (!response.ok) throw new ApiError(response.status);
  return response.json() as Promise<T>;
}
export default function Customers({ refreshKey = 0 }: { refreshKey?: number }) {
  const { i18n } = useTranslation();
  const chinese = i18n.language === 'zh';
  const t = chinese ? zh : en;
  const [onlyMine,setOnlyMine]=React.useState(false),[ownCustomer,setOwnCustomer]=React.useState<Customer|null>(null),[ownLoading,setOwnLoading]=React.useState(false),[ownError,setOwnError]=React.useState(false),[filterReset,setFilterReset]=React.useState(0);
  const ownGeneration=React.useRef(0);
  const [items, setItems] = React.useState<Customer[]>([]);
  const [cursor, setCursor] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [loaded, setLoaded] = React.useState(false);
  const [message, setMessage] = React.useState<keyof typeof en | null>(null);
  const [error, setError] = React.useState<keyof typeof en | null>(null);
  const [editor, setEditor] = React.useState<{ id: string; input: CustomerWrite } | null>(null);
  const [uncertain, setUncertain] = React.useState(false);
  const [search, setSearch] = React.useState('');
  const [activeSearch, setActiveSearch] = React.useState('');
  const [petCustomer, setPetCustomer] = React.useState<{ id: string; name: string; loginEmail: string | null } | null>(null);
  const [linkBusy,setLinkBusy] = React.useState(false);
  const [linkCustomer,setLinkCustomer] = React.useState<string|null>(null);
  const request = React.useRef(0);
  const alive = React.useRef(true);
  const baseline = React.useRef('');
  const form = React.useRef<HTMLFormElement>(null), petsPanel = React.useRef<HTMLDivElement>(null), directoryPanel = React.useRef<HTMLDivElement>(null);
  const revealPets=React.useCallback(()=>{if(window.matchMedia('(max-width: 800px)').matches&&petsPanel.current&&!petsPanel.current.closest('[hidden]')){petsPanel.current.focus({preventScroll:true});petsPanel.current.scrollIntoView({block:'start',behavior:'instant'});}},[]);
  function choosePets(customer: NonNullable<typeof petCustomer>) {
    if (customer.id === petCustomer?.id || confirmDiscardChanges(i18n.language, petsPanel.current)) {
      if(onlyMine&&customer.id!==ownCustomer?.id)return;
      setPetCustomer(customer);
      if (window.matchMedia('(max-width: 800px)').matches) requestAnimationFrame(() => {
        petsPanel.current?.focus({ preventScroll: true });
        petsPanel.current?.scrollIntoView({ block: 'start', behavior: 'instant' });
      });
    }
  }
  function report(e: unknown) {
    const status = e instanceof ApiError ? e.status : 0;
    setError(status === 409 ? 'conflict' : status === 401 || status === 403 ? 'forbidden' : status === 400 ? 'invalid' : 'error');
  }
  async function load(next?: string, query = activeSearch) {
    const generation = ++request.current;
    setLoading(true); setError(null);
    try {
      const params = new URLSearchParams();
      if (next) params.set('cursor', next);
      if (query.trim()) params.set('search', query.trim());
      const page = await api<components['schemas']['CustomerPage']>('?' + params);
      if (!alive.current || generation !== request.current) return;
      setItems(previous => next ? [...new Map([...previous, ...page.items].map(item => [item.id, item])).values()] : page.items);
      setCursor(page.nextCursor); setLoaded(true);
    } catch (e) { if (alive.current && generation === request.current) report(e); }
    finally { if (alive.current && generation === request.current) setLoading(false); }
  }
  React.useEffect(() => { alive.current = true; void load(); return () => { alive.current = false; ++request.current; }; }, [refreshKey]);
  function open(customer?: Customer) {
    if (!confirmDiscardChanges(i18n.language, form.current)) return;
    setError(null); setMessage(null); setUncertain(false);
    const input: CustomerWrite = customer ? { name: customer.name, email: customer.email, phone: customer.phone, language: customer.language, version: customer.version } : { name: '', email: '', phone: '', language: chinese ? 'zh' : 'en', version: 0 };
    baseline.current = JSON.stringify(input);
    setEditor({ id: customer?.id ?? crypto.randomUUID(), input });
  }
  async function save(event: React.FormEvent) {
    event.preventDefault();
    if (!editor || saving) return;
    setSaving(true); setError(null); setMessage(null);
    try {
      const customer = await api<Customer>('/' + editor.id, editor.input);
      if (!alive.current) return;
      // Invalidate any list response started before this write.
      ++request.current; setLoading(false);
      setItems(previous => [customer, ...previous.filter(item => item.id !== customer.id)]);
      setOwnCustomer(previous=>previous?.id===customer.id?customer:previous);
      setPetCustomer(previous => previous?.id === customer.id ? customer : previous);
      setEditor(null); setUncertain(false); setMessage('saved'); setLoaded(true);
      void load();
    } catch (e) {
      if (alive.current) { report(e); setUncertain(!(e instanceof ApiError) || e.status >= 500); }
    } finally { if (alive.current) setSaving(false); }
  }
  const route=window.location.hash;
  React.useEffect(()=>{const params=new URLSearchParams(route.split('?')[1]||''),customer=params.get('customer'),pet=params.get('pet'),lookup=params.get('lookup');if(!customer||!pet||!lookup)return;let active=true;
    void (async()=>{try{const token=await auth.currentUser?.getIdToken();if(!token)return;const response=await fetch('/api/pet-search?'+new URLSearchParams({search:lookup}),{cache:'no-store',headers:{Authorization:`Bearer ${token}`}});if(!response.ok)throw new Error('lookup');const result:components['schemas']['PetSearchPage']=await response.json();const match=result.items.find(item=>item.customer.id===customer&&item.pet.id===pet);if(active){if(match){setOnlyMine(false);setPetCustomer(match.customer);}else setError('error');}}catch{if(active)setError('error');}})();return()=>{active=false;};
  },[route]);
  async function mine(next:boolean){
    if(!confirmDiscardChanges(i18n.language,petsPanel.current))return;
    const generation=++ownGeneration.current;setOnlyMine(next);setOwnCustomer(null);setOwnError(false);setOwnLoading(false);setPetCustomer(null);
    if(!next)return;
    setOwnLoading(true);
    try{const token=await auth.currentUser?.getIdToken();if(!token)throw new Error('signed-out');const response=await fetch('/api/profile',{cache:'no-store',headers:{Authorization:`Bearer ${token}`}});if(!response.ok)throw new Error('profile');const own:Customer|null=response.status===204?null:await response.json();if(alive.current&&generation===ownGeneration.current){setOwnCustomer(own);setPetCustomer(own);}}
    catch{if(alive.current&&generation===ownGeneration.current)setOwnError(true);}
    finally{if(alive.current&&generation===ownGeneration.current)setOwnLoading(false);}
  }
  const visibleItems=onlyMine?(ownCustomer&&(!activeSearch.trim()||[ownCustomer.name,ownCustomer.email,ownCustomer.loginEmail||''].some(value=>value.toLowerCase().startsWith(activeSearch.trim().toLowerCase())))?[ownCustomer]:[]):items;
  function resetFilters(){if(!confirmDiscardChanges(i18n.language,petsPanel.current))return;++ownGeneration.current;setOwnLoading(false);setOwnError(false);setOnlyMine(false);setSearch('');setActiveSearch('');setPetCustomer(null);setFilterReset(value=>value+1);void load(undefined,'');}
  return <section className="customer-section" aria-labelledby="customers-title">
    <div className="customer-heading"><div><h2 id="customers-title">{t.title}</h2></div><button className="button" disabled={saving || uncertain} onClick={() => open()}>{t.add}</button></div>
    <p className="customer-intro">{t.intro}</p>
    <section className="customer-filters" aria-label={chinese?'客户筛选':'Customer filters'}><div className="hc-filters-heading"><h2>{chinese?'筛选':'Filters'}</h2><button className="icon-button" title={chinese?'清除客户筛选':'Clear customer filters'} aria-label={chinese?'清除客户筛选':'Clear customer filters'} onClick={resetFilters}><Icon name="reset"/></button></div><div className="customer-filter-fields">    <form className="customer-search" role="search" onSubmit={event => { event.preventDefault(); setActiveSearch(search); void load(undefined, search); }}>
      <label htmlFor="customer-search">{t.searchHint}</label>
      <div className="portal-actions"><input id="customer-search" type="search" maxLength={254} value={search} onChange={event => setSearch(event.target.value)} /><button className="language" disabled={loading || saving} type="submit">{t.search}</button></div>
    </form><PetSearch key={filterReset} onChoose={choosePets} customerScope={onlyMine?ownCustomer?.id||'none':undefined}/></div><label className="customer-ownership-filter"><input type="checkbox" checked={onlyMine} onChange={e=>void mine(e.target.checked)}/>{chinese?'只看我的宠物':'Only my pets'}</label>{ownLoading&&<p role="status">{chinese?'正在加载自己的资料…':'Loading your own profile…'}</p>}{ownError&&<p role="alert">{chinese?'无法加载自己的资料，请重试。':'Could not load your profile. Try again.'}<button className="language" onClick={()=>void mine(true)}>{t.reload}</button></p>}{onlyMine&&!ownLoading&&!ownError&&!ownCustomer&&<p>{chinese?'请先在账号菜单中保存个人资料。':'Save your profile from the Account menu to find your own pets.'}</p>}</section>
    <div className="customer-pet-layout">
    <div ref={directoryPanel} tabIndex={-1} className="customer-directory-panel" role="region" aria-label={chinese ? '客户列表' : 'Customer list'}>

    {message && <p role="status">{t[message]}</p>}
    {error && <p role="alert">{t[error]}</p>}
    {editor && <Modal title={editor.input.version ? t.edit : t.add} disabled={saving || uncertain} onClose={() => { if (confirmDiscardChanges(i18n.language, form.current)) { setEditor(null); setError(null); } }}><form ref={form} className="customer-form" onSubmit={event => void save(event)}>
      <UnsavedChanges active={JSON.stringify(editor.input) !== baseline.current || saving || uncertain}/>
      {!editor.input.version && <p className="customer-intro">{chinese ? '保存联系方式不会创建登录账号或发送邮件。' : 'Saving contact details does not create a login or send an email.'}</p>}
      <fieldset disabled={saving || uncertain}>
        <label>{t.name}<input name="name" autoComplete="name" required maxLength={120} value={editor.input.name} onChange={e => setEditor({ ...editor, input: { ...editor.input, name: e.target.value } })}/></label>
        <label>{t.email}<input name="email" type="email" autoComplete="email" maxLength={254} value={editor.input.email} onChange={e => setEditor({ ...editor, input: { ...editor.input, email: e.target.value } })}/></label>
        <label>{t.phone}<input name="phone" type="tel" autoComplete="tel" maxLength={40} value={editor.input.phone} onChange={e => setEditor({ ...editor, input: { ...editor.input, phone: e.target.value } })}/></label>
        <label>{t.language}<select value={editor.input.language} onChange={e => setEditor({ ...editor, input: { ...editor.input, language: e.target.value as 'en' | 'zh' } })}><option value="en">English</option><option value="zh">简体中文</option></select></label>
      </fieldset>
      <div className="portal-actions"><button className="button" disabled={saving || error === 'conflict' || error === 'forbidden'} type="submit">{saving ? t.saving : uncertain ? t.retry : t.save}</button><button className="language" type="button" disabled={saving || uncertain} onClick={() => { if (confirmDiscardChanges(i18n.language, form.current)) { setEditor(null); setError(null); } }}>{t.cancel}</button></div>
    </form></Modal>}
    <div className="customer-heading directory-toolbar"><p>{loaded && !visibleItems.length && !loading ? activeSearch.trim() ? t.noMatches : t.empty : loaded ? (chinese ? `已显示 ${visibleItems.length} 位客户` : `${visibleItems.length} customers shown`) : ''}</p>{(error === 'error' || error === 'conflict') && !uncertain && <button className="language" disabled={loading || saving} onClick={() => void load()}>{t.reload}</button>}</div>
    <ul className="customer-list">{visibleItems.map(customer => <li key={customer.id} className={petCustomer?.id === customer.id ? 'selected-customer' : undefined}><div><h3><button className="customer-select" aria-label={customer.name} aria-pressed={petCustomer?.id === customer.id} onClick={() => choosePets(customer)}><span className="customer-name">{customer.name}</span></button></h3><p>{customer.email || customer.phone ? [customer.email, customer.phone].filter(Boolean).join(' · ') : t.noContact}</p>{customer.loginEmail && <p>{t.loginEmail}: {customer.loginEmail}</p>}<span className="customer-language" lang={customer.language === 'zh' ? 'zh-Hans' : 'en'}>{customer.language === 'zh' ? '简体中文' : 'English'}</span></div><div className="customer-row-actions"><button className="icon-button" title={t.edit} aria-label={`${t.edit}: ${customer.name}`} disabled={saving || uncertain} onClick={() => open(customer)}><Icon name="edit"/></button>{!customer.loginEmail&&<button className="icon-button" title={chinese ? '关联 Google 账号' : 'Link Google account'} aria-label={`${chinese ? '关联 Google 账号' : 'Link Google account'}: ${customer.name}`} onClick={()=>setLinkCustomer(customer.id)}><Icon name="link"/></button>}</div></li>)}</ul>
    {linkCustomer&&<Modal title={chinese ? '关联 Google 账号' : 'Link a Google account'} disabled={linkBusy} onClose={()=>setLinkCustomer(null)}><AdminAccountLink key={linkCustomer} customerId={linkCustomer} onBusyChange={setLinkBusy} onLinked={()=>void load()}/></Modal>}

    {loading && <p role="status">{t.loading}</p>}
    {cursor && !onlyMine && <button className="language" disabled={loading || saving} onClick={() => void load(cursor)}>{t.more}</button>}
    </div>
    <div ref={petsPanel} tabIndex={-1} className="admin-pets" role="region" aria-label={chinese ? '所选客户的宠物' : 'Selected customer pets'}>{petCustomer ? <><div className="selected-customer-heading"><button className="back-to-customers" onClick={() => { directoryPanel.current?.focus({ preventScroll: true }); directoryPanel.current?.scrollIntoView({ block: 'start', behavior: 'instant' }); }}>{chinese ? '← 客户列表' : '← Customers'}</button><h3>{petCustomer.name}</h3>{petCustomer.loginEmail && <p>{petCustomer.loginEmail}</p>}</div><Pets selectedPetId={new URLSearchParams(route.split('?')[1]||'').get('pet')||undefined} key={petCustomer.id} customerId={petCustomer.id} onReady={revealPets} title={chinese ? '客户的宠物' : 'Customer’s pets'}/></> : <div className="pet-selection-empty"><h3>{chinese ? '客户的宠物' : 'Customer’s pets'}</h3><p>{chinese ? '从客户列表中选择一位客户，查看和管理其宠物。' : 'Select a customer from the list to view and manage their pets.'}</p></div>}</div>
    </div>
  </section>;
}
