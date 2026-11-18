import React from 'react';
import { useTranslation } from 'react-i18next';
import LanguageSelector from './language-selector';

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
  onLanguageChange: (language: 'en' | 'zh') => void;
  children: React.ReactNode;
}) {
  const { i18n } = useTranslation();
  const chinese = i18n.language === 'zh';
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
          <header className="portal-header">
            <a className="brand" href="/home/">
              Niu Niu Family Paws
            </a>
            <LanguageSelector onChange={onLanguageChange} />
          </header>
          <main className="portal">
            <section className="portal-card" role={status === 'offline' ? 'alert' : 'status'}>
              <h1>
                {status === 'checking'
                  ? chinese
                    ? '正在连接…'
                    : 'Connecting…'
                  : chinese
                    ? '无法连接服务器'
                    : 'Unable to connect'}
              </h1>
              {status === 'offline' && (
                <>
                  <p>
                    {chinese
                      ? '暂时无法连接服务器。请检查网络连接，稍后重试。'
                      : 'We can’t reach the server right now. Check your connection and try again.'}
                  </p>
                  <button
                    className="button"
                    onClick={() => {
                      setStatus('checking');
                      setRetry((value) => value + 1);
                    }}
                  >
                    {chinese ? '重试' : 'Try again'}
                  </button>
                  <p>
                    <a href="/home/">{chinese ? '返回网站' : 'Back to website'}</a>
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
