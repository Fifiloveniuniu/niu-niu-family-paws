import React from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { localeFor, speciesText, uiText } from './i18n.ts';
import { apiBlob } from './api-client';
import { useDropdownState } from './dropdown-state';
import useAnchoredPopover from './use-anchored-popover';
import { useWorkspaceText } from './workspace-text';
import { petKey, scopedUrl, type PetRow } from './workspace-data';
import Icon from './icons';
import { PetTypeIcon } from './pet-type';
const PhotoLoader = React.createContext<(row: PetRow) => Promise<string>>(async () => {
  throw Error('Photo provider unavailable');
});
export function WorkspacePhotos({ children }: { children: React.ReactNode }) {
  const cache = React.useRef(new Map<string, Promise<string>>());
  const urls = React.useRef(new Set<string>());
  const requests = React.useRef(new Set<AbortController>());
  const alive = React.useRef(true);
  React.useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
      requests.current.forEach((c) => c.abort());
      urls.current.forEach((url) => URL.revokeObjectURL(url));
      cache.current.clear();
    };
  }, []);
  const load = React.useCallback((row: PetRow) => {
    const key = petKey(row.customer.id, row.pet.id) + '/' + row.pet.photo;
    const previous = cache.current.get(key);
    if (previous) return previous;
    const controller = new AbortController();
    requests.current.add(controller);
    const pending = apiBlob(`/customers/${row.customer.id}/pets/${row.pet.id}/photo`, {
      signal: controller.signal,
    })
      .then((blob) => {
        if (!alive.current) throw new Error('Photo request cancelled');
        const url = URL.createObjectURL(blob);
        urls.current.add(url);
        return url;
      })
      .catch((error) => {
        if (cache.current.get(key) === pending) cache.current.delete(key);
        throw error;
      })
      .finally(() => requests.current.delete(controller));
    cache.current.set(key, pending);
    return pending;
  }, []);
  return <PhotoLoader.Provider value={load}>{children}</PhotoLoader.Provider>;
}
export function WorkspaceAvatar({ row, large = false }: { row: PetRow; large?: boolean }) {
  const t = useWorkspaceText();
  const load = React.useContext(PhotoLoader);
  const root = React.useRef<HTMLSpanElement>(null);
  const [url, setUrl] = React.useState('');
  const [failed, setFailed] = React.useState(false);
  React.useEffect(() => {
    let cancelled = false;
    setUrl('');
    setFailed(false);
    if (!row.pet.photo) return;
    const request = () => {
      void load(row)
        .then((value) => {
          if (!cancelled) setUrl(value);
        })
        .catch(() => {
          if (!cancelled) setFailed(true);
        });
    };
    if (large || !('IntersectionObserver' in window)) {
      request();
      return () => {
        cancelled = true;
      };
    }
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          observer.disconnect();
          request();
        }
      },
      { rootMargin: '80px' },
    );
    if (root.current) observer.observe(root.current);
    return () => {
      cancelled = true;
      observer.disconnect();
    };
  }, [row.customer.id, row.pet.id, row.pet.photo, load, large]);
  return (
    <span
      ref={root}
      className={'workspace-avatar' + (large ? ' large' : '')}
      data-photo-state={url && !failed ? 'ready' : row.pet.photo ? 'unavailable' : 'missing'}
    >
      {url && !failed ? (
        <img
          src={url}
          alt={uiText('ui.calendarPetPhotos.profilePhoto', { name: row.pet.name })}
          onError={() => setFailed(true)}
        />
      ) : (
        <svg
          viewBox="0 0 24 24"
          role="img"
          aria-label={t('photoMissing')}
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
        >
          <ellipse cx="8" cy="6" rx="2" ry="3" />
          <ellipse cx="16" cy="6" rx="2" ry="3" />
          <ellipse cx="3.5" cy="11" rx="1.5" ry="2.3" />
          <ellipse cx="20.5" cy="11" rx="1.5" ry="2.3" />
          <path d="M12 11c-3 0-8 7-5 9 2 1 3-1 5-1s3 2 5 1c3-2-2-9-5-9Z" />
        </svg>
      )}
    </span>
  );
}
export function PetOption({ row, showType = true }: { row: PetRow; showType?: boolean }) {
  return (
    <span className="workspace-pet-option">
      {showType && <PetTypeIcon species={row.pet.species ?? ''} />}
      <WorkspaceAvatar row={row} />
      <span>
        <strong>{row.pet.name}</strong>
        {showType && (
          <small>
            {row.pet.species ? speciesText(row.pet.species) : uiText('common.notAvailable')}
          </small>
        )}
      </span>
    </span>
  );
}
export function PetInfo({
  row,
  scope,
  status = '',
  location = '',
}: {
  row: PetRow;
  scope?: string;
  status?: string;
  location?: string;
}) {
  const t = useWorkspaceText();
  const { i18n } = useTranslation();
  const [open, setOpen] = useDropdownState(false);
  const [portal, setPortal] = React.useState<HTMLElement | null>(null);
  const root = React.useRef<HTMLSpanElement>(null),
    trigger = React.useRef<HTMLButtonElement>(null),
    popup = React.useRef<HTMLDivElement>(null);
  const restoring = React.useRef(false);
  // Dismissal must survive focus restoration and hover events caused by removing the portal.
  const dismissed = React.useRef(false);
  const timer = React.useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const close = React.useCallback(() => setOpen(false), [setOpen]);
  const dismiss = React.useCallback(() => {
    dismissed.current = true;
    close();
  }, [close]);
  const id = React.useId();
  useAnchoredPopover({ open, close, root, anchor: trigger, popup, width: 340, maxHeight: 560 });
  React.useLayoutEffect(() => {
    setPortal(root.current?.closest('dialog') ?? document.body);
  }, []);
  React.useEffect(() => () => clearTimeout(timer.current), []);
  const restoreFocus = () => {
    restoring.current = true;
    trigger.current?.focus({ preventScroll: true });
    queueMicrotask(() => {
      restoring.current = false;
    });
  };
  React.useEffect(() => {
    if (!open) return;
    const escape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape' || event.defaultPrevented) return;
      event.preventDefault();
      dismiss();
      if (
        popup.current?.contains(document.activeElement) ||
        root.current?.contains(document.activeElement)
      )
        restoreFocus();
    };
    document.addEventListener('keydown', escape);
    return () => document.removeEventListener('keydown', escape);
  }, [open, dismiss]);
  const enter = () => {
    if (restoring.current || dismissed.current) return;
    clearTimeout(timer.current);
    setOpen(true);
  };
  const leave = () => {
    dismissed.current = false;
    clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      if (
        !popup.current?.contains(document.activeElement) &&
        !root.current?.contains(document.activeElement)
      )
        close();
    }, 180);
  };
  const na = uiText('common.notAvailable');
  return (
    <span
      ref={root}
      className="workspace-pet-info"
      onBlur={(event) => {
        const next = event.relatedTarget as Node | null;
        if (!root.current?.contains(next) && !popup.current?.contains(next))
          dismissed.current = false;
      }}
      onMouseEnter={enter}
      onMouseLeave={leave}
      onKeyDown={(event) => {
        if (event.key === 'Escape' && open) {
          event.preventDefault();
          event.stopPropagation();
          dismiss();
          restoreFocus();
        }
      }}
    >
      <button
        ref={trigger}
        type="button"
        className="workspace-avatar-button"
        title={t('viewPet')}
        aria-label={`${t('viewPet')}: ${row.pet.name}`}
        aria-expanded={open}
        aria-controls={open ? id : undefined}
        onFocus={enter}
        onClick={() => {
          dismissed.current = false;
          enter();
        }}
      >
        <WorkspaceAvatar row={row} />
      </button>
      {open &&
        portal &&
        createPortal(
          <div
            ref={popup}
            id={id}
            className="workspace-pet-popup"
            popover="manual"
            role="dialog"
            aria-label={`${t('viewPet')}: ${row.pet.name}`}
            onMouseEnter={() => clearTimeout(timer.current)}
            onMouseLeave={leave}
          >
            <button
              className="icon-button popup-close"
              type="button"
              aria-label={t('close')}
              onClick={() => {
                dismiss();
                restoreFocus();
              }}
            >
              <Icon name="close" />
            </button>
            <WorkspaceAvatar row={row} large />
            <h3>{row.pet.name}</h3>
            <p>{row.pet.species ? speciesText(row.pet.species) : na}</p>
            <dl>
              {[
                [t('owner'), row.customer.name],
                [
                  t('weight'),
                  row.pet.weightKg == null
                    ? na
                    : uiText('ui.pets.weightValue', {
                        weight: new Intl.NumberFormat(localeFor(i18n.language)).format(
                          row.pet.weightKg,
                        ),
                      }),
                ],
                [t('balance'), row.account ? `${row.account.days} ${t('days')}` : na],
                [t('validFrom'), row.account?.validFrom ?? na],
                [t('validThrough'), row.account?.validThrough ?? na],
                [t('status'), status || na],
                [t('room'), location || na],
              ].map(([label, value]) => (
                <div key={label}>
                  <dt>{label}</dt>
                  <dd>{value}</dd>
                </div>
              ))}
            </dl>
            <div className="portal-actions">
              <a href={scopedUrl(`/app/customers/${row.customer.id}/pets/${row.pet.id}/`, scope)}>
                {t('viewProfile')}
              </a>
              <a
                href={scopedUrl(
                  '/app/balances/?pet=' + encodeURIComponent(petKey(row.customer.id, row.pet.id)),
                  scope,
                )}
              >
                {t('viewBalance')}
              </a>
            </div>
          </div>,
          portal,
        )}
    </span>
  );
}
