import React from 'react';
import { useTranslation } from 'react-i18next';
import { localeFor, uiText } from './i18n';
import { auth } from './auth-client';
import { apiJson, ApiError } from './api-client';
import Button from './button';
import Icon from './icons';
import Modal from './modal';
import SearchInput from './search-input';
import CustomSelect from './custom-select';
import SegmentedTabs from './segmented-tabs';
import { useDialogState } from './dialog-routing';
import { currentRoute, updateQuery } from './routing';
import { Pagination, useCursorPage } from './pagination';
import UnsavedChanges, { confirmDiscardChanges, markFormSaved } from './unsaved-changes';
import type {
  AccessAccount,
  AccessWrite,
  AccessInvitation,
  InvitationWrite,
  AccessRole,
  AccessHistory,
} from '../../../packages/access/types';
import './identity-access.css';
const roles: AccessRole[] = ['admin', 'employee', 'customer'];
const text = (key: string) => uiText('ui.identityAccess.' + key);
export const accessText = text;
type House = { id: string; name: string };
type Selection = { roles: AccessRole[]; houseIds: string[] };
type Section = 'accounts' | 'invitations' | 'history';
const houseNames = (ids: string[], houses: House[]) =>
  ids.map((id) => houses.find((house) => house.id === id)?.name ?? text('unknownHouse')).join(', ');
