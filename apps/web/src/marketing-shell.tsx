import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import MarketingLanguageMenu from './marketing-language-menu';
import SiteAccountLink from './site-account-link';

const navIcons: Record<string, string> = {
  home: 'M3 10 12 3l9 7M5 9v12h5v-7h4v7h5V9',
  services: 'M8 14c-2 1-4 4-2 6s4 0 6 0 4 2 6 0 0-5-2-6-6-1-8 0ZM6 7v2m5-5v3m5-3v3m4 0v2',
  spaces: 'M3 21h18M5 21V7l7-4 7 4v14M9 21v-6h6v6M9 9h.01M15 9h.01',
  about:
    'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M16 4a4 4 0 0 1 0 8m6 9v-2a4 4 0 0 0-3-3.87M13 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z',
  pricing: 'M20 13 11 22 2 13V3h10l8 8v2ZM7 8h.01',
  faqs: 'M9 9a3 3 0 0 1 6 0c0 2-3 2-3 4m0 4h.01M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z',
  contact: 'M3 5h18v14H3ZM3 5l9 8 9-8',
};

function NavIcon({ kind }: { kind: string }) {
  return (
    <svg
      className="nav-icon"
      viewBox="0 0 24 24"
      aria-hidden="true"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d={navIcons[kind]} />
    </svg>
  );
}

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
  const [dropdown, setDropdown] = useState<string | null>(null);
  const menu = useRef<HTMLButtonElement>(null);
  const header = useRef<HTMLElement>(null);
  useEffect(() => {
    setOpen(false);
    setDropdown(null);
  }, [page]);
  useEffect(() => {
    const close = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false);
        setDropdown(null);
        menu.current?.focus();
      }
    };
    const outside = (event: PointerEvent) => {
      if (!header.current?.contains(event.target as Node)) {
        setOpen(false);
        setDropdown(null);
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
      <NavIcon kind={kind} />
      {label}
    </a>
  );
  const submenu = (kind: string, href: string, label: string, items: string[][]) => (
    <div
      className="nav-dropdown"
      data-dropdown-open={dropdown === kind || undefined}
      onMouseEnter={() => {
        if (matchMedia('(min-width: 1181px)').matches) setDropdown(kind);
      }}
      onMouseLeave={(event) => {
        if (!event.currentTarget.contains(document.activeElement)) setDropdown(null);
      }}
      onFocusCapture={() => {
        if (matchMedia('(min-width: 1181px)').matches) setDropdown(kind);
      }}
      onBlurCapture={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node)) setDropdown(null);
      }}
      onKeyDown={(event) => {
        if (event.key === 'Escape' && matchMedia('(min-width: 1181px)').matches) {
          event.stopPropagation();
          event.currentTarget.querySelector('a')?.focus();
          setDropdown(null);
        }
      }}
    >
      {link(href, label, kind)}
      <button
        className="nav-submenu-toggle"
        aria-label={(zh ? '展开：' : 'Show ') + label}
        title={label}
        aria-expanded={dropdown === kind}
        aria-controls={kind === 'services' ? 'service-menu' : `${kind}-menu`}
        onClick={() => setDropdown(dropdown === kind ? null : kind)}
      >
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="m7 10 5 5 5-5" />
        </svg>
      </button>
      <div id={kind === 'services' ? 'service-menu' : `${kind}-menu`} className="nav-submenu">
        {items.map(([url, text]) => (
          <a key={url} href={url}>
            {text}
          </a>
        ))}
      </div>
    </div>
  );
  return (
    <header
      ref={header}
      className="marketing-header"
      data-menu-open={open || undefined}
      onClick={(event) => {
        if ((event.target as Element).closest('a')) {
          setOpen(false);
          setDropdown(null);
        }
      }}
    >
      <a className="brand" href="/home/" aria-label="Niu Niu Family Paws">
        <img
          className="brand-logo"
          src="/images/marketing/logo.png"
          alt="Niu Niu Family Paws Sitting LLC"
          width="1024"
          height="1024"
        />
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
          {submenu('services', '/services/', t('services'), [
            ['/services/#daycare', t('day')],
            ['/services/#boarding', t('night')],
            ['/services/#drop-in', zh ? '上门照护' : 'Drop-in visits'],
            ['/services/#dog-walking', zh ? '遛狗服务' : 'Dog walking'],
            ['/services/#grooming', zh ? '宠物美容' : 'Pet grooming'],
            ['/academy/', zh ? '美容师成长课堂' : 'Grooming Academy'],
          ])}
          {submenu('spaces', '/spaces/', zh ? '我们的小天地' : 'Our Spaces', [
            ['/spaces/#care-homes', zh ? '照护家庭' : 'Our care homes'],
            ['/spaces/#grooming-shop', zh ? '美容店与设备' : 'Grooming shop & equipment'],
            ['/spaces/#space-gallery', zh ? '空间图集' : 'Space gallery'],
          ])}
          {submenu('about', '/about/', t('approach'), [
            ['/about/#care-approach', zh ? '我们的照护理念' : 'Our approach'],
            ['/about/#family-stories', zh ? '家长们的暖心分享' : 'Family stories'],
          ])}
          {submenu('pricing', '/pricing/', zh ? '价格' : 'Pricing', [
            ['/pricing/#service-prices', zh ? '服务价格' : 'Service prices'],
            ['/pricing/#boarding-packages', zh ? '寄养套餐' : 'Boarding packages'],
            ['/pricing/#cancellation-policy', zh ? '取消政策' : 'Cancellation policy'],
          ])}
          {link('/faqs/', t('questions'), 'faqs')}
          {link('/contact/', t('contact'), 'contact')}
        </nav>
        <div className="header-actions">
          <MarketingLanguageMenu onChange={onLanguageChange} />
          <SiteAccountLink />
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
          <div className="brand">
            <img
              className="brand-logo"
              src="/images/marketing/logo.png"
              alt="Niu Niu Family Paws Sitting LLC"
              width="1024"
              height="1024"
              loading="lazy"
            />
          </div>
          <p className="cute-note">
            {zh ? '小小爪印，满满的爱。' : 'Little paws. A whole lot of love.'}
          </p>
          <p>
            {zh
              ? '用心照顾宠物，陪伴每一步成长。'
              : 'Thoughtful care for pets. A place for new beginnings.'}
          </p>
        </div>
      </div>
      <div className="footer-bottom">
        <span>
          © {new Date().getFullYear()} {t('footer')}
        </span>
        <span>{t('footerNote')}</span>
      </div>
    </footer>
  );
}
