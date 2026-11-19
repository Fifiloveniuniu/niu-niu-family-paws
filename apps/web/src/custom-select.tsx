import Icon from './icons';
import React from 'react';
import { useDropdownState } from './dropdown-state';
import './custom-select.css';

type Props = React.SelectHTMLAttributes<HTMLSelectElement> & {
  renderChoice?: (value: string, label: string) => React.ReactNode;
};
type Choice = { value: string; label: string; disabled: boolean; lang?: string };

function text(node: React.ReactNode): string {
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (React.isValidElement<{ children?: React.ReactNode }>(node)) return text(node.props.children);
  if (Array.isArray(node)) return node.map(text).join('');
  return '';
}
function choices(children: React.ReactNode, disabled = false): Choice[] {
  const result: Choice[] = [];
  React.Children.forEach(children, (child) => {
    if (!React.isValidElement<React.OptionHTMLAttributes<HTMLOptionElement>>(child)) return;
    if (child.type === 'option')
      result.push({
        value: String(child.props.value ?? text(child.props.children)),
        label: child.props.label ?? text(child.props.children),
        disabled: disabled || !!child.props.disabled,
        lang: child.props.lang,
      });
    else result.push(...choices(child.props.children, disabled || !!child.props.disabled));
  });
  return result;
}

