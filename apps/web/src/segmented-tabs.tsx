import React from 'react';

type Tab<T extends string> = {
  value: T;
  label: React.ReactNode;
  ariaLabel?: string;
  id?: string;
  panelId?: string;
};

/** Shared segmented tabs and filters with automatic activation and roving keyboard focus. */
export default function SegmentedTabs<T extends string>({
  label,
  value,
  items,
  onChange,
  className = '',
  mode = 'tabs',
}: {
  label: string;
  value: T | undefined;
  items: readonly Tab<T>[];
  onChange: (value: T) => void;
  className?: string;
  mode?: 'tabs' | 'buttons';
}) {
  const buttons = React.useRef<(HTMLButtonElement | null)[]>([]);
  return (
    <div
      className={'hc-scales shared-tabs ' + className}
      role={mode === 'tabs' ? 'tablist' : 'group'}
      aria-label={label}
    >
      {items.map((item, index) => (
        <button
          key={item.value}
          ref={(node) => {
            buttons.current[index] = node;
          }}
          type="button"
          role={mode === 'tabs' ? 'tab' : undefined}
          id={item.id}
          aria-controls={item.panelId}
          aria-label={item.ariaLabel}
          data-selected={value === item.value}
          aria-selected={mode === 'tabs' ? value === item.value : undefined}
          aria-pressed={mode === 'buttons' ? value === item.value : undefined}
          tabIndex={mode === 'buttons' || value === item.value ? 0 : -1}
          onClick={() => onChange(item.value)}
          onKeyDown={(event) => {
            let next: number;
            if (event.key === 'ArrowRight') next = (index + 1) % items.length;
            else if (event.key === 'ArrowLeft') next = (index + items.length - 1) % items.length;
            else if (event.key === 'Home') next = 0;
            else if (event.key === 'End') next = items.length - 1;
            else return;
            event.preventDefault();
            onChange(items[next].value);
            buttons.current[next]?.focus();
          }}
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}
