import { englishCatalog, uiText, uiValue } from './i18n.ts';
import CustomSelect from './custom-select';
import CustomAutocomplete from './custom-autocomplete';
import { ApiError, apiJson } from './api-client';
import React from 'react';
import { navigate } from './routing';
import { useTranslation } from 'react-i18next';
import Modal from './modal';
import Rooms from './rooms';
import Icon from './icons';
import UnsavedChanges, { confirmDiscardChanges } from './unsaved-changes';
import type { components } from '../../../packages/contracts/generated';
type House = components['schemas']['House'];
type HouseWrite = components['schemas']['HouseWrite'];
const englishMessages = englishCatalog['ui.houses.labels'];

function houseRequest<T>(path = '', body?: HouseWrite) {
  return apiJson<T>('/houses' + path, { body });
}
export default function Houses({
  initialSelected = '',
  routable = false,
}: {
  initialSelected?: string;
  routable?: boolean;
}) {
  const { i18n } = useTranslation();
  const labels = uiValue('ui.houses.labels', i18n.language);
  const [items, setItems] = React.useState<House[]>([]);
  const [selected, setSelected] = React.useState(initialSelected);
  React.useEffect(() => setSelected(initialSelected), [initialSelected]);
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [uncertain, setUncertain] = React.useState(false);
  const [error, setError] = React.useState<keyof typeof englishMessages | null>(null);
  const [saved, setSaved] = React.useState(false);
  const [editor, setEditor] = React.useState<{ id: string; input: HouseWrite } | null>(null);
  const baseline = React.useRef('');
  const form = React.useRef<HTMLFormElement>(null);
  const generation = React.useRef(0);
  const alive = React.useRef(true);
  const zones = React.useMemo(() => ['UTC', ...Intl.supportedValuesOf('timeZone')], []);
  const fieldId = React.useId();
  function report(error: unknown) {
    const status = error instanceof ApiError ? error.status : 0;
    setError(
      status === 409
        ? 'conflict'
        : status === 401 || status === 403
          ? 'denied'
          : status === 400
            ? 'invalid'
            : 'error',
    );
  }
  async function load() {
    const request = ++generation.current;
    setLoading(true);
    setError(null);
    try {
      const result = await houseRequest<{ items: House[] }>();
      if (alive.current && request === generation.current) setItems(result.items);
    } catch (error) {
      if (alive.current && request === generation.current) report(error);
    } finally {
      if (alive.current && request === generation.current) setLoading(false);
    }
  }
  React.useEffect(() => {
    alive.current = true;
    void load();
    return () => {
      alive.current = false;
      ++generation.current;
    };
  }, []);
  function close() {
    if (!saving && !uncertain && confirmDiscardChanges(i18n.language, form.current)) {
      setEditor(null);
      setError(null);
      if (error === 'conflict') void load();
    }
  }
  function open(house?: House) {
    if (!confirmDiscardChanges(i18n.language, form.current)) return;
    const input: HouseWrite = house
      ? {
          name: house.name,
          address: house.address,
          timezone: house.timezone,
          version: house.version,
        }
      : { name: '', address: '', timezone: '', version: 0 };
    baseline.current = JSON.stringify(input);
    setEditor({ id: house?.id ?? crypto.randomUUID(), input });
    setError(null);
    setSaved(false);
    setUncertain(false);
  }
  async function save(event: React.FormEvent) {
    event.preventDefault();
    if (!editor || saving) return;
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      const house = await houseRequest<House>('/' + editor.id, editor.input);
      if (!alive.current) return;
      ++generation.current;
      setLoading(false);
      setItems((previous) =>
        [house, ...previous.filter((h) => h.id !== house.id)].sort((a, b) =>
          a.name.localeCompare(b.name),
        ),
      );
      setSelected(house.id);
      setEditor(null);
      setUncertain(false);
      setSaved(true);
    } catch (error) {
      if (alive.current) {
        report(error);
        setUncertain(!(error instanceof ApiError) || error.status >= 500);
      }
    } finally {
      if (alive.current) setSaving(false);
    }
  }
  const blocked = saving || uncertain;
  return (
    <section className="customer-section" aria-label={labels.title}>
      <div className="customer-heading">
        <h2 id={fieldId + '-title'}>{labels.title}</h2>
        <button className="button" disabled={blocked} onClick={() => open()}>
          {labels.add}
        </button>
      </div>
      <p className="customer-intro">{labels.intro}</p>
      {saved && <p role="status">{labels.saved}</p>}
      {error && !editor && <p role="alert">{labels[error]}</p>}
      {loading && <p role="status">{labels.loading}</p>}
      {!!items.length && (
        <label className="house-filter">
          {labels.filter}
          <CustomSelect
            value={selected}
            disabled={blocked}
            onChange={(event) => {
              setSelected(event.target.value);
              if (routable)
                navigate(
                  '/app/settings/locations/' +
                    (event.target.value ? encodeURIComponent(event.target.value) + '/' : ''),
                );
            }}
          >
            <option value="">{labels.all}</option>
            {items.map((house) => (
              <option key={house.id} value={house.id}>
                {house.name}
              </option>
            ))}
          </CustomSelect>
        </label>
      )}
      {!loading && !items.length && !error && <p>{labels.empty}</p>}
      {initialSelected &&
        !loading &&
        !error &&
        !items.some((house) => house.id === initialSelected) && (
          <p role="alert">{uiText('ui.houses.locationNotFound', {}, i18n.language)}</p>
        )}
      <ul className="house-list">
        {items
          .filter((house) => !selected || house.id === selected)
          .map((house) => (
            <li key={house.id}>
              <div>
                <h3>
                  {routable ? (
                    <a href={'/app/settings/locations/' + house.id + '/'}>{house.name}</a>
                  ) : (
                    house.name
                  )}
                </h3>
                <p>{house.address || labels.noAddress}</p>
                {!house.address?.trim() && (
                  <p role="status">{uiText('ui.houses.addressMissing')}</p>
                )}
                <p>
                  {labels.timezone}: {house.timezone}
                </p>
                <Rooms houseId={house.id} addressReady={!!house.address?.trim()} />
              </div>
              <button
                className="icon-button"
                title={labels.edit}
                aria-label={`${labels.edit}: ${house.name}`}
                disabled={blocked}
                onClick={() => open(house)}
              >
                <Icon name="edit" />
              </button>
            </li>
          ))}
      </ul>
      {error === 'error' && !editor && (
        <button className="language" disabled={loading} onClick={() => void load()}>
          {labels.retry}
        </button>
      )}
      {editor && (
        <Modal
          title={editor.input.version ? labels.edit : labels.add}
          disabled={blocked}
          onClose={close}
        >
          <form ref={form} className="customer-form" onSubmit={(event) => void save(event)}>
            <UnsavedChanges
              active={JSON.stringify(editor.input) !== baseline.current || saving || uncertain}
            />
            {error && <p role="alert">{labels[error]}</p>}
            <fieldset disabled={blocked}>
              <label>
                {labels.name}
                <input
                  required
                  maxLength={120}
                  value={editor.input.name}
                  onChange={(event) =>
                    setEditor({ ...editor, input: { ...editor.input, name: event.target.value } })
                  }
                />
              </label>
              <label>
                {labels.address}
                <input
                  required
                  pattern={String.raw`.*\S.*`}
                  maxLength={500}
                  autoComplete="street-address"
                  value={editor.input.address}
                  onChange={(event) =>
                    setEditor({
                      ...editor,
                      input: { ...editor.input, address: event.target.value },
                    })
                  }
                />
              </label>
              <label>
                {labels.timezone}
                <CustomAutocomplete
                  label={labels.timezone}
                  required
                  disabled={blocked}
                  placeholder={labels.zoneExample}
                  value={editor.input.timezone}
                  options={zones.map((zone) => ({ value: zone, label: zone }))}
                  onChange={(timezone) =>
                    setEditor({ ...editor, input: { ...editor.input, timezone } })
                  }
                />
              </label>
              <p id={fieldId + '-zone-hint'} className="customer-intro">
                {labels.zoneHint}
              </p>
            </fieldset>
            <div className="portal-actions">
              <button
                className="button"
                type="submit"
                disabled={saving || error === 'conflict' || error === 'denied'}
              >
                {saving ? labels.saving : uncertain ? labels.retry : labels.save}
              </button>
              <button className="language" type="button" disabled={blocked} onClick={close}>
                {labels.cancel}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </section>
  );
}
