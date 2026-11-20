import Button from './button';
import React from 'react';
import CustomAutocomplete from './custom-autocomplete';
import { apiJson } from './api-client';
import { uiText } from './i18n.ts';
import { petKey, type Customer, type PetRow } from './workspace-data';
import { PetOption, WorkspaceAvatar } from './workspace-photos';
function useChoices<T>(path: string, initial: T[]) {
  const [state, setState] = React.useState({
    path,
    items: initial,
    cursor: null as string | null,
    loading: true,
    error: false,
  });
  const generation = React.useRef(0);
  async function load(next?: string) {
    const request = ++generation.current;
    setState((previous) => ({ ...previous, loading: true, error: false }));
    try {
      const url = new URL(path, location.origin);
      if (next) url.searchParams.set('cursor', next);
      const result = await apiJson<{ items: T[]; nextCursor: string | null }>(
        url.pathname + url.search,
      );
      if (request === generation.current)
        setState((previous) => ({
          path,
          items: next ? [...previous.items, ...result.items] : result.items,
          cursor: result.nextCursor,
          loading: false,
          error: false,
        }));
    } catch {
      if (request === generation.current)
        setState({ path, items: [], cursor: null, loading: false, error: true });
    }
  }
  React.useEffect(() => {
    setState({ path, items: initial, cursor: null, loading: true, error: false });
    void load();
    return () => {
      generation.current++;
    };
  }, [path]);
  return {
    ...state,
    items: state.path === path ? state.items : initial,
    more: state.cursor
      ? () => {
          if (!state.loading) void load(state.cursor!);
        }
      : undefined,
    retry: () => void load(),
  };
}
export function CustomerPicker({
  value,
  label,
  onChange,
  initial = [],
  disabled = false,
  required = false,
}: {
  value: string;
  label: string;
  onChange: (value: string) => void;
  initial?: Customer[];
  disabled?: boolean;
  required?: boolean;
}) {
  const [query, setQuery] = React.useState('');
  const choices = useChoices<Customer>(
    '/customers?' + new URLSearchParams(query ? { search: query.trim().toLowerCase() } : {}),
    initial,
  );
  const selected = React.useRef<Customer | undefined>(undefined);
  const match = [...choices.items, ...initial].find((item) => item.id === value);
  if (match) selected.current = match;
  if (selected.current?.id !== value) selected.current = undefined;
  const items = [
    ...new Map(
      [...(selected.current ? [selected.current] : []), ...choices.items].map((item) => [
        item.id,
        item,
      ]),
    ).values(),
  ];
  return (
    <>
      <CustomAutocomplete
        label={label}
        value={value}
        disabled={disabled}
        required={required}
        options={items.map((item) => ({
          value: item.id,
          label: item.name,
          search: [item.name, item.email, item.phone, item.loginEmail].filter(Boolean).join(' '),
        }))}
        onChange={onChange}
        onQueryChange={setQuery}
        onMore={choices.more}
        moreLoading={choices.loading}
      />
      {choices.error && (
        <Button icon="reset" type="button" variant="secondary" onClick={choices.retry}>
          {uiText('ui.workspace.retry')}
        </Button>
      )}
    </>
  );
}
export function PetPicker({
  value,
  label,
  scope,
  initial = [],
  onChange,
  disabled = false,
  required = false,
}: {
  value: string;
  label: string;
  scope?: string;
  initial?: PetRow[];
  onChange: (value: string, row?: PetRow) => void;
  disabled?: boolean;
  required?: boolean;
}) {
  const params = new URLSearchParams({ pageSize: '25' });
  if (scope) params.set('customerId', scope);
  const choices = useChoices<PetRow>('/workspace/pets?' + params, initial);
  const items = [
    ...new Map(
      [
        ...initial.filter((row) => petKey(row.customer.id, row.pet.id) === value),
        ...choices.items,
      ].map((row) => [petKey(row.customer.id, row.pet.id), row]),
    ).values(),
  ];
  return (
    <>
      <CustomAutocomplete
        label={label}
        value={value}
        disabled={disabled}
        required={required}
        options={items.map((row) => ({
          value: petKey(row.customer.id, row.pet.id),
          label: row.pet.name + (scope ? '' : ' · ' + row.customer.name),
          content: <PetOption row={row} />,
          adornment: <WorkspaceAvatar row={row} />,
        }))}
        onChange={(key) =>
          onChange(
            key,
            items.find((row) => petKey(row.customer.id, row.pet.id) === key),
          )
        }
        onMore={choices.more}
        moreLoading={choices.loading}
      />
      {choices.error && (
        <Button icon="reset" type="button" variant="secondary" onClick={choices.retry}>
          {uiText('ui.workspace.retry')}
        </Button>
      )}
    </>
  );
}
