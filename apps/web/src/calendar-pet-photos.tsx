import { apiResponse } from './api-client';
import React from 'react';
import { useTranslation } from 'react-i18next';
import {
  onIdTokenChanged,
  browserSessionPersistence,
  setPersistence,
  signInWithPopup,
  GoogleAuthProvider,
  type User,
} from 'firebase/auth';
import { auth } from './auth-client';
import { hasAdminAccess } from './admin-access';
import type { components } from '../../../packages/contracts/generated';
type Pet = components['schemas']['Pet'];
type Photo = { status: 'ready' | 'missing' | 'failed'; url?: string; profile?: Pet };
const Photos = React.createContext<Record<string, Photo>>({});
type Access = 'checking' | 'sign-in' | 'admin' | 'ready';
const PhotoAccess = React.createContext<{
  status: Access;
  connect: () => void;
  busy: boolean;
  error: boolean;
}>({ status: 'checking', connect: () => {}, busy: false, error: false });
const RetryPhotos = React.createContext<() => void>(() => {});
// Explicit links between synthetic calendar aliases and existing isolated demo
// profiles. These are never real customer identities or production photo IDs.
export const calendarPhotoFixtures = [
  { name: 'Mochi', species: 'dog', family: 0 },
  { name: 'Biscuit', species: 'dog', family: 1 },
  { name: 'Luna', species: 'dog', family: 2 },
  { name: 'Oliver', species: 'cat', family: 0 },
  { name: 'Coco', species: 'cat', family: 1 },
  { name: 'Pip', species: 'rabbit', family: 0 },
  { name: 'Maple', species: 'dog', family: 3 },
  { name: 'Teddy', species: 'dog', family: 4 },
  { name: 'Nori', species: 'cat', family: 2 },
  { name: 'Willow', species: 'dog', family: 5 },
  { name: 'Pebble', species: 'rabbit', family: 1 },
  { name: 'Miso', species: 'cat', family: 3 },
] as const;
export async function demoProfileId(label: string) {
  const hash = [
    ...new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(label))),
  ]
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
  return `${hash.slice(0, 8)}-${hash.slice(8, 12)}-4${hash.slice(13, 16)}-a${hash.slice(17, 20)}-${hash.slice(20, 32)}`;
}
export function CalendarPhotoProvider({ children }: { children: React.ReactNode }) {
  const [photos, setPhotos] = React.useState<Record<string, Photo>>({});
  const [retry, setRetry] = React.useState(0);
  const [access, setAccess] = React.useState<Access>('checking');
  const [busy, setBusy] = React.useState(false);
  const [signInError, setSignInError] = React.useState(false);
  async function connect() {
    setBusy(true);
    setSignInError(false);
    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      await setPersistence(auth, browserSessionPersistence);
      await signInWithPopup(auth, provider);
      setRetry((value) => value + 1);
    } catch (e) {
      if (
        !['auth/popup-closed-by-user', 'auth/cancelled-popup-request'].includes(
          (e as { code: string }).code,
        )
      )
        setSignInError(true);
    } finally {
      setBusy(false);
    }
  }
  React.useEffect(() => {
    if (import.meta.env.MODE !== 'test' || auth.app.options.projectId !== 'demo-niu-niu') return;
    let generation = 0;
    let controller: AbortController | undefined;
    const urls = new Set<string>();
    const clear = () => {
      controller?.abort();
      for (const url of urls) URL.revokeObjectURL(url);
      urls.clear();
      setPhotos({});
    };
    async function load(user: User | null, force = false) {
      const request = ++generation;
      clear();
      setAccess('checking');
      if (!user) {
        setAccess('sign-in');
        return;
      }
      controller = new AbortController();
      const signal = controller.signal;
      try {
        const token = await user.getIdTokenResult(force);
        if (request !== generation) return;
        if (!hasAdminAccess(token.claims)) {
          setAccess('admin');
          return;
        }
        setAccess('ready');
        const get = (path: string) => apiResponse(path, { token: token.token, signal });
        const publish = (name: string, photo: Photo) => {
          if (request === generation && !signal.aborted)
            setPhotos((previous) => ({ ...previous, [name]: photo }));
        };
        await Promise.all(
          [...new Set(calendarPhotoFixtures.map((p) => p.family))].map(async (family) => {
            const fixtures = calendarPhotoFixtures.filter((p) => p.family === family);
            try {
              const customerId = await demoProfileId('local-photo-customer-' + family);
              const page: components['schemas']['PetPage'] = await (
                await get(`/customers/${customerId}/pets`)
              ).json();
              await Promise.all(
                fixtures.map(async (fixture) => {
                  const id = await demoProfileId(`local-photo-${fixture.species}-${family}`);
                  const profile = page.items.find(
                    (p) => p.id === id && p.customerId === customerId,
                  );
                  if (!profile?.photo) {
                    publish(fixture.name, { status: 'missing', profile });
                    return;
                  }
                  try {
                    const response = await get(`/customers/${customerId}/pets/${id}/photo`);
                    if (!response.headers.get('content-type')?.startsWith('image/'))
                      throw Error('Invalid photo');
                    const blob = await response.blob();
                    if (request !== generation || signal.aborted) return;
                    const url = URL.createObjectURL(blob);
                    urls.add(url);
                    publish(fixture.name, { status: 'ready', url, profile });
                  } catch {
                    publish(fixture.name, { status: 'failed', profile });
                  }
                }),
              );
            } catch {
              for (const fixture of fixtures) publish(fixture.name, { status: 'failed' });
            }
          }),
        );
      } catch {
        if (request === generation) setAccess('sign-in');
      }
    }
    const unsubscribe = onIdTokenChanged(auth, (user) => {
      void load(user);
    });
    const refresh = () => {
      if (document.visibilityState === 'visible') void load(auth.currentUser, true);
    };
    document.addEventListener('visibilitychange', refresh);
    return () => {
      ++generation;
      unsubscribe();
      document.removeEventListener('visibilitychange', refresh);
      controller?.abort();
      for (const url of urls) URL.revokeObjectURL(url);
      urls.clear();
    };
  }, [retry]);
  return (
    <PhotoAccess.Provider
      value={{ status: access, connect: () => void connect(), busy, error: signInError }}
    >
      <RetryPhotos.Provider value={() => setRetry((value) => value + 1)}>
        <Photos.Provider value={photos}>{children}</Photos.Provider>
      </RetryPhotos.Provider>
    </PhotoAccess.Provider>
  );
}
export function PhotoSignIn() {
  const { i18n } = useTranslation();
  const isChinese = i18n.language === 'zh';
  const { status, connect, busy, error } = React.useContext(PhotoAccess);
  if (import.meta.env.MODE !== 'test' || status === 'ready' || status === 'checking') return null;
  return (
    <div className="hc-photo-access">
      <p>
        {status === 'admin'
          ? isChinese
            ? '需要管理员登录才能查看私密宠物照片。'
            : 'Administrator sign-in is required for private pet photos.'
          : isChinese
            ? '登录后查看已保存的宠物照片，当前表单会保留。'
            : 'Sign in to view saved pet photos. Your open form will stay here.'}
      </p>
      <button type="button" className="hc-photo-retry" disabled={busy} onClick={connect}>
        {busy
          ? isChinese
            ? '正在连接…'
            : 'Connecting…'
          : isChinese
            ? '登录查看照片'
            : 'Sign in for pet photos'}
      </button>
      {error && (
        <p role="alert">
          {isChinese
            ? '无法登录，请重试并允许登录弹窗。'
            : 'Sign-in failed. Try again and allow the sign-in popup.'}
        </p>
      )}
    </div>
  );
}
export function PetProfileAvatar({ name, className = '' }: { name: string; className?: string }) {
  const { i18n } = useTranslation();
  const isChinese = i18n.language === 'zh';
  const photo = React.useContext(Photos)[name];
  const access = React.useContext(PhotoAccess).status;
  const [broken, setBroken] = React.useState(false);
  React.useEffect(() => setBroken(false), [photo?.url]);
  const ready = photo?.status === 'ready' && !broken;
  const title = photo?.profile
    ? (isChinese ? `档案：${photo.profile.name}` : `Profile: ${photo.profile.name}`) +
      (photo.profile.photoCredit
        ? ` · ${photo.profile.photoCredit.creator} · ${photo.profile.photoCredit.license}`
        : '')
    : isChinese
      ? '尚无可访问的档案照片'
      : 'No accessible profile photo';
  const placeholder =
    access === 'sign-in' || access === 'admin'
      ? isChinese
        ? '登录后查看档案照片'
        : 'Sign in to view profile photo'
      : photo?.status === 'failed' || broken
        ? isChinese
          ? '照片加载失败'
          : 'Photo unavailable'
        : isChinese
          ? '尚无档案照片'
          : 'No profile photo';
  return (
    <span
      className={'hc-profile-photo ' + className}
      title={title}
      data-photo-state={broken ? 'failed' : ready ? 'ready' : photo?.status || 'unavailable'}
    >
      {ready ? (
        <img
          src={photo.url}
          alt={isChinese ? `${name} 的档案照片` : `${name} profile photo`}
          loading="lazy"
          decoding="async"
          onError={() => setBroken(true)}
        />
      ) : (
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.4"
          role="img"
          aria-label={placeholder}
        >
          <ellipse cx="8" cy="6" rx="2" ry="3" />
          <ellipse cx="16" cy="6" rx="2" ry="3" />
          <ellipse cx="3.5" cy="11" rx="1.5" ry="2.3" />
          <ellipse cx="20.5" cy="11" rx="1.5" ry="2.3" />
          <path d="M12 11c-3 0-8 7-5 9 2 1 3-1 5-1s3 2 5 1c3-2-2-9-5-9Z" />
        </svg>
      )}
    </span>
  );
}
export function CalendarPhotoStatus() {
  const { i18n } = useTranslation();
  const isChinese = i18n.language === 'zh';
  const photos = React.useContext(Photos);
  const retry = React.useContext(RetryPhotos);
  const failed = Object.values(photos).some((photo) => photo.status === 'failed');

  return (
    <div className="hc-photo-info">
      <PhotoSignIn />
      {failed && (
        <button className="hc-photo-retry" type="button" onClick={retry}>
          {isChinese ? '重试档案照片' : 'Retry profile photos'}
        </button>
      )}
    </div>
  );
}

