import MetricChart from './metric-chart';
import { sampleMetrics } from './metrics-sample';
import React from 'react';
import { useTranslation } from 'react-i18next';
import type { components } from '../../../packages/contracts/generated';
import { apiJson } from './api-client';
import { localeFor, speciesText, uiText } from './i18n';
import CustomDateInput from './custom-date-input';
import CustomSelect from './custom-select';
import Icon from './icons';
import { updateQuery } from './routing';
import { parseWallInput, shiftDay, startOfZonedDay, wallDateKey, wallNow } from './wall-time';
import './business-metrics.css';
type Metrics = components['schemas']['BusinessMetrics'];
export default function BusinessMetrics({
  zone,
  search,
}: {
  zone: string;
  search: URLSearchParams;
}) {
  const { i18n } = useTranslation();
  const text = (key: string) => uiText('ui.metrics.' + key);
  const today = wallDateKey(wallNow(zone));
  const from = search.get('from') || shiftDay(today, -29),
    through = search.get('through') || today;
  const start = parseWallInput(from, false) && startOfZonedDay(from, zone),
    end = parseWallInput(through, false) && startOfZonedDay(shiftDay(through, 1), zone);
  const valid = !!(
    start &&
    end &&
    end > start &&
    Date.parse(end) - Date.parse(start) <= 366 * 86400000
  );
  const [revision, setRevision] = React.useState(0);
  const [state, setState] = React.useState<{ key: string; data: Metrics | null; error: boolean }>({
    key: '',
    data: null,
    error: false,
  });
  const sampleAvailable = import.meta.env.DEV && import.meta.env.MODE === 'test';
  const sample =
    sampleAvailable &&
    (search.get('data') === 'sample' ||
      (!search.has('data') && import.meta.env.VITE_LOCAL_SAMPLE_METRICS === 'true'));
  const key = from + ':' + through + ':' + zone + ':' + revision;
  React.useEffect(() => {
    if (sample || !valid || !start || !end) return;
    const abort = new AbortController();
    setState({ key, data: null, error: false });
    void apiJson<Metrics>(
      '/business-metrics?' + new URLSearchParams({ from: start, through: end, timeZone: zone }),
      { signal: abort.signal },
    )
      .then((data) => {
        if (!abort.signal.aborted) setState({ key, data, error: false });
      })
      .catch(() => {
        if (!abort.signal.aborted) setState({ key, data: null, error: true });
      });
    return () => abort.abort();
  }, [key, valid, start, end, sample]);
  const preview = React.useMemo(
    () => (sample && valid && start && end ? sampleMetrics(start, end, zone) : null),
    [sample, valid, start, end, zone, revision],
  );
  const data = preview ?? (valid && state.key === key ? state.data : null),
    error = !sample && valid && state.key === key && state.error,
    loading = valid && !data && !error;
  const number = new Intl.NumberFormat(localeFor(i18n.language));
  const zones = React.useMemo(
    () => [...new Set([zone, 'UTC', ...Intl.supportedValuesOf('timeZone')])],
    [zone],
  );
  function cards(items: { key: keyof Metrics; hint: string }[]) {
    return (
      <dl className="business-metric-grid">
        {items.map((item) => (
          <div className="business-metric" key={item.key} data-metric={item.key}>
            <dt>{text(item.key)}</dt>
            <dd>{data ? number.format(data[item.key] as number) : '—'}</dd>
            <dd className="business-metric-hint" title={text(item.hint)}>
              {text(item.key === 'recordedDays' ? 'recordedShort' : item.hint)}
            </dd>
          </div>
        ))}
      </dl>
    );
  }
  const dateFormat = new Intl.DateTimeFormat(localeFor(i18n.language), {
    month: 'short',
    day: 'numeric',
    timeZone: zone,
  });
  const trend = (field: 'bookings' | 'newCustomers' | 'balanceChange') =>
    (data?.series ?? []).map((point) => ({
      label:
        dateFormat.format(new Date(point.from)) +
        ' – ' +
        dateFormat.format(new Date(Date.parse(point.through) - 1)),
      shortLabel: dateFormat.format(new Date(point.from)),
      value: point[field],
    }));
  return (
    <section className="business-metrics" aria-labelledby="business-metrics-title">
      <div className="business-metrics-heading">
        <div>
          <h1 id="business-metrics-title">{text('title')}</h1>
          <p>{text('intro')}</p>
        </div>
        <button
          className="icon-button"
          aria-label={text('refresh')}
          title={text('refresh')}
          disabled={loading}
          onClick={() => setRevision((v) => v + 1)}
        >
          <Icon name="reset" />
        </button>
      </div>
      {sampleAvailable && (
        <div className="metrics-data-source">
          <div className="hc-scales" role="group" aria-label={text('dataSource')}>
            <button
              type="button"
              className="language"
              aria-pressed={!sample}
              onClick={() => updateQuery({ data: 'saved' })}
            >
              {text('savedData')}
            </button>
            <button
              type="button"
              className="language"
              aria-pressed={sample}
              onClick={() => updateQuery({ data: 'sample' })}
            >
              {text('sampleData')}
            </button>
          </div>
          {sample && <p role="status">{text('sampleHint')}</p>}
        </div>
      )}
      <div className="business-period">
        <div className="business-period-presets hc-scales" role="group" aria-label={text('period')}>
          {[7, 30, 90].map((days) => (
            <button
              type="button"
              className="language"
              key={days}
              aria-label={uiText('ui.metrics.lastDays', { count: days })}
              aria-pressed={through === today && from === shiftDay(today, 1 - days)}
              onClick={() => updateQuery({ from: shiftDay(today, 1 - days), through: today })}
            >
              {uiText('ui.metrics.rangeDays', { count: days })}
            </button>
          ))}
        </div>
        <div className="business-period-fields">
          <label>
            {text('from')}
            <CustomDateInput
              value={from}
              timeZone={zone}
              onChange={(value) => updateQuery({ from: value })}
            />
          </label>
          <label>
            {text('through')}
            <CustomDateInput
              value={through}
              timeZone={zone}
              onChange={(value) => updateQuery({ through: value })}
            />
          </label>
          <label>
            {text('timezone')}
            <CustomSelect
              value={zone}
              onChange={(event) => updateQuery({ zone: event.target.value })}
            >
              {zones.map((value) => (
                <option key={value} value={value}>
                  {value.replaceAll('_', ' ')}
                </option>
              ))}
            </CustomSelect>
          </label>
        </div>
      </div>
      {!valid && <p role="alert">{text('invalidRange')}</p>}
      {loading && <p role="status">{text('loading')}</p>}
      {error && (
        <div role="alert" className="business-metrics-error">
          <p>{text('error')}</p>
          <button className="language" onClick={() => setRevision((v) => v + 1)}>
            {text('retry')}
          </button>
        </div>
      )}
      <section aria-labelledby="business-current-title" aria-busy={loading}>
        <div className="business-section-heading">
          <div>
            <h2 id="business-current-title">{text('currentTitle')}</h2>
            <p className="business-metrics-note">{text('currentHint')}</p>
          </div>
          <a
            className="icon-button"
            title={text('calendar')}
            aria-label={text('calendar')}
            href={'/app/calendar/?' + new URLSearchParams({ zone, date: today })}
          >
            <Icon name="calendar" />
          </a>
        </div>
        {cards([
          { key: 'inCare', hint: 'inCareHint' },
          { key: 'overdue', hint: 'overdueHint' },
          { key: 'customers', hint: 'customersHint' },
          { key: 'pets', hint: 'petsHint' },
          { key: 'recordedDays', hint: 'recordedHint' },
        ])}
      </section>
      {valid && !error && (
        <section className="metrics-charts" aria-label={text('trends')}>
          <MetricChart
            id="revenue-trend"
            title={text('revenueChart')}
            hint={text('revenueChartHint')}
            points={(data?.series ?? []).map((point) => ({
              label:
                dateFormat.format(new Date(point.from)) +
                ' – ' +
                dateFormat.format(new Date(Date.parse(point.through) - 1)),
              shortLabel: dateFormat.format(new Date(point.from)),
              value: (point.revenueCents ?? 0) / 100,
            }))}
            unit="USD"
            unavailable={!data?.revenueAvailable}
            sample={sample}
            loading={loading}
          />
          <MetricChart
            id="balance-trend"
            title={text('balanceChart')}
            hint={text('balanceChartHint')}
            points={trend('balanceChange')}
            unit={text('days')}
            kind="bar"
            sample={sample}
            loading={loading}
          />
          <MetricChart
            id="bookings-trend"
            title={text('bookingsChart')}
            hint={text('scheduledHint')}
            points={trend('bookings')}
            unit={text('bookingUnit')}
            sample={sample}
            loading={loading}
          />
          <MetricChart
            id="customers-trend"
            title={text('customersChart')}
            hint={text('customersChartHint')}
            points={trend('newCustomers')}
            unit={text('customerUnit')}
            sample={sample}
            loading={loading}
          />
          <MetricChart
            id="services-trend"
            dimensionLabel={uiText('ui.houseCalendar.petType')}
            title={text('servicesChart')}
            hint={text('servicesChartHint')}
            points={(data?.serviceUsage ?? []).map((item) => ({
              label: speciesText(item.species),
              shortLabel: speciesText(item.species),
              value: item.stays,
            }))}
            unit={text('stayUnit')}
            kind="bar"
            sample={sample}
            loading={loading}
          />
          <MetricChart
            id="handoffs-trend"
            dimensionLabel={text('handoffType')}
            total={data ? data.actualArrivals + data.actualPickups : undefined}
            title={text('handoffsChart')}
            hint={text('handoffsHint')}
            points={
              data
                ? (
                    [
                      'scheduledArrivals',
                      'actualArrivals',
                      'scheduledPickups',
                      'actualPickups',
                    ] as const
                  ).map((key) => ({
                    label: text(key),
                    shortLabel: text(key + 'Short'),
                    value: data[key],
                  }))
                : []
            }
            unit={text('handoffsUnit')}
            summaryUnit={text('handoffUnit')}
            kind="bar"
            sample={sample}
            loading={loading}
          />
        </section>
      )}
      {data && (
        <p className="business-metrics-updated">
          {text('updated')}{' '}
          {new Intl.DateTimeFormat(localeFor(i18n.language), {
            dateStyle: 'medium',
            timeStyle: 'short',
            timeZone: zone,
          }).format(new Date(data.generatedAt))}{' '}
          · {zone.replaceAll('_', ' ')}
        </p>
      )}
    </section>
  );
}
