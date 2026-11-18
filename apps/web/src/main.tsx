import { marketingPreview, previewMessages } from './marketing-preview';
import { FamilyStories } from './marketing-galleries';
import { englishMessages, chineseMessages } from './marketing-messages';
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
const Portal = React.lazy(() => import('./portal'));

void i18n.use(initReactI18next).init({
  resources: {
    en: { translation: { ...englishMessages, ...(marketingPreview ? previewMessages.en : {}) } },
    zh: { translation: { ...chineseMessages, ...(marketingPreview ? previewMessages.zh : {}) } },
  },
  lng: 'en',
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
});

export function App({ initialPath = '/' }: { initialPath?: string } = {}) {
  const { t } = useTranslation();
  const chinese = i18n.language === 'zh';
  const route = useRoute(i18n.language, initialPath);
  const page = route.kind;
  const marketingRoot = React.useRef<HTMLElement>(null);
  const appVisible = route.path.startsWith('/app/') && page !== 'not-found';
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
    try {
      if (localStorage.getItem('language') === 'zh') void i18n.changeLanguage('zh');
    } catch {
      /* optional */
    }
  }, []);
  React.useEffect(() => {
    document.documentElement.lang = chinese ? 'zh-Hans' : 'en';
    const names: Record<string, string> = {
      home: chinese ? '首页' : 'Home',
      services: t('services'),
      about: t('approach'),
      faqs: t('questions'),
      pricing: chinese ? '价格' : 'Pricing',
      contact: t('contact'),
      spaces: chinese ? '我们的小天地' : 'Our Spaces',
      academy: chinese ? '美容师成长课堂' : 'Grooming Academy',
      calendar: chinese ? '日历' : 'Calendar',
      customers: chinese ? '客户' : 'Customers',
      balances: chinese ? '寄养余额' : 'Balances',
      settings: chinese ? '设置' : 'Settings',
      personal: chinese ? '我的资料' : 'My profile',
      login: chinese ? '登录' : 'Sign in',
      'not-found': chinese ? '未找到页面' : 'Page not found',
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
  function setLanguage(lang: 'en' | 'zh') {
    void i18n.changeLanguage(lang);
    try {
      localStorage.setItem('language', lang);
    } catch {
      /* optional */
    }
  }
  const portal =
    appVisible || visitedApp ? (
      <div hidden={!appVisible} className="app-route-root">
        <React.Suspense
          fallback={
            <main className="portal" role="status">
              {chinese ? '正在加载…' : 'Loading…'}
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
                <h1>{chinese ? '未找到页面' : 'Page not found'}</h1>
                <p>
                  {chinese
                    ? '请检查链接或返回首页。'
                    : 'Check the link or return to the home page.'}
                </p>
                <a className="button" href="/home/">
                  {chinese ? '返回首页' : 'Back to home'}
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
