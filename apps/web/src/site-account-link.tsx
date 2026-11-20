import Button from './button';
import { uiText } from './i18n.ts';
import React from 'react';
import { createPortal } from 'react-dom';
import Modal from './modal';
import { useTranslation } from 'react-i18next';
export default function SiteAccountLink() {
  const { i18n } = useTranslation();
  const [open, setOpen] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState('');

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
        setError(uiText('ui.siteAccountLink.signInCouldNotFinishAllowTheGooglePopup'));
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
        {signedIn
          ? uiText('ui.siteAccountLink.openApp', {}, i18n.language)
          : uiText('ui.siteAccountLink.signIn', {}, i18n.language)}
      </a>
      {open &&
        createPortal(
          <Modal
            title={uiText('ui.siteAccountLink.welcomeBack')}
            onClose={() => setOpen(false)}
            disabled={busy}
            className="marketing-sign-in"
          >
            <span className="sign-in-flower" aria-hidden="true">
              ✿
            </span>
            <p>{uiText('ui.siteAccountLink.yourLittleWorldOfCareAllInOnePlace')}</p>
            <Button variant="primary" disabled={busy} onClick={() => void signIn()}>
              {busy
                ? uiText('ui.siteAccountLink.signingIn')
                : uiText('ui.siteAccountLink.continueWithGoogle')}
            </Button>
            <p className="sign-in-note">
              {uiText('ui.siteAccountLink.oneSecureSignInForPetFamiliesAndOur')}
            </p>
            {error && <p role="alert">{error}</p>}
          </Modal>,
          document.body,
        )}
    </>
  );
}
