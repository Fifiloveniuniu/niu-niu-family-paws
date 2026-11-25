import { useTranslation } from 'react-i18next';
import { uiText, localeFor } from './i18n';
import { apiJson } from './api-client';
import { zonedValue } from './wall-time';
import React from 'react';
import { timelineGrid, timelinePosition, type TimelineTick } from './timeline-layout';
import './calendar-timeline.css';
type Timeline = { from: string; through: string; ticks: TimelineTick[] };
export function CalendarAxis({
  from,
  through,
  ticks,
  label,
  zone,
  locale,
  view,
  className = '',
}: Timeline & {
  label: string;
  zone: string;
  locale: string;
  view: 'day' | 'week' | 'month' | 'year';
  className?: string;
}) {
  const [holidays, setHolidays] = React.useState<string[]>([]);
  React.useEffect(() => {
    const abort = new AbortController();
    void apiJson<{ holidays: string[] }>('/public/pricing', { signal: abort.signal })
      .then((value) => setHolidays(value.holidays))
      .catch(() => {});
    return () => abort.abort();
  }, []);
  const today = zonedValue(new Date().toISOString(), zone).slice(0, 10);
  const offset = (at: string) =>
    new Intl.DateTimeFormat(locale, { timeZone: zone, timeZoneName: 'shortOffset' })
      .formatToParts(new Date(at))
      .find((part) => part.type === 'timeZoneName')?.value;
  const showOffsets = view === 'day' && new Set(ticks.map((tick) => offset(tick.at))).size > 1;
  return (
    <div className={`calendar-timeline-axis ${className}`}>
      <div className="hc-label calendar-timeline-label">{label}</div>
      <div className="saved-axis-track calendar-timeline-axis-track">
        {ticks.map((tick, index) => {
          const date = new Date(tick.at),
            left = timelinePosition(date.getTime(), from, through);
          const right = timelinePosition(
            Date.parse(ticks[index + 1]?.at ?? through),
            from,
            through,
          );
          const dateKey = zonedValue(tick.at, zone).slice(0, 10);
          const holiday = view !== 'year' && holidays.includes(dateKey);
          return (
            <div
              key={tick.key}
              className="saved-axis-tick calendar-timeline-tick"
              data-at={tick.at}
              data-today={dateKey === today}
              data-holiday={holiday}
              style={{ left: `${left}%`, width: `${right - left}%` }}
              title={new Intl.DateTimeFormat(locale, {
                timeZone: zone,
                dateStyle: 'full',
                ...(view === 'day' ? { timeStyle: 'short' as const } : {}),
              }).format(date)}
            >
              <span>
                {new Intl.DateTimeFormat(locale, {
                  timeZone: zone,
                  ...(view === 'day'
                    ? { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' as const }
                    : view === 'year'
                      ? { month: 'short' as const }
                      : { weekday: 'short' as const }),
                }).format(date)}
              </span>
              {showOffsets && <small>{offset(tick.at)}</small>}
              {holiday && (
                <small className="calendar-holiday">
                  {uiText('ui.calendarAnnotations.holiday')}
                </small>
              )}
              {view !== 'day' && view !== 'year' && (
                <strong>
                  {new Intl.DateTimeFormat(locale, { timeZone: zone, day: 'numeric' }).format(date)}
                </strong>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
export function CalendarTrack({
  from,
  through,
  ticks,
  children,
  className = '',
  gridOverContent = false,
}: Timeline & {
  children?: React.ReactNode;
  className?: string;
  gridOverContent?: boolean;
}) {
  const backgroundImage = timelineGrid(ticks, from, through);
  return (
    <div
      className={`calendar-timeline-track ${className}`}
      style={{ backgroundImage, backgroundSize: '100% 100%' }}
    >
      {children}
      {gridOverContent && (
        <span className="calendar-timeline-grid" aria-hidden="true" style={{ backgroundImage }} />
      )}
    </div>
  );
}

export function CalendarFrame({
  ticks,
  view,
  minColumnWidth = view === 'day' || view === 'year' ? 64 : 48,
  timeline,
  zone,
  className = '',
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & {
  ticks: TimelineTick[];
  view: 'day' | 'week' | 'month' | 'year';
  minColumnWidth?: number;
  timeline?: Pick<Timeline, 'from' | 'through'>;
  zone?: string;
}) {
  return (
    <div
      {...props}
      className={`calendar-timeline ${className}`}
      style={{
        ...props.style,
        minWidth: `max(var(--calendar-min-width, 1050px), calc(var(--label, 180px) + ${ticks.length * minColumnWidth}px))`,
      }}
    >
      {timeline && (
        <span
          className="calendar-timeline-continuous-grid"
          aria-hidden="true"
          style={{ backgroundImage: timelineGrid(ticks, timeline.from, timeline.through) }}
        />
      )}
      {timeline && zone && (
        <CalendarNow from={timeline.from} through={timeline.through} zone={zone} />
      )}
      {children}
    </div>
  );
}

export function CalendarViewport({
  label,
  hint,
  className = '',
  children,
}: {
  label: string;
  hint: string;
  className?: string;
  children: React.ReactNode;
}) {
  const ref = React.useRef<HTMLDivElement>(null);
  const [overflowing, setOverflowing] = React.useState(false);
  React.useLayoutEffect(() => {
    const viewport = ref.current;
    if (!viewport) return;
    const update = () => setOverflowing(viewport.scrollWidth > viewport.clientWidth + 1);
    const observer = new ResizeObserver(update);
    observer.observe(viewport);
    if (viewport.firstElementChild) observer.observe(viewport.firstElementChild);
    update();
    return () => observer.disconnect();
  }, []);
  React.useLayoutEffect(() => {
    const viewport = ref.current;
    if (!viewport) return;
    const dialog = viewport.closest('.hc-booking-dialog');
    const toolbar = dialog
      ? dialog.querySelector('.dialog-fixed-header')
      : viewport.closest('.hc')?.querySelector('.marketing-header, .hc-top');
    let frame = 0;
    const update = () => {
      frame = 0;
      const axis = viewport.querySelector<HTMLElement>('.calendar-timeline-axis');
      if (!axis) return;
      const bounds = viewport.getBoundingClientRect();
      const boundary = toolbar?.getBoundingClientRect().bottom ?? 0;
      const context = !dialog && document.querySelector('.workspace-context');
      const top = context ? Math.max(boundary, context.getBoundingClientRect().bottom) : boundary;
      // Keep the axis in its original flow until it reaches the toolbar, then
      // translate within the horizontally pannable frame until its last row.
      const offset = Math.max(0, Math.min(top - bounds.top, bounds.height - axis.offsetHeight));
      viewport.style.setProperty('--calendar-axis-offset', `${offset}px`);
      const marker = viewport.querySelector<HTMLElement>('.workspace-now-marker');
      const dates = axis.querySelector<HTMLElement>('.calendar-timeline-axis-track');
      if (marker && dates && marker.parentElement) {
        // The line and its label share one origin immediately below the dates.
        // Measure the translated date track so both follow the sticky axis.
        const lineTop =
          dates.getBoundingClientRect().bottom - marker.parentElement.getBoundingClientRect().top;
        marker.style.top = `${lineTop}px`;
      }
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    const observer = new ResizeObserver(schedule);
    observer.observe(viewport);
    if (toolbar) observer.observe(toolbar);
    const mutation = new MutationObserver(schedule);
    mutation.observe(viewport, { childList: true, subtree: true });
    document.addEventListener('scroll', update, true);
    window.addEventListener('resize', schedule);
    update();
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      mutation.disconnect();
      document.removeEventListener('scroll', update, true);
      window.removeEventListener('resize', schedule);
    };
  }, []);
  return (
    <>
      <p className="calendar-timeline-pan-hint" hidden={!overflowing}>
        <span aria-hidden="true">↔ </span>
        {hint}
      </p>
      <div
        ref={ref}
        className={`calendar-timeline-viewport ${className}`}
        tabIndex={0}
        aria-label={label}
      >
        {children}
      </div>
    </>
  );
}

function CalendarNow({ from, through, zone }: { from: string; through: string; zone: string }) {
  const [now, setNow] = React.useState(Date.now());
  const { i18n } = useTranslation();
  React.useEffect(() => {
    const update = () => setNow(Date.now());
    const timer = setInterval(update, 1000);
    document.addEventListener('visibilitychange', update);
    return () => {
      clearInterval(timer);
      document.removeEventListener('visibilitychange', update);
    };
  }, []);
  const position = timelinePosition(now, from, through);
  if (position < 0 || position >= 100) return null;
  return (
    <div
      className="workspace-now-marker"
      data-label-align={position > 85 ? 'end' : 'start'}
      style={{
        left: `calc(var(--label, 180px) + (100% - var(--label, 180px)) * ${position / 100})`,
      }}
      aria-label={uiText('ui.workspace.now')}
    >
      <span>
        {uiText('ui.workspace.now')}{' '}
        <time dateTime={new Date(now).toISOString()}>
          {new Date(now).toLocaleTimeString(localeFor(i18n.language), {
            timeZone: zone,
            hour: '2-digit',
            minute: '2-digit',
          })}
        </time>
      </span>
    </div>
  );
}
