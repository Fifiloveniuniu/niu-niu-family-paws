import { setAppearanceScope } from './theme-preferences';
import useLanguageUrl from './use-language-url';
import { withLanguage } from './language-url.ts';
import { navigate, routeUrl } from './routing';
import {
  catalogs,
  htmlLanguage,
  localeFor,
  resolveLanguage,
  type Language,
  uiText,
} from './i18n.ts';
import { marketingPreview, previewMessages } from './marketing-preview';
import { FamilyStories } from './marketing-galleries';
import MarketingHome from './marketing-home';
import { CareStory, PetCareStories, VisitPreparation, StayPlanning } from './marketing-sections';
import useRoute from './use-route';
import {
  scrollMarketingTarget,
  cancelMarketingTransition,
  animateMarketingPageEntry,
} from './marketing-navigation';
import useMarketingMotion from './use-marketing-motion';
import useMarketingHeader from './use-marketing-header';
import { MarketingHeader, MarketingFooter } from './marketing-shell';
import { ServicesPage, PricingPage, ContactPage, SpacesPage, AcademyPage } from './marketing-pages';
import React from 'react';
import ApiConnection from './api-connection';
import i18n from 'i18next';
import { initReactI18next, useTranslation } from 'react-i18next';
import './style.css';
import './marketing.css';
import './marketing-system.css';
import './material-theme.css';
import './theme-presets.css';
import './theme-components.css';
import './workflow-layout.css';
const Portal = React.lazy(() => import('./portal'));

void i18n.use(initReactI18next).init({
  resources: Object.fromEntries(
    Object.entries(catalogs).map(([code, resource]) => [
      code,
      {
        translation: {
          ...resource,
          ...(marketingPreview
            ? (previewMessages[code as keyof typeof previewMessages] ?? {})
            : {}),
        },
      },
    ]),
  ),
  lng: 'en',
  keySeparator: false,
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
});

