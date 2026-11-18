import { type Language, uiText } from './i18n.ts';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { MarketingHeader } from './marketing-shell';

/** An unauthenticated request checks API reachability without reading private records. */
export async function checkApiConnection(signal: AbortSignal) {
  const response = await fetch('/api/profile', { cache: 'no-store', signal });
  if (response.status !== 401) throw new Error('API unavailable');
  const body = await response.json();
  if (body.code !== 'unauthenticated') throw new Error('Invalid API response');
}

export default function ApiConnection({
  active,
  onLanguageChange,
  children,
}: {
  active: boolean;
  onLanguageChange: (language: Language) => void;
  children: React.ReactNode;
}) {
  const { i18n } = useTranslation();

  const [status, setStatus] = React.useState<'checking' | 'ready' | 'offline'>('checking');
  const [connectedOnce, setConnectedOnce] = React.useState(false);
  const [retry, setRetry] = React.useState(0);
  React.useEffect(() => {
    if (!active) return;
    let disposed = false;
    let pending = false;
    let controller: AbortController | undefined;
    async function check() {
      if (pending) return;
      pending = true;
      controller = new AbortController();
      const timeout = window.setTimeout(() => controller?.abort(), 8000);
      try {
        await checkApiConnection(controller.signal);
        if (!disposed) {
          setStatus('ready');
          setConnectedOnce(true);
        }
      } catch {
        if (!disposed) setStatus('offline');
      } finally {
        clearTimeout(timeout);
        pending = false;
      }
    }
    void check();
    const timer = window.setInterval(() => void check(), 15000);
    const resume = () => void check();
    window.addEventListener('online', resume);
    window.addEventListener('focus', resume);
    return () => {
      disposed = true;
      clearInterval(timer);
      controller?.abort();
      window.removeEventListener('online', resume);
      window.removeEventListener('focus', resume);
    };
  }, [active, retry]);
  return (
    <>
      {status !== 'ready' && (
        <>
          <MarketingHeader showNavigation={false} page="app" onLanguageChange={onLanguageChange} />
          <main className="portal">
            <section className="portal-card" role={status === 'offline' ? 'alert' : 'status'}>
              <h1>
                {status === 'checking'
                  ? uiText('ui.apiConnection.connecting')
                  : uiText('ui.apiConnection.unableToConnect')}
              </h1>
              {status === 'offline' && (
                <>
                  <p>{uiText('ui.apiConnection.weCanTReachTheServerRightNowCheck')}</p>
                  <button
                    className="button"
                    onClick={() => {
                      setStatus('checking');
                      setRetry((value) => value + 1);
                    }}
                  >
                    {uiText('ui.apiConnection.tryAgain')}
                  </button>
                  <p>
                    <a href="/home/">{uiText('ui.apiConnection.backToWebsite')}</a>
                  </p>
                </>
              )}
            </section>
          </main>
        </>
      )}
      {connectedOnce && <div hidden={status !== 'ready'}>{children}</div>}
    </>
  );
}
