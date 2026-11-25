import { dialogUrl } from './dialog-url';
import React from 'react';
import { uiText } from './i18n';
import { routeUrl } from './routing';
const subscribers = new Set<() => void>();
const errors = new Set<string>();
let errorVersion = 0;
function publishError(key: string, failed: boolean) {
  if (errors.has(key) === failed) return;
  if (failed) errors.add(key);
  else errors.delete(key);
  errorVersion++;
  subscribers.forEach((fn) => fn());
}
function subscribe(fn: () => void) {
  window.addEventListener('family-paws:route-accepted', fn);
  return () => window.removeEventListener('family-paws:route-accepted', fn);
}
function write(key: string, value: string | null) {
  const to = dialogUrl(location.href, key, value);
  if (to === routeUrl()) return;
  const index = (Number(history.state?.familyPawsIndex) || 0) + (value === null ? 0 : 1);
  history[value === null ? 'replaceState' : 'pushState'](
    { ...history.state, familyPawsIndex: index, familyPawsFrom: routeUrl() },
    '',
    to,
  );
  window.dispatchEvent(new Event('family-paws:navigation'));
}
export const DIALOG_PENDING = Symbol('dialog-pending');
type Options<T> = {
  encode?: (value: T) => string | null;
  decode?: (
    raw: string,
    signal: AbortSignal,
  ) => T | typeof DIALOG_PENDING | Promise<T | typeof DIALOG_PENDING>;
};
/** URLs contain only dialog identifiers/context, never draft form values or credentials. */
export function useDialogState<T>(
  name: string,
  initial: T,
  options: Options<T> = {},
  dependencies: unknown[] = [],
): [T, React.Dispatch<React.SetStateAction<T>>] {
  const key = 'dialog.' + name;
  const token = React.useSyncExternalStore(
    subscribe,
    () => new URLSearchParams(location.search).get(key),
    () => null,
  );
  const [value, setValue] = React.useState(initial);
  const state = React.useRef(value);
  state.current = value;
  const config = React.useRef(options);
  config.current = options;
  const initialValue = React.useRef(initial);
  const applied = React.useRef<string | null | undefined>(undefined);
  React.useEffect(() => {
    if (applied.current === token) return;
    const abort = new AbortController();
    if (token === null) {
      applied.current = null;
      state.current = initialValue.current;
      setValue(initialValue.current);
      publishError(key, false);
      return;
    }
    void Promise.resolve()
      .then(() =>
        config.current.decode
          ? config.current.decode(token, abort.signal)
          : (() => {
              const parsed = JSON.parse(token);
              if (typeof initialValue.current === 'boolean' && typeof parsed !== 'boolean')
                throw Error('Invalid dialog state');
              return parsed as T;
            })(),
      )
      .then((next) => {
        if (abort.signal.aborted || next === DIALOG_PENDING) return;
        applied.current = token;
        state.current = next;
        setValue(next);
        publishError(key, false);
      })
      .catch(() => {
        if (!abort.signal.aborted) {
          applied.current = token;
          state.current = initialValue.current;
          setValue(initialValue.current);
          publishError(key, true);
        }
      });
    return () => abort.abort();
  }, [token, ...dependencies]);
  React.useEffect(
    () => () => {
      if (errors.has(key)) publishError(key, false);
    },
    [key],
  );
  const set: React.Dispatch<React.SetStateAction<T>> = React.useCallback(
    (next) => {
      const resolved = typeof next === 'function' ? (next as (value: T) => T)(state.current) : next;
      const encoded = config.current.encode
        ? config.current.encode(resolved)
        : resolved === false || resolved === null || resolved === undefined
          ? null
          : JSON.stringify(resolved);
      applied.current = encoded;
      state.current = resolved;
      setValue(resolved);
      publishError(key, false);
      write(key, encoded);
    },
    [key],
  );
  return [value, set];
}
export function DialogRouteErrors() {
  React.useSyncExternalStore(
    (fn) => {
      subscribers.add(fn);
      return () => {
        subscribers.delete(fn);
      };
    },
    () => errorVersion,
    () => 0,
  );
  return errors.size ? (
    <p role="alert" className="workspace-form-error">
      {uiText('ui.dialogRouting.unavailable')}
    </p>
  ) : null;
}
export function dialogIdentifier(raw: string) {
  if (!/^[A-Za-z0-9_-]{1,120}$/.test(raw)) throw Error('Invalid dialog target');
  return raw;
}
