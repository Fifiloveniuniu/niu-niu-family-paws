import { withoutLanguage, withLanguage, urlLanguage } from './language-url.ts';
import React from 'react';
import { scrollMarketingTarget, animateMarketingPageEntry } from './marketing-navigation';
import { canonicalUrl, parseRoute, routeUrl, navigate } from './routing';
import { confirmDiscardChanges } from './unsaved-changes';
export default function useRoute(language: string, initialPath = '/') {
  const [route, setRoute] = React.useState(() =>
    parseRoute(typeof window === 'undefined' ? initialPath : routeUrl()),
  );
  React.useEffect(() => {
    let previousUrl = canonicalUrl(routeUrl());
    let historyIndex = Number(history.state?.familyPawsIndex) || 0;
    let isRevertingHistory = false;
    history.replaceState({ ...history.state, familyPawsIndex: historyIndex }, '', previousUrl);
    const canNavigate = (nextUrl: string) => {
      if (withoutLanguage(nextUrl) === withoutLanguage(previousUrl)) return true;
      if (!previousUrl.startsWith('/app/')) return true;
      const retainWorkspaceDrafts =
        nextUrl.startsWith('/app/') && !nextUrl.startsWith('/app/sign-in/');
      const target = parseRoute(nextUrl);
      if (
        retainWorkspaceDrafts &&
        ((target.customerId && target.customerId !== parseRoute(previousUrl).customerId) ||
          new URL(nextUrl, location.origin).searchParams.get('asCustomer') !==
            new URL(previousUrl, location.origin).searchParams.get('asCustomer')) &&
        !confirmDiscardChanges(language, document.querySelector('[data-customer-workspace]'))
      )
        return false;
      return confirmDiscardChanges(language, undefined, retainWorkspaceDrafts);
    };
    const guardNavigation = (event: Event) => {
      if (!canNavigate((event as CustomEvent<{ to: string }>).detail.to)) event.preventDefault();
    };
    const acceptNavigation = () => {
      previousUrl = canonicalUrl(routeUrl());
      historyIndex = Number(history.state?.familyPawsIndex) || 0;
      setRoute(parseRoute(previousUrl));
    };
    const handleHistoryNavigation = () => {
      if (isRevertingHistory) {
        isRevertingHistory = false;
        return;
      }
      const nextUrl = canonicalUrl(routeUrl());
      if (nextUrl === previousUrl) return;
      const nextHistoryIndex =
        typeof history.state?.familyPawsIndex === 'number'
          ? history.state.familyPawsIndex
          : historyIndex - 1;
      if (!canNavigate(nextUrl)) {
        const historyDelta = historyIndex - nextHistoryIndex;
        if (historyDelta) {
          isRevertingHistory = true;
          history.go(historyDelta);
        } else
          history.replaceState(
            { ...history.state, familyPawsIndex: historyIndex },
            '',
            previousUrl,
          );
        return;
      }
      history.replaceState({ ...history.state, familyPawsIndex: nextHistoryIndex }, '', nextUrl);
      acceptNavigation();
    };
    const handleHashNavigation = () => {
      if (isRevertingHistory) return;
      const nextUrl = canonicalUrl(routeUrl());
      if (nextUrl === previousUrl) return;
      if (!canNavigate(nextUrl)) {
        history.replaceState({ ...history.state, familyPawsIndex: historyIndex }, '', previousUrl);
        return;
      }
      history.replaceState({ ...history.state, familyPawsIndex: historyIndex + 1 }, '', nextUrl);
      acceptNavigation();
    };
    const handleLinkClick = (event: MouseEvent) => {
      if (
        event.defaultPrevented ||
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.altKey ||
        event.shiftKey
      )
        return;
      if (!(event.target instanceof Element)) return;
      const anchor = event.target.closest<HTMLAnchorElement>('a[href]');
      if (!anchor || anchor.target || anchor.hasAttribute('download')) return;
      const url = new URL(anchor.href, location.href);
      if (url.origin === location.origin)
        url.searchParams.set('lang', urlLanguage(location.href) ?? language);
      if (url.origin !== location.origin) return;
      if (
        url.pathname === location.pathname &&
        url.search === location.search &&
        !url.hash &&
        (anchor.closest('.marketing-header') || anchor.closest('.marketing-footer'))
      ) {
        event.preventDefault();
        if (url.pathname === '/home/') {
          url.hash = 'main';
          navigate(url.href);
          scrollMarketingTarget('#main', true);
        } else animateMarketingPageEntry();
        return;
      }

      if (
        url.pathname === location.pathname &&
        url.search === location.search &&
        url.hash &&
        !url.hash.startsWith('#/')
      ) {
        if (!document.querySelector('.marketing-header')) return;
        event.preventDefault();
        navigate(url.href);
        scrollMarketingTarget(url.hash, !anchor.classList.contains('skip'));
        return;
      }
      event.preventDefault();
      navigate(url.href);
    };
    window.addEventListener('family-paws:before-navigation', guardNavigation);
    window.addEventListener('family-paws:navigation', acceptNavigation);
    window.addEventListener('popstate', handleHistoryNavigation);
    window.addEventListener('hashchange', handleHashNavigation);
    document.addEventListener('click', handleLinkClick);
    return () => {
      window.removeEventListener('family-paws:before-navigation', guardNavigation);
      window.removeEventListener('family-paws:navigation', acceptNavigation);
      window.removeEventListener('popstate', handleHistoryNavigation);
      window.removeEventListener('hashchange', handleHashNavigation);
      document.removeEventListener('click', handleLinkClick);
    };
  }, [language]);
  return route;
}