function RoleBadges({ value }: { value: Selection }) {
  return (
    <div className="iam-badges">
      {value.roles.map((role) => (
        <span key={role}>{text(role)}</span>
      ))}
    </div>
  );
}
function Scope({ value, houses }: { value: Selection; houses: House[] }) {
  return (
    <>
      {value.roles.includes('admin')
        ? text('allHouses')
        : value.roles.includes('employee')
          ? houseNames(value.houseIds, houses) || text('noAccess')
          : text('own')}
    </>
  );
}
function Summary({ value, houses }: { value: Selection & { status?: string }; houses: House[] }) {
  return (
    <aside className="iam-summary">
      <strong>{text('effective')}</strong>
      {value.status && value.status !== 'active' ? (
        <p>{text(value.status === 'disabled' ? 'authDisabled' : 'suspendedSummary')}</p>
      ) : (
        <ul>
          {value.roles.includes('admin') && <li>{text('adminWarning')}</li>}
          {value.roles.includes('employee') && !value.roles.includes('admin') && (
            <li>
              {text('employeeSummary')} {houseNames(value.houseIds, houses) || text('noAccess')}
            </li>
          )}
          <li>{text('ownSummary')}</li>
        </ul>
      )}
    </aside>
  );
}
function Fields({
  value,
  houses,
  protectAdmin,
  onChange,
}: {
  value: Selection;
  houses: House[];
  protectAdmin?: boolean;
  onChange: (value: Selection) => void;
}) {
  return (
    <>
      <fieldset>
        <legend>{text('roles')}</legend>
        <p>{text('roleHelp')}</p>
        {roles.map((role) => (
          <label className="iam-role-choice" key={role}>
            <input
              type="checkbox"
              checked={value.roles.includes(role)}
              disabled={role === 'customer' || (role === 'admin' && protectAdmin)}
              onChange={(event) => {
                const nextRoles = roles.filter((item) =>
                  item === role ? event.target.checked : value.roles.includes(item),
                );
                onChange({
                  roles: nextRoles,
                  houseIds: nextRoles.includes('employee') ? value.houseIds : [],
                });
              }}
            />
            <span>
              <strong>{text(role)}</strong>
              <small>{text(role + 'Help')}</small>
            </span>
          </label>
        ))}
        <p>{text('automaticCustomer')}</p>
        {protectAdmin && <p>{text('selfProtection')}</p>}
      </fieldset>
      {value.roles.includes('employee') && (
        <fieldset>
          <legend>{text('houses')}</legend>
          <p>{text('houseHelp')}</p>
          {houses.map((house) => (
            <label className="iam-house-choice" key={house.id}>
              <input
                type="checkbox"
                checked={value.houseIds.includes(house.id)}
                onChange={(event) =>
                  onChange({
                    ...value,
                    houseIds: event.target.checked
                      ? [...value.houseIds, house.id]
                      : value.houseIds.filter((id) => id !== house.id),
                  })
                }
              />
              {house.name}
            </label>
          ))}
          {!houses.length && <p>{text('noHouses')}</p>}
          {!value.houseIds.length && <p className="iam-warning">{text('noHouseWarning')}</p>}
        </fieldset>
      )}
    </>
  );
}
/** Freeze uncertain writes so Retry uses exactly the same operation and reviewed input. */
export function useAccessMutation<T>(onSaved: (result: T) => void) {
  const [busy, setBusy] = React.useState(false),
    [uncertain, setUncertain] = React.useState(false),
    [error, setError] = React.useState('');
  const pending = React.useRef<{ path: string; method: string; body: unknown } | null>(null);
  const running = React.useRef(false),
    alive = React.useRef(true);
  React.useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);
  async function save(path: string, body: unknown, form: HTMLFormElement | null, method = 'PUT') {
    if (running.current) return;
    running.current = true;
    pending.current ??= { path, body, method };
    setBusy(true);
    setError('');
    try {
      const attempt = pending.current;
      const result = await apiJson<T>(attempt.path, { method: attempt.method, body: attempt.body });
      if (!alive.current) return;
      markFormSaved(form);
      pending.current = null;
      setUncertain(false);
      onSaved(result);
    } catch (error) {
      if (!alive.current) return;
      const unknown = !(error instanceof ApiError) || error.status >= 500;
      setUncertain(unknown);
      setError(
        unknown
          ? text('uncertain')
          : text(
              ['stale_access', 'operation_conflict'].includes(error.code)
                ? 'stale_access'
                : error.status === 401 || error.status === 403
                  ? 'forbidden'
                  : error.code in errorKeys
                    ? errorKeys[error.code]
                    : 'saveError',
            ),
      );
      if (!unknown) pending.current = null;
    } finally {
      running.current = false;
      if (alive.current) setBusy(false);
    }
  }
  return { save, busy, uncertain, error, frozen: busy || uncertain };
}
const errorKeys: Record<string, string> = {
  last_admin: 'lastAdmin',
  self_protection: 'selfProtection',
  duplicate_email: 'duplicateEmail',
  account_unavailable: 'unavailable',
  house_unavailable: 'houseUnavailable',
  auth_disabled: 'authDisabled',
  invitation_unavailable: 'invitationUnavailable',
  existing_staff_access: 'existingStaff',
  forbidden: 'forbidden',
  invalid_input: 'invalidInput',
};
export default function IdentityAccess() {
  useTranslation();
  const params = new URLSearchParams(currentRoute().search);
  const section: Section =
    params.get('section') === 'invitations'
      ? 'invitations'
      : params.get('section') === 'history'
        ? 'history'
        : 'accounts';
  const [query, setQuery] = React.useState(''),
    [filter, setFilter] = React.useState(''),
    [status, setStatus] = React.useState(''),
    [revision, refresh] = React.useReducer((value) => value + 1, 0),
    [notice, setNotice] = React.useState('');
  const [houses, setHouses] = React.useState<House[]>([]),
    [catalogError, setCatalogError] = React.useState(false),
    [ready, setReady] = React.useState(false);
  React.useEffect(() => {
    const controller = new AbortController();
    setReady(false);
    setCatalogError(false);
    void apiJson<{ items: House[] }>('/houses', { signal: controller.signal })
      .then((result) => {
        if (!controller.signal.aborted) {
          setHouses(result.items);
          setReady(true);
        }
      })
      .catch(() => {
        if (!controller.signal.aborted) {
          setHouses([]);
          setCatalogError(true);
        }
      });
    return () => controller.abort();
  }, [revision]);
  const queryParams = new URLSearchParams();
  if (query.trim()) queryParams.set('search', query.trim());
  if (filter) queryParams.set('role', filter);
  if (status) queryParams.set('status', status);
  const accounts = useCursorPage<AccessAccount>(
    '/access/accounts?' + queryParams,
    revision,
    section === 'accounts',
  );
  const invitations = useCursorPage<AccessInvitation>(
    '/access/invitations',
    revision,
    section === 'invitations',
  );
  const history = useCursorPage<AccessHistory>('/access/history', revision, section === 'history');
  const [editing, setEditing] = useDialogState<AccessAccount | null>('access-edit', null, {
    encode: (value) => value?.uid ?? null,
    decode: (uid, signal) => apiJson('/access/accounts/' + encodeURIComponent(uid), { signal }),
  });
  const [target, setTarget] = useDialogState<AccessAccount | null>('access-status', null, {
    encode: (value) => value?.uid ?? null,
    decode: (uid, signal) => apiJson('/access/accounts/' + encodeURIComponent(uid), { signal }),
  });
  const [inviting, setInviting] = useDialogState('access-invite', false);
  const [cancel, setCancel] = useDialogState<AccessInvitation | null>(
    'access-invite-cancel',
    null,
    {
      encode: (value) => value?.id ?? null,
      decode: async (id, signal) =>
        apiJson('/access/invitations/' + encodeURIComponent(id), { signal }),
    },
  );
  const [share, setShare] = React.useState<{ code: string; invitation: AccessInvitation } | null>(
    null,
  );
  const clear = () => {
    setQuery('');
    setFilter('');
    setStatus('');
  };
  const saved = () => {
    refresh();
    setNotice(text('saved'));
    window.dispatchEvent(new Event('family-paws:access-changed'));
  };
  const open = async (account: AccessAccount, status = false) => {
    try {
      const fresh = await apiJson<AccessAccount>(
        '/access/accounts/' + encodeURIComponent(account.uid),
      );
      if (status) setTarget(fresh);
      else setEditing(fresh);
    } catch {
      setNotice(text('loadError'));
    }
  };
  const activePage =
    section === 'accounts' ? accounts : section === 'invitations' ? invitations : history;
  return (
    <section className="identity-access">
      <header className="iam-heading">
        <div>
          <h1>{text('title')}</h1>
          <p>{text('intro')}</p>
        </div>
        <div className="iam-actions">
          <Button variant="secondary" icon="reset" onClick={refresh}>
            {text('refresh')}
          </Button>
          <Button icon="plus" disabled={!ready} onClick={() => setInviting(true)}>
            {text('invite')}
          </Button>
        </div>
      </header>
      <p className="iam-service-note">{text('liveNote')}</p>
      <SegmentedTabs
        label={text('sections')}
        value={section}
        items={(['accounts', 'invitations', 'history'] as Section[]).map((value) => ({
          value,
          label: text(value),
          id: 'iam-tab-' + value,
          panelId: 'iam-panel-' + value,
        }))}
        onChange={(value) => updateQuery({ section: value === 'accounts' ? null : value })}
      />
      {notice && (
        <p className="iam-notice" role="status">
          {notice}
        </p>
      )}
      {catalogError && (
        <p role="alert">
          {text('loadError')}{' '}
          <Button variant="secondary" onClick={refresh}>
            {text('retry')}
          </Button>
        </p>
      )}
      <div
        role="tabpanel"
        id={'iam-panel-' + section}
        aria-labelledby={'iam-tab-' + section}
        tabIndex={0}
      >
        {section === 'accounts' && (
          <>
            <div className="iam-filters">
              <label>
                {text('search')}
                <SearchInput value={query} onChange={(event) => setQuery(event.target.value)} />
              </label>
              <label>
                {text('roles')}
                <CustomSelect value={filter} onChange={(event) => setFilter(event.target.value)}>
                  <option value="">{text('all')}</option>
                  {roles.map((role) => (
                    <option key={role} value={role}>
                      {text(role)}
                    </option>
                  ))}
                </CustomSelect>
              </label>
              <label>
                {text('status')}
                <CustomSelect value={status} onChange={(event) => setStatus(event.target.value)}>
                  <option value="">{text('allStatus')}</option>
                  {['active', 'suspended', 'disabled'].map((status) => (
                    <option key={status} value={status}>
                      {text(status)}
                    </option>
                  ))}
                </CustomSelect>
              </label>
            </div>
            <div className="iam-list-heading">
              <h2>{text('accounts')}</h2>
              {(query || filter || status) && (
                <Button variant="secondary" onClick={clear}>
                  {text('clear')}
                </Button>
              )}
            </div>
            <div className="iam-accounts">
              {accounts.items.map((account) => (
                <article className="iam-account" key={account.uid}>
                  <div className="iam-person">
                    <span className="iam-avatar" aria-hidden="true">
                      <Icon name="account" />
                    </span>
                    <div>
                      <h3>{account.name || account.email}</h3>
                      <p>{account.email}</p>
                      {account.uid === auth.currentUser?.uid && <small>{text('you')}</small>}
                    </div>
                  </div>
                  <div>
                    <span className="iam-field-label">{text('roles')}</span>
                    <RoleBadges value={account} />
                    <p className={'iam-state iam-state-' + account.status}>
                      {text(account.status)}
                    </p>
                  </div>
                  <div>
                    <span className="iam-field-label">{text('houses')}</span>
                    <p>
                      <Scope value={account} houses={houses} />
                    </p>
                  </div>
                  <div className="iam-row-actions">
                    <Button
                      variant="secondary"
                      icon="edit"
                      disabled={!ready || account.status === 'disabled'}
                      onClick={() => void open(account)}
                    >
                      {text('edit')}
                    </Button>
                    {account.uid !== auth.currentUser?.uid && account.status !== 'disabled' && (
                      <Button variant="secondary" onClick={() => void open(account, true)}>
                        {text(account.status === 'active' ? 'suspend' : 'restore')}
                      </Button>
                    )}
                  </div>
                </article>
              ))}
            </div>
            {!accounts.loading && !accounts.error && !accounts.items.length && (
              <div className="iam-empty">
                <p>{text('empty')}</p>
                {(query || filter || status) && (
                  <Button variant="secondary" onClick={clear}>
                    {text('clear')}
                  </Button>
                )}
              </div>
            )}
          </>
        )}
        {section === 'invitations' && (
          <section className="iam-invitations">
            <h2>{text('invitations')}</h2>
            <p>{text('inviteHelp')}</p>
            {!invitations.loading && !invitations.error && !invitations.items.length && (
              <p className="iam-empty">{text('noInvites')}</p>
            )}
            {invitations.items.map((invitation) => (
              <article className="iam-invite" key={invitation.id}>
                <div>
                  <h3>{invitation.email}</h3>
                  <p>
                    {text(invitation.status)} · {text('expires')}{' '}
                    {new Date(invitation.expiresAt).toLocaleString(localeFor())}
                  </p>
                  <RoleBadges value={invitation} />
                  <p>
                    <Scope value={invitation} houses={houses} />
                  </p>
                </div>
                {invitation.status === 'pending' && (
                  <Button variant="secondary" onClick={() => setCancel(invitation)}>
                    {text('cancelInvite')}
                  </Button>
                )}
              </article>
            ))}
          </section>
        )}
        {section === 'history' && (
          <section className="iam-history">
            <h2>{text('history')}</h2>
            {!history.loading && !history.error && !history.items.length && (
              <p className="iam-empty">{text('noHistory')}</p>
            )}
            {history.items.map((entry) => (
              <article key={entry.id}>
                <div className="iam-history-heading">
                  <strong>{text(entry.action)}</strong>
                  <time dateTime={entry.at}>{new Date(entry.at).toLocaleString(localeFor())}</time>
                </div>
                <p>
                  {entry.email} · {entry.actorEmail}
                </p>
                <div className="iam-history-diff">
                  {(
                    [
                      ['before', entry.before],
                      ['after', entry.after],
                    ] as const
                  ).map(
                    ([label, value]) =>
                      value && (
                        <div key={label}>
                          <strong>{text(label)}</strong>
                          <p>{text(value.status)}</p>
                          <RoleBadges value={value} />
                          <p>
                            <Scope value={value} houses={houses} />
                          </p>
                        </div>
                      ),
                  )}
                </div>
                {entry.reason && (
                  <p>
                    {text('reason')}: {entry.reason}
                  </p>
                )}
              </article>
            ))}
          </section>
        )}
        {activePage.loading && <p role="status">{text('loading')}</p>}
        <Pagination page={activePage} label={text(section)} />
      </div>
      <details className="iam-guide">
        <summary>{text('permissions')}</summary>
        <dl>
          {roles.map((role) => (
            <div key={role}>
              <dt>{text(role)}</dt>
              <dd>{text(role + 'Help')}</dd>
            </div>
          ))}
        </dl>
        <p>{text('guideNote')}</p>
      </details>
      {editing && ready && (
        <AccountEditor
          key={editing.uid}
          account={editing}
          houses={houses}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            saved();
          }}
        />
      )}
      {target && ready && (
        <AccountEditor
          key={target.uid}
          account={target}
          houses={houses}
          statusChange
          onClose={() => setTarget(null)}
          onSaved={() => {
            setTarget(null);
            saved();
          }}
        />
      )}
      {inviting && ready && (
        <InviteEditor
          houses={houses}
          onClose={() => setInviting(false)}
          onSaved={(invitation, code) => {
            setInviting(false);
            saved();
            setShare({ invitation, code });
          }}
        />
      )}
      {cancel && (
        <CancelInvitation
          invitation={cancel}
          onClose={() => setCancel(null)}
          onSaved={() => {
            setCancel(null);
            saved();
          }}
        />
      )}
      {share && <ShareInvitation value={share} onClose={() => setShare(null)} />}
    </section>
  );
}
function AccountEditor({
  account,
  houses,
  statusChange = false,
  onClose,
  onSaved,
}: {
  account: AccessAccount;
  houses: House[];
  statusChange?: boolean;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { i18n } = useTranslation();
  const [selection, setSelection] = React.useState<Selection>({
      roles: account.roles,
      houseIds: account.houseIds,
    }),
    [reason, setReason] = React.useState('');
  const mutation = useAccessMutation<AccessAccount>(onSaved);
  const operationId = React.useRef(crypto.randomUUID());
  const dirty =
    statusChange ||
    JSON.stringify(selection) !==
      JSON.stringify({ roles: account.roles, houseIds: account.houseIds }) ||
    !!reason;
  const nextStatus = statusChange
    ? account.status === 'active'
      ? 'suspended'
      : 'active'
    : account.status;
  const close = () => {
    if (!mutation.busy && confirmDiscardChanges(i18n.language)) onClose();
  };
  return (
    <Modal
      title={text(
        statusChange ? (account.status === 'active' ? 'suspend' : 'restore') : 'editTitle',
      )}
      onClose={close}
      disabled={mutation.busy}
    >
      <form
        className="iam-editor"
        onSubmit={(event) => {
          event.preventDefault();
          if (nextStatus === 'disabled') return;
          const body: AccessWrite = {
            ...selection,
            status: nextStatus,
            reason: reason.trim(),
            version: account.version,
            assignmentVersion: account.assignmentVersion,
            operationId: operationId.current,
          };
          if (dirty && reason.trim())
            void mutation.save(
              '/access/accounts/' + encodeURIComponent(account.uid),
              body,
              event.currentTarget,
            );
        }}
      >
        <UnsavedChanges active={dirty || mutation.uncertain} />
        <div>
          <h3>{account.name || account.email}</h3>
          <p>{account.email}</p>
        </div>
        <fieldset className="iam-form-fields" disabled={mutation.frozen}>
          {statusChange ? (
            <p>{text(account.status === 'active' ? 'suspendHelp' : 'restoreHelp')}</p>
          ) : (
            <Fields
              value={selection}
              houses={houses}
              protectAdmin={account.uid === auth.currentUser?.uid}
              onChange={setSelection}
            />
          )}
          <Summary value={{ ...selection, status: nextStatus }} houses={houses} />
          <label className="iam-input-label">
            {text('reason')}
            <textarea
              required
              maxLength={500}
              value={reason}
              onChange={(event) => setReason(event.target.value)}
            />
          </label>
          <small>{text('reasonHint')}</small>
        </fieldset>
        {mutation.error && <p role="alert">{mutation.error}</p>}
        <div className="iam-actions">
          <Button type="button" variant="secondary" disabled={mutation.busy} onClick={close}>
            {text('close')}
          </Button>
          <Button type="submit" disabled={mutation.busy || !dirty || !reason.trim()}>
            {text(
              mutation.busy
                ? 'saving'
                : mutation.uncertain
                  ? 'retry'
                  : statusChange
                    ? account.status === 'active'
                      ? 'confirmSuspend'
                      : 'confirmRestore'
                    : 'apply',
            )}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
function InviteEditor({
  houses,
  onClose,
  onSaved,
}: {
  houses: House[];
  onClose: () => void;
  onSaved: (invitation: AccessInvitation, code: string) => void;
}) {
  const { i18n } = useTranslation();
  const [email, setEmail] = React.useState(''),
    [selection, setSelection] = React.useState<Selection>({
      roles: ['employee', 'customer'],
      houseIds: [],
    });
  const secrets = React.useRef<{ operationId: string; code: string } | null>(null);
  if (!secrets.current) {
    const operationId = crypto.randomUUID();
    secrets.current = {
      operationId,
      code:
        operationId +
        '.' +
        Array.from(crypto.getRandomValues(new Uint8Array(24)), (value) =>
          value.toString(16).padStart(2, '0'),
        ).join(''),
    };
  }
  const mutation = useAccessMutation<AccessInvitation>((invitation) =>
    onSaved(invitation, secrets.current!.code),
  );
  const dirty =
    !!email || selection.roles.join() !== 'employee,customer' || !!selection.houseIds.length;
  const close = () => {
    if (!mutation.busy && confirmDiscardChanges(i18n.language)) onClose();
  };
  return (
    <Modal title={text('inviteTitle')} onClose={close} disabled={mutation.busy}>
      <form
        className="iam-editor"
        onSubmit={(event) => {
          event.preventDefault();
          const body: InvitationWrite = {
            email: email.trim().toLowerCase(),
            ...selection,
            ...secrets.current!,
          };
          void mutation.save('/access/invitations', body, event.currentTarget, 'POST');
        }}
      >
        <UnsavedChanges active={dirty || mutation.uncertain} />
        <p>{text('inviteHelp')}</p>
        <fieldset className="iam-form-fields" disabled={mutation.frozen}>
          <label className="iam-input-label">
            {text('email')}
            <input
              type="email"
              required
              maxLength={254}
              autoComplete="off"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          </label>
          <Fields value={selection} houses={houses} onChange={setSelection} />
          <Summary value={selection} houses={houses} />
        </fieldset>
        {mutation.error && <p role="alert">{mutation.error}</p>}
        <div className="iam-actions">
          <Button type="button" variant="secondary" disabled={mutation.busy} onClick={close}>
            {text('close')}
          </Button>
          <Button type="submit" disabled={mutation.busy}>
            {text(mutation.busy ? 'saving' : mutation.uncertain ? 'retry' : 'saveInvite')}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
function CancelInvitation({
  invitation,
  onClose,
  onSaved,
}: {
  invitation: AccessInvitation;
  onClose: () => void;
  onSaved: () => void;
}) {
  const mutation = useAccessMutation<AccessInvitation>(onSaved),
    operationId = React.useRef(crypto.randomUUID());
  return (
    <Modal title={text('cancelInvite')} onClose={onClose} disabled={mutation.busy}>
      <form
        className="iam-editor"
        onSubmit={(event) => {
          event.preventDefault();
          void mutation.save(
            '/access/invitations/' + invitation.id + '/cancel',
            { version: invitation.version, operationId: operationId.current },
            event.currentTarget,
            'POST',
          );
        }}
      >
        <UnsavedChanges active={mutation.uncertain} />
        <p>{invitation.email}</p>
        <p>{text('cancelHelp')}</p>
        {mutation.error && <p role="alert">{mutation.error}</p>}
        <div className="iam-actions">
          <Button type="button" variant="secondary" disabled={mutation.busy} onClick={onClose}>
            {text('close')}
          </Button>
          <Button type="submit" disabled={mutation.busy}>
            {text(mutation.busy ? 'saving' : mutation.uncertain ? 'retry' : 'cancelInvite')}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
function ShareInvitation({
  value,
  onClose,
}: {
  value: { code: string; invitation: AccessInvitation };
  onClose: () => void;
}) {
  const [copied, setCopied] = React.useState(false);
  return (
    <Modal title={text('shareTitle')} onClose={onClose}>
      <div className="iam-editor">
        <p>{value.invitation.email}</p>
        <p>{text('shareHelp')}</p>
        <label className="iam-input-label">
          {text('invitationCode')}
          <textarea readOnly value={value.code} onFocus={(event) => event.target.select()} />
        </label>
        <p>
          {text('expires')} {new Date(value.invitation.expiresAt).toLocaleString(localeFor())}
        </p>
        <p>
          {text('shareDestination')}{' '}
          <a href="/app/account/profile/?dialog.access-accept=true">{text('acceptInvitation')}</a>
        </p>
        <div className="iam-actions">
          <Button
            variant="secondary"
            onClick={() => {
              void navigator.clipboard
                .writeText(value.code)
                .then(() => setCopied(true))
                .catch(() => setCopied(false));
            }}
          >
            {text(copied ? 'copied' : 'copy')}
          </Button>
          <Button onClick={onClose}>{text('done')}</Button>
        </div>
      </div>
    </Modal>
  );
}
