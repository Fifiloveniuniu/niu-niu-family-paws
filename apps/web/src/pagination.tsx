import Button from './button';
import React from 'react';
import { apiJson } from './api-client';
import { uiText } from './i18n.ts';
import CustomSelect from './custom-select';
export function useCursorPage<T>(path: string, refreshKey?: unknown, enabled = true) {
  const [navigation, setNavigation] = React.useState({
    path,
    index: 0,
    cursors: [''] as string[],
    size: '25',
  });
  if (navigation.path !== path) setNavigation({ ...navigation, path, index: 0, cursors: [''] });
  const current =
    navigation.path === path ? navigation : { ...navigation, path, index: 0, cursors: [''] };
  const [revision, reload] = React.useReducer((value) => value + 1, 0);
  const requestKey = path + '|' + current.size + '|' + current.cursors[current.index];
  const [state, setState] = React.useState<{
    key: string;
    items: T[];
    nextCursor: string | null;
    loading: boolean;
    error: boolean;
  }>({ key: '', items: [], nextCursor: null, loading: true, error: false });
  React.useEffect(() => {
    const abort = new AbortController();
    setState({ key: requestKey, items: [], nextCursor: null, loading: true, error: false });
    if (!enabled) {
      setState({ key: requestKey, items: [], nextCursor: null, loading: false, error: false });
      return;
    }
    const url = new URL(path, location.origin);
    url.searchParams.set('pageSize', current.size);
    if (current.cursors[current.index])
      url.searchParams.set('cursor', current.cursors[current.index]);
    void apiJson<{ items: T[]; nextCursor: string | null }>(url.pathname + url.search, {
      signal: abort.signal,
    })
      .then((result) => {
        if (!abort.signal.aborted)
          setState({ ...result, key: requestKey, loading: false, error: false });
      })
      .catch(() => {
        if (!abort.signal.aborted)
          setState({ key: requestKey, items: [], nextCursor: null, loading: false, error: true });
      });
    return () => abort.abort();
  }, [requestKey, refreshKey, revision, enabled]);
  const value =
    state.key === requestKey
      ? state
      : { ...state, items: [], nextCursor: null, loading: true, error: false };
  return {
    ...value,
    index: current.index,
    size: current.size,
    reload,
    previous: () => setNavigation({ ...current, index: Math.max(0, current.index - 1) }),
    next: () => {
      if (value.nextCursor && !value.loading && !value.error)
        setNavigation({
          ...current,
          index: current.index + 1,
          cursors: [...current.cursors.slice(0, current.index + 1), value.nextCursor],
        });
    },
    setSize: (size: string) => setNavigation({ ...current, size, index: 0, cursors: [''] }),
    reset: () => setNavigation({ ...current, index: 0, cursors: [''] }),
  };
}
export function Pagination({
  page,
  label,
}: {
  page: Omit<ReturnType<typeof useCursorPage>, 'key'>;
  label: string;
}) {
  const t = (key: string, values: Record<string, unknown> = {}) =>
    uiText('ui.pagination.' + key, values);
  const first = page.items.length ? page.index * Number(page.size) + 1 : 0,
    last = page.items.length ? first + page.items.length - 1 : 0;
  return (
    <nav className="workspace-pagination" aria-label={label}>
      <label>
        {t('pageSize')}
        <CustomSelect
          value={page.size}
          disabled={page.loading}
          onChange={(event) => page.setSize(event.target.value)}
        >
          {['25', '50', '100'].map((size) => (
            <option key={size} value={size}>
              {size}
            </option>
          ))}
        </CustomSelect>
      </label>
      <span role="status">{t('range', { first, last, page: page.index + 1 })}</span>
      <Button
        variant="secondary"
        disabled={page.loading || page.index === 0}
        onClick={page.previous}
      >
        {t('previous')}
      </Button>
      <Button
        variant="secondary"
        disabled={page.loading || page.error || !page.nextCursor}
        onClick={page.next}
      >
        {t('next')}
      </Button>
      {page.error && (
        <span role="alert">
          {t('error')}{' '}
          <Button variant="secondary" onClick={page.reload}>
            {t('retry')}
          </Button>
          {page.index > 0 && (
            <Button variant="secondary" onClick={page.reset}>
              {t('first')}
            </Button>
          )}
        </span>
      )}
    </nav>
  );
}
