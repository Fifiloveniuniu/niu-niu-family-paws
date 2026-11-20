import { shiftDay, startOfZonedDay, zonedValue } from '../time/wall-time.ts';
/** At most 12 non-overlapping intervals, split at real local midnights (including DST). */
export function metricIntervals(from: string, through: string, zone: string) {
  new Intl.DateTimeFormat('en', { timeZone: zone }).format();
  const boundaries = [from];
  let day = zonedValue(from, zone).slice(0, 10);
  for (let i = 0; i < 368; i++) {
    day = shiftDay(day, 1);
    const at = startOfZonedDay(day, zone);
    if (!at) continue;
    if (at >= through) break;
    if (at > from) boundaries.push(at);
  }
  boundaries.push(through);
  const stride = Math.ceil((boundaries.length - 1) / 12);
  const result: { from: string; through: string }[] = [];
  for (let i = 0; i < boundaries.length - 1; i += stride)
    result.push({
      from: boundaries[i],
      through: boundaries[Math.min(i + stride, boundaries.length - 1)],
    });
  return result;
}
