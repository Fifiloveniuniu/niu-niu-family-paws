import { uiText, localeFor } from './i18n.ts';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { PetProfileAvatar, CalendarProfileLink, useCalendarPet } from './calendar-pet-photos';
import { useDropdownState } from './dropdown-state';
import type { PetBalance } from './pet-balance';
import Icon from './icons';
import './calendar-pet-preview.css';

export default function CalendarPetPreview({
  name,
  species,
  owner,
  location,
  status,
  balance,
}: {
  name: string;
  species: string;
  owner: string;
  location: string;
  status: string;
  balance?: PetBalance;
}) {
  const { i18n } = useTranslation();
  const profile = useCalendarPet(name);

  const [open, setOpen] = useDropdownState(false);
  const root = React.useRef<HTMLSpanElement>(null);
  const trigger = React.useRef<HTMLButtonElement>(null);
  const popup = React.useRef<HTMLDivElement>(null);
  const timer = React.useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const restoringFocus = React.useRef(false);
  const id = React.useId();
  function cancelTimer() {
    clearTimeout(timer.current);
  }
  function close(restore = false) {
    cancelTimer();
    setOpen(false);
    if (restore && document.activeElement !== trigger.current) {
      restoringFocus.current = true;
      trigger.current?.focus({ preventScroll: true });
      restoringFocus.current = false;
    }
  }
  function leave() {
    cancelTimer();
    timer.current = setTimeout(() => {
      if (!root.current?.contains(document.activeElement)) setOpen(false);
    }, 180);
  }
  React.useEffect(() => () => clearTimeout(timer.current), []);
  React.useLayoutEffect(() => {
    if (!open || !popup.current || !trigger.current) return;
    const menu = popup.current;
    const rect = trigger.current.getBoundingClientRect();
    const width = Math.min(360, innerWidth - 24);
    const beside = rect.right + width + 20 < innerWidth;
    menu.style.width = `${width}px`;
    menu.style.maxHeight = `${innerHeight - 24}px`;
    menu.style.left = `${beside ? rect.right + 12 : Math.max(12, Math.min(rect.left, innerWidth - width - 12))}px`;
    menu.showPopover();
    const height = menu.getBoundingClientRect().height;
    menu.style.top = `${Math.max(12, Math.min(beside ? rect.top : rect.bottom + 8, innerHeight - height - 12))}px`;
    const outside = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) close();
    };
    const scrolled = (event: Event) => {
      if (!(event.target instanceof Node) || !menu.contains(event.target)) close();
    };
    const resize = () => close();
    const escape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        event.stopPropagation();
        close(true);
      }
    };
    document.addEventListener('pointerdown', outside);
    document.addEventListener('scroll', scrolled, true);
    window.addEventListener('resize', resize);
    document.addEventListener('keydown', escape);
    return () => {
      if (menu.matches(':popover-open')) menu.hidePopover();
      document.removeEventListener('pointerdown', outside);
      document.removeEventListener('scroll', scrolled, true);
      window.removeEventListener('resize', resize);
      document.removeEventListener('keydown', escape);
    };
  }, [open, setOpen]);
  return (
    <span
      ref={root}
      className="hc-pet-preview-root"
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node)) close();
      }}
      onKeyDown={(event) => {
        if (event.key === 'Escape' && open) {
          event.preventDefault();
          event.stopPropagation();
          close(true);
        }
      }}
    >
      <button
        ref={trigger}
        type="button"
        className="hc-pet-preview-trigger"
        aria-label={`${uiText('ui.calendarPetPreview.viewPetDetails')}: ${name}`}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={open ? id : undefined}
        onPointerEnter={(event) => {
          if (event.pointerType === 'mouse') {
            cancelTimer();
            timer.current = setTimeout(() => setOpen(true), 160);
          }
        }}
        onPointerLeave={leave}
        onFocus={() => {
          if (!restoringFocus.current) {
            cancelTimer();
            setOpen(true);
          }
        }}
        onClick={() => {
          cancelTimer();
          setOpen(true);
        }}
      >
        <PetProfileAvatar name={name} className={'hc-avatar ' + species} showTitle={false} />
      </button>
      {open && (
        <div
          ref={popup}
          id={id}
          role="dialog"
          aria-labelledby={`${id}-title`}
          className="hc-pet-preview"
          popover="manual"
          onPointerEnter={cancelTimer}
          onPointerLeave={leave}
        >
          <button
            type="button"
            className="hc-pet-preview-close"
            aria-label={uiText('ui.calendarPetPreview.closePetDetails')}
            onClick={() => close(true)}
          >
            <Icon name="close" />
          </button>
          <div className="hc-pet-preview-header">
            <PetProfileAvatar name={name} className="hc-pet-preview-photo" showTitle={false} />
            <div>
              <h3 id={`${id}-title`}>{name}</h3>
              <p>
                {species === 'dog'
                  ? uiText('ui.calendarPetPreview.dog')
                  : species === 'cat'
                    ? uiText('ui.calendarPetPreview.cat')
                    : uiText('ui.calendarPetPreview.rabbit')}
              </p>
              <p>{status}</p>
            </div>
          </div>
          <dl>
            <div>
              <dt>{uiText('ui.calendarPetPreview.owner')}</dt>
              <dd>{owner}</dd>
            </div>
            <div>
              <dt>{uiText('ui.calendarPetPreview.weight')}</dt>
              <dd>
                {profile?.weightKg == null
                  ? uiText('common.notAvailable')
                  : uiText('ui.pets.weightValue', {
                      weight: new Intl.NumberFormat(localeFor(i18n.language)).format(
                        profile.weightKg,
                      ),
                    })}
              </dd>
            </div>
            <div>
              <dt>{uiText('ui.calendarPetPreview.boardingBalance')}</dt>
              <dd>{balance ? `${balance.days} ${uiText('ui.calendarPetPreview.days')}` : 'N/A'}</dd>
            </div>
            {balance && (
              <div>
                <dt>{uiText('ui.calendarPetPreview.validDates')}</dt>
                <dd>
                  {balance.validFrom} – {balance.validThrough}
                </dd>
              </div>
            )}
            <div>
              <dt>{uiText('ui.calendarPetPreview.location')}</dt>
              <dd>{location}</dd>
            </div>
          </dl>
          <div className="hc-pet-preview-links">
            <CalendarProfileLink name={name} />
            <a href={'/app/balances/?pet=' + encodeURIComponent(name)}>
              {uiText('ui.calendarPetPreview.viewBalance')}
            </a>
          </div>
        </div>
      )}
    </span>
  );
}
