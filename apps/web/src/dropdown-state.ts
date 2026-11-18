import { useCallback, useEffect, useId, useState } from 'react';

const dropdownEvent = 'family-paws:dropdown-open';

/** Coordinate selectors, navigation submenus and the account menu. */
export function useDropdownState<T>(closed: T) {
  const id = useId();
  const [value, setValue] = useState<T>(closed);
  useEffect(() => {
    const close = (event: Event) => {
      if ((event as CustomEvent<string>).detail !== id) setValue(closed);
    };
    document.addEventListener(dropdownEvent, close);
    return () => document.removeEventListener(dropdownEvent, close);
  }, [id, closed]);
  const update = useCallback(
    (next: T) => {
      if (next !== closed) document.dispatchEvent(new CustomEvent(dropdownEvent, { detail: id }));
      setValue(next);
    },
    [closed, id],
  );
  return [value, update] as const;
}
