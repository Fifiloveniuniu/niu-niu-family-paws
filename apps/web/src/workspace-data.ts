import React from 'react';
import { apiJson, ApiError } from './api-client';
import type { components } from '../../../packages/contracts/generated';
export type Customer = components['schemas']['Customer'];
export type Booking = components['schemas']['Booking'];
export type Account = components['schemas']['BoardingAccount'];
export type PetRow = components['schemas']['WorkspacePets']['items'][number];
export type LocationRow = components['schemas']['WorkspaceLocations']['items'][number];
export type EventRow = components['schemas']['WorkspaceEvents']['items'][number];
export const petKey = (customerId: string, petId: string) => customerId + '/' + petId;
export const roomKey = (houseId: string, roomId: string) => houseId + '/' + roomId;
export function scopedUrl(path: string, scope?: string | null) {
  const url = new URL(path, location.origin);
  if (scope) url.searchParams.set('asCustomer', scope);
  return url.pathname + url.search;
}
export type BusySpan = { houseId: string; roomId: string; from: string; through: string };
export type WorkspaceData = {
  admin: boolean;
  customer: Customer | null;
  rows: PetRow[];
  customers: Customer[];
  locations: LocationRow[];
  bookings: Booking[];
  busy?: BusySpan[];
};
async function allPets(scope: string | undefined, signal: AbortSignal, firstOnly = false) {
  let cursor: string | null = null;
  const seen = new Set<string>();
  let first: components['schemas']['WorkspacePets'] | null = null;
  const items: PetRow[] = [];
  do {
    const params = new URLSearchParams();
    if (firstOnly) params.set('pageSize', '25');
    if (scope) params.set('customerId', scope);
    if (cursor) params.set('cursor', cursor);
    const page = await apiJson<components['schemas']['WorkspacePets']>(
      '/workspace/pets?' + params,
      { signal },
    );
    if (first && (first.admin !== page.admin || first.customer?.id !== page.customer?.id))
      throw new ApiError(409, 'context_changed');
    first ??= page;
    items.push(...page.items);
    cursor = page.nextCursor;
    if (cursor) {
      if (seen.has(cursor)) throw new Error('Invalid pagination');
      seen.add(cursor);
    }
  } while (cursor && !firstOnly);
  return { ...first!, items };
}
async function allCustomers(signal: AbortSignal, firstOnly = false) {
  let cursor: string | null = null;
  const seen = new Set<string>();
  const items: Customer[] = [];
  do {
    const page: components['schemas']['CustomerPage'] = await apiJson<
      components['schemas']['CustomerPage']
    >('/customers' + (cursor ? '?cursor=' + encodeURIComponent(cursor) : ''), { signal });
    items.push(...page.items);
    cursor = page.nextCursor;
    if (cursor) {
      if (seen.has(cursor)) throw new Error('Invalid pagination');
      seen.add(cursor);
    }
  } while (cursor && !firstOnly);
  return items;
}
async function allBookings(
  scope: string | undefined,
  range: { from: string; through: string },
  signal: AbortSignal,
) {
  let cursor: string | null = null;
  const seen = new Set<string>();
  const items: Booking[] = [];
  if (!range.from || !range.through) return items;
  do {
    const params = new URLSearchParams({ from: range.from, through: range.through });
    if (scope) params.set('customerId', scope);
    if (cursor) params.set('cursor', cursor);
    const page = await apiJson<{ items: Booking[]; nextCursor: string | null }>(
      '/bookings?' + params,
      { signal },
    );
    items.push(...page.items);
    cursor = page.nextCursor;
    if (cursor) {
      if (seen.has(cursor)) throw new Error('Invalid pagination');
      seen.add(cursor);
    }
  } while (cursor);
  return items;
}
export function useWorkspaceData(
  identity: string,
  scope: string | undefined,
  range: { from: string; through: string },
  enabled = true,
  firstOnly = false,
) {
  const key = identity + ':' + (scope ?? '') + ':' + firstOnly;
  const [state, setState] = React.useState<{
    key: string;
    data: WorkspaceData | null;
    loading: boolean;
    error: unknown;
  }>({ key, data: null, loading: true, error: null });
  const generation = React.useRef(0);
  const controller = React.useRef<AbortController | null>(null);
  const common = React.useRef<{ key: string; data: Omit<WorkspaceData, 'bookings'> } | null>(null);
  const load = React.useCallback(
    async (full = true) => {
      if (!enabled) return;
      const current = ++generation.current;
      controller.current?.abort();
      const abort = new AbortController();
      controller.current = abort;
      setState((previous) => ({
        key,
        data: previous.key === key ? previous.data : null,
        loading: true,
        error: null,
      }));
      try {
        let base = common.current?.key === key ? common.current.data : null;
        if (full || !base) {
          const directory = await allPets(scope, abort.signal, firstOnly);
          const [customers, locations] = await Promise.all([
            directory.admin && !scope
              ? allCustomers(abort.signal, firstOnly)
              : Promise.resolve(directory.customer ? [directory.customer] : []),
            apiJson<components['schemas']['WorkspaceLocations']>('/workspace/locations', {
              signal: abort.signal,
            }),
          ]);
          base = {
            admin: directory.admin,
            customer: directory.customer,
            rows: directory.items,
            customers,
            locations: locations.items,
          };
          if (current === generation.current) common.current = { key, data: base };
        }
        const bookings = await allBookings(scope, range, abort.signal);
        const busy: BusySpan[] = [];
        if (base.customer && range.from && range.through) {
          let cursor: string | null = null;
          const seen = new Set<string>();
          do {
            const params = new URLSearchParams({
              customerId: base.customer.id,
              from: range.from,
              through: range.through,
            });
            if (cursor) params.set('cursor', cursor);
            const result: { items: BusySpan[]; nextCursor: string | null } = await apiJson(
              '/workspace/busy?' + params,
              { signal: abort.signal },
            );
            busy.push(...result.items);
            cursor = result.nextCursor;
            if (cursor) {
              if (seen.has(cursor)) throw Error('Invalid pagination');
              seen.add(cursor);
            }
          } while (cursor);
        }
        if (current === generation.current)
          setState({ key, data: { ...base, bookings, busy }, loading: false, error: null });
      } catch (error) {
        if (current === generation.current && !abort.signal.aborted) {
          const clear =
            error instanceof ApiError &&
            ([401, 403].includes(error.status) || error.code === 'context_changed');
          if (clear) common.current = null;
          setState((previous) => ({
            key,
            data: !clear && previous.key === key ? previous.data : null,
            loading: false,
            error,
          }));
        }
      }
    },
    [key, scope, range.from, range.through, enabled, firstOnly],
  );
  React.useEffect(() => {
    if (!enabled) return;
    void load(false);
    return () => {
      generation.current++;
      controller.current?.abort();
    };
  }, [load]);
  React.useEffect(() => {
    if (!enabled) return;
    const refresh = () => {
      if (document.visibilityState === 'visible' && !document.querySelector('dialog[open]'))
        void load(true);
    };
    window.addEventListener('focus', refresh);
    const timer = setInterval(refresh, 60000);
    return () => {
      window.removeEventListener('focus', refresh);
      clearInterval(timer);
    };
  }, [load]);
  return {
    data: state.key === key ? state.data : null,
    loading: state.key !== key || state.loading,
    error: state.key === key ? state.error : null,
    refresh: load,
  };
}
