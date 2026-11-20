import Button from './button';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { uiText } from './i18n.ts';
import { apiJson, ApiError } from './api-client';
import Modal from './modal';
import CustomDateInput from './custom-date-input';
import CustomSelect from './custom-select';
import UnsavedChanges, { confirmDiscardChanges, markFormSaved } from './unsaved-changes';
import { parseWallInput } from './wall-time';
import type { components } from '../../../packages/contracts/generated';
export type ValidityTemplate = components['schemas']['ValidityTemplate'];
function useText() {
  const { i18n } = useTranslation();
  return (key: string) => uiText('ui.templates.' + key, {}, i18n.language);
}
export function useValidityTemplates() {
  const [items, setItems] = React.useState<ValidityTemplate[]>([]),
    [error, setError] = React.useState(false),
    [loading, setLoading] = React.useState(true);
  const [revision, reload] = React.useReducer((value) => value + 1, 0);
  React.useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(false);
    void apiJson<{ items: ValidityTemplate[] }>('/validity-templates', {
      signal: controller.signal,
    })
      .then((result) => setItems(result.items))
      .catch(() => {
        if (!controller.signal.aborted) setError(true);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [revision]);
  return { items, error, loading, reload };
}
export function TemplatePicker({
  disabled,
  onSelect,
}: {
  disabled?: boolean;
  onSelect: (template: ValidityTemplate) => void;
}) {
  const t = useText();
  const { items, error, loading, reload } = useValidityTemplates();
  const [value, setValue] = React.useState('');
  return (
    <div className="workspace-template-picker">
      <label>
        {t('useTemplate')}
        <CustomSelect
          disabled={disabled || loading || error}
          value={value}
          onChange={(event) => {
            const template = items.find((item) => item.id === event.target.value && item.active);
            setValue(event.target.value);
            if (template) onSelect(template);
          }}
        >
          <option value="">{uiText('common.notAvailable')}</option>
          {items
            .filter((item) => item.active)
            .map((item) => (
              <option key={item.id} value={item.id}>
                {item.name} · {item.validFrom} – {item.validThrough}
              </option>
            ))}
        </CustomSelect>
      </label>
      <p className="workspace-field-note">{t('copyHint')}</p>
      {error && (
        <p role="alert">
          {t('loadError')}{' '}
          <Button type="button" variant="secondary" onClick={reload}>
            {t('retry')}
          </Button>
        </p>
      )}
    </div>
  );
}
function TemplateEditor({
  existing,
  onClose,
  onSaved,
}: {
  existing?: ValidityTemplate;
  onClose: () => void;
  onSaved: () => void;
}) {
  const t = useText();
  const { i18n } = useTranslation();
  const [name, setName] = React.useState(existing?.name ?? ''),
    [from, setFrom] = React.useState(existing?.validFrom ?? ''),
    [through, setThrough] = React.useState(existing?.validThrough ?? ''),
    [active, setActive] = React.useState(existing?.active ?? true);
  const [saving, setSaving] = React.useState(false),
    [uncertain, setUncertain] = React.useState(false),
    [error, setError] = React.useState('');
  const id = React.useRef(existing?.id ?? crypto.randomUUID()),
    operation = React.useRef(crypto.randomUUID()),
    form = React.useRef<HTMLFormElement>(null);
  const baseline = React.useRef(JSON.stringify([name, from, through, active]));
  const blocked = saving || uncertain,
    dirty = JSON.stringify([name, from, through, active]) !== baseline.current;
  const valid =
    !!name.trim() &&
    name.length <= 120 &&
    !!parseWallInput(from, false) &&
    !!parseWallInput(through, false) &&
    through >= from;
  function close() {
    if (!blocked && confirmDiscardChanges(i18n.language, form.current)) onClose();
  }
  async function save(event: React.FormEvent) {
    event.preventDefault();
    if (saving || !valid) return;
    setSaving(true);
    setError('');
    try {
      await apiJson('/validity-templates/' + id.current, {
        body: {
          operationId: operation.current,
          version: existing?.version ?? 0,
          name,
          validFrom: from,
          validThrough: through,
          active,
        },
      });
      markFormSaved(form.current);
      onSaved();
    } catch (error) {
      setError(
        error instanceof ApiError && error.status === 409
          ? 'conflict'
          : error instanceof ApiError && [401, 403].includes(error.status)
            ? 'denied'
            : 'loadError',
      );
      setUncertain(!(error instanceof ApiError) || error.status >= 500 || error.status === 429);
    } finally {
      setSaving(false);
    }
  }
  return (
    <Modal title={t(existing ? 'edit' : 'add')} onClose={close} disabled={blocked}>
      <form
        ref={form}
        className="customer-form workspace-form"
        onSubmit={(event) => void save(event)}
      >
        <UnsavedChanges active={dirty || blocked} />
        {error && <p role="alert">{t(error)}</p>}
        {uncertain && <p role="alert">{uiText('ui.workspace.uncertain')}</p>}
        <fieldset disabled={blocked}>
          <label>
            {t('name')}
            <input
              required
              maxLength={120}
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
          </label>
          <div className="workspace-field-pair">
            <label>
              {uiText('ui.workspace.validFrom')}
              <CustomDateInput required value={from} onChange={setFrom} />
            </label>
            <label>
              {uiText('ui.workspace.validThrough')}
              <CustomDateInput required value={through} onChange={setThrough} />
            </label>
          </div>
          <label>
            {t('status')}
            <CustomSelect
              value={active ? 'active' : 'archived'}
              onChange={(event) => setActive(event.target.value === 'active')}
            >
              <option value="active">{t('active')}</option>
              <option value="archived">{t('archived')}</option>
            </CustomSelect>
          </label>
          <p className="workspace-field-note">{t('copyHint')}</p>
        </fieldset>
        <div className="portal-actions">
          <Button
            variant="primary"
            disabled={saving || !valid || error === 'conflict' || error === 'denied'}
          >
            {uiText(
              saving
                ? 'ui.workspace.saving'
                : uncertain
                  ? 'ui.workspace.retry'
                  : 'ui.workspace.save',
            )}
          </Button>
          <Button type="button" variant="secondary" disabled={blocked} onClick={close}>
            {uiText('ui.workspace.cancel')}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
export default function ValidityTemplates({ onClose }: { onClose: () => void }) {
  const t = useText();
  const { items, error, loading, reload } = useValidityTemplates();
  const [editing, setEditing] = React.useState<ValidityTemplate | undefined | false>(false);
  if (editing !== false)
    return (
      <TemplateEditor
        existing={editing}
        onClose={() => setEditing(false)}
        onSaved={() => {
          setEditing(false);
          reload();
        }}
      />
    );
  return (
    <Modal title={t('title')} onClose={onClose}>
      <p>{t('intro')}</p>
      <Button variant="primary" onClick={() => setEditing(undefined)}>
        {t('add')}
      </Button>
      {loading && <p role="status">{uiText('ui.workspace.loading')}</p>}
      {error && (
        <p role="alert">
          {t('loadError')}{' '}
          <Button variant="secondary" onClick={reload}>
            {t('retry')}
          </Button>
        </p>
      )}
      <div className="workspace-table-scroll">
        <table className="workspace-table">
          <thead>
            <tr>
              <th>{t('name')}</th>
              <th>{uiText('ui.workspace.validFrom')}</th>
              <th>{uiText('ui.workspace.validThrough')}</th>
              <th>{t('status')}</th>
              <th>{t('edit')}</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id}>
                <td>{item.name}</td>
                <td>{item.validFrom}</td>
                <td>{item.validThrough}</td>
                <td>{t(item.active ? 'active' : 'archived')}</td>
                <td>
                  <Button
                    variant="secondary"
                    aria-label={t('edit') + ': ' + item.name}
                    onClick={() => setEditing(item)}
                  >
                    {t('edit')}
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {!loading && !error && !items.length && <p>{t('empty')}</p>}
    </Modal>
  );
}
