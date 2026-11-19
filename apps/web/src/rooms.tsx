import LocationLabel from './location-label';
import React from 'react';
import './rooms.css';
import { useTranslation } from 'react-i18next';
import { uiText, speciesText } from './i18n.ts';
import { apiJson, ApiError } from './api-client';
import Modal from './modal';
import UnsavedChanges, { confirmDiscardChanges, markFormSaved } from './unsaved-changes';
import Icon from './icons';
import type { components } from '../../../packages/contracts/generated';
type Room = components['schemas']['Room'];
type RoomWrite = components['schemas']['RoomWrite'];
export default function Rooms({
  houseId,
  addressReady,
  onChanged,
  initialEditId,
  initialCreate = false,
  onEditorClosed,
  embedded = false,
  onBusyChange,
}: {
  houseId: string;
  addressReady: boolean;
  onChanged?: () => void;
  initialEditId?: string;
  initialCreate?: boolean;
  onEditorClosed?: () => void;
  embedded?: boolean;
  onBusyChange?: (busy: boolean) => void;
}) {
  const { i18n } = useTranslation();
  const [rooms, setRooms] = React.useState<Room[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState('');
  const [saving, setSaving] = React.useState(false);
  const [uncertain, setUncertain] = React.useState(false);
  const [editor, setEditor] = React.useState<{ id: string; input: RoomWrite } | null>(null);
  const baseline = React.useRef('');
  const form = React.useRef<HTMLFormElement>(null);
  const generation = React.useRef(0);
  const path = '/houses/' + houseId + '/rooms';
  const label = (key: string) => uiText('ui.rooms.' + key, {}, i18n.language);
  const report = (error: unknown) =>
    setError(
      error instanceof ApiError
        ? error.status === 409
          ? 'conflict'
          : error.status === 400
            ? 'invalid'
            : error.status === 401 || error.status === 403
              ? 'denied'
              : 'error'
        : 'error',
    );
  async function load() {
    const current = ++generation.current;
    setLoading(true);
    setError('');
    try {
      const result = await apiJson<{ items: Room[] }>(path);
      if (current === generation.current) setRooms(result.items);
    } catch (error) {
      if (current === generation.current) report(error);
    } finally {
      if (current === generation.current) setLoading(false);
    }
  }
  React.useEffect(() => {
    void load();
    return () => {
      generation.current++;
    };
  }, [path]);
  function open(room?: Room) {
    const input: RoomWrite = room
      ? {
          name: room.name,
          capacity: room.capacity ?? 0,
          costs: { ...room.costs },
          version: room.version,
        }
      : { name: '', capacity: 0, costs: {}, version: 0 };
    baseline.current = JSON.stringify(input);
    setEditor({ id: room?.id ?? crypto.randomUUID(), input });
    setError('');
    setUncertain(false);
  }
  const requestedEditor = React.useRef('');
  React.useEffect(() => {
    if (initialCreate && addressReady && !loading && !error && !requestedEditor.current) {
      requestedEditor.current = 'create';
      open();
    }
  }, [initialCreate, addressReady, loading, error]);
  React.useEffect(() => {
    if (!initialEditId || !addressReady || loading || requestedEditor.current === initialEditId)
      return;
    const room = rooms.find((item) => item.id === initialEditId);
    if (room) {
      requestedEditor.current = initialEditId;
      open(room);
    }
  }, [initialEditId, rooms, loading, addressReady]);
  function close() {
    if (!saving && !uncertain && confirmDiscardChanges(i18n.language, form.current)) {
      setEditor(null);
      setError('');
      void load();
      onEditorClosed?.();
    }
  }
  async function save(event: React.FormEvent) {
    event.preventDefault();
    if (!editor || saving) return;
    setSaving(true);
    setError('');
    const current = generation.current;
    try {
      const room = await apiJson<Room>(path + '/' + editor.id, { body: editor.input });
      if (current !== generation.current) return;
      setRooms((items) =>
        [...items.filter((r) => r.id !== room.id), room].sort((a, b) =>
          a.name.localeCompare(b.name),
        ),
      );
      markFormSaved(form.current);
      setEditor(null);
      setUncertain(false);
      onChanged?.();
      onEditorClosed?.();
    } catch (error) {
      if (current === generation.current) {
        report(error);
        setUncertain(!(error instanceof ApiError) || error.status >= 500);
      }
    } finally {
      if (current === generation.current) setSaving(false);
    }
  }
  React.useEffect(() => {
    if (embedded && editor)
      form.current?.querySelector<HTMLInputElement>('input:not([type="hidden"])')?.focus();
  }, [embedded, editor?.id]);
  const blocked = saving || uncertain;
  React.useEffect(() => onBusyChange?.(blocked), [blocked, onBusyChange]);
  return (
    <section
      className={embedded ? 'embedded-location-editor' : 'saved-rooms'}
      aria-label={label('title')}
    >
      <div hidden={embedded}>
        <div className="customer-heading">
          <h4>{label('title')}</h4>
          <button
            type="button"
            className="language"
            disabled={!addressReady || blocked}
            onClick={() => open()}
          >
            {label('add')}
          </button>
        </div>
        {!addressReady && <p>{uiText('ui.houses.addressMissing')}</p>}
        {loading && <p role="status">{label('loading')}</p>}
        {!loading && !rooms.length && !error && <p>{label('empty')}</p>}
        {error && !editor && (
          <>
            <p role="alert">{label(error)}</p>
            <button className="language" onClick={() => void load()}>
              {label('retry')}
            </button>
          </>
        )}
        <ul>
          {rooms.map((room) => (
            <li key={room.id}>
              <span>
                <LocationLabel kind="room" name={room.name} />
                <br />
                {label('capacity')}: {room.capacity}
                <br />
                {(['dog', 'cat', 'rabbit'] as const)
                  .map(
                    (s) => `${speciesText(s)}: ${room.costs[s] ?? uiText('common.notAvailable')}`,
                  )
                  .join(' · ')}
              </span>
              <button
                type="button"
                className="icon-button"
                title={label('edit')}
                aria-label={`${label('edit')}: ${room.name}`}
                disabled={!addressReady || blocked}
                onClick={() => open(room)}
              >
                <Icon name="edit" />
              </button>
            </li>
          ))}
        </ul>
      </div>
      {embedded &&
        !editor &&
        (loading ? (
          <p role="status">label('loading')</p>
        ) : (
          <>
            <p role="alert">
              {!addressReady ? uiText('ui.houses.addressMissing') : label(error || 'empty')}
            </p>
            <button className="language" onClick={() => void load()}>
              {label('retry')}
            </button>
          </>
        ))}
      {editor && (
        <Modal
          embedded={embedded}
          title={label(editor.input.version ? 'edit' : 'add')}
          onClose={close}
          disabled={blocked}
        >
          <form ref={form} className="customer-form" onSubmit={(event) => void save(event)}>
            <UnsavedChanges active={JSON.stringify(editor.input) !== baseline.current || blocked} />
            {error && <p role="alert">{label(error)}</p>}
            <fieldset disabled={blocked}>
              <label>
                {label('name')}
                <input
                  required
                  maxLength={120}
                  pattern={String.raw`.*\S.*`}
                  value={editor.input.name}
                  onChange={(event) =>
                    setEditor({ ...editor, input: { ...editor.input, name: event.target.value } })
                  }
                />
              </label>
              <label>
                {label('capacity')}
                <input
                  required
                  type="number"
                  min="0.001"
                  max="1000000"
                  step="any"
                  value={editor.input.capacity || ''}
                  onChange={(event) =>
                    setEditor({
                      ...editor,
                      input: { ...editor.input, capacity: event.target.valueAsNumber || 0 },
                    })
                  }
                />
              </label>
              <p>{label('costHint')}</p>
              {(['dog', 'cat', 'rabbit'] as const).map((s) => (
                <label key={s}>
                  {speciesText(s)}
                  <input
                    type="number"
                    min="0.001"
                    max="1000000"
                    step="any"
                    value={editor.input.costs[s] ?? ''}
                    onChange={(event) => {
                      const costs = { ...editor.input.costs };
                      if (event.target.value === '') delete costs[s];
                      else costs[s] = event.target.valueAsNumber;
                      setEditor({ ...editor, input: { ...editor.input, costs } });
                    }}
                  />
                </label>
              ))}
            </fieldset>
            <div className="portal-actions">
              <button
                type="submit"
                className="button"
                disabled={saving || error === 'conflict' || error === 'denied'}
              >
                {label(saving ? 'saving' : uncertain ? 'retry' : 'save')}
              </button>
              <button type="button" className="language" disabled={blocked} onClick={close}>
                {label('cancel')}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </section>
  );
}
