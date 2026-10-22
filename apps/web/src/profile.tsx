import React from 'react';
import { useTranslation } from 'react-i18next';
import { auth } from './auth-client';
import Pets from './pets';
import type { components } from '../../../packages/contracts/generated';

type Customer = components['schemas']['Customer'];
type ProfileWrite = components['schemas']['ProfileWrite'];
const en = {
  title: 'My profile', intro: 'Save your name and preferred language for your customer account.',
  setup: 'Complete your profile to get started.', name: 'Your name', language: 'Your preferred language',
  loginEmail: 'Google sign-in email', identity: 'Your Google account determines which profile you can access. This email cannot be changed here.',
  existing: 'Existing customer records are not linked automatically. Linking requires administrator verification.',
  future: 'Pet profiles and photos will be added in a later release.',
  save: 'Save profile', retry: 'Retry profile save', saving: 'Saving profile…', saved: 'Your profile is saved.',
  loading: 'Loading your profile…', reload: 'Reload saved profile', error: 'Couldn’t load or save your profile. Please try again.',
  conflict: 'Your profile changed elsewhere. Your edits are kept below. Reload the saved profile before editing again; reloading replaces the edits below.',
  forbidden: 'Your account could not be authorized. Refresh access above or sign in with your verified Google account again.',
  invalid: 'Enter your name using 120 characters or fewer.',
};
const zh: typeof en = {
  title: '我的资料', intro: '保存您的姓名和首选语言，用于您的客户账号。',
  setup: '请先填写您的资料。', name: '您的姓名', language: '您的首选语言',
  loginEmail: 'Google 登录邮箱', identity: '系统根据您的 Google 账号确认资料归属。此处不能修改登录邮箱。',
  existing: '已有客户记录不会自动关联。关联记录需要管理员核实身份。',
  future: '宠物资料与照片将在后续版本开放。',
  save: '保存我的资料', retry: '重试保存我的资料', saving: '正在保存资料…', saved: '您的资料已保存。',
  loading: '正在加载您的资料…', reload: '重新加载已保存的资料', error: '未能加载或保存您的资料，请重试。',
  conflict: '资料已被其他操作更新。您的修改保留在下方。请先重新加载已保存的资料，再编辑；重新加载会替换下方尚未保存的修改。',
  forbidden: '未能验证您的账号权限。请刷新上方的访问权限，或重新使用已验证的 Google 账号登录。',
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
      setInput(current ? { name: current.name, language: current.language, version: current.version } : { name: '', language: i18n.language === 'zh' ? 'zh' : 'en', version: 0 });
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
      setProfile(current); setInput({ name: current.name, language: current.language, version: current.version });
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
      {!profile && <p>{t.setup}</p>}
      <p className="profile-identity"><span>{t.loginEmail}</span><strong>{profile?.loginEmail ?? auth.currentUser?.email}</strong></p>
      <p className="customer-intro">{t.identity}</p>
      <form className="customer-form" onSubmit={event => void save(event)}>
        <fieldset disabled={saving || loading || uncertain || error === 'forbidden'}>
          <label>{t.name}<input name="profile-name" autoComplete="name" required maxLength={120} value={input.name} onChange={event => { setInput({ ...input, name: event.target.value }); setSaved(false); }}/></label>
          <label>{t.language}<select value={input.language} onChange={event => { setInput({ ...input, language: event.target.value as 'en' | 'zh' }); setSaved(false); }}><option value="en">English</option><option value="zh">简体中文</option></select></label>
        </fieldset>
        <button className="button" disabled={saving || loading || error === 'conflict' || error === 'forbidden'} type="submit">{saving ? t.saving : uncertain ? t.retry : t.save}</button>
      </form>
      {!profile && <p className="customer-intro">{t.existing}</p>}
      {profile && <Pets key={profile.id} customerId={profile.id}/>}
    </>}
    <button className="language" disabled={loading || saving || uncertain} onClick={() => void load()}>{t.reload}</button>
  </section>;
}
