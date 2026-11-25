import React from 'react';
import { apiJson } from './api-client';
import { uiText } from './i18n';
import LoadMore from './load-more';
import { appendRecords } from './record-list-state';
import './record-list.css';

type Batch<T> = { items: T[]; nextCursor: string | null };
const batch = <T,>(response: Batch<T>) => response;

/** Bounded cursor requests; retained rows and current scope never cross filters. */
export function useRecordList<T, R = Batch<T>>(
  path: string,
  refreshKey?: unknown,
  enabled = true,
  select: (response: R) => Batch<T> = batch as (response: R) => Batch<T>,
) {
  const [revision, refresh] = React.useReducer((value) => value + 1, 0);
  const scope = React.useMemo(() => ({ path }), [path, refreshKey, revision]);
  const [request, setRequest] = React.useState({ scope, cursor: '', attempt: 0 });
  const cursor = request.scope === scope ? request.cursor : '';
  const attempt = request.scope === scope ? request.attempt : 0;
  const [state, setState] = React.useState<{
    scope: typeof scope;
    items: T[];
    response?: R;
    nextCursor: string | null;
    completed: string | null;
    cursors: string[];
    loading: boolean;
    error: boolean;
  }>({
    scope,
    items: [],
    nextCursor: null,
    completed: null,
    cursors: [],
    loading: enabled,
    error: false,
  });
  const latest = React.useRef(state);
  latest.current = state;
  const locked = React.useRef(false);
  React.useEffect(() => {
    locked.current = false;
    if (!enabled) return;
    if (latest.current.scope === scope && latest.current.completed === cursor) return;
    const abort = new AbortController();
    locked.current = true;
    setState((old) => ({
      ...(old.scope === scope
        ? old
        : { scope, items: [], nextCursor: null, completed: null, cursors: [] }),
      loading: true,
      error: false,
    }));
    const url = new URL(path, location.origin);
    url.searchParams.set('pageSize', '25');
    if (cursor) url.searchParams.set('cursor', cursor);
    void apiJson<R>(url.pathname + url.search, { signal: abort.signal })
      .then((response) => {
        if (abort.signal.aborted) return;
        const result = select(response);
        const old = latest.current.scope === scope ? latest.current : null;
        if (
          result.nextCursor &&
          (result.nextCursor === cursor || old?.cursors.includes(result.nextCursor))
        )
          throw Error('Repeated continuation');
        setState({
          scope,
          items: appendRecords(old?.items ?? [], result.items),
          response,
          nextCursor: result.nextCursor,
          completed: cursor,
          cursors: [...(old?.cursors ?? []), cursor],
          loading: false,
          error: false,
        });
      })
      .catch(() => {
        if (!abort.signal.aborted) setState((old) => ({ ...old, loading: false, error: true }));
      })
      .finally(() => {
        if (!abort.signal.aborted) locked.current = false;
      });
    return () => abort.abort();
  }, [scope, cursor, attempt, enabled, select]);
  const current =
    state.scope === scope
      ? state
      : {
          scope,
          items: [] as T[],
          response: undefined,
          nextCursor: null,
          completed: null,
          cursors: [],
          loading: enabled,
          error: false,
        };
  const loadMore = React.useCallback(() => {
    if (!enabled || locked.current) return;
    const value = latest.current;
    if (value.scope !== scope) return;
    if (value.error) {
      locked.current = true;
      setRequest((old) => ({ scope, cursor, attempt: old.attempt + 1 }));
    } else if (value.nextCursor) {
      locked.current = true;
      setRequest({ scope, cursor: value.nextCursor, attempt: 0 });
    }
  }, [scope, cursor, enabled]);
  const position = React.useMemo(() => ({ top: 0, left: 0 }), [scope]);
  return { ...current, enabled, loadMore, reload: refresh, position };
}

type ListState = {
  nextCursor: string | null;
  loading: boolean;
  error: boolean;
  enabled: boolean;
  loadMore: () => void;
  position: { top: number; left: number };
};
export function RecordList({
  list,
  label,
  children,
  resetKey,
}: {
  list: ListState;
  label: string;
  children: React.ReactNode;
  resetKey?: string;
}) {
  const root = React.useRef<HTMLDivElement>(null);
  const previousPosition = React.useRef(list.position);
  React.useLayoutEffect(() => {
    const element = root.current;
    if (!element) return;
    element.scrollTo(list.position.left, list.position.top);
    if (
      previousPosition.current !== list.position &&
      element.scrollHeight <= element.clientHeight + 1
    ) {
      const top = element.getBoundingClientRect().top;
      if (top < 80) window.scrollBy({ top: top - 80, behavior: 'instant' });
    }
    previousPosition.current = list.position;
  }, [list.position, resetKey, list.enabled]);

  return (
    <div
      className="record-list-scroll"
      ref={root}
      role="region"
      aria-label={label}
      tabIndex={0}
      onScroll={(event) => {
        list.position.top = event.currentTarget.scrollTop;
        list.position.left = event.currentTarget.scrollLeft;
      }}
    >
      {children}
      {list.error && <p role="alert">{uiText('ui.workspace.loadError')}</p>}
      <LoadMore
        hasMore={!!list.nextCursor}
        loading={list.loading && list.enabled}
        error={list.error}
        disabled={!list.enabled}
        label={uiText('ui.records.more')}
        loadingLabel={uiText('ui.workspace.loading')}
        retryLabel={uiText('ui.workspace.retry')}
        onLoad={list.loadMore}
      />
    </div>
  );
}
