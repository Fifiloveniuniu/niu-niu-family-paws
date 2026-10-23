import React from 'react';
import { browserSessionPersistence, GoogleAuthProvider, onIdTokenChanged, setPersistence, signInWithPopup, signOut, type User } from 'firebase/auth';
import { useTranslation } from 'react-i18next';
import { getPortalAccess } from './admin-access';
import { auth } from './auth-client';
import Customers from './customers';
import Profile from './profile';
import LanguageSelector from './language-selector';
import { confirmDiscardChanges } from './unsaved-changes';

const provider = new GoogleAuthProvider();
provider.setCustomParameters({ prompt: 'select_account' });
const en = {
  home: 'Back to website', label: 'YOUR FAMILY PAWS ACCOUNT', title: 'Welcome to Family Paws',
  intro: 'Sign in with your Google account to continue.',
  login: 'Continue with Google', logout: 'Sign out', checking: 'Checking your access…', busy: 'Please wait…',
  denied: 'Verified account required', deniedBody: 'We could not verify access for this account. Refresh access or sign out and try your Google account again.',
  refresh: 'Refresh session', error: 'Something went wrong. Please try again.', popup: 'Allow the Google sign-in window, then try again.', network: 'Check your connection and try again.',
  dashboard: 'Administrator dashboard', welcome: 'Welcome back.', account: 'Your account', role: 'Administrator',
  ready: 'Manage customers or update your own profile and pets.',
  workspace: 'Workspace', manage: 'Customer management', personal: 'My profile & pets', personalTitle: 'My profile & pets',
  manageHint: 'View and update customer and pet details.', personalHint: 'Your own profile and pets, linked to this Google account.',
  customerTitle: 'Customer account', employeeTitle: 'Staff account', customerRole: 'Customer', employeeRole: 'Staff',
  customerNext: 'Manage your profile and pets below.',
  employeeNext: 'Staff tools are on the way. You can manage your own profile and pets here.',
  session: 'Using a shared device? Remember to sign out when you’re done.',
};
const zh: typeof en = {
  home: '返回首页', label: 'FAMILY PAWS 账号', title: '欢迎来到 Family Paws',
  intro: '使用您的 Google 账号登录，即可继续。',
  login: '使用 Google 登录', logout: '退出登录', checking: '正在确认登录状态…', busy: '请稍候…',
  denied: '请验证您的账号', deniedBody: '暂时无法确认您的登录状态。请刷新登录状态，或退出后重新登录。',
  refresh: '刷新登录状态', error: '操作未完成，请重试。', popup: '请允许弹出 Google 登录窗口，然后重试。', network: '请检查网络连接后重试。',
  dashboard: '管理员控制台', welcome: '欢迎回来。', account: '您的账号', role: '管理员',
  ready: '管理客户资料，或打开自己的资料与宠物。',
  workspace: '切换页面', manage: '客户管理', personal: '我的资料与宠物', personalTitle: '我的资料与宠物',
  manageHint: '查看和更新客户及宠物资料。', personalHint: '用当前 Google 账号管理自己的资料与宠物。',
  customerTitle: '客户账号', employeeTitle: '员工账号', customerRole: '客户', employeeRole: '员工',
  customerNext: '在这里管理您的个人资料与宠物。',
  employeeNext: '员工功能尚未开放。您可以先管理自己的资料与宠物。',
  session: '使用共用设备时，请记得在离开前退出登录。',
};

