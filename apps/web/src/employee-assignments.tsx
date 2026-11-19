import React from 'react';
import { useTranslation } from 'react-i18next';
import Modal from './modal';
import { apiJson, ApiError } from './api-client';
import { uiText } from './i18n.ts';
import UnsavedChanges, { confirmDiscardChanges, markFormSaved } from './unsaved-changes';
import type { components } from '../../../packages/contracts/generated';
type Assignment = components['schemas']['EmployeeAssignment'];
export default function EmployeeAssignments({ onClose }: { onClose: () => void }) {
  const { i18n } = useTranslation();
  const t = (key: string) => uiText('ui.employeeAssignments.' + key, {}, i18n.language);
  const [email, setEmail] = React.useState(''),
    [employee, setEmployee] = React.useState<Assignment | null>(null),
    [houseIds, setHouseIds] = React.useState<string[]>([]);
  const [houses, setHouses] = React.useState<components['schemas']['House'][]>([]);
  const [loading, setLoading] = React.useState(false),
    [saving, setSaving] = React.useState(false),
    [uncertain, setUncertain] = React.useState(false),
    [error, setError] = React.useState(''),
    [saved, setSaved] = React.useState(false);
  const operation = React.useRef(crypto.randomUUID()),
    form = React.useRef<HTMLFormElement>(null);
  const dirty =
    !!employee &&
    JSON.stringify([...houseIds].sort()) !== JSON.stringify([...employee.houseIds].sort());
  const blocked = loading || saving || uncertain;
  function close() {
    if (!blocked && confirmDiscardChanges(i18n.language, form.current)) onClose();
  }
  async function find(event: React.FormEvent) {
    event.preventDefault();
    if (blocked || !confirmDiscardChanges(i18n.language, form.current)) return;
    setLoading(true);
    setError('');
    setSaved(false);
    setEmployee(null);
    setHouseIds([]);
    try {
      const [person, locations] = await Promise.all([
        apiJson<Assignment>(
          '/employee-assignments?' + new URLSearchParams({ email: email.trim() }),
        ),
        apiJson<{ items: components['schemas']['House'][] }>('/houses'),
      ]);
      setEmployee(person);
      setHouseIds(person.houseIds);
      setHouses(locations.items);
      operation.current = crypto.randomUUID();
    } catch (e) {
      setError(
        e instanceof ApiError && e.status === 404
          ? 'missing'
          : e instanceof ApiError && [401, 403].includes(e.status)
            ? 'denied'
            : 'error',
      );
    } finally {
      setLoading(false);
    }
  }
  async function save(event: React.FormEvent) {
    event.preventDefault();
    if (!employee || saving || houseIds.length > 30) return;
    setSaving(true);
    setError('');
    setSaved(false);
    try {
      const result = await apiJson<Assignment>('/employee-assignments/' + employee.uid, {
        body: { operationId: operation.current, version: employee.version, houseIds },
      });
      markFormSaved(form.current);
      setEmployee(result);
      setHouseIds(result.houseIds);
      operation.current = crypto.randomUUID();
      setSaved(true);
      setUncertain(false);
    } catch (e) {
      setError(
        e instanceof ApiError && e.status === 409
          ? 'conflict'
          : e instanceof ApiError && [401, 403].includes(e.status)
            ? 'denied'
            : e instanceof ApiError && e.status === 404
              ? 'missing'
              : 'error',
      );
      setUncertain(!(e instanceof ApiError) || e.status >= 500 || e.status === 429);
    } finally {
      setSaving(false);
    }
  }
  return (
    <Modal title={t('title')} onClose={close} disabled={blocked}>
      <p>{t('intro')}</p>
      {error && <p role="alert">{t(error)}</p>}
      {saved && <p role="status">{t('saved')}</p>}
      {uncertain && <p role="alert">{uiText('ui.workspace.uncertain')}</p>}
      <form className="customer-form" onSubmit={(event) => void find(event)}>
        <label>
          {t('email')}
          <input
            type="email"
            required
            maxLength={254}
            disabled={blocked}
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
        </label>
        <button className="language" disabled={blocked}>
          {t(loading ? 'loading' : 'find')}
        </button>
      </form>
      {employee && (
        <form ref={form} className="customer-form" onSubmit={(event) => void save(event)}>
          <UnsavedChanges active={dirty || blocked} />
          <p>
            <strong>{employee.name || employee.email}</strong>
            <br />
            {employee.email}
          </p>
          <fieldset
            disabled={blocked || error === 'conflict' || error === 'denied' || error === 'missing'}
          >
            <legend>{t('houses')}</legend>
            {houses.map((house) => (
              <label key={house.id} className="employee-house-choice">
                <input
                  type="checkbox"
                  checked={houseIds.includes(house.id)}
                  onChange={(event) => {
                    setHouseIds(
                      event.target.checked
                        ? [...houseIds, house.id]
                        : houseIds.filter((id) => id !== house.id),
                    );
                    setSaved(false);
                  }}
                />
                {house.name}
              </label>
            ))}
            {employee.houseIds
              .filter((id) => !houses.some((house) => house.id === id))
              .map((id) => (
                <label key={id} className="employee-house-choice">
                  <input
                    type="checkbox"
                    checked={houseIds.includes(id)}
                    onChange={(event) =>
                      setHouseIds(
                        event.target.checked
                          ? [...houseIds, id]
                          : houseIds.filter((value) => value !== id),
                      )
                    }
                  />
                  {t('unavailableHouse')} ({id})
                </label>
              ))}
            {!houses.length && <p>{t('empty')}</p>}
          </fieldset>
          <p>{t('scope')}</p>
          <button
            className="button"
            disabled={
              saving ||
              houseIds.length > 30 ||
              (!dirty && !uncertain) ||
              ['conflict', 'denied', 'missing'].includes(error)
            }
          >
            {uiText('ui.workspace.' + (saving ? 'saving' : uncertain ? 'retry' : 'save'))}
          </button>
        </form>
      )}
    </Modal>
  );
}
