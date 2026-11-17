import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import LanguageSelector from './language-selector';
import SiteAccountLink from './site-account-link';

export function MarketingHeader({
  page,
  onLanguageChange,
}: {
  page: string;
  onLanguageChange: (language: 'en' | 'zh') => void;
}) {
  const { t, i18n } = useTranslation();
  const zh = i18n.language === 'zh';
  const [open, setOpen] = useState(false);
  const [servicesOpen, setServicesOpen] = useState(false);
  const menu = useRef<HTMLButtonElement>(null);
  const header = useRef<HTMLElement>(null);
  useEffect(() => {
    setOpen(false);
    setServicesOpen(false);
  }, [page]);
  useEffect(() => {
    const close = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false);
        setServicesOpen(false);
        menu.current?.focus();
      }
    };
    const outside = (event: PointerEvent) => {
      if (!header.current?.contains(event.target as Node)) {
        setOpen(false);
        setServicesOpen(false);
      }
    };
    document.addEventListener('keydown', close);
    document.addEventListener('pointerdown', outside);
    return () => {
      document.removeEventListener('keydown', close);
      document.removeEventListener('pointerdown', outside);
    };
  }, []);
  const link = (href: string, label: string, kind: string) => (
    <a href={href} aria-current={page === kind ? 'page' : undefined}>
      {label}
    </a>
  );
  return (
    <header
      ref={header}
      className="marketing-header"
      data-menu-open={open || undefined}
      onClick={(event) => {
        if ((event.target as Element).closest('a')) {
          setOpen(false);
          setServicesOpen(false);
        }
      }}
    >
      <a className="brand" href="/home/" aria-label="Niu Niu Family Paws">
        <span className="paw" aria-hidden="true">
          ✿
        </span>
        <span>
          NIU NIU<span className="brand-sub">FAMILY PAWS</span>
        </span>
      </a>
      <button
        ref={menu}
        className="marketing-menu-toggle"
        aria-expanded={open}
        aria-controls="marketing-menu"
        onClick={() => setOpen(!open)}
      >
        {open ? (zh ? '关闭' : 'Close') : zh ? '菜单' : 'Menu'}{' '}
        <span aria-hidden="true">{open ? '×' : '☰'}</span>
      </button>
      <div id="marketing-menu" className="marketing-menu">
        <nav aria-label={zh ? '主导航' : 'Main navigation'}>
          {link('/home/', t('home'), 'home')}
          <div className="nav-services">
            {link('/services/', t('services'), 'services')}
            <button
              aria-label={zh ? '展开服务项目' : 'Show services'}
              aria-expanded={servicesOpen}
              aria-controls="service-menu"
              onClick={() => setServicesOpen(!servicesOpen)}
            >
              ⌄
            </button>
            <div id="service-menu" className="service-menu" hidden={!servicesOpen}>
              <a href="/services/#daycare">{t('day')}</a>
              <a href="/services/#boarding">{t('night')}</a>
              <a href="/services/#grooming">{zh ? '宠物美容' : 'Pet grooming'}</a>
              <a href="/academy/">{zh ? '美容师成长课堂' : 'Grooming Academy'}</a>
            </div>
          </div>
          {link('/spaces/', zh ? '我们的小天地' : 'Our Spaces', 'spaces')}
          {link('/about/', t('approach'), 'about')}
          {link('/pricing/', zh ? '价格' : 'Pricing', 'pricing')}
          {link('/faqs/', t('questions'), 'faqs')}
          <a
            className="nav-contact"
            href="/contact/"
            aria-current={page === 'contact' ? 'page' : undefined}
          >
            {t('contact')} <span aria-hidden="true">↗</span>
          </a>
        </nav>
        <div className="header-actions">
          <SiteAccountLink />
          <LanguageSelector onChange={onLanguageChange} />
        </div>
      </div>
    </header>
  );
}

export function MarketingFooter() {
  const { t, i18n } = useTranslation();
  const zh = i18n.language === 'zh';
  return (
    <footer className="marketing-footer">
      <div className="footer-main">
        <div className="footer-brand">
          <a className="brand" href="/home/">
            <span className="paw" aria-hidden="true">
              ✿
            </span>
            <span>
              NIU NIU<span className="brand-sub">FAMILY PAWS</span>
            </span>
          </a>
          <p className="cute-note">
            {zh ? '小小爪印，满满的爱。' : 'Little paws. A whole lot of love.'}
          </p>
          <p>
            {zh
              ? '用心照顾宠物，陪伴每一步成长。'
              : 'Thoughtful care for pets. A place for new beginnings.'}
          </p>
        </div>
        <nav aria-label={zh ? '探索' : 'Explore'}>
          <h2>{zh ? '探索' : 'Explore'}</h2>
          <a href="/services/">{t('services')}</a>
          <a href="/spaces/">{zh ? '我们的小天地' : 'Our Spaces'}</a>
          <a href="/academy/">{zh ? '美容师成长课堂' : 'Grooming Academy'}</a>
          <a href="/about/">{t('approach')}</a>
        </nav>
        <nav aria-label={zh ? '实用信息' : 'Useful things'}>
          <h2>{zh ? '实用信息' : 'Useful things'}</h2>
          <a href="/pricing/">{zh ? '价格' : 'Pricing'}</a>
          <a href="/pricing/#cancellation-policy">{zh ? '取消政策' : 'Cancellation policy'}</a>
          <a href="/faqs/">{t('questions')}</a>
          <a href="/contact/">{t('contact')} ↗</a>
        </nav>
      </div>
      <div className="footer-bottom">
        <span>
          © {new Date().getFullYear()} {t('footer')}
        </span>
        <span>{t('footerNote')}</span>
        <a href="/home/">{zh ? '回到首页' : 'Back to Home'} ↑</a>
      </div>
    </footer>
  );
}
