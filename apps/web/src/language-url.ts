import { resolveLanguage, supportedLanguages } from './i18n.ts';

const fallbackOrigin = 'https://family-paws.invalid';
export function urlLanguage(input: string): string | null {
  const value = new URL(input, fallbackOrigin).searchParams.get('lang');
  return supportedLanguages.some((item) => item.code === value) ? value : null;
}
export function withLanguage(input: string, language: string, base = fallbackOrigin) {
  const url = new URL(input, base);
  if (!['http:', 'https:'].includes(url.protocol) || url.origin !== new URL(base).origin)
    return input;
  url.searchParams.set('lang', resolveLanguage(language));
  return url.pathname + url.search + url.hash;
}
export function withoutLanguage(input: string) {
  const url = new URL(input, fallbackOrigin);
  url.searchParams.delete('lang');
  return url.pathname + url.search + url.hash;
}
export function isPageLink(input: string, base: string) {
  const url = new URL(input, base);
  return (
    url.origin === new URL(base).origin &&
    ['http:', 'https:'].includes(url.protocol) &&
    !/^\/(?:api|images|assets)\//.test(url.pathname) &&
    !/\.[a-z0-9]+$/i.test(url.pathname)
  );
}
