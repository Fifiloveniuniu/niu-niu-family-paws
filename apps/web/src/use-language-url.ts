import React from 'react';
import i18n from 'i18next';
import { resolveLanguage } from './i18n.ts';
import { isPageLink, urlLanguage, withLanguage } from './language-url.ts';
import { navigate, routeUrl, type AppRoute } from './routing';

/** The URL is authoritative; storage is only a fallback for an unlocalized link. */
export default function useLanguageUrl(route: AppRoute) {
  React.useEffect(() => {
    let stored: string | null = null;
    try {
      stored = localStorage.getItem('language');
    } catch {
      /* optional preference */
    }
    const language = route.language ?? resolveLanguage(stored);
    if (i18n.resolvedLanguage !== language) void i18n.changeLanguage(language);
    try {
      localStorage.setItem('language', language);
    } catch {
      /* optional preference */
    }
    if (urlLanguage(routeUrl()) !== language)
      navigate(withLanguage(routeUrl(), language, location.origin), true);
  }, [route.language, route.path]);

  React.useEffect(() => {
    const update = (root: ParentNode) => {
      const language = urlLanguage(location.href) ?? resolveLanguage(i18n.resolvedLanguage);
      for (const anchor of root.querySelectorAll<HTMLAnchorElement>('a[href]')) {
        if (anchor.hasAttribute('download') || !isPageLink(anchor.href, location.href)) continue;
        const target = withLanguage(anchor.href, language, location.origin);
        if (anchor.getAttribute('href') !== target) anchor.setAttribute('href', target);
      }
    };
    update(document);
    const observer = new MutationObserver(() => update(document));
    observer.observe(document.body, {
      subtree: true,
      childList: true,
      attributes: true,
      attributeFilter: ['href'],
    });
    const changed = () => update(document);
    window.addEventListener('family-paws:navigation', changed);
    window.addEventListener('popstate', changed);
    i18n.on('languageChanged', changed);
    return () => {
      observer.disconnect();
      window.removeEventListener('family-paws:navigation', changed);
      window.removeEventListener('popstate', changed);
      i18n.off('languageChanged', changed);
    };
  }, []);
}
