import Button from './button';
import { englishCatalog, localeFor, uiValue } from './i18n.ts';
import { apiJson } from './api-client';
import React from 'react';
import { useTranslation } from 'react-i18next';
import type { components } from '../../../packages/contracts/generated';
type State = components['schemas']['LinkState'];
const englishMessages = englishCatalog['ui.accountLink.labels'];

function linkRequest<T>(path: string, method = 'GET', body?: unknown) {
  return apiJson<T>(path, { method, body });
}
export function AdminAccountLink({
  customerId,
  onLinked,
  onBusyChange,
}: {
  customerId: string;
  onLinked: () => void;
  onBusyChange?: (busy: boolean) => void;
}) {
  const { i18n } = useTranslation();
  const messages = uiValue('ui.accountLink.labels', i18n.language);
  const [state, setState] = React.useState<State | null>(null);
  const [code, setCode] = React.useState('');
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState(false);
  React.useEffect(() => {
    onBusyChange?.(busy);
  }, [busy, onBusyChange]);
  const alive = React.useRef(true);
  const generation = React.useRef(0);
  const path = `/customers/${customerId}/account-link`;
  async function run(action: (current: () => boolean) => Promise<void>) {
    const id = ++generation.current;
    const current = () => alive.current && id === generation.current;
    setBusy(true);
    setError(false);
    try {
      await action(current);
    } catch {
      if (current()) setError(true);
    } finally {
      if (current()) setBusy(false);
    }
  }
  async function load(current: () => boolean) {
    const next = await linkRequest<State>(path);
    if (current()) setState(next);
  }
  React.useEffect(() => {
    alive.current = true;
    void run(load);
    return () => {
      alive.current = false;
    };
  }, [customerId]);
  async function issue() {
    if (state && ['open', 'requested'].includes(state.status) && !window.confirm(messages.replace))
      return;
    setCode('');
    await run(async (current) => {
      const next = await linkRequest<{ code: string; state: State }>(path, 'POST', {});
      if (current()) {
        setState(next.state);
        setCode(next.code);
      }
    });
  }
  async function decide(action: 'approve' | 'reject' | 'cancel') {
    if (!state || (action === 'approve' && !window.confirm(messages.confirm))) return;
    await run(async (current) => {
      const next = await linkRequest<State>(path, 'PUT', {
        action,
        version: state.version,
        customerVersion: state.customerVersion,
      });
      if (current()) {
        setState(next);
        setCode('');
        if (action === 'approve') onLinked();
      }
    });
  }
  return (
    <section className="customer-section" aria-label={messages.title} aria-busy={busy}>
      <h3>{messages.title}</h3>
      <p>{messages.intro}</p>
      {error && <p role="alert">{messages.error}</p>}
      {busy && <p role="status">{messages.busy}</p>}
      {state && (
        <>
          <h4>{state.customerName}</h4>
          <p>
            {messages.status}: <strong>{messages[state.status]}</strong>
          </p>
          {state.expiresAt && (
            <p>
              {messages.expires}:{' '}
              {new Date(state.expiresAt).toLocaleString(localeFor(i18n.language))}
            </p>
          )}
          {code && (
            <div className="unsaved-notice">
              <p>{messages.once}</p>
              <code className="link-code">{code}</code>
            </div>
          )}
          {state.requestedEmail && (
            <p className="profile-identity">
              <span>{messages.email}</span>
              <strong>{state.requestedEmail}</strong>
            </p>
          )}
          {state.status === 'requested' && (
            <>
              <p>{messages.verify}</p>
              <div className="portal-actions">
                <Button
                  icon="check"
                  variant="primary"
                  disabled={busy}
                  onClick={() => void decide('approve')}
                >
                  {messages.approve}
                </Button>
                <Button variant="secondary" disabled={busy} onClick={() => void decide('reject')}>
                  {messages.reject}
                </Button>
              </div>
            </>
          )}
          <div className="portal-actions">
            {state.status !== 'approved' && (
              <Button variant="secondary" disabled={busy} onClick={() => void issue()}>
                {state.status === 'none' ? messages.generate : messages.regenerate}
              </Button>
            )}
            {['open', 'requested'].includes(state.status) && (
              <Button
                icon="close"
                variant="secondary"
                disabled={busy}
                onClick={() => void decide('cancel')}
              >
                {messages.cancel}
              </Button>
            )}
            <Button icon="reset" variant="secondary" disabled={busy} onClick={() => void run(load)}>
              {messages.refresh}
            </Button>
          </div>
        </>
      )}
    </section>
  );
}
export function AccountLinkRequest({
  onLinked,
  onPending,
}: {
  onLinked: () => void;
  onPending: (pending: boolean) => void;
}) {
  const { i18n } = useTranslation();
  const messages = uiValue('ui.accountLink.labels', i18n.language);
  const [code, setCode] = React.useState('');
  const [status, setStatus] = React.useState('none');
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState(false);
  const alive = React.useRef(true);
  const generation = React.useRef(0);
  async function run(submit = false) {
    const id = ++generation.current;
    const current = () => alive.current && id === generation.current;
    setBusy(true);
    setError(false);
    try {
      const next = await linkRequest<{ status: string }>(
        '/account-link',
        submit ? 'POST' : 'GET',
        submit ? { code } : undefined,
      );
      if (current()) {
        setStatus(next.status);
        onPending(next.status === 'requested');
        if (submit) setCode('');
        if (next.status === 'approved') onLinked();
      }
    } catch {
      if (current()) setError(true);
    } finally {
      if (current()) setBusy(false);
    }
  }
  React.useEffect(() => {
    alive.current = true;
    void run();
    return () => {
      alive.current = false;
    };
  }, []);
  return (
    <section className="customer-form" aria-label={messages.requestTitle}>
      <h3>{messages.requestTitle}</h3>
      <p>{messages.requestIntro}</p>
      <p>{messages.note}</p>
      {error && <p role="alert">{messages.error}</p>}
      {status !== 'none' && (
        <p role="status">{messages[status as keyof typeof englishMessages] ?? messages.none}</p>
      )}
      {status === 'requested' ? (
        <p>{messages.pending}</p>
      ) : (
        status !== 'approved' && (
          <form
            onSubmit={(event) => {
              event.preventDefault();
              void run(true);
            }}
          >
            <label>
              {messages.code}
              <input
                autoComplete="off"
                spellCheck={false}
                minLength={32}
                maxLength={80}
                required
                value={code}
                onChange={(event) => setCode(event.target.value)}
              />
            </label>
            <Button variant="primary" disabled={busy} type="submit">
              {messages.submit}
            </Button>
          </form>
        )
      )}
      <Button icon="reset" variant="secondary" disabled={busy} onClick={() => void run()}>
        {busy ? messages.busy : messages.refresh}
      </Button>
    </section>
  );
}
