import IconButton from './icon-button';
import React from 'react';
import Icon from './icons';
import { localeFor, uiText } from './i18n';
import { useTranslation } from 'react-i18next';
type Point = { label: string; shortLabel: string; value: number };
export default function MetricChart({
  id,
  title,
  hint,
  points,
  unit,
  kind = 'line',
  unavailable = false,
  loading = false,
  total,
  summaryUnit,
  dimensionLabel,
  wrapLabels = false,
}: {
  id: string;
  title: string;
  hint: string;
  points: Point[];
  unit: string;
  kind?: 'line' | 'bar';
  unavailable?: boolean;
  loading?: boolean;
  total?: number;
  summaryUnit?: string;
  dimensionLabel?: string;
  wrapLabels?: boolean;
}) {
  const { i18n } = useTranslation();
  const plot = React.useRef<HTMLDivElement>(null);
  const [width, setWidth] = React.useState(600);
  React.useLayoutEffect(() => {
    const node = plot.current;
    if (!node) return;
    const resize = new ResizeObserver(([entry]) =>
      setWidth(Math.max(260, Math.min(600, entry.contentRect.width))),
    );
    resize.observe(node);
    return () => resize.disconnect();
  }, []);
  const [active, setActive] = React.useState(-1),
    [table, setTable] = React.useState(false);
  const controls = React.useRef<(SVGGElement | null)[]>([]);
  const selectedIndex =
    active < 0 ? points.length - 1 : Math.min(active, Math.max(0, points.length - 1));
  const selected = points[selectedIndex];
  const text = (key: string) => uiText('ui.metrics.' + key);
  const min = Math.min(0, ...points.map((p) => p.value)),
    rawMax = Math.max(0, ...points.map((p) => p.value)),
    step =
      unit === text('days')
        ? Math.max(0.5, Math.ceil(((rawMax - min || 1) / 3) * 2) / 2)
        : Math.max(1, Math.ceil((rawMax - min || 1) / 3)),
    max = min + step * 3;
  const left = 48,
    right = width - 18,
    top = 18,
    bottom = 182;
  const x = (i: number) =>
    kind === 'bar'
      ? left + ((i + 0.5) * (right - left)) / points.length
      : points.length === 1
        ? (left + right) / 2
        : left + (i * (right - left)) / (points.length - 1);
  const y = (value: number) => bottom - ((value - min) / (max - min)) * (bottom - top);
  const path = points.map((p, i) => `${i ? 'L' : 'M'}${x(i)},${y(p.value)}`).join(' ');
  const values = new Intl.NumberFormat(localeFor(i18n.language), { maximumFractionDigits: 2 });
  const headline = (value: number) =>
    unit === 'USD'
      ? new Intl.NumberFormat(localeFor(i18n.language), {
          style: 'currency',
          currency: 'USD',
          maximumFractionDigits: 0,
        }).format(value)
      : values.format(value);
  const aggregate = total ?? points.reduce((sum, point) => sum + point.value, 0);
  const stackedLabels = wrapLabels && width < 400;
  const splitLabel = (label: string) =>
    label.includes(' ') ? label.split(' ') : [label.slice(0, 2), label.slice(2)];
  const zero = points.length > 0 && points.every((p) => p.value === 0);
  return (
    <figure className="metric-chart" aria-labelledby={id + '-title'} aria-busy={loading}>
      <div className="metric-chart-heading">
        <div>
          <h2 id={id + '-title'}>{title}</h2>
          <p>{hint}</p>
        </div>
        <IconButton
          type="button"

          aria-label={text('viewData') + ': ' + title}
          title={text('viewData')}
          aria-expanded={table}
          aria-controls={id + '-data'}
          disabled={unavailable || loading || !points.length}
          onClick={() => setTable((v) => !v)}
        >
          <Icon name="menu" />
        </IconButton>
      </div>
      <div className="metric-chart-total">
        <strong>{unavailable || loading ? '—' : headline(aggregate)}</strong>
        {!unavailable && !loading && (
          <span>
            {summaryUnit ?? (unit === 'USD' ? 'USD' : unit)} · {text('periodTitle')}
          </span>
        )}
      </div>
      <div className="metric-chart-plot" ref={plot}>
        <svg
          viewBox={`0 0 ${width} ${stackedLabels ? 238 : 220}`}
          role="img"
          aria-labelledby={id + '-title ' + id + '-description'}
        >
          <desc id={id + '-description'}>
            {unavailable ? text('revenueHint') : hint + ' ' + unit}
          </desc>
          {[0, 1, 2, 3].map((i) => {
            const value = min + ((max - min) * i) / 3;
            return (
              <g key={i} className="metric-chart-grid">
                <line x1={left} x2={right} y1={y(value)} y2={y(value)} />
                {!unavailable && !loading && (
                  <text x={left - 10} y={y(value) + 4} textAnchor="end">
                    {new Intl.NumberFormat(localeFor(i18n.language), {
                      notation: 'compact',
                      maximumFractionDigits: 1,
                    }).format(value)}
                  </text>
                )}
              </g>
            );
          })}
          {!unavailable && !loading && points.length > 0 && (
            <>
              {kind === 'line' && <path className="metric-chart-line" d={path} />}
              {kind === 'bar' && (
                <line className="metric-chart-zero" x1={left} x2={right} y1={y(0)} y2={y(0)} />
              )}
              {points.map((point, i) => (
                <g
                  key={i}
                  ref={(node) => {
                    controls.current[i] = node;
                  }}
                  role="button"
                  tabIndex={i === selectedIndex ? 0 : -1}
                  aria-label={`${point.label}: ${values.format(point.value)} ${unit}`}
                  aria-pressed={i === selectedIndex}
                  className="metric-chart-point"
                  onPointerEnter={() => setActive(i)}
                  onClick={() => setActive(i)}
                  onFocus={() => setActive(i)}
                  onKeyDown={(event) => {
                    if (['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) {
                      event.preventDefault();
                      const next =
                        event.key === 'Home'
                          ? 0
                          : event.key === 'End'
                            ? points.length - 1
                            : Math.max(
                                0,
                                Math.min(
                                  points.length - 1,
                                  i + (event.key === 'ArrowLeft' ? -1 : 1),
                                ),
                              );
                      setActive(next);
                      controls.current[next]?.focus();
                    }
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      setActive(i);
                    }
                  }}
                >
                  <title>
                    {point.label}: {values.format(point.value)} {unit}
                  </title>
                  <rect
                    className="metric-chart-hit"
                    x={x(i) - Math.min(22, (right - left) / Math.max(points.length, 1) / 2)}
                    width={Math.min(44, (right - left) / Math.max(points.length, 1))}
                    y={top}
                    height={bottom - top}
                  />
                  {kind === 'bar' ? (
                    <rect
                      className="metric-chart-bar"
                      data-negative={point.value < 0}
                      x={x(i) - Math.min(13, 180 / points.length)}
                      width={Math.min(26, 360 / points.length)}
                      y={Math.min(y(0), y(point.value))}
                      height={Math.max(point.value === 0 ? 1 : 3, Math.abs(y(point.value) - y(0)))}
                    />
                  ) : (
                    <circle
                      className="metric-chart-dot"
                      cx={x(i)}
                      cy={y(point.value)}
                      r={i === selectedIndex ? 5 : 3.5}
                    />
                  )}
                  {(points.length <= 4 ||
                    i === 0 ||
                    i === points.length - 1 ||
                    i % Math.ceil(points.length / (width < 400 ? 2 : 4)) === 0) && (
                    <text
                      className="metric-chart-tick"
                      x={x(i)}
                      y={bottom + 24}
                      textAnchor={
                        kind === 'bar'
                          ? 'middle'
                          : i === 0
                            ? 'start'
                            : i === points.length - 1
                              ? 'end'
                              : 'middle'
                      }
                    >
                      {stackedLabels
                        ? splitLabel(point.shortLabel).map((part, line) => (
                            <tspan key={line} x={x(i)} dy={line ? 14 : 0}>
                              {part}
                            </tspan>
                          ))
                        : point.shortLabel.length > 14
                          ? point.shortLabel.slice(0, 12) + '…'
                          : point.shortLabel}
                    </text>
                  )}
                </g>
              ))}
            </>
          )}
        </svg>
        {(unavailable || loading) && (
          <div className="metric-chart-placeholder">
            <Icon name={unavailable ? 'balance' : 'clock'} />
            <strong>{text(loading ? 'loading' : 'revenue')}</strong>
            <span>{unavailable ? text('revenueHint') : ''}</span>
          </div>
        )}
      </div>
      {!unavailable && !loading && selected && (
        <figcaption className="metric-chart-selection" aria-live="polite">
          <span>{selected.label}</span>
          <strong>
            {values.format(selected.value)} <small>{unit}</small>
          </strong>
        </figcaption>
      )}
      {!unavailable && !loading && zero && (
        <p className="metric-chart-empty">{text('noRecordedActivity')}</p>
      )}
      {table && (
        <div id={id + '-data'} className="metric-chart-data">
          <table>
            <caption className="sr-only">{title}</caption>
            <thead>
              <tr>
                <th>{dimensionLabel ?? text('period')}</th>
                <th>{unit}</th>
              </tr>
            </thead>
            <tbody>
              {points.map((point, i) => (
                <tr key={i}>
                  <td>{point.label}</td>
                  <td>{values.format(point.value)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </figure>
  );
}
