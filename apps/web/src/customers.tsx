import React from 'react';
import { useTranslation } from 'react-i18next';
import { auth } from './auth-client';
import Pets, { PetSearch } from './pets';
import type { components } from '../../../packages/contracts/generated';
type Customer = components['schemas']['Customer'];
type CustomerWrite = components['schemas']['CustomerWrite'];
const en = {
  title: 'Customers', intro: 'Keep contact details and preferred language together. Adding a customer does not create a login or send an email.',
  add: 'Add customer', edit: 'Edit customer', name: 'Customer name', email: 'Email (optional)', phone: 'Phone (optional)', language: 'Preferred language',
  save: 'Save customer', cancel: 'Cancel', loading: 'Loading customers…', saving: 'Saving…', empty: 'No customers yet. Add your first customer to get started.',
  more: 'Load more customers', reload: 'Reload customers', saved: 'Customer saved.', error: 'Couldn’t load or save customers. Please try again.',
  conflict: 'This record changed since you opened it. Your edits are kept below. Reload customers, compare the latest record, and reopen it before saving.',
  forbidden: 'Your administrator session is no longer authorized. Refresh access above or sign in again.',
  invalid: 'Check the name, email, and field lengths, then try again.', retry: 'Retry save', noContact: 'No contact details added',
  search: 'Search customers', searchHint: 'Start of customer name, contact email, or Google email', noMatches: 'No matching customers.', loginEmail: 'Google sign-in email',
};
const zh: typeof en = {
  title: '客户', intro: '管理客户联系方式与首选语言。添加客户不会创建登录账号或发送邮件。',
  add: '添加客户', edit: '编辑客户', name: '客户姓名', email: '邮箱（选填）', phone: '电话（选填）', language: '首选语言',
  save: '保存客户', cancel: '取消', loading: '正在加载客户…', saving: '正在保存…', empty: '暂无客户。请添加第一位客户。',
  more: '加载更多客户', reload: '重新加载客户', saved: '客户已保存。', error: '未能加载或保存客户，请重试。',
  conflict: '此记录已被其他操作更新。您的修改保留在下方。请重新加载客户，对比最新记录，并重新打开后再保存。',
  forbidden: '您的管理员会话已失去授权。请刷新上方的访问权限或重新登录。',
  invalid: '请检查姓名、邮箱与字段长度后重试。', retry: '重试保存', noContact: '尚未添加联系方式',
  search: '搜索客户', searchHint: '输入客户姓名、联系邮箱或 Google 邮箱的开头', noMatches: '没有找到符合条件的客户。', loginEmail: 'Google 登录邮箱',
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
  const request = React.useRef(0);
  const alive = React.useRef(true);
  const heading = React.useRef<HTMLHeadingElement>(null);
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
  React.useEffect(() => { if (editor) heading.current?.focus(); }, [editor?.id]);
  function open(customer?: Customer) {
    setError(null); setMessage(null); setUncertain(false);
    setEditor(customer ? { id: customer.id, input: { name: customer.name, email: customer.email, phone: customer.phone, language: customer.language, version: customer.version } } : { id: crypto.randomUUID(), input: { name: '', email: '', phone: '', language: chinese ? 'zh' : 'en', version: 0 } });
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
      setEditor(null); setUncertain(false); setMessage('saved'); setLoaded(true);
      void load();
    } catch (e) {
      if (alive.current) { report(e); setUncertain(!(e instanceof ApiError) || e.status >= 500); }
    } finally { if (alive.current) setSaving(false); }
  }
  return <section className="customer-section" aria-labelledby="customers-title">
    <div className="customer-heading"><div><p className="eyebrow">{chinese ? '客户管理' : 'CUSTOMER DIRECTORY'}</p><h2 id="customers-title">{t.title}</h2></div><button className="button" disabled={saving || uncertain} onClick={() => open()}>{t.add}</button></div>
    <p className="customer-intro">{t.intro}</p>
    <form className="customer-search" role="search" onSubmit={event => { event.preventDefault(); setActiveSearch(search); void load(undefined, search); }}>
      <label htmlFor="customer-search">{t.searchHint}</label>
      <div className="portal-actions"><input id="customer-search" type="search" maxLength={254} value={search} onChange={event => setSearch(event.target.value)} /><button className="language" disabled={loading || saving} type="submit">{t.search}</button></div>
    </form>
    {message && <p role="status">{t[message]}</p>}
    {error && <p role="alert">{t[error]}</p>}
    {editor && <form className="customer-form" onSubmit={event => void save(event)}>
      <h3 ref={heading} tabIndex={-1}>{editor.input.version ? t.edit : t.add}</h3>
      <fieldset disabled={saving || uncertain}>
        <label>{t.name}<input name="name" autoComplete="name" required maxLength={120} value={editor.input.name} onChange={e => setEditor({ ...editor, input: { ...editor.input, name: e.target.value } })}/></label>
        <label>{t.email}<input name="email" type="email" autoComplete="email" maxLength={254} value={editor.input.email} onChange={e => setEditor({ ...editor, input: { ...editor.input, email: e.target.value } })}/></label>
        <label>{t.phone}<input name="phone" type="tel" autoComplete="tel" maxLength={40} value={editor.input.phone} onChange={e => setEditor({ ...editor, input: { ...editor.input, phone: e.target.value } })}/></label>
        <label>{t.language}<select value={editor.input.language} onChange={e => setEditor({ ...editor, input: { ...editor.input, language: e.target.value as 'en' | 'zh' } })}><option value="en">English</option><option value="zh">简体中文</option></select></label>
      </fieldset>
      <div className="portal-actions"><button className="button" disabled={saving || error === 'conflict' || error === 'forbidden'} type="submit">{saving ? t.saving : uncertain ? t.retry : t.save}</button><button className="language" type="button" disabled={saving || uncertain} onClick={() => { setEditor(null); setError(null); }}>{t.cancel}</button></div>
    </form>}
    <div className="customer-heading"><p>{loaded && !items.length && !loading ? activeSearch.trim() ? t.noMatches : t.empty : ''}</p><button className="language" disabled={loading || saving} onClick={() => void load()}>{t.reload}</button></div>
    <ul className="customer-list">{items.map(customer => <li key={customer.id}><div><h3>{customer.name}</h3><p>{customer.email || customer.phone ? [customer.email, customer.phone].filter(Boolean).join(' · ') : t.noContact}</p>{customer.loginEmail && <p>{t.loginEmail}: {customer.loginEmail}</p>}<span lang={customer.language === 'zh' ? 'zh-Hans' : 'en'}>{customer.language === 'zh' ? '简体中文' : 'English'}</span></div><div className="customer-row-actions"><button className="language" aria-label={`${t.edit}: ${customer.name}`} disabled={saving || uncertain} onClick={() => open(customer)}>{t.edit}</button><button className="language" aria-label={`${chinese ? '管理宠物' : 'Manage pets'}: ${customer.name}`} onClick={() => setPetCustomer(customer)}>{chinese ? '管理宠物' : 'Manage pets'}</button></div></li>)}</ul>
    <PetSearch onChoose={setPetCustomer}/>
    {petCustomer && <div className="admin-pets"><h3>{chinese ? '客户' : 'Customer'}: {petCustomer.name}</h3>{petCustomer.loginEmail && <p>{petCustomer.loginEmail}</p>}<Pets key={petCustomer.id} customerId={petCustomer.id} title={chinese ? '客户的宠物' : 'Customer’s pets'}/></div>}
    {loading && <p role="status">{t.loading}</p>}
    {cursor && <button className="language" disabled={loading || saving} onClick={() => void load(cursor)}>{t.more}</button>}
  </section>;
}
