import { shiftDay, startOfZonedDay, zonedValue } from './wall-time.ts';
export type TimelineTick = { key: string; at: string };
export function timelinePosition(at: number, from: string, through: string) {
  const first = Date.parse(from),
    duration = Date.parse(through) - first;
  return Number.isFinite(at) && Number.isFinite(duration) && duration > 0
    ? ((at - first) / duration) * 100
    : 0;
}
export function timelineSpan(start: number, end: number, from: string, through: string) {
  if (
    ![start, end, Date.parse(from), Date.parse(through)].every(Number.isFinite) ||
    end <= start ||
    Date.parse(through) <= Date.parse(from)
  )
    return null;
  const left = Math.max(0, timelinePosition(start, from, through));
  const right = Math.min(100, timelinePosition(end, from, through));
  return right > left ? { left: `${left}%`, width: `${right - left}%` } : null;
}
export function dailyTimelineTicks(from: string, through: string, zone: string): TimelineTick[] {
  const ticks: TimelineTick[] = [];
  if (
    !Number.isFinite(Date.parse(from)) ||
    !Number.isFinite(Date.parse(through)) ||
    Date.parse(through) <= Date.parse(from)
  )
    return ticks;
  for (let day = zonedValue(from, zone).slice(0, 10); ; day = shiftDay(day, 1)) {
    const at = startOfZonedDay(day, zone);
    if (!at || Date.parse(at) >= Date.parse(through)) break;
    ticks.push({ key: day, at });
  }
  return ticks;
}
export function timelineGrid(ticks: TimelineTick[], from: string, through: string) {
  if (!ticks.length) return 'none';
  return `linear-gradient(to right, ${ticks
    .map((tick) => {
      const position = timelinePosition(Date.parse(tick.at), from, through);
      return `transparent ${position}%, var(--line, #dce5dd) ${position}%, var(--line, #dce5dd) calc(${position}% + 1px), transparent calc(${position}% + 1px)`;
    })
    .join(', ')})`;
}
export function timelineRangeLabel(from: string, through: string, zone: string, locale: string) {
  return new Intl.DateTimeFormat(locale, {
    timeZone: zone,
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).formatRange(new Date(from), new Date(Date.parse(through) - 1));
}