export function App({ initialPath = '/' }: { initialPath?: string } = {}) {
  const { t } = useTranslation();
  const chinese = i18n.language === 'zh';
  const route = useRoute(i18n.language, initialPath);
  useLanguageUrl(route);
  const page = route.kind;
  const marketingRoot = React.useRef<HTMLElement>(null);
  const appVisible = route.path.startsWith('/app/') && page !== 'not-found';
  React.useLayoutEffect(() => setAppearanceScope(appVisible), [appVisible]);
  useMarketingHeader(!appVisible);
  useMarketingMotion(marketingRoot, route.path, i18n.language);
  const previousDestination = React.useRef(route.path + (route.hash ?? ''));
  React.useEffect(() => () => cancelMarketingTransition(), [route.path]);
  const [visitedApp, setVisitedApp] = React.useState(appVisible);
  React.useEffect(() => {
    if (appVisible) setVisitedApp(true);
  }, [appVisible]);
  const SectionHeading = 'h1';
  React.useEffect(() => {
    document.documentElement.lang = htmlLanguage(i18n.language);
    const names: Record<string, string> = {
      home: uiText('ui.main.home'),
      services: t('services'),
      about: t('approach'),
      faqs: t('questions'),
      pricing: uiText('ui.main.pricing'),
      operations: uiText('ui.operations.title'),
      'admin-pricing': uiText('ui.pricingAdmin.title'),
      'business-metrics': uiText('ui.metrics.title'),
      contact: t('contact'),
      spaces: uiText('ui.main.ourSpaces'),
      academy: uiText('ui.main.groomingAcademy'),
      calendar: uiText('ui.main.calendar'),
      customers: uiText('ui.main.customers'),
      balances: uiText('ui.main.balances'),
      settings: uiText('ui.main.settings'),
      personal: uiText('ui.main.myProfile'),
      login: uiText('ui.main.signIn'),
      'not-found': uiText('ui.main.pageNotFound'),
    };
    document.title = names[page] + ' · Niu Niu Family Paws';
  }, [page, route.path, chinese, t]);
  React.useEffect(() => {
    const destination = route.path + (route.hash ?? '');
    const animated = previousDestination.current !== destination;
    previousDestination.current = destination;
    if (location.hash && !location.hash.startsWith('#/')) {
      const hash = location.hash;
      const frame = requestAnimationFrame(() => scrollMarketingTarget(hash, animated));
      return () => cancelAnimationFrame(frame);
    } else if (!appVisible && animated) animateMarketingPageEntry();
    else window.scrollTo({ top: 0, behavior: 'instant' });
  }, [page, route.path, route.hash]);
  function setLanguage(lang: Language) {
    const language = resolveLanguage(lang);
    if (navigate(withLanguage(routeUrl(), language, location.origin), true)) {
      void i18n.changeLanguage(language);
      try {
        localStorage.setItem('language', language);
      } catch {
        /* optional preference */
      }
    }
  }
  const portal =
    appVisible || visitedApp ? (
      <div hidden={!appVisible} className="app-route-root">
        <React.Suspense
          fallback={
            <main className="portal" role="status">
              {uiText('ui.main.loading')}
            </main>
          }
        >
          <ApiConnection active={appVisible} onLanguageChange={setLanguage}>
            <Portal active={appVisible} onLanguageChange={setLanguage} />
          </ApiConnection>
        </React.Suspense>
      </div>
    ) : null;
  return (
    <>
      {portal}
      {!appVisible && (
        <>
          <a className="skip" href="#main">
            {t('skip')}
          </a>
          <MarketingHeader page={page} onLanguageChange={setLanguage} />
          <main
            ref={marketingRoot}
            id="main"
            className={'marketing-site' + (page !== 'home' ? ' public-page' : '')}
          >
            {page === 'home' && <MarketingHome />}
            {page === 'services' && <ServicesPage />}
            {page === 'services' && <PetCareStories />}
            {page === 'about' && (
              <section data-scroll-scene id="about" className="about">
                <div>
                  <p className="eyebrow">{t('aboutLabel')}</p>
                  <SectionHeading>{t('approach')}</SectionHeading>
                  <p>{t('aboutBody')}</p>
                </div>
                <ol>
                  {[1, 2, 3].map((n) => (
                    <li data-scroll-object="rise" key={n}>
                      <span>0{n}</span>
                      <div>
                        <h3>{t('step' + n)}</h3>
                        <p>{t('step' + n + 'Body')}</p>
                      </div>
                    </li>
                  ))}
                </ol>
              </section>
            )}
            {page === 'about' && <CareStory />}
            {page === 'about' && <FamilyStories />}
            {page === 'services' && <VisitPreparation />}
            {page === 'services' && <StayPlanning />}
            {page === 'faqs' && (
              <section data-scroll-scene id="faq" className="faq">
                <div>
                  <p className="eyebrow">{t('faqLabel')}</p>
                  <SectionHeading>{t('questions')}</SectionHeading>
                </div>
                <div>
                  {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
                    <details data-scroll-object="rise" key={n}>
                      <summary>{t('q' + n)}</summary>
                      <p>{t('a' + n)}</p>
                    </details>
                  ))}
                </div>
              </section>
            )}
            {page === 'pricing' && <PricingPage />}
            {page === 'contact' && <ContactPage />}
            {page === 'spaces' && <SpacesPage />}
            {page === 'academy' && <AcademyPage />}
            {page === 'not-found' && (
              <section data-scroll-scene className="public-policy">
                <h1>{uiText('ui.main.pageNotFound')}</h1>
                <p>{uiText('ui.main.checkTheLinkOrReturnToTheHomePage')}</p>
                <a className="button" href="/home/">
                  {uiText('ui.main.backToHome')}
                </a>
              </section>
            )}
          </main>
          <MarketingFooter />
        </>
      )}
    </>
  );
}
