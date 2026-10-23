import React from 'react';
import { useTranslation } from 'react-i18next';
import { auth } from './auth-client';
import Pets from './pets';
import UnsavedChanges, { confirmDiscardChanges } from './unsaved-changes';
import {AccountLinkRequest} from './account-link';
import type { components } from '../../../packages/contracts/generated';

type Customer = components['schemas']['Customer'];
type ProfileWrite = components['schemas']['ProfileWrite'];
const en = {
  title: 'My profile', intro: 'Tell us your name and which language you prefer.',
  setup: 'Complete your profile to get started.', name: 'Your name', language: 'Your preferred language',
  loginEmail: 'Google sign-in email', identity: 'This profile belongs to your Google account. Your sign-in email can’t be changed here.',
  existing: 'Already have a customer record? An administrator needs to verify it before linking your account.',
  save: 'Save profile', retry: 'Retry profile save', saving: 'Saving profile…', saved: 'Your profile is saved.',
  loading: 'Loading your profile…', reload: 'Reload saved profile', error: 'Couldn’t load or save your profile. Please try again.',
  conflict: 'Your profile was updated elsewhere. Your edits are still here. Reload the saved profile to continue; this will replace your unsaved edits.',
  forbidden: 'We couldn’t verify access to your profile. Refresh your session above or sign in again.',
  invalid: 'Enter your name using 120 characters or fewer.',
};
const zh: typeof en = {
  title: '我的资料', intro: '填写您的姓名，并选择偏好的语言。',
  setup: '请先填写您的资料。', name: '您的姓名', language: '您的首选语言',
  loginEmail: 'Google 登录邮箱', identity: '这份资料与您的 Google 账号关联，登录邮箱不能在这里修改。',
  existing: '之前已经登记过客户资料？请联系管理员核实身份后再关联账号。',
  save: '保存我的资料', retry: '重试保存我的资料', saving: '正在保存资料…', saved: '您的资料已保存。',
  loading: '正在加载资料…', reload: '重新加载资料', error: '资料加载或保存失败，请重试。',
  conflict: '资料已在其他页面更新，您还没保存的修改仍保留在这里。请重新加载资料后再编辑；重新加载会替换未保存的修改。',
  forbidden: '暂时无法访问您的资料。请刷新上方的登录状态，或重新登录。',
  invalid: '请填写姓名，最多 120 个字符。',
};
class ProfileError extends Error { constructor(public status: number) { super('Profile request failed'); } }
async function profileRequest(input?: ProfileWrite): Promise<Customer | null> {
  const current = auth.currentUser;
  if (!current) throw new ProfileError(401);
  const token = await current.getIdToken();
  const response = await fetch('/api/profile', {
    method: input ? 'PUT' : 'GET', cache: 'no-store',
    headers: { Authorization: `Bearer ${token}`, ...(input ? { 'Content-Type': 'application/json' } : {}) },
    ...(input ? { body: JSON.stringify(input) } : {}),
  });
  if (!response.ok) throw new ProfileError(response.status);
  return response.status === 204 ? null : response.json();
}
export default function Profile({ onSaved }: { onSaved: () => void }) {
  const { i18n } = useTranslation();
  const t = i18n.language === 'zh' ? zh : en;
  const [profile, setProfile] = React.useState<Customer | null>(null);
  const [input, setInput] = React.useState<ProfileWrite>({ name: '', language: i18n.language === 'zh' ? 'zh' : 'en', version: 0 });
  const [loaded, setLoaded] = React.useState(false);
  const [linkPending,setLinkPending] = React.useState(false);
  const baseline = React.useRef('');
  const form = React.useRef<HTMLFormElement>(null);
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [uncertain, setUncertain] = React.useState(false);
  const [saved, setSaved] = React.useState(false);
  const [error, setError] = React.useState<keyof typeof en | null>(null);
  const alive = React.useRef(true);
  function report(e: unknown) {
    const status = e instanceof ProfileError ? e.status : 0;
    setError(status === 409 ? 'conflict' : status === 401 || status === 403 ? 'forbidden' : status === 400 ? 'invalid' : 'error');
  }
  async function load() {
    setLoading(true); setError(null); setSaved(false);
    try {
      const current = await profileRequest();
      if (!alive.current) return;
      setProfile(current);
      const next = current ? { name: current.name, language: current.language, version: current.version } : { name: '', language: i18n.language === 'zh' ? 'zh' as const : 'en' as const, version: 0 };
      baseline.current = JSON.stringify(next); setInput(next);
      setLoaded(true); setUncertain(false);
    } catch (e) { if (alive.current) report(e); }
    finally { if (alive.current) setLoading(false); }
  }
  React.useEffect(() => { alive.current = true; void load(); return () => { alive.current = false; }; }, []);
  async function save(event: React.FormEvent) {
    event.preventDefault();
    if (saving || loading || !loaded) return;
    setSaving(true); setError(null); setSaved(false);
    try {
      const current = await profileRequest(input);
      if (!alive.current) return;
      if (!current) throw new Error('Missing saved profile');
      const next = { name: current.name, language: current.language, version: current.version };
      baseline.current = JSON.stringify(next); setProfile(current); setInput(next);
      setUncertain(false); setSaved(true); onSaved();
    } catch (e) {
      if (alive.current) { report(e); setUncertain(!(e instanceof ProfileError) || e.status >= 500); }
    } finally { if (alive.current) setSaving(false); }
  }
  return <section className="customer-section profile-section" aria-labelledby="profile-title" aria-busy={loading || saving}>
    <h2 id="profile-title">{t.title}</h2><p>{t.intro}</p>
    {loading && <p role="status">{t.loading}</p>}
    {error && <p role="alert">{t[error]}</p>}
    {saved && <p role="status">{t.saved}</p>}
    {loaded && <>
      {!profile&&<AccountLinkRequest onPending={setLinkPending} onLinked={()=>{if(confirmDiscardChanges(i18n.language,form.current))void load();}}/>}
      {!profile && !linkPending && <p>{t.setup}</p>}
      <p className="profile-identity"><span>{t.loginEmail}</span><strong>{profile?.loginEmail ?? auth.currentUser?.email}</strong></p>
      <p className="customer-intro">{t.identity}</p>
      <form ref={form} hidden={linkPending} className="customer-form" onSubmit={event => void save(event)}>
        <UnsavedChanges active={loaded && (JSON.stringify(input) !== baseline.current || saving || uncertain)}/>
        <fieldset disabled={saving || loading || uncertain || error === 'forbidden'}>
          <label>{t.name}<input name="profile-name" autoComplete="name" required maxLength={120} value={input.name} onChange={event => { setInput({ ...input, name: event.target.value }); setSaved(false); }}/></label>
          <label>{t.language}<select value={input.language} onChange={event => { setInput({ ...input, language: event.target.value as 'en' | 'zh' }); setSaved(false); }}><option value="en">English</option><option value="zh">简体中文</option></select></label>
        </fieldset>
        <button className="button" disabled={saving || loading || error === 'conflict' || error === 'forbidden'} type="submit">{saving ? t.saving : uncertain ? t.retry : t.save}</button>
      </form>
      {profile && <Pets key={profile.id} customerId={profile.id}/>}
    </>}
    <button className="language" disabled={loading || saving || uncertain} onClick={() => { if (confirmDiscardChanges(i18n.language, form.current)) void load(); }}>{t.reload}</button>
  </section>;
}
