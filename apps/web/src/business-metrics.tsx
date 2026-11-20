import MetricChart from './metric-chart';
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
  const key = from + ':' + through + ':' + zone + ':' + revision;
  React.useEffect(() => {
    if (!valid || !start || !end) return;
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
  }, [key, valid, start, end]);
  const data = valid && state.key === key ? state.data : null,
    error = valid && state.key === key && state.error,
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
            <dd className="business-metric-hint">{text(item.hint)}</dd>
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
      <div className="business-period">
        <div className="business-period-presets" role="group" aria-label={text('period')}>
          {[7, 30, 90].map((days) => (
            <button
              type="button"
              className="language"
              key={days}
              aria-pressed={through === today && from === shiftDay(today, 1 - days)}
              onClick={() => updateQuery({ from: shiftDay(today, 1 - days), through: today })}
            >
              {uiText('ui.metrics.lastDays', { count: days })}
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
      {valid && !error && (
        <section className="metrics-charts" aria-label={text('trends')}>
          <MetricChart
            id="revenue-trend"
            title={text('revenueChart')}
            hint={text('revenueChartHint')}
            points={[]}
            unit="USD"
            unavailable
            loading={loading}
          />
          <MetricChart
            id="balance-trend"
            title={text('balanceChart')}
            hint={text('balanceChartHint')}
            points={trend('balanceChange')}
            unit={text('days')}
            kind="bar"
            loading={loading}
          />
          <MetricChart
            id="bookings-trend"
            title={text('bookingsChart')}
            hint={text('scheduledHint')}
            points={trend('bookings')}
            unit={text('bookingUnit')}
            loading={loading}
          />
          <MetricChart
            id="customers-trend"
            title={text('customersChart')}
            hint={text('customersChartHint')}
            points={trend('newCustomers')}
            unit={text('customerUnit')}
            loading={loading}
          />
          <MetricChart
            id="services-trend"
            title={text('servicesChart')}
            hint={text('servicesChartHint')}
            points={(data?.serviceUsage ?? []).map((item) => ({
              label: speciesText(item.species),
              shortLabel: speciesText(item.species),
              value: item.stays,
            }))}
            unit={text('stayUnit')}
            kind="bar"
            loading={loading}
          />
        </section>
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
        ])}
      </section>
      <div className="business-recorded-days">
        <div>
          <h2>{text('recordedDays')}</h2>
          <p>{text('recordedHint')}</p>
        </div>
        <strong data-metric="recordedDays">
          {data ? number.format(data.recordedDays) : '—'} <small>{text('days')}</small>
        </strong>
        <a
          className="icon-button"
          title={text('balances')}
          aria-label={text('balances')}
          href="/app/balances/"
        >
          <Icon name="balance" />
        </a>
      </div>
      <div className="business-payment-note">
        <Icon name="balance" />
        <div>
          <h2>{text('revenue')}</h2>
          <p>{text('revenueHint')}</p>
        </div>
      </div>
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