export function CalendarProfileLink({ name }: { name: string }) {
  const { i18n } = useTranslation();
  const profile = React.useContext(Photos)[name]?.profile;
  if (!profile || import.meta.env.MODE !== 'test' || auth.app.options.projectId !== 'demo-niu-niu')
    return null;
  return (
    <a
      className="hc-manage"
      href={'/app/customers/' + profile.customerId + '/pets/' + profile.id + '/'}
    >
      {i18n.language === 'zh' ? '查看宠物档案' : 'View pet profile'}
    </a>
  );
}
export function DemoBalanceLink({ customerId, petId }: { customerId: string; petId: string }) {
  const { i18n } = useTranslation();
  const [alias, setAlias] = React.useState('');
  React.useEffect(() => {
    let active = true;
    if (import.meta.env.MODE === 'test' && auth.app.options.projectId === 'demo-niu-niu')
      void Promise.all(
        calendarPhotoFixtures.map(async (item) => ({
          name: item.name,
          customer: await demoProfileId('local-photo-customer-' + item.family),
          pet: await demoProfileId('local-photo-' + item.species + '-' + item.family),
        })),
      ).then((links) => {
        if (active)
          setAlias(
            links.find((item) => item.customer === customerId && item.pet === petId)?.name || '',
          );
      });
    return () => {
      active = false;
    };
  }, [customerId, petId]);
  return alias ? (
    <a className="language" href={'/app/balances/?pet=' + encodeURIComponent(alias)}>
      {i18n.language === 'zh' ? '查看余额' : 'View balance'}
    </a>
  ) : null;
}