export default function Portal({ onLanguageChange }: { onLanguageChange: (language: 'en' | 'zh') => void }) {
  const { i18n } = useTranslation();
  const chinese = i18n.language === 'zh';
  const t = chinese ? zh : en;
  const [user, setUser] = React.useState<User | null>(null);
  const [access, setAccess] = React.useState<'checking' | 'signed-out' | 'denied' | 'admin' | 'employee' | 'customer'>('checking');
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<keyof typeof en | null>(null);
  const generation = React.useRef(0);
  const previousUid = React.useRef<string | null | undefined>(undefined);
  const [directoryRefresh, setDirectoryRefresh] = React.useState(0);
  const [personal, setPersonal] = React.useState(false);
  const verify = React.useCallback(async (current: User | null, force = false) => {
    const request = ++generation.current;
    if (previousUid.current !== (current?.uid ?? null)) { setAccess('checking'); setPersonal(false); }
    previousUid.current = current?.uid ?? null;
    setError(null); setUser(current);
    if (!current) { setAccess('signed-out'); return; }
    try {
      const token = await current.getIdTokenResult(force);
      if (request === generation.current) setAccess(getPortalAccess(token.claims));
    } catch {
      if (request === generation.current) { setAccess('denied'); setError('network'); }
    }
  }, []);
  React.useEffect(() => {
    const unsubscribe = onIdTokenChanged(auth, current => { void verify(current); });
    const refresh = () => { if (document.visibilityState === 'visible') void verify(auth.currentUser, true); };
    document.addEventListener('visibilitychange', refresh);
    return () => { unsubscribe(); ++generation.current; document.removeEventListener('visibilitychange', refresh); };
  }, [verify]);
  async function run(action: () => Promise<unknown>) {
    setBusy(true); setError(null);
    try { await action(); }
    catch (e) {
      const code = (e as { code?: string }).code;
      if (code !== 'auth/popup-closed-by-user' && code !== 'auth/cancelled-popup-request') {
        setError(code === 'auth/popup-blocked' ? 'popup' : code === 'auth/network-request-failed' ? 'network' : 'error');
      }
    } finally { setBusy(false); }
  }
  async function login() {
    auth.languageCode = chinese ? 'zh-CN' : 'en';
    await setPersistence(auth, browserSessionPersistence);
    await signInWithPopup(auth, provider);
  }
  return <>
    <header className="portal-header"><a className="brand" href="#">NIU NIU<span className="brand-sub">FAMILY PAWS</span></a><LanguageSelector onChange={onLanguageChange}/></header>
    <main className="portal" id="main"><a className="portal-back" href="#">← {t.home}</a><p className="eyebrow">{t.label}</p>
      <h1>{access === 'admin' ? personal ? t.personalTitle : t.dashboard : access === 'employee' ? t.employeeTitle : access === 'customer' ? t.customerTitle : t.title}</h1>
      <div className="portal-card" aria-busy={busy || access === 'checking'}>
        {access === 'checking' ? <p role="status">{t.checking}</p> : access === 'signed-out' ? <><p>{t.intro}</p><button className="button" disabled={busy} onClick={() => void run(login)}>{busy ? t.busy : t.login}</button></> : <>
          {access === 'denied' && <h2>{t.denied}</h2>}
          <div className="portal-identity-row"><p className="portal-account"><span>{t.account}</span><strong>{user?.email}</strong></p>{access !== 'denied' && <span className="portal-role">{access === 'admin' ? t.role : access === 'employee' ? t.employeeRole : t.customerRole}</span>}</div>
          <p className="customer-intro">{access === 'denied' ? t.deniedBody : access === 'admin' ? t.ready : access === 'employee' ? t.employeeNext : t.customerNext}</p>
          <div className="portal-actions session-actions"><button className="language" disabled={busy} onClick={() => void run(() => verify(auth.currentUser, true))}>{t.refresh}</button><button className="language" disabled={busy} onClick={() => { if (confirmDiscardChanges(i18n.language)) void run(() => signOut(auth)); }}>{t.logout}</button></div>
        </>}
        {error && <p role="alert">{t[error]}</p>}
      </div>
      {access === 'admin' && <>
        <section className="portal-workspace" aria-label={t.workspace}>
          <p className="eyebrow">{t.workspace}</p>
          <div className="workspace-buttons" role="group" aria-label={t.workspace}>
            <button className="language" aria-pressed={!personal} onClick={() => setPersonal(false)}>{t.manage}</button>
            <button className="language" aria-pressed={personal} onClick={() => setPersonal(true)}>{t.personal}</button>
          </div>
          <p className="customer-intro">{personal ? t.personalHint : t.manageHint}</p>
        </section>
        <div hidden={personal}><Customers key={user?.uid} refreshKey={directoryRefresh}/></div>
      </>}
      {(access === 'admin' || access === 'customer' || access === 'employee') && <div hidden={access === 'admin' && !personal}><Profile key={user?.uid} onSaved={() => setDirectoryRefresh(value => value + 1)}/></div>}
      <p className="portal-session">{t.session}</p>
    </main>
  </>;
}
