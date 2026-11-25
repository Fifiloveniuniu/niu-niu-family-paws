import { useDialogState } from './dialog-routing';
import { dialogPet } from './dialog-records';
import PetDetails from './pet-details';
import { PetTypeIcon } from './pet-type';
import Button from './button';
import SearchInput from './search-input';
import IconButton from './icon-button';
import { Pagination } from './pagination';
import { englishCatalog, uiText, uiValue, speciesText, localeFor } from './i18n.ts';
import { ApiError, apiJson, apiBlob } from './api-client';
import React from 'react';
import { updateQuery } from './routing';
import { useTranslation } from 'react-i18next';
import Modal from './modal';
import { DemoBalanceLink } from './calendar-pet-photos';
import Icon from './icons';
import CustomSelect from './custom-select';
import UnsavedChanges, { confirmDiscardChanges } from './unsaved-changes';
import type { components } from '../../../packages/contracts/generated';
type Pet = components['schemas']['Pet'];
type PetWrite = components['schemas']['PetWrite'];
const englishMessages = englishCatalog['ui.pets.labels'];

function readFile(file: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error('Image read failed'));
    reader.readAsDataURL(file);
  });
}
function PetPhoto({ pet }: { pet: Pet }) {
  const { i18n } = useTranslation();
  const labels = uiValue('ui.pets.labels', i18n.language);
  const [url, setUrl] = React.useState('');
  const [failed, setFailed] = React.useState(false);
  const [retry, setRetry] = React.useState(0);
  React.useEffect(() => {
    let alive = true;
    setUrl('');
    setFailed(false);
    if (pet.photo)
      void apiBlob(`/customers/${pet.customerId}/pets/${pet.id}/photo`)
        .then(readFile)
        .then((value) => {
          if (alive) setUrl(value);
        })
        .catch(() => {
          if (alive) setFailed(true);
        });
    return () => {
      alive = false;
    };
  }, [pet.customerId, pet.id, pet.photo, retry]);
  if (!pet.photo)
    return (
      <div className="pet-photo">
        <span>{labels.noPhoto}</span>
      </div>
    );
  return (
    <div className="pet-photo">
      {url ? (
        <img src={url} alt={pet.name} />
      ) : failed ? (
        <div>
          <p>{labels.photoError}</p>
          <Button icon="reset" variant="secondary" onClick={() => setRetry((value) => value + 1)}>
            {labels.photoRetry}
          </Button>
        </div>
      ) : (
        <span>{labels.loading}</span>
      )}
    </div>
  );
}
export default function Pets({
  customerId,
  title,
  onReady,
  onChanged,
  selectedPetId,
  routable = false,
}: {
  customerId: string;
  title?: string;
  selectedPetId?: string;
  routable?: boolean;
  onReady?: () => void;
  onChanged?: () => void;
}) {
  const { i18n } = useTranslation();
  const labels = uiValue('ui.pets.labels', i18n.language);
  const headingId = React.useId();
  const [detail, setDetail] = useDialogState<Pet | null>('pet-view', null, {
    encode: (value) => value?.id ?? null,
    decode: (raw, signal) => dialogPet(customerId, raw, signal),
  });
  const [items, setItems] = React.useState<Pet[]>([]);
  const [pageSize, setPageSize] = React.useState('25');
  const [pageIndex, setPageIndex] = React.useState(0);
  const cursors = React.useRef<string[]>(['']);
  const target = React.useRef({ id: selectedPetId, found: false });
  if (target.current.id !== selectedPetId) target.current = { id: selectedPetId, found: false };
  const [cursor, setCursor] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [reading, setReading] = React.useState(false);
  const [error, setError] = React.useState<keyof typeof englishMessages | null>(null);
  const [saved, setSaved] = React.useState(false);
  const [uncertain, setUncertain] = React.useState(false);
  const [editor, setEditor] = useDialogState<{
    id: string;
    input: PetWrite;
    preview: string;
  } | null>('pet-edit', null, {
    encode: (value) => (value ? (value.input.version ? value.id : 'new') : null),
    decode: async (raw, signal) => {
      const pet = raw === 'new' ? null : await dialogPet(customerId, raw, signal);
      const input: PetWrite = {
        name: pet?.name ?? '',
        species: pet?.species ?? null,
        weightKg: pet?.weightKg ?? null,
        version: pet?.version ?? 0,
      };
      baseline.current = JSON.stringify(input);
      return { id: pet?.id ?? crypto.randomUUID(), input, preview: '' };
    },
  });
  const alive = React.useRef(true);
  const generation = React.useRef(0);
  const path = `/customers/${customerId}/pets`;
  const baseline = React.useRef('');
  const form = React.useRef<HTMLFormElement>(null);
  function report(event: unknown) {
    const status = event instanceof ApiError ? event.status : 0;
    setError(
      status === 409
        ? 'conflict'
        : status === 401 || status === 403
          ? 'forbidden'
          : status === 400
            ? 'invalid'
            : 'error',
    );
  }
  async function load(next?: string, index = 0, size = pageSize) {
    const version = ++generation.current;
    setItems([]);
    setPageIndex(index);
    if (index === 0) cursors.current = [''];
    setLoading(true);
    setError(null);
    try {
      const page: components['schemas']['PetPage'] = await apiJson<
        components['schemas']['PetPage']
      >(path + '?' + new URLSearchParams({ pageSize: size, ...(next ? { cursor: next } : {}) }));
      if (!alive.current || version !== generation.current) return;
      setItems(page.items);
      setCursor(page.nextCursor);
    } catch (e) {
      if (alive.current && version === generation.current) report(e);
    } finally {
      if (alive.current && version === generation.current) setLoading(false);
    }
  }
  React.useEffect(() => {
    alive.current = true;
    void load();
    return () => {
      alive.current = false;
      ++generation.current;
    };
  }, [customerId]);
  React.useEffect(() => {
    if (!loading) onReady?.();
  }, [loading, onReady]);
  React.useEffect(() => {
    if (items.some((p) => p.id === selectedPetId)) target.current.found = true;
    if (selectedPetId && !target.current.found && !loading && !error && cursor) {
      cursors.current = [...cursors.current.slice(0, pageIndex + 1), cursor];
      void load(cursor, pageIndex + 1);
    }
  }, [selectedPetId, loading, error, cursor, items]);
  function open(pet?: Pet) {
    if (!confirmDiscardChanges(i18n.language, form.current)) return;
    setError(null);
    setSaved(false);
    setUncertain(false);
    const input: PetWrite = {
      name: pet?.name ?? '',
      species: pet?.species ?? null,
      weightKg: pet?.weightKg ?? null,
      version: pet?.version ?? 0,
    };
    baseline.current = JSON.stringify(input);
    setEditor({ id: pet?.id ?? crypto.randomUUID(), input, preview: '' });
  }
  async function choose(file?: File) {
    if (!file || !editor) return;
    setError(null);
    setSaved(false);
    if (file.size > 3_145_728 || !['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setError('invalid');
      return;
    }
    setReading(true);
    try {
      const preview = await readFile(file);
      if (alive.current)
        setEditor({
          ...editor,
          preview,
          input: { ...editor.input, photoData: preview.split(',')[1] },
        });
    } catch {
      if (alive.current) setError('invalid');
    } finally {
      if (alive.current) setReading(false);
    }
  }
  async function save(event: React.FormEvent) {
    event.preventDefault();
    if (!editor || loading || saving || reading) return;
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      await apiJson(`${path}/${editor.id}`, { body: editor.input });
      if (!alive.current) return;
      setEditor(null);
      setUncertain(false);
      setSaved(true);
      onChanged?.();
      await load();
    } catch (e) {
      if (alive.current) {
        report(e);
        setUncertain(!(e instanceof ApiError) || e.status >= 500 || e.status === 429);
      }
    } finally {
      if (alive.current) setSaving(false);
    }
  }
  const blocked = saving || reading || uncertain;
  return (
    <section className="pets-section" aria-labelledby={headingId}>
      <div className="customer-heading">
        <h3 id={headingId}>{title ?? labels.own}</h3>
        <Button icon="plus" variant="primary" disabled={blocked || loading} onClick={() => open()}>
          {labels.add}
        </Button>
      </div>
      <p className="customer-intro">{labels.intro}</p>
      {error && <p role="alert">{labels[error]}</p>}
      {saved && <p role="status">{labels.saved}</p>}
      {editor && (
        <Modal
          title={editor.input.version ? labels.edit : labels.add}
          disabled={blocked}
          onClose={() => {
            if (confirmDiscardChanges(i18n.language, form.current)) {
              setEditor(null);
              setError(null);
            }
          }}
        >
          <form
            ref={form}
            className="customer-form pet-form"
            onSubmit={(event) => void save(event)}
          >
            <UnsavedChanges
              active={
                JSON.stringify(editor.input) !== baseline.current || saving || reading || uncertain
              }
            />
            <fieldset disabled={blocked}>
              <label>
                {labels.name}
                <input
                  required
                  maxLength={120}
                  value={editor.input.name}
                  onChange={(event) => {
                    setEditor({ ...editor, input: { ...editor.input, name: event.target.value } });
                    if (error === 'invalid') setError(null);
                  }}
                />
              </label>
              <label>
                {uiText('ui.pets.species')}
                <CustomSelect
                  value={editor.input.species ?? ''}
                  onChange={(event) =>
                    setEditor({
                      ...editor,
                      input: {
                        ...editor.input,
                        species: (event.target.value || null) as PetWrite['species'],
                      },
                    })
                  }
                >
                  <option value="">{uiText('common.notAvailable')}</option>
                  {(['dog', 'cat', 'rabbit'] as const).map((species) => (
                    <option key={species} value={species}>
                      {speciesText(species)}
                    </option>
                  ))}
                </CustomSelect>
              </label>
              <label>
                {uiText('ui.pets.weightKg')}
                <input
                  type="number"
                  min="0.001"
                  max="1000"
                  step="any"
                  value={editor.input.weightKg ?? ''}
                  onChange={(event) =>
                    setEditor({
                      ...editor,
                      input: {
                        ...editor.input,
                        weightKg: event.target.value === '' ? null : event.target.valueAsNumber,
                      },
                    })
                  }
                />
              </label>
              <label>
                {labels.photo}
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={(event) => void choose(event.target.files?.[0])}
                />
              </label>
            </fieldset>
            <p className="customer-intro">{labels.hint}</p>
            {editor.preview && (
              <>
                <img className="pet-preview" src={editor.preview} alt={editor.input.name} />
                <p>{labels.selected}</p>
              </>
            )}
            <div className="portal-actions">
              <Button
                icon="check"
                variant="primary"
                type="submit"
                disabled={
                  saving ||
                  reading ||
                  loading ||
                  error === 'conflict' ||
                  error === 'forbidden' ||
                  error === 'invalid'
                }
              >
                {saving ? labels.saving : uncertain ? labels.retry : labels.save}
              </Button>
              <Button
                icon="close"
                variant="secondary"
                type="button"
                disabled={blocked}
                onClick={() => {
                  if (confirmDiscardChanges(i18n.language, form.current)) {
                    setEditor(null);
                    setError(null);
                  }
                }}
              >
                {labels.cancel}
              </Button>
            </div>
          </form>
        </Modal>
      )}
      {detail && (
        <PetDetails
          customerId={detail.customerId}
          petId={detail.id}
          name={detail.name}
          onClose={() => setDetail(null)}
        />
      )}
      <div className="pet-grid">
        {items.map((pet) => (
          <article
            className={'pet-card' + (pet.id === selectedPetId ? ' pet-card-selected' : '')}
            key={pet.id}
          >
            <button
              type="button"
              className="pet-photo-button"
              aria-label={uiText('ui.calendarPetPhotos.viewPetDetails') + ': ' + pet.name}
              onClick={() => setDetail(pet)}
            >
              <PetPhoto pet={pet} />
            </button>
            <div className="pet-card-info">
              <h4>
                <a
                  href={'/app/customers/' + pet.customerId + '/pets/' + pet.id + '/'}
                  className="pet-name-button"
                  onClick={(event) => {
                    event.preventDefault();
                    setDetail(pet);
                  }}
                >
                  {pet.name}
                  <Icon name="chevron-right" className="pet-card-open-icon" />
                </a>
              </h4>
              <p>
                <PetTypeIcon species={pet.species ?? ''} />
                {pet.species ? speciesText(pet.species) : uiText('common.notAvailable')} ·{' '}
                {pet.weightKg == null
                  ? uiText('common.notAvailable')
                  : uiText('ui.pets.weightValue', {
                      weight: new Intl.NumberFormat(localeFor(i18n.language)).format(pet.weightKg),
                    })}
              </p>
            </div>
            <IconButton
              title={labels.edit}
              aria-label={`${labels.edit}: ${pet.name}`}
              disabled={blocked}
              onClick={() => open(pet)}
            >
              <Icon name="edit" />
            </IconButton>
            <div className="pet-card-footer">
              {pet.photoCredit && (
                <p className="pet-photo-credit">
                  {uiText('ui.pets.testPhoto', {}, i18n.language)} · {pet.photoCredit.creator} ·{' '}
                  <a href={pet.photoCredit.sourcePage} target="_blank" rel="noopener noreferrer">
                    {uiText('ui.pets.source', {}, i18n.language)}
                  </a>{' '}
                  ·{' '}
                  <a href={pet.photoCredit.licenseUrl} target="_blank" rel="noopener noreferrer">
                    {pet.photoCredit.license}
                  </a>
                </p>
              )}
              <DemoBalanceLink customerId={pet.customerId} petId={pet.id} />
            </div>
          </article>
        ))}
      </div>
      {selectedPetId &&
        !loading &&
        !cursor &&
        !error &&
        !items.some((p) => p.id === selectedPetId) && (
          <p role="alert">{uiText('ui.pets.petNotFound', {}, i18n.language)}</p>
        )}
      {loading ? (
        <p role="status">{labels.loading}</p>
      ) : !items.length && !error ? (
        <p>{labels.empty}</p>
      ) : null}
      {(((error === 'error' || error === 'conflict') && !uncertain) || cursor) && (
        <div className="portal-actions">
          {(error === 'error' || error === 'conflict') && !uncertain && (
            <Button
              icon="reset"
              variant="secondary"
              disabled={blocked || loading}
              onClick={() => void load()}
            >
              {labels.reload}
            </Button>
          )}
        </div>
      )}
      <Pagination
        label={uiText('ui.pagination.pets')}
        page={{
          items,
          index: pageIndex,
          size: pageSize,
          loading: loading || blocked,
          error: !!error,
          nextCursor: cursor,
          reload: () => void load(cursors.current[pageIndex], pageIndex),
          reset: () => void load(),
          previous: () => {
            target.current.found = true;
            void load(cursors.current[pageIndex - 1], pageIndex - 1);
          },
          next: () => {
            if (cursor) {
              cursors.current = [...cursors.current.slice(0, pageIndex + 1), cursor];
              void load(cursor, pageIndex + 1);
            }
          },
          setSize: (size) => {
            target.current.found = true;
            setPageSize(size);
            void load(undefined, 0, size);
          },
        }}
      />
    </section>
  );
}
export function PetSearch({
  onChoose,
  customerScope,
}: {
  customerScope?: string;
  onChoose: (customer: { id: string; name: string; loginEmail: string | null }) => void;
}) {
  const { i18n } = useTranslation();
  const labels = uiValue('ui.pets.labels', i18n.language);
  const [search, setSearch] = React.useState(
    () => new URLSearchParams(location.search).get('petSearch') || '',
  );
  const [active, setActive] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState(false);
  const [page, setPage] = React.useState<components['schemas']['PetSearchPage'] | null>(null);
  const generation = React.useRef(0);
  React.useEffect(
    () => () => {
      ++generation.current;
    },
    [],
  );
  async function load(query: string, cursor?: string) {
    const current = ++generation.current;
    setLoading(true);
    setError(false);
    setActive(query);
    try {
      const next: components['schemas']['PetSearchPage'] = await apiJson<
        components['schemas']['PetSearchPage']
      >('/pet-search?' + new URLSearchParams({ search: query, ...(cursor ? { cursor } : {}) }));
      if (current === generation.current)
        setPage((previous) => ({
          ...next,
          items: cursor ? [...(previous?.items ?? []), ...next.items] : next.items,
        }));
    } catch {
      if (current === generation.current) setError(true);
    } finally {
      if (current === generation.current) setLoading(false);
    }
  }
  React.useEffect(() => {
    const query = new URLSearchParams(location.search).get('petSearch');
    if (query) void load(query);
  }, []);
  const matches = page?.items.filter(
    (item) => !customerScope || item.customer.id === customerScope,
  );
  return (
    <div className="pet-search">
      <form
        className="customer-search"
        role="search"
        onSubmit={(event) => {
          event.preventDefault();
          updateQuery({ petSearch: search.trim() });
          void load(search.trim());
        }}
      >
        <label>
          {labels.searchHint}
          <SearchInput
            required
            maxLength={120}
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </label>
        <IconButton
          type="submit"
          aria-label={labels.search}
          title={labels.search}
          disabled={loading || !search.trim()}
        >
          <Icon name="search" />
        </IconButton>
      </form>
      {error && <p role="alert">{labels.error}</p>}
      {loading && <p role="status">{labels.loading}</p>}
      {page && !loading && !matches?.length && <p>{labels.noMatches}</p>}
      <ul className="customer-list">
        {matches?.map(({ pet, customer }) => (
          <li key={pet.customerId + '/' + pet.id}>
            <div>
              <h4>
                {
                  <a href={'/app/customers/' + pet.customerId + '/pets/' + pet.id + '/'}>
                    {pet.name}
                  </a>
                }
              </h4>
              <p>
                {labels.customer}: {customer.name}
              </p>
              {customer.loginEmail && <p>{customer.loginEmail}</p>}
            </div>
            <Button icon="customers" variant="secondary" onClick={() => onChoose(customer)}>
              {labels.manage}
            </Button>
          </li>
        ))}
      </ul>
      {page?.nextCursor && (
        <Button
          icon="chevron-down"
          variant="secondary"
          disabled={loading}
          onClick={() => void load(active, page.nextCursor!)}
        >
          {labels.more}
        </Button>
      )}
    </div>
  );
}
