import { englishMessages, chineseMessages } from './marketing-messages';
import HomeIllustration from './home-illustration';
import useRoute from './use-route';
import useMarketingMotion from './use-marketing-motion';
import SiteAccountLink from './site-account-link';
import React from 'react';
import i18n from 'i18next';
import { initReactI18next, useTranslation } from 'react-i18next';
import './style.css';
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
  useMarketingMotion(marketingRoot, route.path);
  const appVisible = route.path.startsWith('/app/') && page !== 'not-found';
  const [visitedApp, setVisitedApp] = React.useState(appVisible);
  React.useEffect(() => {
    if (appVisible) setVisitedApp(true);
  }, [appVisible]);
  const SectionHeading = page === 'home' ? 'h2' : 'h1';
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
    if (location.hash && !location.hash.startsWith('#/'))
      requestAnimationFrame(() =>
        document.getElementById(location.hash.slice(1))?.scrollIntoView(),
      );
    else window.scrollTo({ top: 0, behavior: 'instant' });
  }, [page, route.path, chinese]);
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
          <header>
            <a className="brand" href="/home/" aria-label="Niu Niu Family Paws">
              <span className="paw" aria-hidden="true">
                ✿
              </span>
              <span>
                NIU NIU<span className="brand-sub">FAMILY PAWS</span>
              </span>
            </a>
            <nav aria-label={chinese ? '主导航' : 'Main navigation'}>
              <a href="/home/" aria-current={page === 'home' ? 'page' : undefined}>
                {t('home')}
              </a>
              <a href="/services/" aria-current={page === 'services' ? 'page' : undefined}>
                {t('services')}
              </a>
              <a href="/about/" aria-current={page === 'about' ? 'page' : undefined}>
                {t('approach')}
              </a>
              <a href="/faqs/" aria-current={page === 'faqs' ? 'page' : undefined}>
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
            {page === 'home' && (
              <section className="hero">
                <div>
                  <p className="eyebrow">{t('eyebrow')}</p>
                  <h1>{t('title')}</h1>
                  <p className="intro">{t('intro')}</p>
                  <a className="button" href="/services/">
                    {t('explore')} <span aria-hidden="true">↗</span>
                  </a>
                  <p className="handwritten">{t('note')}</p>
                </div>
                <div className="hero-art">
                  <HomeIllustration />
                  <span className="art-label">NIU NIU · FAMILY PAWS</span>
                </div>
              </section>
            )}
            {(page === 'home' || page === 'services') && (
              <section id="services" className="services">
                <div className="section-heading">
                  <p className="eyebrow">{t('servicesLabel')}</p>
                  <SectionHeading>
                    {page === 'home' ? t('servicesTitle') : t('services')}
                  </SectionHeading>
                  <p>{t('servicesIntro')}</p>
                </div>
                <div className="cards">
                  {['day', 'night'].map((key, index) => (
                    <article className={'service service-' + index} key={key}>
                      <div className="service-top">
                        <span className="service-number">0{index + 1}</span>
                        <span aria-hidden="true">{index === 0 ? '☀' : '☾'}</span>
                      </div>
                      <p className="eyebrow">{t(key + 'Tag')}</p>
                      <h3>{t(key)}</h3>
                      <p>{t(key + 'Description')}</p>
                      <p className="price">{t('price')}</p>
                    </article>
                  ))}
                </div>
              </section>
            )}
            {(page === 'home' || page === 'about') && (
              <section id="about" className="about">
                <div>
                  <p className="eyebrow">{t('aboutLabel')}</p>
                  <SectionHeading>
                    {page === 'home' ? t('aboutTitle') : t('approach')}
                  </SectionHeading>
                  <p>{t('aboutBody')}</p>
                </div>
                <ol>
                  {[1, 2, 3].map((n) => (
                    <li key={n}>
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
            {(page === 'home' || page === 'faqs') && (
              <section id="faq" className="faq">
                <div>
                  <p className="eyebrow">{t('faqLabel')}</p>
                  <SectionHeading>
                    {page === 'home' ? t('faqTitle') : t('questions')}
                  </SectionHeading>
                </div>
                <div>
                  {[1, 2, 3].map((n) => (
                    <details key={n}>
                      <summary>{t('q' + n)}</summary>
                      <p>{t('a' + n)}</p>
                    </details>
                  ))}
                </div>
              </section>
            )}
            {page === 'policy' && (
              <section className="public-policy">
                <p className="eyebrow">{chinese ? '托管前先了解' : 'BEFORE A STAY'}</p>
                <h1>{chinese ? '取消政策' : 'Cancellation policy'}</h1>
                <p>
                  {chinese
                    ? '以下是已确认的寄养取消条款。'
                    : 'These are the confirmed boarding cancellation terms.'}
                </p>
                <div className="public-policy-terms">
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
                <a href="/services/" className="button">
                  {t('services')}
                </a>
              </section>
            )}
            {page === 'not-found' && (
              <section className="public-policy">
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
            {page === 'home' && (
              <section id="contact" className="contact">
                <p className="eyebrow">{t('contactLabel')}</p>
                <h2>{t('contactTitle')}</h2>
                <p>{t('contactBody')}</p>
                <span className="pending">{t('pending')}</span>
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
