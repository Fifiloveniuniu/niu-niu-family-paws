import React from 'react';
import { useTranslation } from 'react-i18next';
import { localeFor, uiText } from './i18n';
import Button from './button';
import IconButton from './icon-button';
import Icon from './icons';
import Modal from './modal';
import SearchInput from './search-input';
import CustomSelect from './custom-select';
import SegmentedTabs from './segmented-tabs';
import { useDialogState } from './dialog-routing';
import { currentRoute, updateQuery } from './routing';
import UnsavedChanges, { confirmDiscardChanges } from './unsaved-changes';
import {
  accessRoles,
  previewAccounts,
  previewActor,
  normalizeAccess,
  accountChangeError,
  inviteError,
  type PreviewAccount,
  type PreviewInvite,
  type AccessRole,
} from './access-preview';
import './identity-access.css';

const text = (key: string) => uiText('ui.identityAccess.' + key);
type AccessSelection = { roles: AccessRole[]; houses: number[] };
type HistoryEntry = {
  id: string;
  time: string;
  action: string;
  email: string;
  before?: PreviewAccount | PreviewInvite;
  after: PreviewAccount | PreviewInvite;
  reason?: string;
};
type Section = 'accounts' | 'invitations' | 'history';
const accountName = (account: PreviewAccount) => text(account.name);
function RoleBadges({ roles }: { roles: AccessRole[] }) {
  return (
    <div className="iam-badges">
      {roles.map((role) => (
        <span key={role}>{text(role)}</span>
      ))}
    </div>
  );
}
function HouseAccess({ value }: { value: AccessSelection }) {
  return (
    <>
      {value.roles.includes('admin')
        ? text('allHouses')
        : value.roles.includes('employee')
          ? value.houses.map((house) => text('sampleHouse') + ' ' + house).join(', ') ||
            text('noAccess')
          : text('own')}
    </>
  );
}
function AccessSummary({ value }: { value: AccessSelection & { status?: string } }) {
  return (
    <aside className="iam-summary">
      <strong>{text('effective')}</strong>
      {value.status === 'suspended' ? (
        <p>{text('suspendedSummary')}</p>
      ) : (
        <ul>
          {value.roles.includes('admin') && <li>{text('adminWarning')}</li>}
          {value.roles.includes('employee') && (
            <li>
              {text('employeeSummary')}{' '}
              <HouseAccess
                value={value.roles.includes('admin') ? { ...value, roles: ['employee'] } : value}
              />
            </li>
          )}
          {value.roles.includes('customer') && <li>{text('ownSummary')}</li>}
        </ul>
      )}
    </aside>
  );
}
function AccessFields({
  value,
  onChange,
  protectAdmin = false,
}: {
  value: AccessSelection;
  onChange: (value: AccessSelection) => void;
  protectAdmin?: boolean;
}) {
  return (
    <>
      <fieldset>
        <legend>{text('roles')}</legend>
        <p>{text('roleHelp')}</p>
        {accessRoles.map((role) => (
          <label className="iam-role-choice" key={role}>
            <input
              type="checkbox"
              checked={value.roles.includes(role)}
              disabled={role === 'admin' && protectAdmin}
              onChange={(event) =>
                onChange(
                  normalizeAccess({
                    ...value,
                    roles: event.target.checked
                      ? [...value.roles, role]
                      : value.roles.filter((item) => item !== role),
                  }),
                )
              }
            />
            <span>
              <strong>{text(role)}</strong>
              <small>{text(role + 'Help')}</small>
            </span>
          </label>
        ))}
        {protectAdmin && <p>{text('selfProtection')}</p>}
      </fieldset>
      {value.roles.includes('employee') && (
        <fieldset>
          <legend>{text('houses')}</legend>
          <p>{text('houseHelp')}</p>
          {[1, 2].map((house) => (
            <label className="iam-house-choice" key={house}>
              <input
                type="checkbox"
                checked={value.houses.includes(house)}
                onChange={(event) =>
                  onChange({
                    ...value,
                    houses: event.target.checked
                      ? [...value.houses, house]
                      : value.houses.filter((item) => item !== house),
                  })
                }
              />
              {text('sampleHouse')} {house}
            </label>
          ))}
          {!value.houses.length && <p className="iam-warning">{text('noHouseWarning')}</p>}
        </fieldset>
      )}
      {!value.roles.length && <p role="alert">{text('chooseRole')}</p>}
    </>
  );
}
export default function IdentityAccess() {
  const { i18n } = useTranslation();
  const [accounts, setAccounts] = React.useState(previewAccounts);
  const [invites, setInvites] = React.useState<PreviewInvite[]>([]);
  const [history, setHistory] = React.useState<HistoryEntry[]>([]);
  const params = new URLSearchParams(currentRoute().search);
  const section: Section =
    params.get('section') === 'invitations'
      ? 'invitations'
      : params.get('section') === 'history'
        ? 'history'
        : 'accounts';
  const [query, setQuery] = React.useState('');
  const [filter, setFilter] = React.useState('');
  const [status, setStatus] = React.useState('');
  const [notice, setNotice] = React.useState('');
  const [editing, setEditing] = useDialogState<string | null>('access-preview', null, {
    encode: (value) => value,
    decode: (value) => {
      if (!previewAccounts.some((account) => account.id === value))
        throw Error('Unavailable example');
      return value;
    },
  });
  const [inviting, setInviting] = useDialogState('access-invite', false);
  const showInvitations = React.useRef(false);
  React.useEffect(() => {
    if (!inviting && showInvitations.current) {
      showInvitations.current = false;
      updateQuery({ section: 'invitations' });
    }
  }, [inviting]);
  const [statusTarget, setStatusTarget] = useDialogState<string | null>('access-status', null, {
    encode: (value) => value,
    decode: (value) => {
      if (!previewAccounts.some((account) => account.id === value))
        throw Error('Unavailable example');
      return value;
    },
  });
  const [resetting, setResetting] = useDialogState('access-reset', false);
  const selected = accounts.find((account) => account.id === editing);
  const target = accounts.find((account) => account.id === statusTarget);
  const matching = accounts.filter(
    (account) =>
      (!filter || account.roles.includes(filter as AccessRole)) &&
      (!status || account.status === status) &&
      (accountName(account) + ' ' + account.email)
        .toLowerCase()
        .includes(query.trim().toLowerCase()),
  );
  const clear = () => {
    setQuery('');
    setFilter('');
    setStatus('');
  };
  function record(
    action: string,
    after: PreviewAccount | PreviewInvite,
    before?: PreviewAccount | PreviewInvite,
    reason?: string,
  ) {
    setHistory((current) => [
      {
        id: crypto.randomUUID(),
        time: new Date().toISOString(),
        action,
        email: after.email,
        before,
        after,
        reason,
      },
      ...current,
    ]);
  }
  function changeAccount(next: PreviewAccount, reason?: string) {
    const error = accountChangeError(accounts, next);
    if (error) {
      setNotice(text(error));
      return;
    }
    const before = accounts.find((account) => account.id === next.id)!;
    setAccounts((current) => current.map((item) => (item.id === next.id ? next : item)));
    record(before.status === next.status ? 'accessChanged' : next.status, next, before, reason);
    setEditing(null);
    setStatusTarget(null);
    setNotice(text(before.status === next.status ? 'updated' : 'statusUpdated'));
  }
  return (
    <section className="identity-access">
      <header className="iam-heading">
        <div>
          <h1>{text('title')}</h1>
          <p>{text('intro')}</p>
        </div>
        <div className="iam-actions">
          <IconButton
            title={text('reset')}
            aria-label={text('reset')}
            onClick={() => setResetting(true)}
          >
            <Icon name="reset" />
          </IconButton>
          <Button icon="plus" onClick={() => setInviting(true)}>
            {text('invite')}
          </Button>
        </div>
      </header>
      <aside className="iam-draft">
        <strong>{text('draft')}</strong>
        <p>{text('draftNote')}</p>
      </aside>
      <dl className="iam-stats">
        {(['active', 'admin', 'employee', 'suspended'] as const).map((kind) => (
          <div key={kind}>
            <dt>{text(kind)}</dt>
            <dd>
              {
                accounts.filter((account) =>
                  kind === 'active' || kind === 'suspended'
                    ? account.status === kind
                    : account.status === 'active' && account.roles.includes(kind),
                ).length
              }
            </dd>
          </div>
        ))}
      </dl>
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
                  {accessRoles.map((role) => (
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
                  {['active', 'suspended'].map((value) => (
                    <option key={value} value={value}>
                      {text(value)}
                    </option>
                  ))}
                </CustomSelect>
              </label>
            </div>
            <div className="iam-list-heading">
              <h2>
                {text('resultCount')} <small>({matching.length})</small>
              </h2>
              {(query || filter || status) && (
                <Button variant="secondary" onClick={clear}>
                  {text('clear')}
                </Button>
              )}
            </div>
            <div className="iam-accounts">
              {matching.map((account) => (
                <article className="iam-account" key={account.id}>
                  <div className="iam-person">
                    <span className="iam-avatar" aria-hidden="true">
                      <Icon name="account" />
                    </span>
                    <div>
                      <h3>{accountName(account)}</h3>
                      <p>{account.email}</p>
                      <small>{account.id === previewActor ? text('you') : text('verified')}</small>
                    </div>
                  </div>
                  <div>
                    <span className="iam-field-label">{text('roles')}</span>
                    <RoleBadges roles={account.roles} />
                    <p className={'iam-state iam-state-' + account.status}>
                      {text(account.status)}
                    </p>
                  </div>
                  <div>
                    <span className="iam-field-label">{text('houses')}</span>
                    <p>
                      {account.status === 'suspended' ? (
                        text('suspendedSummary')
                      ) : (
                        <HouseAccess value={account} />
                      )}
                    </p>
                  </div>
                  <div className="iam-row-actions">
                    <Button variant="secondary" icon="edit" onClick={() => setEditing(account.id)}>
                      {text('edit')}
                    </Button>
                    {account.id !== previewActor && (
                      <Button variant="secondary" onClick={() => setStatusTarget(account.id)}>
                        {text(account.status === 'active' ? 'suspend' : 'restore')}
                      </Button>
                    )}
                  </div>
                </article>
              ))}
            </div>
            {!matching.length && (
              <div className="iam-empty">
                <p>{text('empty')}</p>
                <Button variant="secondary" onClick={clear}>
                  {text('clear')}
                </Button>
              </div>
            )}
          </>
        )}
        {section === 'invitations' && (
          <section className="iam-invitations">
            <h2>{text('invitations')}</h2>
            {!invites.length && <p className="iam-empty">{text('noInvites')}</p>}
            {invites.map((invite) => (
              <article className="iam-invite" key={invite.id}>
                <div>
                  <h3>{invite.email}</h3>
                  <p>{text(invite.status === 'draft' ? 'draftStatus' : 'cancelled')}</p>
                  <RoleBadges roles={invite.roles} />
                  <p>
                    <HouseAccess value={invite} />
                  </p>
                </div>
                {invite.status === 'draft' && (
                  <Button
                    variant="secondary"
                    onClick={() => {
                      const after: PreviewInvite = { ...invite, status: 'cancelled' };
                      setInvites((current) =>
                        current.map((item) => (item.id === invite.id ? after : item)),
                      );
                      record('invitationCancelled', after, invite);
                      setNotice(text('inviteCancelled'));
                    }}
                  >
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
            <p>{text('previewHistory')}</p>
            {!history.length && <p className="iam-empty">{text('noHistory')}</p>}
            {history.map((entry) => (
              <article key={entry.id}>
                <div className="iam-history-heading">
                  <strong>{text(entry.action)}</strong>
                  <time dateTime={entry.time}>
                    {new Intl.DateTimeFormat(localeFor(), {
                      dateStyle: 'medium',
                      timeStyle: 'short',
                    }).format(new Date(entry.time))}
                  </time>
                </div>
                <p>
                  {entry.email} · {text('actor')}
                </p>
                <div className="iam-history-diff">
                  {entry.before && (
                    <div>
                      <strong>{text('before')}</strong>
                      <p>
                        {text(
                          entry.before.status === 'draft' ? 'draftStatus' : entry.before.status,
                        )}
                      </p>
                      <RoleBadges roles={entry.before.roles} />
                      <p>
                        <HouseAccess value={entry.before} />
                      </p>
                    </div>
                  )}
                  <div>
                    <strong>{text('after')}</strong>
                    <p>
                      {text(entry.after.status === 'draft' ? 'draftStatus' : entry.after.status)}
                    </p>
                    <RoleBadges roles={entry.after.roles} />
                    <p>
                      <HouseAccess value={entry.after} />
                    </p>
                  </div>
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
      </div>
      <details className="iam-guide">
        <summary>{text('permissions')}</summary>
        <dl>
          {accessRoles.map((role) => (
            <div key={role}>
              <dt>{text(role)}</dt>
              <dd>{text(role + 'Help')}</dd>
            </div>
          ))}
        </dl>
        <p>{text('guideNote')}</p>
      </details>
      {selected && (
        <AccessEditor
          key={selected.id}
          account={selected}
          accounts={accounts}
          onClose={() => setEditing(null)}
          onApply={changeAccount}
        />
      )}
      {inviting && (
        <InviteEditor
          accounts={accounts}
          invites={invites}
          onClose={() => setInviting(false)}
          onApply={(value) => {
            const invite: PreviewInvite = {
              ...normalizeAccess(value),
              id: crypto.randomUUID(),
              status: 'draft',
            };
            setInvites((current) => [invite, ...current]);
            record('invitationCreated', invite);
            showInvitations.current = true;
            setInviting(false);
            setNotice(text('inviteSaved'));
          }}
        />
      )}
      {target && (
        <StatusEditor
          key={target.id}
          account={target}
          accounts={accounts}
          onClose={() => setStatusTarget(null)}
          onApply={changeAccount}
        />
      )}
      {resetting && (
        <Modal title={text('resetTitle')} onClose={() => setResetting(false)}>
          <p>{text('resetHelp')}</p>
          <div className="iam-actions">
            <Button variant="secondary" onClick={() => setResetting(false)}>
              {text('close')}
            </Button>
            <Button
              onClick={() => {
                if (!confirmDiscardChanges(i18n.language)) return;
                setAccounts(previewAccounts);
                setInvites([]);
                setHistory([]);
                clear();
                setEditing(null);
                setStatusTarget(null);
                setInviting(false);
                setResetting(false);
                setNotice(text('resetDone'));
              }}
            >
              {text('resetConfirm')}
            </Button>
          </div>
        </Modal>
      )}
    </section>
  );
}
function AccessEditor({
  account,
  accounts,
  onClose,
  onApply,
}: {
  account: PreviewAccount;
  accounts: PreviewAccount[];
  onClose: () => void;
  onApply: (account: PreviewAccount) => void;
}) {
  const { i18n } = useTranslation();
  const [draft, setDraft] = React.useState(account);
  const normalized = normalizeAccess(draft);
  const dirty = JSON.stringify(normalizeAccess(account)) !== JSON.stringify(normalized);
  const error = accountChangeError(accounts, normalized);
  const close = () => {
    if (confirmDiscardChanges(i18n.language)) onClose();
  };
  return (
    <Modal title={text('editTitle')} onClose={close}>
      <form
        className="iam-editor"
        onSubmit={(event) => {
          event.preventDefault();
          if (dirty && !error) onApply(normalized);
        }}
      >
        <UnsavedChanges active={dirty} />
        <div>
          <h3>{accountName(account)}</h3>
          <p>{account.email}</p>
        </div>
        <AccessFields
          value={draft}
          protectAdmin={account.id === previewActor}
          onChange={(value) => setDraft({ ...draft, ...value })}
        />
        <AccessSummary value={normalized} />
        {error && <p role="alert">{text(error)}</p>}
        <div className="iam-actions">
          <Button type="button" variant="secondary" onClick={close}>
            {text('close')}
          </Button>
          <Button type="submit" disabled={!dirty || !!error}>
            {text('apply')}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
function InviteEditor({
  accounts,
  invites,
  onClose,
  onApply,
}: {
  accounts: PreviewAccount[];
  invites: PreviewInvite[];
  onClose: () => void;
  onApply: (value: AccessSelection & { email: string }) => void;
}) {
  const { i18n } = useTranslation();
  const [email, setEmail] = React.useState('');
  const [value, setValue] = React.useState<AccessSelection>({ roles: ['employee'], houses: [] });
  const [submitted, setSubmitted] = React.useState(false);
  const error =
    inviteError(email, accounts, invites) || (!value.roles.length ? 'chooseRole' : null);
  const dirty = !!email || value.roles.join() !== 'employee' || !!value.houses.length;
  const close = () => {
    if (confirmDiscardChanges(i18n.language)) onClose();
  };
  return (
    <Modal title={text('inviteTitle')} onClose={close}>
      <form
        className="iam-editor"
        onSubmit={(event) => {
          event.preventDefault();
          setSubmitted(true);
          if (!error) onApply({ ...normalizeAccess(value), email: email.trim().toLowerCase() });
        }}
      >
        <UnsavedChanges active={dirty} />
        <p>{text('inviteHelp')}</p>
        <label className="iam-input-label">
          {text('email')}
          <input
            type="email"
            value={email}
            required
            maxLength={254}
            autoComplete="off"
            aria-invalid={submitted && !!error}
            aria-describedby={submitted && error ? 'iam-invite-error' : undefined}
            onChange={(event) => setEmail(event.target.value)}
          />
        </label>
        <AccessFields value={value} onChange={setValue} />
        <AccessSummary value={value} />
        {submitted && error && (
          <p id="iam-invite-error" role="alert">
            {text(error)}
          </p>
        )}
        <div className="iam-actions">
          <Button type="button" variant="secondary" onClick={close}>
            {text('close')}
          </Button>
          <Button type="submit" disabled={!value.roles.length}>
            {text('saveInvite')}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
function StatusEditor({
  account,
  accounts,
  onClose,
  onApply,
}: {
  account: PreviewAccount;
  accounts: PreviewAccount[];
  onClose: () => void;
  onApply: (account: PreviewAccount, reason: string) => void;
}) {
  const { i18n } = useTranslation();
  const [reason, setReason] = React.useState('');
  const next: PreviewAccount = {
    ...account,
    status: account.status === 'active' ? 'suspended' : 'active',
  };
  const error = accountChangeError(accounts, next);
  const close = () => {
    if (confirmDiscardChanges(i18n.language)) onClose();
  };
  return (
    <Modal title={text(account.status === 'active' ? 'suspend' : 'restore')} onClose={close}>
      <form
        className="iam-editor"
        onSubmit={(event) => {
          event.preventDefault();
          if (!error && reason.trim()) onApply(next, reason.trim());
        }}
      >
        <UnsavedChanges active={!!reason} />
        <div>
          <h3>{accountName(account)}</h3>
          <p>{account.email}</p>
        </div>
        <p>{text(account.status === 'active' ? 'suspendHelp' : 'restoreHelp')}</p>
        <AccessSummary value={next} />
        <label className="iam-input-label">
          {text('reason')}
          <textarea
            required
            maxLength={500}
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            aria-describedby="iam-reason-hint"
          />
        </label>
        <small id="iam-reason-hint">{text('reasonHint')}</small>
        {error && <p role="alert">{text(error)}</p>}
        <div className="iam-actions">
          <Button type="button" variant="secondary" onClick={close}>
            {text('close')}
          </Button>
          <Button type="submit" disabled={!!error || !reason.trim()}>
            {text(account.status === 'active' ? 'confirmSuspend' : 'confirmRestore')}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
