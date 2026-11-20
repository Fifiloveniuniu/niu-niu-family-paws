import Button from './button';
import {
  englishCatalog,
  languageName,
  localeFor,
  profileLanguage,
  supportedLanguages,
  uiText,
  uiValue,
} from './i18n.ts';
import CustomSelect from './custom-select';
import { ApiError, apiOptionalJson, apiJson } from './api-client';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { auth } from './auth-client';
import Pets from './pets';
import UnsavedChanges, { confirmDiscardChanges } from './unsaved-changes';
import { AccountLinkRequest } from './account-link';
import type { components, operations } from '../../../packages/contracts/generated';

type Customer = components['schemas']['Customer'];
type ProfileWrite = components['schemas']['ProfileWrite'];
type AccountIdentity =
  operations['getSignedInIdentity']['responses'][200]['content']['application/json'];
const englishMessages = englishCatalog['ui.profile.labels'];

function profileRequest(input?: ProfileWrite): Promise<Customer | null> {
  return apiOptionalJson<Customer>('/profile', { body: input });
}
export default function Profile({
  onSaved,
  showPets = true,
  showHeading = true,
}: {
  onSaved: () => void;
  showPets?: boolean;
  showHeading?: boolean;
}) {
  const { i18n } = useTranslation();
  const labels = uiValue('ui.profile.labels', i18n.language);
  const [roles, setRoles] = React.useState<('admin' | 'employee' | 'customer')[] | null>(null);
  const [rolesError, setRolesError] = React.useState(false);
  const [profile, setProfile] = React.useState<Customer | null>(null);
  const [input, setInput] = React.useState<ProfileWrite>({
    name: '',
    language: profileLanguage(i18n.language),
    version: 0,
  });
  const [loaded, setLoaded] = React.useState(false);
  const [linkPending, setLinkPending] = React.useState(false);
  const baseline = React.useRef('');
  const form = React.useRef<HTMLFormElement>(null);
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [uncertain, setUncertain] = React.useState(false);
  const [saved, setSaved] = React.useState(false);
  const [error, setError] = React.useState<keyof typeof englishMessages | null>(null);
  const alive = React.useRef(true);
  function report(event: unknown) {
    const status = event instanceof ApiError ? event.status : 0;
    setError(
      status === 409
        ? 'conflict'
        : status === 401 || status === 403
          ? 'forbidden'
          : status === 400
            ? 'invalid'
            : 'error',
    );
  }
  async function load() {
    setLoading(true);
    setError(null);
    setSaved(false);
    try {
      const current = await profileRequest();
      if (!alive.current) return;
      setProfile(current);
      const next = current
        ? { name: current.name, language: current.language, version: current.version }
        : {
            name: '',
            language: profileLanguage(i18n.language),
            version: 0,
          };
      baseline.current = JSON.stringify(next);
      setInput(next);
      setLoaded(true);
      setUncertain(false);
    } catch (e) {
      if (alive.current) report(e);
    } finally {
      if (alive.current) setLoading(false);
    }
  }
  React.useEffect(() => {
    alive.current = true;
    let roleRequest = 0;
    function refreshRoles() {
      if (document.visibilityState !== 'visible') return;
      const request = ++roleRequest;
      setRoles(null);
      setRolesError(false);
      void apiJson<AccountIdentity>('/identity')
        .then((identity) => {
          if (alive.current && request === roleRequest) setRoles(identity.roles);
        })
        .catch(() => {
          if (alive.current && request === roleRequest) setRolesError(true);
        });
    }
    refreshRoles();
    document.addEventListener('visibilitychange', refreshRoles);
    void load();
    return () => {
      alive.current = false;
      roleRequest++;
      document.removeEventListener('visibilitychange', refreshRoles);
    };
  }, []);
  async function save(event: React.FormEvent) {
    event.preventDefault();
    if (saving || loading || !loaded) return;
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      const current = await profileRequest(input);
      if (!alive.current) return;
      if (!current) throw new Error('Missing saved profile');
      const next = { name: current.name, language: current.language, version: current.version };
      baseline.current = JSON.stringify(next);
      setProfile(current);
      setInput(next);
      setUncertain(false);
      setSaved(true);
      onSaved();
    } catch (e) {
      if (alive.current) {
        report(e);
        setUncertain(!(e instanceof ApiError) || e.status >= 500);
      }
    } finally {
      if (alive.current) setSaving(false);
    }
  }
  return (
    <section
      className="customer-section profile-section"
      aria-labelledby="profile-title"
      aria-busy={loading || saving}
    >
      {showHeading ? (
        <h1 id="profile-title">{labels.title}</h1>
      ) : (
        <span id="profile-title" className="sr-only">
          {labels.title}
        </span>
      )}
      <p>{labels.intro}</p>
      {rolesError && <p role="status">{labels.rolesUnavailable}</p>}
      {roles && (
        <div className="profile-roles" aria-label={labels.roles}>
          <strong>{labels.roles}</strong>
          <ul>
            {roles.map((role) => (
              <li key={role}>{labels[role]}</li>
            ))}
          </ul>
          <p>{labels.roleIdentity}</p>
        </div>
      )}
      {loading && <p role="status">{labels.loading}</p>}
      {error && <p role="alert">{labels[error]}</p>}
      {saved && <p role="status">{labels.saved}</p>}
      {loaded && (
        <>
          {!profile && (
            <AccountLinkRequest
              onPending={setLinkPending}
              onLinked={() => {
                if (confirmDiscardChanges(i18n.language, form.current)) void load();
              }}
            />
          )}
          {!profile && !linkPending && <p>{labels.setup}</p>}
          <p className="profile-identity">
            <span>{labels.loginEmail}</span>
            <strong>{profile?.loginEmail ?? auth.currentUser?.email}</strong>
          </p>
          <p className="customer-intro">{labels.identity}</p>
          <form
            ref={form}
            hidden={linkPending}
            className="customer-form"
            onSubmit={(event) => void save(event)}
          >
            <UnsavedChanges
              active={loaded && (JSON.stringify(input) !== baseline.current || saving || uncertain)}
            />
            <fieldset disabled={saving || loading || uncertain || error === 'forbidden'}>
              <label>
                {labels.name}
                <input
                  name="profile-name"
                  autoComplete="name"
                  required
                  maxLength={120}
                  value={input.name}
                  onChange={(event) => {
                    setInput({ ...input, name: event.target.value });
                    setSaved(false);
                  }}
                />
              </label>
              <label>
                {labels.language}
                <CustomSelect
                  value={input.language}
                  onChange={(event) => {
                    setInput({ ...input, language: event.target.value });
                    setSaved(false);
                  }}
                >
                  {supportedLanguages.map(({ code, name, htmlLang }) => (
                    <option key={code} value={code} lang={htmlLang}>
                      {name}
                    </option>
                  ))}
                </CustomSelect>
              </label>
            </fieldset>
            <Button
              icon="check"
              variant="primary"
              disabled={saving || loading || error === 'conflict' || error === 'forbidden'}
              type="submit"
            >
              {saving ? labels.saving : uncertain ? labels.retry : labels.save}
            </Button>
          </form>
          {profile && showPets && <Pets key={profile.id} customerId={profile.id} />}
        </>
      )}
      {(error === 'error' || error === 'conflict') && !uncertain && (
        <Button
          icon="reset"
          variant="secondary"
          disabled={loading || saving || uncertain}
          onClick={() => {
            if (confirmDiscardChanges(i18n.language, form.current)) void load();
          }}
        >
          {labels.reload}
        </Button>
      )}
    </section>
  );
}
