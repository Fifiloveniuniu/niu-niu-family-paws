import Button from './button';
import Icon from './icons';
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
  adornment?: React.ReactNode;
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
  onMore?: () => void;
  moreLoading?: boolean;
  onQueryChange?: (query: string) => void;
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
  onMore,
  moreLoading,
  onQueryChange,
}: Props) {
  const [open, setOpen] = useDropdownState(false);
  const [query, setQuery] = React.useState('');
  const [typing, setTyping] = React.useState(false);
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
    setTyping(false);
    requestAnimationFrame(() => input.current?.select());
    onQueryChange?.('');
    setActive(
      Math.max(
        0,
        options.findIndex((option) => option.value === value),
      ),
    );
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
    <span
      className={'custom-autocomplete' + (selected?.adornment ? ' has-adornment' : '')}
      ref={root}
    >
      {selected?.adornment && (
        <span className="custom-autocomplete-adornment" aria-hidden="true">
          {selected.adornment}
        </span>
      )}
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
        placeholder={placeholder ?? label}
        data-value={value}
        value={open && typing ? query : (selected?.label ?? '')}
        onClick={() => {
          if (!open) reveal();
        }}
        onChange={(e) => {
          if (!open) setOpen(true);
          setTyping(true);
          setQuery(e.target.value);
          onQueryChange?.(e.target.value);
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
      <button
        type="button"
        className="custom-autocomplete-toggle"
        tabIndex={-1}
        disabled={disabled}
        aria-label={uiText('ui.autocomplete.toggle', { field: label })}
        aria-controls={open ? id : undefined}
        aria-expanded={open}
        onMouseDown={(event) => event.preventDefault()}
        onClick={() => {
          if (open) close();
          else reveal();
          input.current?.focus({ preventScroll: true });
        }}
      >
        <Icon name="chevron-down" />
      </button>
      {open &&
        portal &&
        createPortal(
          <div
            ref={popup}
            popover="manual"
            className="custom-select-options custom-autocomplete-options"
          >
            <div id={id} role="listbox" aria-label={label}>
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
            </div>
            {onMore && (
              <Button
                icon="chevron-down"
                type="button"
                variant="secondary"
                disabled={moreLoading}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => onMore()}
              >
                {uiText(moreLoading ? 'ui.workspace.loading' : 'ui.pagination.moreChoices')}
              </Button>
            )}
          </div>,
          portal,
        )}
    </span>
  );
}
