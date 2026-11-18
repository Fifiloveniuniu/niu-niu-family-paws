import { languageName, localeFor, supportedLanguages, type Language, uiText } from './i18n.ts';
import { useDropdownState } from './dropdown-state';
import { useEffect, useId, useRef } from 'react';
import { useTranslation } from 'react-i18next';

export default function MarketingLanguageMenu({
  onChange,
}: {
  onChange: (language: Language) => void;
}) {
  const { i18n } = useTranslation();
  const [open, setOpen] = useDropdownState(false);
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const id = useId();
  const language = i18n.language;
  useEffect(() => {
    const close = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('pointerdown', close);
    return () => document.removeEventListener('pointerdown', close);
  }, []);
  useEffect(() => {
    if (open)
      root.current
        ?.querySelector<HTMLButtonElement>('[aria-checked="true"]')
        ?.focus({ preventScroll: true });
  }, [open]);
  return (
    <div
      className="marketing-language-menu"
      ref={root}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node)) setOpen(false);
      }}
      onKeyDown={(event) => {
        if (event.key === 'Escape' && open) {
          event.stopPropagation();
          setOpen(false);
          trigger.current?.focus({ preventScroll: true });
        }
        if (['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) {
          event.preventDefault();
          if (!open) return setOpen(true);
          const items = Array.from(
            root.current!.querySelectorAll<HTMLButtonElement>('[role="menuitemradio"]'),
          );
          const index = items.indexOf(document.activeElement as HTMLButtonElement);
          const next =
            event.key === 'Home'
              ? 0
              : event.key === 'End'
                ? items.length - 1
                : (index + (event.key === 'ArrowUp' ? -1 : 1) + items.length) % items.length;
          items[next]?.focus({ preventScroll: true });
        }
      }}
    >
      <button
        ref={trigger}
        className="language-menu-trigger"
        aria-label={uiText('common.languageMenuCurrent', { name: languageName(language) })}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={id}
        onMouseDown={(event) => event.preventDefault()}
        onClick={() => {
          trigger.current?.focus({ preventScroll: true });
          setOpen(!open);
        }}
      >
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <circle cx="12" cy="12" r="9" />
          <path d="M3 12h18M12 3c5 5 5 13 0 18-5-5-5-13 0-18Z" />
        </svg>
        <span>{languageName(language)}</span>
        <svg className="language-chevron" viewBox="0 0 24 24" aria-hidden="true">
          <path d="m7 10 5 5 5-5" />
        </svg>
      </button>
      {open && (
        <div
          id={id}
          role="menu"
          aria-label={uiText('common.languageMenu')}
          className="language-menu-options"
        >
          {supportedLanguages.map(({ code: value, name: label, htmlLang }) => (
            <button
              key={value}
              type="button"
              role="menuitemradio"
              aria-checked={language === value}
              lang={htmlLang}
              onClick={() => {
                onChange(value);
                setOpen(false);
                trigger.current?.focus({ preventScroll: true });
              }}
            >
              {label}
              <span aria-hidden="true">{language === value ? '✓' : ''}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
