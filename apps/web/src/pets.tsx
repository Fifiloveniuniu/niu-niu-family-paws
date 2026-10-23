import React from 'react';
import { useTranslation } from 'react-i18next';
import { auth } from './auth-client';
import UnsavedChanges from './unsaved-changes';
import type { components } from '../../../packages/contracts/generated';
type Pet = components['schemas']['Pet'];
type PetWrite = components['schemas']['PetWrite'];
const en = {
  title: 'Pets', own: 'My pets', intro: 'Each pet has its own profile. You can add a photo now or later.',
  add: 'Add pet', edit: 'Edit pet', name: 'Pet name', photo: 'Pet photo (optional)', hint: 'JPEG, PNG or WebP, up to 3 MB and 16 megapixels. Photos are private to the owner and administrators.',
  noPhoto: 'Photo not added yet', save: 'Save pet', retry: 'Retry pet save', cancel: 'Cancel', loading: 'Loading pets…', saving: 'Saving pet…',
  empty: 'No pets yet. Add your first pet.', more: 'Load more pets', reload: 'Reload pets', saved: 'Pet saved.',
  error: 'Couldn’t load or save pets. Please try again.', invalid: 'Enter a pet name (up to 120 characters) and choose a valid photo within the limits.',
  forbidden: 'You don’t have access to these pets. Refresh your session above or sign in again.',
  conflict: 'This pet changed elsewhere. Your edits are kept. Reload pets and reopen the latest pet before saving.',
  photoError: 'Couldn’t load this private photo.', photoRetry: 'Retry photo', selected: 'New photo selected. Save the pet to upload it.',
  search: 'Search pet names', searchHint: 'Start of pet name', noMatches: 'No matching pets.', customer: 'Customer', manage: 'Manage these pets',
};
const zh: typeof en = {
  title: '宠物', own: '我的宠物', intro: '为每只宠物单独添加资料，照片可以以后再补。',
  add: '添加宠物', edit: '编辑宠物', name: '宠物名字', photo: '宠物照片（选填）', hint: '支持 JPEG、PNG 或 WebP，最大 3 MB、1600 万像素。仅宠物主人和管理员可查看照片。',
  noPhoto: '尚未添加照片', save: '保存宠物', retry: '重试保存宠物', cancel: '取消', loading: '正在加载宠物…', saving: '正在保存宠物…',
  empty: '还没有添加宠物，先添加一只吧。', more: '加载更多宠物', reload: '重新加载宠物', saved: '宠物资料已保存。',
  error: '宠物资料加载或保存失败，请重试。', invalid: '请填写宠物名字（最多 120 个字符），并检查照片格式和大小。',
  forbidden: '暂时无法访问这些宠物的资料。请刷新上方的登录状态，或重新登录。',
  conflict: '宠物资料已在其他页面更新，您还没保存的修改仍保留在这里。请重新加载宠物，再打开最新资料编辑。',
  photoError: '照片加载失败。', photoRetry: '重新加载照片', selected: '已选好新照片，点击“保存宠物”后才会上传。',
  search: '搜索宠物名字', searchHint: '输入宠物名字的开头', noMatches: '没有找到符合条件的宠物。', customer: '客户', manage: '管理这些宠物',
};
class PetError extends Error { constructor(public status: number) { super('Pet request failed'); } }
async function request(path: string, body?: PetWrite, photo = false) {
  const user = auth.currentUser;
  if (!user) throw new PetError(401);
  const token = await user.getIdToken();
  const response = await fetch('/api' + path, { method: body ? 'PUT' : 'GET', cache: 'no-store',
    headers: { Authorization: `Bearer ${token}`, ...(body ? { 'Content-Type': 'application/json' } : {}) },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  if (!response.ok) throw new PetError(response.status);
  return photo ? response.blob() : response.json();
}
function readFile(file: Blob): Promise<string> {
  return new Promise((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(String(reader.result)); reader.onerror = () => reject(new Error('Image read failed')); reader.readAsDataURL(file); });
}
function PetPhoto({ pet }: { pet: Pet }) {
  const { i18n } = useTranslation(), t = i18n.language === 'zh' ? zh : en;
  const [url, setUrl] = React.useState(''), [failed, setFailed] = React.useState(false), [retry, setRetry] = React.useState(0);
  React.useEffect(() => {
    let alive = true; setUrl(''); setFailed(false);
    if (pet.photo) void request(`/customers/${pet.customerId}/pets/${pet.id}/photo`, undefined, true)
      .then(readFile).then(value => { if (alive) setUrl(value); }).catch(() => { if (alive) setFailed(true); });
    return () => { alive = false; };
  }, [pet.customerId, pet.id, pet.photo, retry]);
  return <div className="pet-photo">{url ? <img src={url} alt={pet.name}/> : failed ? <div><p>{t.photoError}</p><button className="language" onClick={() => setRetry(value => value + 1)}>{t.photoRetry}</button></div> : <span>{pet.photo ? t.loading : t.noPhoto}</span>}</div>;
}
export default function Pets({ customerId, title }: { customerId: string; title?: string }) {
  const { i18n } = useTranslation(), t = i18n.language === 'zh' ? zh : en;
  const headingId = React.useId();
  const [items, setItems] = React.useState<Pet[]>([]), [cursor, setCursor] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(true), [saving, setSaving] = React.useState(false), [reading, setReading] = React.useState(false);
  const [error, setError] = React.useState<keyof typeof en | null>(null), [saved, setSaved] = React.useState(false), [uncertain, setUncertain] = React.useState(false);
  const [editor, setEditor] = React.useState<{ id: string; input: PetWrite; preview: string } | null>(null);
  const alive = React.useRef(true), generation = React.useRef(0), heading = React.useRef<HTMLHeadingElement>(null);
  const path = `/customers/${customerId}/pets`;
  const baseline = React.useRef('');
  function report(e: unknown) {
    const status = e instanceof PetError ? e.status : 0;
    setError(status === 409 ? 'conflict' : status === 401 || status === 403 ? 'forbidden' : status === 400 ? 'invalid' : 'error');
  }
  async function load(next?: string) {
    const version = ++generation.current; setLoading(true); setError(null);
    try {
      const page: components['schemas']['PetPage'] = await request(path + (next ? '?cursor=' + next : ''));
      if (!alive.current || version !== generation.current) return;
      setItems(previous => next ? [...new Map([...previous, ...page.items].map(p => [p.id, p])).values()] : page.items); setCursor(page.nextCursor);
    } catch (e) { if (alive.current && version === generation.current) report(e); }
    finally { if (alive.current && version === generation.current) setLoading(false); }
  }
  React.useEffect(() => { alive.current = true; void load(); return () => { alive.current = false; ++generation.current; }; }, [customerId]);
  React.useEffect(() => { if (editor) heading.current?.focus(); }, [editor?.id]);
  function open(pet?: Pet) {
    setError(null); setSaved(false); setUncertain(false);
    const input = { name: pet?.name ?? '', version: pet?.version ?? 0 };
    baseline.current = JSON.stringify(input);
    setEditor({ id: pet?.id ?? crypto.randomUUID(), input, preview: '' });
  }
  async function choose(file?: File) {
    if (!file || !editor) return;
    setError(null); setSaved(false);
    if (file.size > 3_145_728 || !['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) { setError('invalid'); return; }
    setReading(true);
    try {
      const preview = await readFile(file);
      if (alive.current) setEditor({ ...editor, preview, input: { ...editor.input, photoData: preview.split(',')[1] } });
    } catch { if (alive.current) setError('invalid'); }
    finally { if (alive.current) setReading(false); }
  }
  async function save(event: React.FormEvent) {
    event.preventDefault(); if (!editor || loading || saving || reading) return;
    setSaving(true); setError(null); setSaved(false);
    try {
      await request(`${path}/${editor.id}`, editor.input);
      if (!alive.current) return;
      setEditor(null); setUncertain(false); setSaved(true); await load();
    } catch (e) { if (alive.current) { report(e); setUncertain(!(e instanceof PetError) || e.status >= 500 || e.status === 429); } }
    finally { if (alive.current) setSaving(false); }
  }
  const blocked = saving || reading || uncertain;
  return <section className="pets-section" aria-labelledby={headingId}>
    <div className="customer-heading"><h3 id={headingId}>{title ?? t.own}</h3><button className="button" disabled={blocked || loading} onClick={() => open()}>{t.add}</button></div>
    <p className="customer-intro">{t.intro}</p>
    {error && <p role="alert">{t[error]}</p>}{saved && <p role="status">{t.saved}</p>}
    {editor && <form className="customer-form pet-form" onSubmit={event => void save(event)}>
      <UnsavedChanges active={JSON.stringify(editor.input) !== baseline.current || saving || reading || uncertain}/>
      <h4 ref={heading} tabIndex={-1}>{editor.input.version ? t.edit : t.add}</h4>
      <fieldset disabled={blocked}>
        <label>{t.name}<input required maxLength={120} value={editor.input.name} onChange={event => { setEditor({ ...editor, input: { ...editor.input, name: event.target.value } }); if (error === 'invalid') setError(null); }}/></label>
        <label>{t.photo}<input type="file" accept="image/jpeg,image/png,image/webp" onChange={event => void choose(event.target.files?.[0])}/></label>
      </fieldset>
      <p className="customer-intro">{t.hint}</p>
      {editor.preview && <><img className="pet-preview" src={editor.preview} alt={editor.input.name}/><p>{t.selected}</p></>}
      <div className="portal-actions"><button className="button" type="submit" disabled={saving || reading || loading || error === 'conflict' || error === 'forbidden' || error === 'invalid'}>{saving ? t.saving : uncertain ? t.retry : t.save}</button><button className="language" type="button" disabled={blocked} onClick={() => { setEditor(null); setError(null); }}>{t.cancel}</button></div>
    </form>}
    <div className="pet-grid">{items.map(pet => <article className="pet-card" key={pet.id}><PetPhoto pet={pet}/><div><h4>{pet.name}</h4><button className="language" aria-label={`${t.edit}: ${pet.name}`} disabled={blocked} onClick={() => open(pet)}>{t.edit}</button></div></article>)}</div>
    {loading ? <p role="status">{t.loading}</p> : !items.length && !error ? <p>{t.empty}</p> : null}
    <div className="portal-actions"><button className="language" disabled={blocked || loading} onClick={() => void load()}>{t.reload}</button>{cursor && <button className="language" disabled={blocked || loading} onClick={() => void load(cursor)}>{t.more}</button>}</div>
  </section>;
}
export function PetSearch({ onChoose }: { onChoose: (customer: { id: string; name: string; loginEmail: string | null }) => void }) {
  const { i18n } = useTranslation(), t = i18n.language === 'zh' ? zh : en;
  const [search, setSearch] = React.useState(''), [active, setActive] = React.useState(''), [loading, setLoading] = React.useState(false), [error, setError] = React.useState(false);
  const [page, setPage] = React.useState<components['schemas']['PetSearchPage'] | null>(null);
  const generation = React.useRef(0);
  React.useEffect(() => () => { ++generation.current; }, []);
  async function load(query: string, cursor?: string) {
    const current = ++generation.current; setLoading(true); setError(false); setActive(query);
    try {
      const next: components['schemas']['PetSearchPage'] = await request('/pet-search?' + new URLSearchParams({ search: query, ...(cursor ? { cursor } : {}) }));
      if (current === generation.current) setPage(previous => ({ ...next, items: cursor ? [...(previous?.items ?? []), ...next.items] : next.items }));
    } catch { if (current === generation.current) setError(true); }
    finally { if (current === generation.current) setLoading(false); }
  }
  return <div className="pet-search"><form className="customer-search" role="search" onSubmit={event => { event.preventDefault(); void load(search.trim()); }}>
    <label>{t.searchHint}<input type="search" required maxLength={120} value={search} onChange={event => setSearch(event.target.value)}/></label><button className="language" disabled={loading || !search.trim()}>{t.search}</button>
  </form>{error && <p role="alert">{t.error}</p>}{loading && <p role="status">{t.loading}</p>}
    {page && !loading && !page.items.length && <p>{t.noMatches}</p>}
    <ul className="customer-list">{page?.items.map(({ pet, customer }) => <li key={pet.customerId + '/' + pet.id}><div><h4>{pet.name}</h4><p>{t.customer}: {customer.name}</p>{customer.loginEmail && <p>{customer.loginEmail}</p>}</div><button className="language" onClick={() => onChoose(customer)}>{t.manage}</button></li>)}</ul>
    {page?.nextCursor && <button className="language" disabled={loading} onClick={() => void load(active, page.nextCursor!)}>{t.more}</button>}
  </div>;
}
