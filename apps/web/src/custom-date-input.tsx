import React from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { localeFor, uiText } from './i18n.ts';
import { localDateKey, localDateTimeValue } from './date-utils';
import { useDropdownState } from './dropdown-state';
import useAnchoredPopover from './use-anchored-popover';
import Icon from './icons';
import './custom-date-input.css';

type Props = Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type' | 'value' | 'onChange'> & {
  type?: 'date' | 'datetime-local';
  value: string;
  onChange: (value: string) => void;
};
function localDay(year: number, month: number, day: number) {
  const date = new Date(0);
  date.setHours(0, 0, 0, 0);
  date.setFullYear(year, month, day);
  return date;
}
function parse(value: string, time: boolean) {
  const normalized = value.trim().replace(' ', 'T');
  const match = (
    time ? /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/ : /^(\d{4})-(\d{2})-(\d{2})$/
  ).exec(normalized);
  if (!match) return null;
  const [year, month, day, hour = 0, minute = 0] = match.slice(1).map(Number);
  const date = localDay(year, month - 1, day);
  date.setHours(hour, minute, 0, 0);
  if (
    year < 1 ||
    year > 9999 ||
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day ||
    hour > 23 ||
    minute > 59 ||
    date.getHours() !== hour ||
    date.getMinutes() !== minute
  )
    return null;
  return { date, value: time ? localDateTimeValue(date) : localDateKey(date) };
}
const display = (value: string) => value.replace('T', ' ');

