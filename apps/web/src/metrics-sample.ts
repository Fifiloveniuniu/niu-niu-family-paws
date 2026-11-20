import type { components } from '../../../packages/contracts/generated';
import { metricIntervals } from '../../../packages/metrics/intervals.ts';
import { shiftDay } from './wall-time.ts';
type Metrics = components['schemas']['BusinessMetrics'];
export type DashboardMetrics = Omit<Metrics, 'series' | 'revenueAvailable'> & {
  revenueAvailable: boolean;
  series: (Omit<Metrics['series'][number], 'revenueCents'> & { revenueCents: number | null })[];
};
// Fictional presentation data only, never written to accounts, bookings or payment records.
// Date-based values stay stable when changing ranges; they are not business prices or forecasts.
export function sampleMetrics(
  from: string,
  through: string,
  zone: string,
  now = Date.now(),
): DashboardMetrics {
  // Fixed UTC event dates keep the underlying example records independent of reporting zone.
  const today = new Date(now).toISOString().slice(0, 10);
  const daily = (day: string) => {
    const seed = [...day].reduce((n, char) => (n * 31 + char.charCodeAt(0)) >>> 0, 17);
    const bookings = seed % 5;
    const actual = day <= today ? Math.max(0, bookings - (seed % 11 === 0 ? 1 : 0)) : 0;
    const cat = actual && seed % 3 === 0 ? 1 : 0;
    const rabbit = actual > 1 && (seed >>> 3) % 9 === 0 ? 1 : 0;
    return {
      bookings,
      newCustomers: day <= today && seed % 7 === 0 ? 1 : 0,
      balanceChange:
        day <= today ? (seed % 7 === 0 ? 30 : 0) - actual * 2 + (seed % 19 === 0 ? 1.5 : 0) : 0,
      revenueCents: actual ? actual * (9500 + (seed % 270) * 100) : 0,
      actual,
      dog: actual - cat - rabbit,
      cat,
      rabbit,
    };
  };
  let actualArrivals = 0,
    scheduledPickups = 0,
    actualPickups = 0;
  const usage = { dog: 0, cat: 0, rabbit: 0 };
  const series = metricIntervals(from, through, zone).map((range) => {
    const point = { ...range, bookings: 0, newCustomers: 0, balanceChange: 0, revenueCents: 0 };
    const last = new Date(Date.parse(range.through) - 1).toISOString().slice(0, 10);
    for (let day = range.from.slice(0, 10); day <= last; day = shiftDay(day, 1)) {
      const at = day + 'T00:00:00.000Z';
      if (at < range.from || at >= range.through) continue;
      const value = daily(day);
      point.bookings += value.bookings;
      point.newCustomers += value.newCustomers;
      point.balanceChange += value.balanceChange;
      point.revenueCents += value.revenueCents;
      actualArrivals += value.actual;
      scheduledPickups += daily(shiftDay(day, -2)).bookings;
      actualPickups += day <= today ? daily(shiftDay(day, -2)).actual : 0;
      for (const species of ['dog', 'cat', 'rabbit'] as const) usage[species] += value[species];
    }
    return point;
  });
  let customers = 42,
    recordedDays = 180;
  for (let offset = -364; offset <= 0; offset++)
    customers += daily(shiftDay(today, offset)).newCustomers;
  for (let offset = -89; offset <= 0; offset++)
    recordedDays += daily(shiftDay(today, offset)).balanceChange;
  return {
    from,
    through,
    generatedAt: new Date(now).toISOString(),
    customers,
    pets: Math.round(customers * 1.42),
    recordedDays,
    inCare: 9,
    overdue: 1,
    scheduledArrivals: series.reduce((n, p) => n + p.bookings, 0),
    scheduledPickups,
    actualArrivals,
    actualPickups,
    revenueAvailable: true,
    series,
    serviceUsage: (['dog', 'cat', 'rabbit'] as const).map((species) => ({
      species,
      stays: usage[species],
    })),
  };
}
