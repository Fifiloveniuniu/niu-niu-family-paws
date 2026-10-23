import React from 'react';
import { browserSessionPersistence, GoogleAuthProvider, onIdTokenChanged, setPersistence, signInWithPopup, signOut, type User } from 'firebase/auth';
import { useTranslation } from 'react-i18next';
import { getPortalAccess } from './admin-access';
import { auth } from './auth-client';
import Customers from './customers';
import Profile from './profile';

const provider = new GoogleAuthProvider();
provider.setCustomParameters({ prompt: 'select_account' });
const en = {
  home: 'Back to website', label: 'ONE SIGN-IN FOR EVERYONE', title: 'Welcome to Family Paws.',
  intro: 'Continue with your Google account. We’ll open the page for your account permissions.',
  login: 'Continue with Google', logout: 'Sign out', checking: 'Checking your access…', busy: 'Please wait…',
  denied: 'Verified account required', deniedBody: 'We could not verify access for this account. Refresh access or sign out and try your Google account again.',
  refresh: 'Refresh access', error: 'We couldn’t complete that request. Please try again.', popup: 'Allow the Google sign-in window, then try again.', network: 'Check your connection and try again.',
  dashboard: 'Administrator dashboard', welcome: 'Welcome back.', account: 'Your account', role: 'Administrator',
  ready: 'Your administrator sign-in is ready.',
  workspace: 'Workspace', manage: 'Customer management', personal: 'My profile & pets', personalTitle: 'My customer account',
  manageHint: 'Manage customer records and their pets.', personalHint: 'You’re viewing your own profile and pets with this Google account.',
  customerTitle: 'Customer account', employeeTitle: 'Staff account', customerRole: 'Customer', employeeRole: 'Staff',
  customerNext: 'You’re signed in. Complete or update your profile below.',
  employeeNext: 'You’re signed in with staff access. Customer lookup and visit tracking are coming in a future release.',
  session: 'For shared devices, sign out when finished. Your session is limited to this browser session.',
};
const zh: typeof en = {
  home: '返回网站', label: '客户 · 员工 · 管理员统一入口', title: '欢迎来到 Family Paws。',
  intro: '使用您的 Google 账号继续，系统将根据账号权限进入对应页面。',
  login: '使用 Google 继续', logout: '退出登录', checking: '正在验证访问权限…', busy: '请稍候…',
  denied: '需要验证账号', deniedBody: '未能验证此账号的访问权限。请刷新访问权限，或退出后重新使用 Google 账号登录。',
  refresh: '刷新访问权限', error: '未能完成此操作，请重试。', popup: '请允许 Google 登录窗口，然后重试。', network: '请检查网络连接后重试。',
  dashboard: '管理员控制台', welcome: '欢迎回来。', account: '您的账号', role: '管理员',
  ready: '管理员登录已就绪。',
  workspace: '工作页面', manage: '客户管理', personal: '我的资料与宠物', personalTitle: '我的客户页面',
  manageHint: '管理客户及其宠物资料。', personalHint: '您正在查看当前 Google 账号自己的资料与宠物。',
  customerTitle: '客户账号', employeeTitle: '员工账号', customerRole: '客户', employeeRole: '员工',
  customerNext: '您已登录。请在下方填写或更新您的资料。',
  employeeNext: '您已使用员工权限登录。客户查询与服务记录将在后续版本开放。',
  session: '使用共用设备时，请在完成后退出登录。登录状态仅保留在当前浏览器会话中。',
};

export default function Portal({ toggle }: { toggle: () => void }) {
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
    <header className="portal-header"><a className="brand" href="#">NIU NIU<span className="brand-sub">FAMILY PAWS</span></a><button className="language" onClick={toggle} lang={chinese ? 'en' : 'zh-Hans'}>{chinese ? 'English' : '简体中文'}</button></header>
    <main className="portal" id="main"><a className="portal-back" href="#">← {t.home}</a><p className="eyebrow">{t.label}</p>
      <h1>{access === 'admin' ? personal ? t.personalTitle : t.dashboard : access === 'employee' ? t.employeeTitle : access === 'customer' ? t.customerTitle : t.title}</h1>
      <div className="portal-card" aria-busy={busy || access === 'checking'}>
        {access === 'checking' ? <p role="status">{t.checking}</p> : access === 'signed-out' ? <><p>{t.intro}</p><button className="button" disabled={busy} onClick={() => void run(login)}>{busy ? t.busy : t.login}</button></> : <>
          <h2>{access === 'denied' ? t.denied : t.welcome}</h2>
          <p className="portal-account"><span>{t.account}</span><strong>{user?.email}</strong></p>
          {access === 'denied' ? <p>{t.deniedBody}</p> : <><span className="portal-role">{access === 'admin' ? t.role : access === 'employee' ? t.employeeRole : t.customerRole}</span><p>{access === 'admin' ? t.ready : access === 'employee' ? t.employeeNext : t.customerNext}</p></>}
          <div className="portal-actions"><button className="button" disabled={busy} onClick={() => void run(() => verify(auth.currentUser, true))}>{t.refresh}</button><button className="language" disabled={busy} onClick={() => void run(() => signOut(auth))}>{t.logout}</button></div>
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
