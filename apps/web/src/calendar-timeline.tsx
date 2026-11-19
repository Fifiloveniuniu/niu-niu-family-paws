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
          return (
            <div
              key={tick.key}
              className="saved-axis-tick calendar-timeline-tick"
              data-at={tick.at}
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
              {view !== 'day' && (
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
  className = '',
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & {
  ticks: TimelineTick[];
  view: 'day' | 'week' | 'month' | 'year';
  minColumnWidth?: number;
  timeline?: Pick<Timeline, 'from' | 'through'>;
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
