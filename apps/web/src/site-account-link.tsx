import React from 'react';
import { useTranslation } from 'react-i18next';
export default function SiteAccountLink() {
  const { i18n } = useTranslation();
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
    <a className="sign-in-link" href={signedIn ? '/app/' : '/app/sign-in/'}>
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
  );
}