/** Custom single-select UI; the inaccessible native field retains form/change semantics. */
export default function CustomSelect(props: Props) {
  const {
    children,
    value,
    defaultValue,
    onChange,
    disabled,
    id,
    className,
    renderChoice,
    ...rest
  } = props;
  const options = choices(children);
  const [localValue, setLocalValue] = React.useState(
    String(defaultValue ?? options[0]?.value ?? ''),
  );
  const selected = String(value ?? localValue);
  const [open, setOpen] = useDropdownState(false);
  const [active, setActive] = React.useState(-1);
  const [label, setLabel] = React.useState('');
  const root = React.useRef<HTMLSpanElement>(null);
  const trigger = React.useRef<HTMLButtonElement>(null);
  const native = React.useRef<HTMLSelectElement>(null);
  const popup = React.useRef<HTMLDivElement>(null);
  const listId = React.useId();
  const prefix = React.useRef({ text: '', at: 0 });
  const selectedOption = options.find((item) => item.value === selected);

  React.useLayoutEffect(() => {
    const parent =
      root.current?.closest('label') ??
      (id ? document.querySelector(`label[for="${CSS.escape(id)}"]`) : null);
    if (!parent) return;
    const copy = parent.cloneNode(true) as HTMLElement;
    copy.querySelectorAll('.custom-select').forEach((element) => element.remove());
    setLabel(copy.textContent?.trim() ?? '');
  }, [children, id]);

  const reveal = () => {
    if (disabled) return;
    setActive(
      Math.max(
        0,
        options.findIndex((item) => item.value === selected && !item.disabled),
      ),
    );
    setOpen(true);
  };
  const choose = (index: number) => {
    const option = options[index];
    if (!option || option.disabled || !native.current) return;
    native.current.value = option.value;
    native.current.dispatchEvent(new Event('change', { bubbles: true }));
    setOpen(false);
    trigger.current?.focus({ preventScroll: true });
  };
  React.useLayoutEffect(() => {
    if (!open || !popup.current || !trigger.current) return;
    const menu = popup.current;
    const position = () => {
      const rect = trigger.current!.getBoundingClientRect();
      const viewport = window.visualViewport;
      const bottom = (viewport?.height ?? innerHeight) + (viewport?.offsetTop ?? 0);
      const spaceBelow = bottom - rect.bottom - 12;
      const spaceAbove = rect.top - 12;
      const above = spaceBelow < 180 && spaceAbove > spaceBelow;
      const height = Math.min(300, Math.max(80, above ? spaceAbove : spaceBelow));
      menu.style.width = `${Math.min(Math.max(rect.width, 180), innerWidth - 16)}px`;
      menu.style.maxHeight = `${height}px`;
      menu.style.left = `${Math.max(8, Math.min(rect.left, innerWidth - parseFloat(menu.style.width) - 8))}px`;
      menu.style.top = above ? 'auto' : `${rect.bottom + 6}px`;
      menu.style.bottom = above ? `${innerHeight - rect.top + 6}px` : 'auto';
    };
    position();
    menu.showPopover();
    const outside = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    };
    const scrolled = (event: Event) => {
      if (!(event.target instanceof Node) || !menu.contains(event.target)) {
        const rect = trigger.current!.getBoundingClientRect();
        if (rect.bottom < 0 || rect.top > innerHeight) setOpen(false);
        else position();
      }
    };
    document.addEventListener('pointerdown', outside);
    window.addEventListener('resize', position);
    window.visualViewport?.addEventListener('resize', position);
    document.addEventListener('scroll', scrolled, true);
    return () => {
      if (menu.matches(':popover-open')) menu.hidePopover();
      document.removeEventListener('pointerdown', outside);
      window.removeEventListener('resize', position);
      window.visualViewport?.removeEventListener('resize', position);
      document.removeEventListener('scroll', scrolled, true);
    };
  }, [open, setOpen]);
  React.useEffect(() => {
    const menu = popup.current;
    const option = menu?.querySelector<HTMLElement>(`[data-index="${active}"]`);
    if (open && menu && option) {
      if (option.offsetTop < menu.scrollTop) menu.scrollTop = option.offsetTop;
      else if (option.offsetTop + option.offsetHeight > menu.scrollTop + menu.clientHeight)
        menu.scrollTop = option.offsetTop + option.offsetHeight - menu.clientHeight;
    }
  }, [active, open]);
  React.useEffect(() => {
    if (disabled) setOpen(false);
  }, [disabled, setOpen]);

  function keyDown(event: React.KeyboardEvent<HTMLButtonElement>) {
    if (event.key === 'Escape' && open) {
      event.preventDefault();
      event.stopPropagation();
      setOpen(false);
      return;
    }
    if (event.key === 'Tab') return setOpen(false);
    if (['Enter', ' '].includes(event.key)) {
      event.preventDefault();
      if (open) choose(active);
      else reveal();
      return;
    }
    const enabled = options
      .map((option, index) => (option.disabled ? -1 : index))
      .filter((index) => index >= 0);
    if (!enabled.length) return;
    if (['ArrowDown', 'ArrowUp', 'Home', 'End', 'PageDown', 'PageUp'].includes(event.key)) {
      event.preventDefault();
      if (!open) reveal();
      const index = enabled.indexOf(
        open ? active : options.findIndex((option) => option.value === selected),
      );
      const offset =
        event.key === 'ArrowUp'
          ? -1
          : event.key === 'PageUp'
            ? -10
            : event.key === 'PageDown'
              ? 10
              : 1;
      const next =
        event.key === 'Home'
          ? 0
          : event.key === 'End'
            ? enabled.length - 1
            : Math.max(0, Math.min(enabled.length - 1, index + offset));
      setActive(enabled[next]);
    } else if (event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey) {
      event.preventDefault();
      const now = Date.now();
      prefix.current.text =
        now - prefix.current.at < 700 ? prefix.current.text + event.key : event.key;
      prefix.current.at = now;
      const query = prefix.current.text.toLocaleLowerCase();
      const match = options.findIndex(
        (option) => !option.disabled && option.label.toLocaleLowerCase().startsWith(query),
      );
      if (!open) reveal();
      if (match >= 0) setActive(match);
    }
  }
  return (
    <span className="custom-select" ref={root}>
      <select
        {...rest}
        ref={native}
        className="custom-select-native"
        aria-hidden="true"
        tabIndex={-1}
        disabled={disabled}
        value={value}
        defaultValue={defaultValue}
        onChange={(event) => {
          setLocalValue(event.target.value);
          onChange?.(event);
        }}
        onInvalid={(event) => {
          event.preventDefault();
          trigger.current?.focus();
          reveal();
        }}
      >
        {children}
      </select>
      <button
        ref={trigger}
        id={id}
        type="button"
        role="combobox"
        data-value={selected}
        className={`custom-select-trigger${className ? ' ' + className : ''}`}
        disabled={disabled}
        aria-label={props['aria-label'] ?? (label || undefined)}
        aria-labelledby={props['aria-labelledby']}
        aria-describedby={props['aria-describedby']}
        aria-invalid={props['aria-invalid']}
        aria-required={props.required}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        aria-activedescendant={open && active >= 0 ? `${listId}-${active}` : undefined}
        title={props.title}
        onClick={() => (open ? setOpen(false) : reveal())}
        onKeyDown={keyDown}
        onBlur={(event) => {
          if (!root.current?.contains(event.relatedTarget as Node)) setOpen(false);
        }}
      >
        <span className="custom-select-value">
          {selectedOption
            ? ((selected ? renderChoice?.(selected, selectedOption.label) : undefined) ??
              selectedOption.label)
            : 'N/A'}
        </span>
        <Icon name="chevron-down" />
      </button>
      {open && (
        <div
          ref={popup}
          id={listId}
          className="custom-select-options"
          popover="manual"
          role="listbox"
          aria-label={props['aria-label'] ?? (label || undefined)}
        >
          {options.map((option, index) => (
            <div
              key={`${option.value}-${index}`}
              id={`${listId}-${index}`}
              role="option"
              aria-selected={option.value === selected}
              aria-disabled={option.disabled || undefined}
              data-active={active === index || undefined}
              data-value={option.value}
              data-index={index}
              lang={option.lang}
              onPointerMove={() => {
                if (!option.disabled) setActive(index);
              }}
              onMouseDown={(event) => event.preventDefault()}
              onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
                choose(index);
              }}
            >
              <span>{renderChoice?.(option.value, option.label) ?? option.label}</span>
              <span aria-hidden="true">{option.value === selected ? '✓' : ''}</span>
            </div>
          ))}
        </div>
      )}
    </span>
  );
}
