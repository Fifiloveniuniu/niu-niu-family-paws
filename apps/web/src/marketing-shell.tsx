import Icon from './icons';
import AppearanceControl from './appearance';
import { type Language, uiText } from './i18n.ts';
import { useDropdownState } from './dropdown-state';
import { useEffect, useRef, useState, type ReactNode } from 'react';
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
  account,
  showNavigation = true,
  navigation,
}: {
  navigation?: ReactNode;
  showNavigation?: boolean;
  account?: ReactNode;
  page: string;
  onLanguageChange: (language: Language) => void;
}) {
  const { t, i18n } = useTranslation();
  const zh = i18n.language === 'zh';
  const [open, setOpen] = useState(false);
  const [dropdown, setDropdown] = useDropdownState<string | null>(null);
  const menu = useRef<HTMLButtonElement>(null);
  const header = useRef<HTMLElement>(null);
  useEffect(() => {
    const element = header.current;
    if (!element) return;
    const update = () => {
      const height = element.getBoundingClientRect().height;
      if (height > 0)
        document.documentElement.style.setProperty('--marketing-header-height', `${height}px`);
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    setOpen(false);
    setDropdown(null);
  }, [page]);
  useEffect(() => {
    const close = (event: KeyboardEvent) => {
      if (document.querySelector('dialog:modal')) return;
      if (event.key === 'Escape') {
        setOpen(false);
        setDropdown(null);
        menu.current?.focus();
      }
    };
    const outside = (event: PointerEvent) => {
      if (document.querySelector('dialog:modal')) return;
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
        aria-label={uiText('ui.marketingShell.show') + label}
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
      data-app-header={!showNavigation || undefined}
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
        {open ? uiText('ui.marketingShell.close') : uiText('ui.marketingShell.menu')}{' '}
        <span aria-hidden="true">
          {page === 'app' ? <Icon name={open ? 'close' : 'menu'} /> : open ? '×' : '☰'}
        </span>
      </button>
      <div id="marketing-menu" className="marketing-menu">
        {navigation}
        {showNavigation && (
          <nav aria-label={uiText('ui.marketingShell.mainNavigation')}>
            {link('/home/', t('home'), 'home')}
            {submenu('services', '/services/', t('services'), [
              ['/services/#boarding', t('night')],
              ['/services/#drop-in', uiText('ui.marketingShell.dropInVisits')],
              ['/services/#dog-walking', uiText('ui.marketingShell.dogWalking')],
              ['/services/#grooming', uiText('ui.marketingShell.petGrooming')],
              ['/academy/', uiText('ui.marketingShell.groomingAcademy')],
            ])}
            {submenu('spaces', '/spaces/', uiText('ui.marketingShell.ourSpaces'), [
              ['/spaces/#care-homes', uiText('ui.marketingShell.ourCareHomes')],
              ['/spaces/#grooming-shop', uiText('ui.marketingShell.groomingShopEquipment')],
              ['/spaces/#space-gallery', uiText('ui.marketingShell.spaceGallery')],
            ])}
            {submenu('about', '/about/', t('approach'), [
              ['/about/#care-approach', uiText('ui.marketingShell.ourApproach')],
              ['/about/#family-stories', uiText('ui.marketingShell.familyStories')],
            ])}
            {submenu('pricing', '/pricing/', uiText('ui.marketingShell.pricing'), [
              ['/pricing/#service-prices', uiText('ui.marketingShell.servicePrices')],
              ['/pricing/#boarding-packages', uiText('ui.marketingShell.boardingPackages')],
              ['/pricing/#cancellation-policy', uiText('ui.marketingShell.cancellationPolicy')],
            ])}
            {link('/faqs/', t('questions'), 'faqs')}
            {link('/contact/', t('contact'), 'contact')}
          </nav>
        )}
        <div className="header-actions">
          <MarketingLanguageMenu onChange={onLanguageChange} />
          {page === 'app' && <AppearanceControl />}
          {account ?? <SiteAccountLink app={page === 'app'} />}
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
          <p className="cute-note">{uiText('ui.marketingShell.littlePawsAWholeLotOfLove')}</p>
          <p>{uiText('ui.marketingShell.thoughtfulCareForPetsAPlaceForNewBeginnings')}</p>
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
