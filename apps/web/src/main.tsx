import { englishMessages, chineseMessages } from './marketing-messages';
import MarketingHome from './marketing-home';
import { CareStory, PetCareStories, VisitPreparation, StayPlanning } from './marketing-sections';
import useRoute from './use-route';
import { scrollMarketingTarget } from './marketing-navigation';
import useMarketingMotion from './use-marketing-motion';
import SiteAccountLink from './site-account-link';
import React from 'react';
import i18n from 'i18next';
import { initReactI18next, useTranslation } from 'react-i18next';
import './style.css';
import './marketing.css';
import LanguageSelector from './language-selector';
const Portal = React.lazy(() => import('./portal'));

void i18n.use(initReactI18next).init({
  resources: { en: { translation: englishMessages }, zh: { translation: chineseMessages } },
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
  useMarketingMotion(marketingRoot, route.path, i18n.language);
  const appVisible = route.path.startsWith('/app/') && page !== 'not-found';
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
      policy: chinese ? '取消政策' : 'Cancellation policy',
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
    if (location.hash && !location.hash.startsWith('#/'))
      requestAnimationFrame(() => scrollMarketingTarget(location.hash));
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
          <Portal active={appVisible} onLanguageChange={setLanguage} />
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
          <header className="marketing-header">
            <a className="brand" href="/home/#main" aria-label="Niu Niu Family Paws">
              <span className="paw" aria-hidden="true">
                ✿
              </span>
              <span>
                NIU NIU<span className="brand-sub">FAMILY PAWS</span>
              </span>
            </a>
            <nav aria-label={chinese ? '主导航' : 'Main navigation'}>
              <a
                href="/home/#main"
                aria-current={
                  page === 'home' && (!route.hash || route.hash === '#main')
                    ? 'location'
                    : undefined
                }
              >
                {t('home')}
              </a>
              <a
                href="/home/#services"
                aria-current={
                  page === 'services' || (page === 'home' && route.hash === '#services')
                    ? 'location'
                    : undefined
                }
              >
                {t('services')}
              </a>
              <a
                href="/home/#about"
                aria-current={
                  page === 'about' || (page === 'home' && route.hash === '#about')
                    ? 'location'
                    : undefined
                }
              >
                {t('approach')}
              </a>
              <a
                href="/home/#faq"
                aria-current={
                  page === 'faqs' || (page === 'home' && route.hash === '#faq')
                    ? 'location'
                    : undefined
                }
              >
                {t('questions')}
              </a>
            </nav>
            <div className="header-actions">
              <SiteAccountLink />
              <LanguageSelector onChange={setLanguage} />
            </div>
          </header>
          <main
            ref={marketingRoot}
            id="main"
            className={'marketing-site' + (page !== 'home' ? ' public-page' : '')}
          >
            {page === 'home' && <MarketingHome />}
            {page === 'services' && (
              <section data-scroll-scene id="services" className="services">
                <div className="section-heading">
                  <p className="eyebrow">{t('servicesLabel')}</p>
                  <SectionHeading>{t('services')}</SectionHeading>
                  <p>{t('servicesIntro')}</p>
                </div>
                <div className="cards">
                  {['day', 'night'].map((key, index) => (
                    <article
                      id={key === 'night' ? 'boarding' : 'daycare'}
                      data-scroll-object="rise"
                      className={'service service-' + index}
                      key={key}
                    >
                      <div className="service-top">
                        <span className="service-number">0{index + 1}</span>
                        <span aria-hidden="true">{index === 0 ? '☀' : '☾'}</span>
                      </div>
                      <p className="eyebrow">{t(key + 'Tag')}</p>
                      <h3>{t(key)}</h3>
                      <p>{t(key + 'Description')}</p>
                      <p className="service-detail">{t(key + 'Detail')}</p>
                      <a className="text-link" href="/services/#prepare">
                        {t('prepareLink')} <span aria-hidden="true">↗</span>
                      </a>
                      <p className="price">{t('price')}</p>
                    </article>
                  ))}
                </div>
              </section>
            )}
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
            {page === 'services' && <VisitPreparation />}
            {page === 'services' && <StayPlanning />}
            {page === 'faqs' && (
              <section data-scroll-scene id="faq" className="faq">
                <div>
                  <p className="eyebrow">{t('faqLabel')}</p>
                  <SectionHeading>{t('questions')}</SectionHeading>
                </div>
                <div>
                  {[1, 2, 3, 4, 5, 6].map((n) => (
                    <details data-scroll-object="rise" key={n}>
                      <summary>{t('q' + n)}</summary>
                      <p>{t('a' + n)}</p>
                    </details>
                  ))}
                </div>
              </section>
            )}
            {page === 'policy' && (
              <section data-scroll-scene className="public-policy">
                <p className="eyebrow">{chinese ? '托管前先了解' : 'BEFORE A STAY'}</p>
                <h1>{chinese ? '取消政策' : 'Cancellation policy'}</h1>
                <p>
                  {chinese
                    ? '以下是已确认的寄养取消条款。'
                    : 'These are the confirmed boarding cancellation terms.'}
                </p>
                <div data-scroll-object="rise" className="public-policy-terms">
                  <article>
                    <h2>{chinese ? '提前 14 天' : '14 days ahead'}</h2>
                    <p>
                      {chinese ? '取消可获得全额返还。' : 'Cancellation receives a full refund.'}
                    </p>
                  </article>
                  <article>
                    <h2>{chinese ? '提前 7 天' : '7 days ahead'}</h2>
                    <p>
                      {chinese ? '取消可获得一半返还。' : 'Cancellation receives a half refund.'}
                    </p>
                  </article>
                </div>
                <p className="public-policy-pending">
                  {chinese
                    ? '具体截止时间、少于 7 天或未到店的处理方式，以及返还形式等细节尚未公布。预约前请先确认完整条款，目前网站尚未开放实际付费预约。'
                    : 'Exact deadlines, shorter-notice and no-show terms, and the form of refund have not yet been published. Confirm the complete terms before booking; paid bookings are not available through this website yet.'}
                </p>
                <a href="/home/#services" className="button">
                  {t('services')}
                </a>
              </section>
            )}
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
          <footer>
            <span>{t('footer')}</span>
            <span>{t('footerNote')}</span>
            <a href="/cancellation-policy/">{chinese ? '取消政策' : 'Cancellation policy'}</a>
            <a href="/home/#contact">{t('contact')} ↗</a>
          </footer>
        </>
      )}
    </>
  );
}