export default function CustomDateInput({
  type = 'date',
  value,
  onChange,
  disabled,
  min,
  max,
  className,
  ...props
}: Props) {
  const { i18n } = useTranslation();
  const time = type === 'datetime-local';
  const [open, setOpen] = useDropdownState(false);
  const [draft, setDraft] = React.useState(display(value));
  const lastEmitted = React.useRef(value);
  const initial = parse(value, time)?.date ?? new Date();
  const [month, setMonth] = React.useState(() =>
    localDay(initial.getFullYear(), initial.getMonth(), 1),
  );
  const [day, setDay] = React.useState(() => localDateKey(initial));
  const [hour, setHour] = React.useState(value ? String(initial.getHours()).padStart(2, '0') : '');
  const [minute, setMinute] = React.useState(
    value ? String(initial.getMinutes()).padStart(2, '0') : '',
  );
  const [pickedDay, setPickedDay] = React.useState(!!parse(value, time));
  const [portalRoot, setPortalRoot] = React.useState<HTMLElement | null>(null);
  const [mode, setMode] = React.useState<'days' | 'months' | 'years'>('days');
  const [label, setLabel] = React.useState('');
  const root = React.useRef<HTMLSpanElement>(null);
  const input = React.useRef<HTMLInputElement>(null);
  const popup = React.useRef<HTMLDivElement>(null);
  const focusDay = React.useRef(false);
  const id = React.useId();
  React.useLayoutEffect(() => {
    setPortalRoot(root.current?.closest('dialog') ?? document.body);
  }, []);
  const close = React.useCallback(() => setOpen(false), [setOpen]);
  useAnchoredPopover({ open, close, root, anchor: input, popup, width: 360, maxHeight: 540 });
  React.useEffect(() => {
    if (value !== lastEmitted.current) setDraft(display(value));
    lastEmitted.current = value;
  }, [value]);
  React.useLayoutEffect(() => {
    const parent = root.current?.closest('label');
    if (!parent) return;
    const copy = parent.cloneNode(true) as HTMLElement;
    copy.querySelectorAll('.custom-date-input').forEach((element) => element.remove());
    setLabel(copy.textContent?.trim() ?? '');
  }, [i18n.language]);
  const bounded = (candidate: string) =>
    (!min || candidate >= String(min)) && (!max || candidate <= String(max));
  const parsed = parse(draft, time);
  const invalid = !!draft && (!parsed || !bounded(parsed.value));
  React.useEffect(() => {
    input.current?.setCustomValidity(
      invalid ? uiText(time ? 'ui.datePicker.invalidDateTime' : 'ui.datePicker.invalidDate') : '',
    );
  }, [invalid, time, i18n.language]);
  React.useEffect(() => {
    if (disabled) close();
  }, [disabled, close]);
  React.useEffect(() => {
    if (open && mode === 'days' && focusDay.current) {
      focusDay.current = false;
      popup.current
        ?.querySelector<HTMLButtonElement>(`[data-date="${day}"]`)
        ?.focus({ preventScroll: true });
    }
  }, [open, mode, day, month]);
  const emit = (next: string) => {
    lastEmitted.current = next;
    onChange(next);
  };
  const commit = (next: string) => {
    if (next && !bounded(next)) return;
    setDraft(display(next));
    emit(next);
    close();
    input.current?.focus({ preventScroll: true });
  };
  function reveal(keyboard = false) {
    if (disabled) return;
    const current = parse(value, time)?.date ?? new Date();
    setMonth(localDay(current.getFullYear(), current.getMonth(), 1));
    setDay(localDateKey(current));
    setHour(parse(value, time) ? String(current.getHours()).padStart(2, '0') : '');
    setMinute(parse(value, time) ? String(current.getMinutes()).padStart(2, '0') : '');
    setPickedDay(!!parse(value, time));
    setMode('days');
    focusDay.current = keyboard;
    setOpen(true);
  }
  function shiftMonth(offset: number) {
    const next = localDay(month.getFullYear(), month.getMonth() + offset, 1);
    if (next.getFullYear() >= 1 && next.getFullYear() <= 9999) setMonth(next);
  }
  function choose(date: Date) {
    const next = localDateKey(date);
    if ((min && next < String(min).slice(0, 10)) || (max && next > String(max).slice(0, 10)))
      return;
    setDay(next);
    setPickedDay(true);
    if (!time) commit(next);
  }
  const locale = localeFor(i18n.language);
  const week = new Intl.Locale(locale) as Intl.Locale & {
    getWeekInfo?: () => { firstDay: number };
    weekInfo?: { firstDay: number };
  };
  const firstDay = (week.getWeekInfo?.().firstDay ?? week.weekInfo?.firstDay ?? 1) % 7;
  const start = localDay(
    month.getFullYear(),
    month.getMonth(),
    1 - ((month.getDay() - firstDay + 7) % 7),
  );
  const days = Array.from({ length: 42 }, (_, index) =>
    localDay(start.getFullYear(), start.getMonth(), start.getDate() + index),
  );
  const weekdays = Array.from({ length: 7 }, (_, index) =>
    new Intl.DateTimeFormat(locale, { weekday: 'short' }).format(
      localDay(2026, 10, 15 + ((firstDay + index) % 7)),
    ),
  );
  const months = Array.from({ length: 12 }, (_, index) =>
    new Intl.DateTimeFormat(locale, { month: 'long' }).format(
      localDay(month.getFullYear(), index, 1),
    ),
  );
  const yearStart = Math.max(1, Math.floor((month.getFullYear() - 1) / 16) * 16 + 1);
  const timeValue =
    pickedDay &&
    /^\d{1,2}$/.test(hour) &&
    /^\d{1,2}$/.test(minute) &&
    Number(hour) <= 23 &&
    Number(minute) <= 59
      ? parse(`${day}T${hour.padStart(2, '0')}:${minute.padStart(2, '0')}`, true)?.value
      : undefined;
  const fieldLabel = props['aria-label'] ?? label;
  return (
    <span
      className="custom-date-input"
      ref={root}
      onBlur={(event) => {
        if (
          !event.currentTarget.contains(event.relatedTarget as Node) &&
          !popup.current?.contains(event.relatedTarget as Node)
        )
          close();
      }}
      onKeyDown={(event) => {
        if (event.key === 'Escape' && open) {
          event.preventDefault();
          event.stopPropagation();
          close();
          input.current?.focus({ preventScroll: true });
        }
      }}
    >
      <span className="custom-date-field">
        <input
          {...props}
          ref={input}
          type="text"
          role="combobox"
          aria-label={fieldLabel || undefined}
          className={className}
          disabled={disabled}
          value={draft}
          data-value={value}
          autoComplete="off"
          spellCheck={false}
          placeholder={props.placeholder ?? uiText('common.notAvailable')}
          aria-haspopup="dialog"
          aria-expanded={open}
          aria-controls={open ? id : undefined}
          aria-invalid={invalid || props['aria-invalid'] || undefined}
          onChange={(event) => {
            const text = event.target.value;
            setDraft(text);
            const next = parse(text, time);
            emit(next && bounded(next.value) ? next.value : text);
          }}
          onClick={() => {
            if (!open) reveal();
          }}
          onKeyDown={(event) => {
            if (event.key === 'ArrowDown') {
              event.preventDefault();
              reveal(true);
            } else if (event.key === 'Enter' && open) {
              event.preventDefault();
              if (parsed && bounded(parsed.value)) commit(parsed.value);
            }
          }}
        />
        <button
          type="button"
          className="custom-date-toggle"
          disabled={disabled}
          tabIndex={-1}
          aria-label={uiText('ui.datePicker.open', { field: fieldLabel })}
          onClick={() => (open ? close() : reveal())}
        >
          <Icon name="calendar" />
        </button>
      </span>
      {invalid && (
        <span className="custom-date-error" role="status">
          {uiText(time ? 'ui.datePicker.invalidDateTime' : 'ui.datePicker.invalidDate')}
        </span>
      )}
      {open &&
        portalRoot &&
        createPortal(
          <div
            ref={popup}
            id={id}
            role="dialog"
            aria-label={fieldLabel}
            popover="manual"
            className="custom-date-options"
          >
            <div className="custom-date-heading">
              <button
                type="button"
                aria-label={uiText('ui.datePicker.previous')}
                onClick={() =>
                  mode === 'years'
                    ? shiftMonth(-16 * 12)
                    : mode === 'months'
                      ? shiftMonth(-12)
                      : shiftMonth(-1)
                }
              >
                ‹
              </button>
              <button type="button" onClick={() => setMode(mode === 'months' ? 'days' : 'months')}>
                {new Intl.DateTimeFormat(locale, { month: 'long' }).format(month)}
              </button>
              <button type="button" onClick={() => setMode(mode === 'years' ? 'days' : 'years')}>
                {month.getFullYear()}
              </button>
              <button
                type="button"
                aria-label={uiText('ui.datePicker.next')}
                onClick={() =>
                  mode === 'years'
                    ? shiftMonth(16 * 12)
                    : mode === 'months'
                      ? shiftMonth(12)
                      : shiftMonth(1)
                }
              >
                ›
              </button>
            </div>
            {mode === 'days' ? (
              <div
                role="grid"
                aria-label={new Intl.DateTimeFormat(locale, {
                  month: 'long',
                  year: 'numeric',
                }).format(month)}
              >
                <div role="row" className="custom-date-weekdays">
                  {weekdays.map((name, index) => (
                    <span key={index} role="columnheader">
                      {name}
                    </span>
                  ))}
                </div>
                {Array.from({ length: 6 }, (_, row) => (
                  <div role="row" className="custom-date-week" key={row}>
                    {days.slice(row * 7, row * 7 + 7).map((date) => {
                      const key = localDateKey(date);
                      const unavailable =
                        (!!min && key < String(min).slice(0, 10)) ||
                        (!!max && key > String(max).slice(0, 10));
                      return (
                        <span role="gridcell" key={key} aria-selected={pickedDay && key === day}>
                          <button
                            type="button"
                            data-date={key}
                            tabIndex={key === day ? 0 : -1}
                            aria-label={new Intl.DateTimeFormat(locale, {
                              dateStyle: 'full',
                            }).format(date)}
                            aria-current={key === localDateKey(new Date()) ? 'date' : undefined}
                            className={
                              date.getMonth() !== month.getMonth() ? 'outside-month' : undefined
                            }
                            disabled={unavailable}
                            onClick={() => choose(date)}
                            onKeyDown={(event) => {
                              if (
                                ![
                                  'ArrowLeft',
                                  'ArrowRight',
                                  'ArrowUp',
                                  'ArrowDown',
                                  'Home',
                                  'End',
                                  'PageUp',
                                  'PageDown',
                                ].includes(event.key)
                              )
                                return;
                              event.preventDefault();
                              const next = new Date(date);
                              if (event.key === 'PageUp' || event.key === 'PageDown') {
                                const target = localDay(
                                  next.getFullYear(),
                                  next.getMonth() + (event.key === 'PageUp' ? -1 : 1),
                                  1,
                                );
                                const last = localDay(
                                  target.getFullYear(),
                                  target.getMonth() + 1,
                                  0,
                                ).getDate();
                                next.setDate(1);
                                next.setFullYear(
                                  target.getFullYear(),
                                  target.getMonth(),
                                  Math.min(date.getDate(), last),
                                );
                              } else
                                next.setDate(
                                  next.getDate() +
                                    ({
                                      ArrowLeft: -1,
                                      ArrowRight: 1,
                                      ArrowUp: -7,
                                      ArrowDown: 7,
                                      Home: -(next.getDay() - firstDay + 7) % 7,
                                      End: 6 - ((next.getDay() - firstDay + 7) % 7),
                                    }[event.key] ?? 0),
                                );
                              focusDay.current = true;
                              setDay(localDateKey(next));
                              setMonth(localDay(next.getFullYear(), next.getMonth(), 1));
                            }}
                          >
                            {date.getDate()}
                          </button>
                        </span>
                      );
                    })}
                  </div>
                ))}
              </div>
            ) : mode === 'months' ? (
              <div className="custom-date-months">
                {months.map((name, index) => (
                  <button
                    key={index}
                    type="button"
                    onClick={() => {
                      setMonth(localDay(month.getFullYear(), index, 1));
                      setMode('days');
                    }}
                  >
                    {name}
                  </button>
                ))}
              </div>
            ) : (
              <div className="custom-date-months">
                {Array.from({ length: 16 }, (_, index) => yearStart + index)
                  .filter((year) => year <= 9999)
                  .map((year) => (
                    <button
                      key={year}
                      type="button"
                      onClick={() => {
                        setMonth(localDay(year, month.getMonth(), 1));
                        setMode('months');
                      }}
                    >
                      {year}
                    </button>
                  ))}
              </div>
            )}
            {time && (
              <div className="custom-date-time">
                <label>
                  {uiText('ui.datePicker.hour')}
                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={2}
                    value={hour}
                    placeholder="00"
                    onChange={(event) => setHour(event.target.value.replace(/\D/g, ''))}
                  />
                </label>
                <span aria-hidden="true">:</span>
                <label>
                  {uiText('ui.datePicker.minute')}
                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={2}
                    value={minute}
                    placeholder="00"
                    onChange={(event) => setMinute(event.target.value.replace(/\D/g, ''))}
                  />
                </label>
                <button
                  type="button"
                  aria-label={uiText('ui.datePicker.applyDateTime')}
                  disabled={!timeValue || !bounded(timeValue)}
                  onClick={() => timeValue && commit(timeValue)}
                >
                  {uiText('ui.datePicker.apply')}
                </button>
              </div>
            )}
            <div className="custom-date-footer">
              <button
                type="button"
                onClick={() => {
                  const today = new Date();
                  setMonth(localDay(today.getFullYear(), today.getMonth(), 1));
                  choose(today);
                }}
              >
                {uiText('ui.datePicker.today')}
              </button>
              <button type="button" onClick={() => commit('')}>
                {uiText('ui.datePicker.clear')}
              </button>
              <button
                type="button"
                onClick={() => {
                  close();
                  input.current?.focus();
                }}
              >
                {uiText('ui.datePicker.close')}
              </button>
            </div>
          </div>,
          portalRoot,
        )}
    </span>
  );
}
