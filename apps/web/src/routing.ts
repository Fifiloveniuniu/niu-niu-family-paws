import { urlLanguage, withLanguage, withoutLanguage } from './language-url.ts';
export type RouteKind =
  | 'home'
  | 'services'
  | 'about'
  | 'faqs'
  | 'pricing'
  | 'spaces'
  | 'academy'
  | 'contact'
  | 'login'
  | 'calendar'
  | 'customers'
  | 'balances'
  | 'settings'
  | 'operations'
  | 'admin-pricing'
  | 'personal'
  | 'not-found';
export type AppRoute = {
  kind: RouteKind;
  path: string;
  search: string;
  language?: string;
  hash?: string;
  customerId?: string;
  petId?: string;
  bookingId?: string;
  locationId?: string;
  locations?: boolean;
  cancellation?: boolean;
};
export const publicPaths = [
  '/home/',
  '/services/',
  '/about/',
  '/faqs/',
  '/pricing/',
  '/spaces/',
  '/academy/',
  '/contact/',
];
const legacyPaths: Record<string, string> = {
  '/login': '/app/sign-in/',
  '/admin': '/app/sign-in/',
  '/house-calendar': '/app/calendar/',
  '/customers': '/app/customers/',
  '/balances': '/app/balances/',
  '/transactions': '/app/balances/',
  '/settings': '/app/settings/',
  '/personal': '/app/account/profile/',
  '/cancellation-policy': '/pricing/#cancellation-policy',
};
export function canonicalUrl(input: string) {
  const url = new URL(input, 'https://family-paws.invalid');
  const hash = url.hash.slice(1);
  const [old, query] = hash.split('?');
  if (legacyPaths[old]) {
    const target = new URL(legacyPaths[old], 'https://family-paws.invalid');
    for (const [key, value] of new URLSearchParams(query)) target.searchParams.set(key, value);
    if (url.searchParams.has('lang') && !target.searchParams.has('lang'))
      target.searchParams.set('lang', url.searchParams.get('lang')!);
    return target.pathname + target.search + target.hash;
  }
  if (url.pathname.replace(/\/+$/, '') === '/cancellation-policy')
    return '/pricing/' + url.search + '#cancellation-policy';
  const path = url.pathname === '/' ? '/' : url.pathname.replace(/\/+$/, '') + '/';
  return (
    (path === '/' ? '/home/' : path === '/app/' ? '/app/calendar/' : path) + url.search + url.hash
  );
}
export function parseRoute(input: string): AppRoute {
  const url = new URL(canonicalUrl(input), 'https://family-paws.invalid');
  const language = urlLanguage(url.href);
  url.searchParams.delete('lang');
  const path = url.pathname;
  const base = {
    path,
    search: url.search,
    ...(language ? { language } : {}),
    ...(url.hash ? { hash: url.hash } : {}),
  };
  const staticRouteKinds: Record<string, RouteKind> = {
    '/': 'home',
    '/home/': 'home',
    '/services/': 'services',
    '/about/': 'about',
    '/faqs/': 'faqs',
    '/pricing/': 'pricing',
    '/spaces/': 'spaces',
    '/academy/': 'academy',
    '/contact/': 'contact',
    '/app/sign-in/': 'login',
    '/app/': 'calendar',
    '/app/calendar/': 'calendar',
    '/app/customers/': 'customers',
    '/app/balances/': 'balances',
    '/app/pricing/': 'admin-pricing',
    '/app/operations/': 'operations',
    '/app/settings/': 'settings',
    '/app/account/profile/': 'personal',
  };
  if (path === '/app/settings/cancellation/')
    return { ...base, kind: 'settings', cancellation: true };
  if (staticRouteKinds[path]) return { ...base, kind: staticRouteKinds[path] };
  const recordIdPattern = '([A-Za-z0-9_-]+)';
  let recordMatch = path.match(new RegExp('^/app/calendar/bookings/' + recordIdPattern + '/$'));
  if (recordMatch) return { ...base, kind: 'calendar', bookingId: recordMatch[1] };
  recordMatch = path.match(
    new RegExp('^/app/customers/' + recordIdPattern + '/(?:pets/' + recordIdPattern + '/)?$'),
  );
  if (recordMatch)
    return { ...base, kind: 'customers', customerId: recordMatch[1], petId: recordMatch[2] };
  recordMatch = path.match(new RegExp('^/app/settings/locations/(?:' + recordIdPattern + '/)?$'));
  if (recordMatch)
    return { ...base, kind: 'settings', locations: true, locationId: recordMatch[1] };
  return { ...base, kind: 'not-found' };
}
export function safeReturnTo(value: string | null) {
  if (!value || !value.startsWith('/app/') || value.startsWith('//') || /[\\\r\n]/.test(value))
    return null;
  const route = parseRoute(value);
  return route.kind !== 'login' && route.kind !== 'not-found' ? canonicalUrl(value) : null;
}
export const routeUrl = () =>
  window.location.pathname + window.location.search + window.location.hash;
export function currentRoute() {
  return parseRoute(routeUrl());
}
export function navigate(to: string, replace = false) {
  const url = new URL(to, window.location.origin);
  if (url.origin !== window.location.origin) return false;
  const inheritedLanguage = urlLanguage(url.href) ?? urlLanguage(location.href) ?? 'en';
  const targetUrl = withLanguage(canonicalUrl(url.href), inheritedLanguage, location.origin);
  if (targetUrl === routeUrl()) return true;
  if (
    !window.dispatchEvent(
      new CustomEvent('family-paws:before-navigation', {
        cancelable: true,
        detail: { to: targetUrl },
      }),
    )
  )
    return false;
  const historyIndex = (Number(window.history.state?.familyPawsIndex) || 0) + (replace ? 0 : 1);
  window.history[replace ? 'replaceState' : 'pushState'](
    {
      ...window.history.state,
      familyPawsIndex: historyIndex,
      familyPawsFrom: replace ? window.history.state?.familyPawsFrom : routeUrl(),
    },
    '',
    targetUrl,
  );
  window.dispatchEvent(new Event('family-paws:navigation'));
  return true;
}
export function closeRecord(parent: string) {
  if (
    window.history.state?.familyPawsFrom &&
    withoutLanguage(window.history.state.familyPawsFrom) === withoutLanguage(parent)
  )
    window.history.back();
  else navigate(parent, true);
}
export function updateQuery(values: Record<string, string | null | undefined>) {
  const queryParameters = new URLSearchParams(location.search);
  for (const [key, value] of Object.entries(values)) {
    if (value === null || value === undefined || value === '' || value === 'all')
      queryParameters.delete(key);
    else queryParameters.set(key, value);
  }
  return navigate(location.pathname + (queryParameters.size ? '?' + queryParameters : ''), true);
}
