import React from 'react';
import { browserSessionPersistence, GoogleAuthProvider, onIdTokenChanged, setPersistence, signInWithPopup, signOut, type User } from 'firebase/auth';
import { useTranslation } from 'react-i18next';
import { hasAdminAccess } from './admin-access';
import { auth } from './auth-client';

const provider = new GoogleAuthProvider();
provider.setCustomParameters({ prompt: 'select_account' });
const en = {
  home: 'Back to website', label: 'ADMINISTRATOR PORTAL', title: 'A little care, behind the scenes.',
  intro: 'Sign in with your authorized Google account to access the administrator dashboard.',
  login: 'Continue with Google', logout: 'Sign out', checking: 'Checking your access…', busy: 'Please wait…',
  denied: 'Administrator access required', deniedBody: 'This account has not been granted administrator access. Sign out to choose another account, or refresh access after the project owner grants your role.',
  refresh: 'Refresh access', error: 'We couldn’t complete that request. Please try again.', popup: 'Allow the Google sign-in window, then try again.', network: 'Check your connection and try again.',
  dashboard: 'Administrator dashboard', welcome: 'Welcome back.', account: 'Your account', role: 'Administrator',
  ready: 'Your administrator sign-in is ready.', next: 'Customer and pet management will be added in upcoming releases. No customer records are stored or displayed in this release.',
  session: 'For shared devices, sign out when finished. Your session is limited to this browser session.',
};
const zh: typeof en = {
  home: '返回网站', label: '管理员入口', title: '用心照护，从这里开始。',
  intro: '请使用已获授权的 Google 账号登录管理员控制台。',
  login: '使用 Google 继续', logout: '退出登录', checking: '正在验证访问权限…', busy: '请稍候…',
  denied: '需要管理员权限', deniedBody: '此账号尚未获得管理员权限。请退出后选择其他账号，或在项目所有者授予权限后刷新访问权限。',
  refresh: '刷新访问权限', error: '未能完成此操作，请重试。', popup: '请允许 Google 登录窗口，然后重试。', network: '请检查网络连接后重试。',
  dashboard: '管理员控制台', welcome: '欢迎回来。', account: '您的账号', role: '管理员',
  ready: '管理员登录已就绪。', next: '客户与宠物管理将在后续版本中提供。此版本不存储或显示客户记录。',
  session: '使用共用设备时，请在完成后退出登录。登录状态仅保留在当前浏览器会话中。',
};

export default function Portal({ toggle }: { toggle: () => void }) {
  const { i18n } = useTranslation();
  const chinese = i18n.language === 'zh';
  const t = chinese ? zh : en;
  const [user, setUser] = React.useState<User | null>(null);
  const [access, setAccess] = React.useState<'checking' | 'signed-out' | 'denied' | 'admin'>('checking');
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<keyof typeof en | null>(null);
  const generation = React.useRef(0);
  const verify = React.useCallback(async (current: User | null, force = false) => {
    const request = ++generation.current;
    setAccess('checking'); setError(null); setUser(current);
    if (!current) { setAccess('signed-out'); return; }
    try {
      const token = await current.getIdTokenResult(force);
      if (request === generation.current) setAccess(hasAdminAccess(token.claims) ? 'admin' : 'denied');
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
      <h1>{access === 'admin' ? t.dashboard : t.title}</h1>
      <div className="portal-card" aria-busy={busy || access === 'checking'}>
        {access === 'checking' ? <p role="status">{t.checking}</p> : access === 'signed-out' ? <><p>{t.intro}</p><button className="button" disabled={busy} onClick={() => void run(login)}>{busy ? t.busy : t.login}</button></> : <>
          <h2>{access === 'admin' ? t.welcome : t.denied}</h2>
          <p className="portal-account"><span>{t.account}</span><strong>{user?.email}</strong></p>
          {access === 'admin' ? <><span className="portal-role">{t.role}</span><p>{t.ready}</p><p>{t.next}</p></> : <p>{t.deniedBody}</p>}
          <div className="portal-actions"><button className="button" disabled={busy} onClick={() => void run(() => verify(auth.currentUser, true))}>{t.refresh}</button><button className="language" disabled={busy} onClick={() => void run(() => signOut(auth))}>{t.logout}</button></div>
        </>}
        {error && <p role="alert">{t[error]}</p>}
      </div><p className="portal-session">{t.session}</p>
    </main>
  </>;
}
