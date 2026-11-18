import React from 'react';
import { createPortal } from 'react-dom';
import Modal from './modal';
import { useTranslation } from 'react-i18next';
export default function SiteAccountLink() {
  const { i18n } = useTranslation();
  const [open, setOpen] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState('');
  const zh = i18n.language === 'zh';
  async function signIn() {
    setBusy(true);
    setError('');
    try {
      const [{ auth }, { GoogleAuthProvider, signInWithPopup }] = await Promise.all([
        import('./auth-client'),
        import('firebase/auth'),
      ]);
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      await signInWithPopup(auth, provider);
      location.assign('/app/');
    } catch (cause) {
      const code = (cause as { code?: string }).code;
      if (code !== 'auth/popup-closed-by-user' && code !== 'auth/cancelled-popup-request')
        setError(
          zh
            ? '无法完成登录。请允许 Google 弹出窗口后重试。'
            : 'Sign-in could not finish. Allow the Google popup and try again.',
        );
    } finally {
      setBusy(false);
    }
  }
  const [signedIn, setSignedIn] = React.useState(false);
  React.useEffect(() => {
    let active = true;
    let stop: (() => void) | undefined;
    void Promise.all([import('./auth-client'), import('firebase/auth')]).then(
      ([{ auth }, { onIdTokenChanged }]) => {
        if (active) stop = onIdTokenChanged(auth, (user) => setSignedIn(!!user));
      },
    );
    return () => {
      active = false;
      stop?.();
    };
  }, []);
  return (
    <>
      <a
        className="sign-in-link"
        href={signedIn ? '/app/' : '/app/sign-in/'}
        onClick={(event) => {
          if (!signedIn && !event.metaKey && !event.ctrlKey && !event.shiftKey) {
            event.preventDefault();
            setOpen(true);
          }
        }}
      >
        <svg
          className="account-link-icon"
          viewBox="0 0 24 24"
          aria-hidden="true"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="12" cy="8" r="4" />
          <path d="M4 21v-2a8 8 0 0 1 16 0v2" />
        </svg>
        {i18n.language === 'zh'
          ? signedIn
            ? '打开应用'
            : '登录'
          : signedIn
            ? 'Open app'
            : 'Sign in'}
      </a>
      {open &&
        createPortal(
          <Modal
            title={zh ? '欢迎回来' : 'Welcome back'}
            onClose={() => setOpen(false)}
            disabled={busy}
            className="marketing-sign-in"
          >
            <span className="sign-in-flower" aria-hidden="true">
              ✿
            </span>
            <p>
              {zh
                ? '使用您的 Google 账号，照顾每一个小爪印。'
                : 'Your little world of care, all in one place.'}
            </p>
            <button className="button" disabled={busy} onClick={() => void signIn()}>
              {busy
                ? zh
                  ? '正在登录…'
                  : 'Signing in…'
                : zh
                  ? '使用 Google 登录'
                  : 'Continue with Google'}
            </button>
            <p className="sign-in-note">
              {zh
                ? '家长与团队成员使用同一个安全登录入口。'
                : 'One secure sign-in for pet families and our team.'}
            </p>
            {error && <p role="alert">{error}</p>}
          </Modal>,
          document.body,
        )}
    </>
  );
}
