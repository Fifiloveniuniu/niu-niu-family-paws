import React from 'react';
import { createPortal } from 'react-dom';
import { uiText } from './i18n.ts';
import { useDropdownState } from './dropdown-state';
import useAnchoredPopover from './use-anchored-popover';
import './custom-select.css';
import './custom-autocomplete.css';
export type AutocompleteOption = {
  value: string;
  label: string;
  search?: string;
  content?: React.ReactNode;
};
type Props = {
  label: string;
  value: string;
  options: AutocompleteOption[];
  onChange: (value: string) => void;
  required?: boolean;
  disabled?: boolean;
  placeholder?: string;
  name?: string;
};
/** A selection is always an option ID; typed text only filters the permitted options. */
export default function CustomAutocomplete({
  label,
  value,
  options,
  onChange,
  required,
  disabled,
  placeholder,
  name,
}: Props) {
  const [open, setOpen] = useDropdownState(false);
  const [query, setQuery] = React.useState('');
  const [active, setActive] = React.useState(0);
  const root = React.useRef<HTMLSpanElement>(null);
  const input = React.useRef<HTMLInputElement>(null);
  const popup = React.useRef<HTMLDivElement>(null);
  const id = React.useId();
  const [portal, setPortal] = React.useState<HTMLElement | null>(null);
  const selected = options.find((o) => o.value === value);
  const filtered = options.filter((o) =>
    (o.search ?? o.label).toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()),
  );
  const close = React.useCallback(() => setOpen(false), [setOpen]);
  useAnchoredPopover({ open, close, root, anchor: input, popup, width: 360, maxHeight: 320 });
  React.useLayoutEffect(() => {
    setPortal(root.current?.closest('dialog') ?? document.body);
  }, []);
  React.useEffect(() => {
    input.current?.setCustomValidity(
      required && !selected ? uiText('ui.autocomplete.chooseOption') : '',
    );
  }, [selected, required]);
  React.useEffect(() => {
    if (disabled) close();
  }, [disabled, close]);
  React.useEffect(() => {
    if (open)
      popup.current
        ?.querySelector<HTMLElement>(`[data-index="${active}"]`)
        ?.scrollIntoView({ block: 'nearest' });
  }, [active, open]);
  function reveal() {
    if (disabled) return;
    setQuery('');
    setActive(0);
    setOpen(true);
  }
  function choose(index: number) {
    const item = filtered[index];
    if (!item) return;
    onChange(item.value);
    close();
    setQuery('');
    input.current?.focus({ preventScroll: true });
  }
  return (
    <span className="custom-autocomplete" ref={root}>
      <input
        ref={input}
        name={name}
        role="combobox"
        aria-label={label}
        aria-autocomplete="list"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? id : undefined}
        aria-activedescendant={open && filtered[active] ? `${id}-${active}` : undefined}
        aria-required={required}
        required={required}
        disabled={disabled}
        autoComplete="off"
        placeholder={placeholder}
        data-value={value}
        value={open ? query : (selected?.label ?? '')}
        onClick={() => {
          if (!open) reveal();
        }}
        onChange={(e) => {
          if (!open) setOpen(true);
          setQuery(e.target.value);
          setActive(0);
          if (value) onChange('');
        }}
        onBlur={(e) => {
          if (
            !popup.current?.contains(e.relatedTarget as Node) &&
            !root.current?.contains(e.relatedTarget as Node)
          )
            close();
        }}
        onKeyDown={(e) => {
          if (e.key === 'Escape' && open) {
            e.preventDefault();
            e.stopPropagation();
            close();
          } else if (e.key === 'Tab') close();
          else if (['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(e.key)) {
            e.preventDefault();
            if (!open) reveal();
            else
              setActive(
                Math.max(
                  0,
                  Math.min(
                    filtered.length - 1,
                    e.key === 'Home'
                      ? 0
                      : e.key === 'End'
                        ? filtered.length - 1
                        : active + (e.key === 'ArrowUp' ? -1 : 1),
                  ),
                ),
              );
          } else if (e.key === 'Enter' && open) {
            e.preventDefault();
            choose(active);
          }
        }}
        onInvalid={() => {
          input.current?.focus();
          reveal();
        }}
      />
      {open &&
        portal &&
        createPortal(
          <div
            ref={popup}
            id={id}
            role="listbox"
            aria-label={label}
            popover="manual"
            className="custom-select-options custom-autocomplete-options"
          >
            {filtered.length ? (
              filtered.map((o, index) => (
                <div
                  key={o.value}
                  id={`${id}-${index}`}
                  role="option"
                  aria-label={o.label}
                  aria-selected={o.value === value}
                  data-value={o.value}
                  data-index={index}
                  data-active={index === active || undefined}
                  onPointerMove={() => setActive(index)}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    choose(index);
                  }}
                >
                  {o.content ?? o.label}
                </div>
              ))
            ) : (
              <p role="status">{uiText('ui.autocomplete.noMatches')}</p>
            )}
          </div>,
          portal,
        )}
    </span>
  );
}
