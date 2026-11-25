import type { HolidayCatalog } from '../../../packages/pricing/holiday-catalog';
import { useDialogState, DIALOG_PENDING } from './dialog-routing';
import PriceNameEditor from './price-name-editor';
import { priceName } from './price-label';
import Button from './button';
import IconButton from './icon-button';
import SegmentedTabs from './segmented-tabs';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { apiJson, ApiError } from './api-client';
import { uiText, localeFor, speciesText } from './i18n.ts';
import Modal from './modal';
import Icon from './icons';
import CustomSelect from './custom-select';
import CustomDateInput from './custom-date-input';
import UnsavedChanges, { confirmDiscardChanges, markFormSaved } from './unsaved-changes';
import {
  packageSavings,
  moneyCents,
  type PriceRate,
  type PricingConfig,
} from '../../../packages/pricing/calculations';
export const usePricingText = () => {
  const { i18n } = useTranslation();
  return (key: string) => uiText('ui.pricingAdmin.' + key, {}, i18n.language);
};
function Editor({
  config,
  existing,
  kind,
  onClose,
  onSaved,
  holidays = false,
}: {
  config: PricingConfig;
  existing?: PriceRate;
  kind: PriceRate['kind'];
  onClose: () => void;
  onSaved: (config: PricingConfig) => void;
  holidays?: boolean;
}) {
  const t = usePricingText();
  const { i18n } = useTranslation();
  const [rate, setRate] = React.useState<PriceRate>(
    existing ?? {
      id: crypto.randomUUID(),
      name: '',
      nameZh: '',
      kind,
      species: 'dog',
      minWeightLb: kind === 'boarding' ? 0 : null,
      maxWeightLb: null,
      minCents: 0,
      maxCents: 0,
      days: kind === 'package' ? 30 : null,
      comparisonRateId: null,
      comparisonWeightLb: null,
      active: true,
      source: '',
    },
  );
  const [minimum, setMinimum] = React.useState(
    existing ? (existing.minCents / 100).toFixed(2) : '',
  );
  const [maximum, setMaximum] = React.useState(
    existing ? (existing.maxCents / 100).toFixed(2) : '',
  );
  const [pendingName, setPendingName] = React.useState(false);
  const [dates, setDates] = React.useState(config.holidays);
  const [date, setDate] = React.useState('');
  const [year, setYear] = React.useState(new Date().getFullYear());
  const [catalogs, setCatalogs] = React.useState<Record<number, HolidayCatalog>>({});
  const [catalogError, setCatalogError] = React.useState(false);
  React.useEffect(() => {
    if (!holidays) return;
    const abort = new AbortController();
    setCatalogError(false);
    const years = [...new Set([year, ...dates.map((day) => Number(day.slice(0, 4)))])].filter(
      (value) => !catalogs[value],
    );
    void Promise.all(
      years.map(
        async (value) =>
          [
            value,
            await apiJson<HolidayCatalog>('/public/holiday-presets?year=' + value, {
              signal: abort.signal,
            }),
          ] as const,
      ),
    )
      .then((entries) => {
        if (!abort.signal.aborted)
          setCatalogs((old) => ({ ...old, ...Object.fromEntries(entries) }));
      })
      .catch(() => {
        if (!abort.signal.aborted) setCatalogError(true);
      });
    return () => abort.abort();
  }, [year, holidays, dates.map((day) => day.slice(0, 4)).join(',')]);
  const holidayText = (key: string) => uiText('ui.holidayPresets.' + key);
  const holidayName = (day: string) =>
    catalogs[Number(day.slice(0, 4))]?.groups
      .flatMap((group) => group.entries)
      .filter((item) => item.date === day)
      .map((item) => holidayText(item.key))
      .join(' / ') || holidayText('custom');
  const [percent, setPercent] = React.useState(config.holidayPercent);
  const [saving, setSaving] = React.useState(false),
    [uncertain, setUncertain] = React.useState(false),
    [error, setError] = React.useState('');
  const operation = React.useRef(crypto.randomUUID()),
    form = React.useRef<HTMLFormElement>(null);
  const baseline = React.useRef(JSON.stringify([rate, minimum, maximum, dates, percent]));
  const dirty =
    pendingName || JSON.stringify([rate, minimum, maximum, dates, percent]) !== baseline.current;
  const blocked = saving || uncertain;
  const min = moneyCents(minimum),
    max = moneyCents(maximum);
  const valid = holidays
    ? Number.isInteger(percent) && percent >= 0 && percent <= 100
    : !pendingName &&
      !!rate.name.trim() &&
      !!rate.nameZh.trim() &&
      min !== null &&
      (kind !== 'boarding' ||
        (max !== null &&
          max >= min &&
          rate.minWeightLb !== null &&
          rate.maxWeightLb !== null &&
          rate.maxWeightLb > rate.minWeightLb)) &&
      (kind !== 'package' || (!!rate.days && Number.isInteger(rate.days)));
  const patch = (value: Partial<PriceRate>) => setRate((current) => ({ ...current, ...value }));
  const number = (value: string) => (value === '' ? null : Number(value));
  function close() {
    if (!blocked && confirmDiscardChanges(i18n.language, form.current)) onClose();
  }
  async function save(event: React.FormEvent) {
    event.preventDefault();
    if (!valid || saving) return;
    setSaving(true);
    setError('');
    const saved = {
      ...rate,
      minCents: min ?? 0,
      maxCents: kind === 'boarding' ? (max ?? 0) : (min ?? 0),
    };
    try {
      const result = await apiJson<PricingConfig>('/pricing', {
        body: {
          rates: holidays
            ? config.rates
            : existing
              ? config.rates.map((row) => (row.id === rate.id ? saved : row))
              : [...config.rates, saved],
          holidays: dates,
          holidayPercent: percent,
          version: config.version,
          operationId: operation.current,
        },
      });
      markFormSaved(form.current);
      onSaved(result);
    } catch (e) {
      setError(
        e instanceof ApiError && e.status === 409
          ? 'conflict'
          : e instanceof ApiError && [401, 403].includes(e.status)
            ? 'denied'
            : e instanceof ApiError && e.status === 400
              ? 'invalid'
              : 'error',
      );
      setUncertain(!(e instanceof ApiError) || e.status >= 500 || e.status === 429);
    } finally {
      setSaving(false);
    }
  }
  return (
    <Modal
      title={t(holidays ? 'holidays' : existing ? 'edit' : 'add')}
      className={
        'pricing-editor-dialog workflow-dialog' + (holidays ? ' holiday-editor-dialog' : '')
      }
      onClose={close}
      disabled={blocked}
    >
      <form
        ref={form}
        className="customer-form workspace-form"
        onSubmit={(event) => void save(event)}
      >
        <UnsavedChanges active={dirty || blocked} />
        {error && <p role="alert">{t(error)}</p>}
        {uncertain && <p role="alert">{uiText('ui.workspace.uncertain')}</p>}
        <div className="workflow-form-body">
          <fieldset disabled={blocked}>
            {holidays ? (
              <>
                <label>
                  {t('holidayPercent')}
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="1"
                    required
                    value={percent}
                    onChange={(event) => setPercent(Number(event.target.value))}
                  />
                </label>
                <p>{t('holidayHint')}</p>
                <p className="workspace-field-note">{holidayText('hint')}</p>
                <label>
                  {holidayText('year')}
                  <CustomSelect
                    value={String(year)}
                    onChange={(event) => setYear(Number(event.target.value))}
                  >
                    {Array.from(
                      new Set([
                        new Date().getFullYear() - 1,
                        new Date().getFullYear(),
                        new Date().getFullYear() + 1,
                        new Date().getFullYear() + 2,
                        ...(catalogs[year]?.years ?? []),
                        ...dates.map((day) => Number(day.slice(0, 4))),
                      ]),
                    )
                      .sort()
                      .map((value) => (
                        <option key={value} value={value}>
                          {value}
                        </option>
                      ))}
                  </CustomSelect>
                </label>
                {catalogError && <p role="alert">{holidayText('unavailable')}</p>}
                {!catalogs[year] && !catalogError && (
                  <p role="status">{uiText('ui.workspace.loading')}</p>
                )}
                {catalogs[year] && !catalogs[year].available && (
                  <p role="status">{holidayText('unavailable')}</p>
                )}
                {catalogs[year]?.groups.map((group) => (
                  <section
                    className="holiday-country-group"
                    key={group.country}
                    aria-label={holidayText('country.' + group.country)}
                  >
                    <h3>{holidayText('country.' + group.country)}</h3>
                    {!group.complete && (
                      <p className="workspace-field-note">{holidayText('partial')}</p>
                    )}
                    <div className="holiday-preset-list">
                      {group.entries.map((item) => (
                        <label key={item.key + ':' + item.date}>
                          <input
                            type="checkbox"
                            checked={dates.includes(item.date)}
                            onChange={(event) =>
                              setDates(
                                event.target.checked
                                  ? [...new Set([...dates, item.date])].sort()
                                  : dates.filter((day) => day !== item.date),
                              )
                            }
                          />
                          <span>
                            <strong>{holidayText(item.key)}</strong>
                            <time dateTime={item.date}>{item.date}</time>
                          </span>
                        </label>
                      ))}
                    </div>
                  </section>
                ))}
                <details className="holiday-custom-date">
                  <summary>{holidayText('custom')}</summary>
                  <div className="workspace-field-pair">
                    <label>
                      {t('date')}
                      <CustomDateInput value={date} onChange={setDate} />
                    </label>
                    <Button
                      icon="plus"
                      type="button"
                      variant="secondary"
                      disabled={!date || dates.includes(date)}
                      onClick={() => {
                        setDates([...dates, date].sort());
                        setDate('');
                      }}
                    >
                      {t('addDate')}
                    </Button>
                  </div>
                </details>
                <h3>{holidayText('selected')}</h3>
                <ul className="holiday-selected-list">
                  {dates.map((day) => (
                    <li key={day}>
                      <span>
                        <strong>{holidayName(day)}</strong>
                        <time dateTime={day}>{day}</time>
                      </span>
                      <IconButton
                        type="button"

                        aria-label={t('removeDate') + ': ' + day}
                        title={t('removeDate')}
                        onClick={() => setDates(dates.filter((value) => value !== day))}
                      >
                        <Icon name="close" />
                      </IconButton>
                    </li>
                  ))}
                </ul>
              </>
            ) : (
              <>
                <PriceNameEditor rate={rate} onChange={patch} onPendingChange={setPendingName} />
                <label>
                  {t('species')}
                  <CustomSelect
                    value={rate.species}
                    onChange={(event) =>
                      patch({
                        species: event.target.value as PriceRate['species'],
                        comparisonRateId: null,
                        comparisonWeightLb: null,
                      })
                    }
                  >
                    {['dog', 'cat', 'rabbit'].map((species) => (
                      <option key={species} value={species}>
                        {speciesText(species)}
                      </option>
                    ))}
                  </CustomSelect>
                </label>
                {kind === 'boarding' && (
                  <div className="workspace-field-pair">
                    <label>
                      {t('minWeight')}
                      <input
                        type="number"
                        step="0.000001"
                        min="0"
                        max="10000"
                        required
                        value={rate.minWeightLb ?? ''}
                        onChange={(event) => patch({ minWeightLb: number(event.target.value) })}
                      />
                    </label>
                    <label>
                      {t('maxWeight')}
                      <input
                        type="number"
                        step="0.000001"
                        min="0"
                        max="10000"
                        required
                        value={rate.maxWeightLb ?? ''}
                        onChange={(event) => patch({ maxWeightLb: number(event.target.value) })}
                      />
                    </label>
                  </div>
                )}
                <div className="workspace-field-pair">
                  <label>
                    {t(kind === 'boarding' ? 'minPrice' : 'price')}
                    <input
                      inputMode="decimal"
                      required
                      value={minimum}
                      onChange={(event) => setMinimum(event.target.value)}
                    />
                  </label>
                  {kind === 'boarding' && (
                    <label>
                      {t('maxPrice')}
                      <input
                        inputMode="decimal"
                        required
                        value={maximum}
                        onChange={(event) => setMaximum(event.target.value)}
                      />
                    </label>
                  )}
                </div>
                {kind === 'package' && (
                  <>
                    <label>
                      {t('days')}
                      <input
                        type="number"
                        min="1"
                        max="10000"
                        step="1"
                        required
                        value={rate.days ?? ''}
                        onChange={(event) => patch({ days: number(event.target.value) })}
                      />
                    </label>
                    <label>
                      {t('comparisonRate')}
                      <CustomSelect
                        value={rate.comparisonRateId ?? ''}
                        onChange={(event) =>
                          patch({
                            comparisonRateId: event.target.value || null,
                            comparisonWeightLb: event.target.value ? rate.comparisonWeightLb : null,
                          })
                        }
                      >
                        <option value="">{uiText('common.notAvailable')}</option>
                        {config.rates
                          .filter(
                            (row) =>
                              row.active && row.kind === 'boarding' && row.species === rate.species,
                          )
                          .map((row) => (
                            <option key={row.id} value={row.id}>
                              {priceName(row, i18n.language)}
                            </option>
                          ))}
                      </CustomSelect>
                    </label>
                    {rate.comparisonRateId && (
                      <label>
                        {t('comparisonWeight')}
                        <input
                          type="number"
                          min="0"
                          max="10000"
                          step="0.000001"
                          required
                          value={rate.comparisonWeightLb ?? ''}
                          onChange={(event) =>
                            patch({ comparisonWeightLb: number(event.target.value) })
                          }
                        />
                      </label>
                    )}
                    <p>{t('comparisonHint')}</p>
                  </>
                )}
                <label>
                  {t('status')}
                  <CustomSelect
                    value={rate.active ? 'active' : 'archived'}
                    onChange={(event) => patch({ active: event.target.value === 'active' })}
                  >
                    <option value="active">{t('active')}</option>
                    <option value="archived">{t('archived')}</option>
                  </CustomSelect>
                </label>
                {rate.source && (
                  <p>
                    {t('source')}: {rate.source}
                  </p>
                )}
              </>
            )}
          </fieldset>
        </div>
        <p>{t('historyHint')}</p>
        <div className="portal-actions">
          <Button
            icon="check"
            variant="primary"
            disabled={saving || !valid || error === 'conflict' || error === 'denied'}
          >
            {uiText('ui.workspace.' + (saving ? 'saving' : uncertain ? 'retry' : 'save'))}
          </Button>
          <Button icon="close" type="button" variant="secondary" disabled={blocked} onClick={close}>
            {uiText('ui.workspace.cancel')}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
export default function AdminPricing() {
  const t = usePricingText(),
    { i18n } = useTranslation();
  const [config, setConfig] = React.useState<PricingConfig | null>(null),
    [loading, setLoading] = React.useState(true),
    [error, setError] = React.useState('');
  const [kind, setKind] = React.useState<PriceRate['kind']>('boarding');
  const [editor, setEditor] = useDialogState<false | { existing?: PriceRate; holidays?: boolean }>(
    'price',
    false,
    {
      encode: (value) =>
        value === false ? null : value.holidays ? 'holidays' : (value.existing?.id ?? 'new'),
      decode: (raw) => {
        if (!config) return DIALOG_PENDING;
        if (raw === 'new') return {};
        if (raw === 'holidays') return { holidays: true };
        const existing = config.rates.find((item) => item.id === raw);
        if (!existing) throw Error('Price unavailable');
        return { existing };
      },
    },
    [config],
  );
  const [revision, reload] = React.useReducer((value) => value + 1, 0);
  React.useEffect(() => {
    const abort = new AbortController();
    setLoading(true);
    setError('');
    void apiJson<PricingConfig>('/pricing', { signal: abort.signal })
      .then(setConfig)
      .catch((e) => {
        if (!abort.signal.aborted) {
          const denied = e instanceof ApiError && [401, 403].includes(e.status);
          if (denied) setConfig(null);
          setError(denied ? 'denied' : 'error');
        }
      })
      .finally(() => {
        if (!abort.signal.aborted) setLoading(false);
      });
    return () => abort.abort();
  }, [revision]);
  const money = (cents: number) =>
    new Intl.NumberFormat(localeFor(i18n.language), { style: 'currency', currency: 'USD' }).format(
      cents / 100,
    );
  return (
    <section className="admin-pricing tab-workspace" aria-label={t('title')} aria-busy={loading}>
      {loading && <p role="status">{uiText('ui.workspace.loading')}</p>}
      {error && (
        <p role="alert">
          {t(error)}{' '}
          {error !== 'denied' && (
            <Button variant="secondary" onClick={reload}>
              {uiText('ui.workspace.retry')}
            </Button>
          )}
        </p>
      )}
      {config && (
        <>
          <div className="workspace-section-actions pricing-toolbar">
            <SegmentedTabs
              label={t('categories')}
              value={kind}
              onChange={setKind}
              items={(['boarding', 'package', 'service', 'addon'] as const).map((value) => ({
                value,
                label: t(value),
              }))}
            />
            <div className="pricing-toolbar-actions">
              <Button
                icon="calendar"
                variant="secondary"
                onClick={() => setEditor({ holidays: true })}
              >
                {t('holidays')}
              </Button>
              <Button icon="plus" variant="primary" onClick={() => setEditor({})}>
                {t('add')}
              </Button>
            </div>
          </div>
          <p>
            {t('holidaySummary')}: {config.holidays.length} · {config.holidayPercent}%
          </p>
          <div className="workspace-table-scroll">
            <table className="workspace-table">
              <thead>
                <tr>
                  <th>{t('nameColumn')}</th>
                  <th>{t('price')}</th>
                  {kind === 'package' && <th>{t('savings')}</th>}
                  <th>{t('status')}</th>
                  <th>{t('edit')}</th>
                </tr>
              </thead>
              <tbody>
                {config.rates
                  .filter((rate) => rate.kind === kind)
                  .map((rate) => {
                    const savings = packageSavings(rate, config.rates);
                    return (
                      <tr key={rate.id}>
                        <td>
                          {priceName(rate, i18n.language)}
                          {rate.days && (
                            <small>
                              {' '}
                              · {rate.days} {t('days')}
                            </small>
                          )}
                        </td>
                        <td>
                          {money(rate.minCents)}
                          {rate.maxCents !== rate.minCents ? ' – ' + money(rate.maxCents) : ''}
                        </td>
                        {kind === 'package' && (
                          <td>
                            {savings
                              ? `${money(savings.savingsCents)} (${savings.percent.toFixed(2)}%)`
                              : uiText('common.notAvailable')}
                          </td>
                        )}
                        <td>{t(rate.active ? 'active' : 'archived')}</td>
                        <td>
                          <IconButton
                            title={t('edit')}
                            aria-label={t('edit') + ': ' + priceName(rate, i18n.language)}
                            onClick={() => setEditor({ existing: rate })}
                          >
                            <Icon name="edit" />
                          </IconButton>
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
          {!config.rates.some((rate) => rate.kind === kind) && <p>{t('empty')}</p>}
          {editor !== false && (
            <Editor
              key={editor.existing?.id ?? (editor.holidays ? 'holidays' : 'new')}
              config={config}
              existing={editor.existing}
              kind={kind}
              holidays={editor.holidays}
              onClose={() => {
                setEditor(false);
                reload();
              }}
              onSaved={(value) => {
                setConfig(value);
                setEditor(false);
              }}
            />
          )}
        </>
      )}
    </section>
  );
}
