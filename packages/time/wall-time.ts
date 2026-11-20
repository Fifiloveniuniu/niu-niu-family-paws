/** Calendar fields represent wall values; only an explicit IANA zone resolves an instant. */
export function wallDay(year: number, month: number, day: number) {
  const date = new Date(0);
  date.setUTCHours(0, 0, 0, 0);
  date.setUTCFullYear(year, month, day);
  return date;
}
export const wallDateKey = (date: Date) => date.toISOString().slice(0, 10);
export const wallDateTimeValue = (date: Date) => date.toISOString().slice(0, 16);
export function parseWallInput(value: string, time: boolean) {
  const match = (
    time ? /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/ : /^(\d{4})-(\d{2})-(\d{2})$/
  ).exec(value.trim().replace(' ', 'T'));
  if (!match) return null;
  const [year, month, day, hour = 0, minute = 0] = match.slice(1).map(Number);
  const date = wallDay(year, month - 1, day);
  date.setUTCHours(hour, minute, 0, 0);
  if (
    year < 1 ||
    year > 9999 ||
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day ||
    hour > 23 ||
    minute > 59 ||
    date.getUTCHours() !== hour ||
    date.getUTCMinutes() !== minute
  )
    return null;
  return { date, value: time ? wallDateTimeValue(date) : wallDateKey(date) };
}
const formatters = new Map<string, Intl.DateTimeFormat>();
function formatter(zone: string) {
  let result = formatters.get(zone);
  if (!result) {
    result = new Intl.DateTimeFormat('en-CA-u-ca-gregory-nu-latn', {
      timeZone: zone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hourCycle: 'h23',
    });
    formatters.set(zone, result);
  }
  return result;
}
function parts(at: number, zone: string) {
  const values: Record<string, number> = {};
  for (const part of formatter(zone).formatToParts(at))
    if (part.type !== 'literal') values[part.type] = Number(part.value);
  const date = wallDay(values.year, values.month - 1, values.day);
  date.setUTCHours(values.hour, values.minute, values.second, 0);
  return date;
}
function offsetsAround(at: number, zone: string) {
  const offsets = new Set<number>();
  for (let hour = -48; hour <= 48; hour += 6) {
    const instant = at + hour * 3600000;
    offsets.add(parts(instant, zone).getTime() - instant);
  }
  return [...offsets];
}
function choicesFor(date: Date, zone: string, offsets: number[]) {
  const target = date.getTime();
  return [
    ...new Set(
      offsets
        .map((offset) => target - offset)
        .filter((instant) => parts(instant, zone).getTime() === target),
    ),
  ]
    .sort((a, b) => a - b)
    .map((instant) => new Date(instant).toISOString());
}
export function resolveWallTime(
  value: string,
  zone: string,
): { choices: string[]; error: 'invalid' | 'zone' | 'gap' | null } {
  const parsed = parseWallInput(value, true);
  if (!parsed) return { choices: [], error: 'invalid' };
  try {
    const choices = choicesFor(parsed.date, zone, offsetsAround(parsed.date.getTime(), zone));
    return { choices, error: choices.length ? null : 'gap' };
  } catch {
    return { choices: [], error: 'zone' };
  }
}
export function zonedValue(instant: string, zone: string) {
  return wallDateTimeValue(parts(Date.parse(instant), zone));
}
export function wallNow(zone?: string) {
  const now = new Date();
  if (zone) {
    try {
      return parseWallInput(zonedValue(now.toISOString(), zone), true)!.date;
    } catch {
      /* An unconfigured zone does not prevent calendar navigation. */
    }
  }
  const date = wallDay(now.getFullYear(), now.getMonth(), now.getDate());
  date.setUTCHours(now.getHours(), now.getMinutes(), 0, 0);
  return date;
}
export function shiftDay(key: string, days: number) {
  const parsed = parseWallInput(key, false);
  if (!parsed) return '';
  parsed.date.setUTCDate(parsed.date.getUTCDate() + days);
  return wallDateKey(parsed.date);
}
/** First real instant of a calendar day, including midnight gaps/folds; null for a skipped day. */
export function startOfZonedDay(key: string, zone: string) {
  const parsed = parseWallInput(key, false);
  if (!parsed) return null;
  try {
    const offsets = offsetsAround(parsed.date.getTime() + 12 * 3600000, zone);
    for (let minute = 0; minute < 1440; minute++) {
      const wall = new Date(parsed.date);
      wall.setUTCMinutes(minute);
      const choices = choicesFor(wall, zone, offsets);
      if (choices.length) return choices[0];
    }
    return null;
  } catch {
    return null;
  }
}
export function zoneOffset(instant: string, zone: string, locale = 'en') {
  return (
    new Intl.DateTimeFormat(locale, { timeZone: zone, hour: '2-digit', timeZoneName: 'longOffset' })
      .formatToParts(new Date(instant))
      .find((part) => part.type === 'timeZoneName')?.value ?? ''
  );
}
