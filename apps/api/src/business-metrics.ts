import { metricIntervals } from '../../../packages/metrics/intervals.ts';
import { AggregateField, type Firestore, type Query } from 'firebase-admin/firestore';
import type { components } from '../../../packages/contracts/generated.ts';
import { timestamp } from './bookings.ts';
import { PetInvalid } from './pets.ts';
export type MetricsQuery = components['schemas']['BusinessMetricsQuery'];
export type Metrics = components['schemas']['BusinessMetrics'];
export interface BusinessMetricsStore {
  read(input: MetricsQuery): Promise<Metrics>;
}
export function metricsRange(input: MetricsQuery) {
  const from = timestamp(input.from),
    through = timestamp(input.through);
  if (through <= from || Date.parse(through) - Date.parse(from) > 366 * 86400000)
    throw new PetInvalid();
  if (input.timeZone) {
    try {
      new Intl.DateTimeFormat('en', { timeZone: input.timeZone }).format();
    } catch {
      throw new PetInvalid();
    }
  }
  return { from, through, ...(input.timeZone ? { timeZone: input.timeZone } : {}) };
}
export function businessMetricsStore(db: Firestore, clock = Date.now): BusinessMetricsStore {
  const count = async (query: Query) => (await query.count().get()).data().count;
  return {
    async read(input) {
      const { from, through } = metricsRange(input);
      const generatedAt = new Date(clock()).toISOString();
      const bookings = db.collection('bookings');
      const period = (field: string, activeOnly = false) => {
        let query: Query = bookings.where(field, '>=', from).where(field, '<', through);
        if (activeOnly) query = query.where('status', 'in', ['planned', 'in_care', 'completed']);
        return count(query);
      };
      const [
        customers,
        pets,
        accounts,
        inCare,
        overdue,
        scheduledArrivals,
        scheduledPickups,
        actualArrivals,
        actualPickups,
      ] = await Promise.all([
        count(db.collection('customers')),
        count(db.collectionGroup('pets')),
        db
          .collectionGroup('balances')
          .where('service', '==', 'boarding')
          .aggregate({ days: AggregateField.sum('days') })
          .get(),
        count(bookings.where('status', '==', 'in_care')),
        count(bookings.where('status', '==', 'in_care').where('pickup', '<', generatedAt)),
        period('arrival', true),
        period('pickup', true),
        period('actualArrival'),
        period('actualPickup'),
      ]);
      const intervals = metricIntervals(from, through, input.timeZone ?? 'UTC');
      const series: Metrics['series'] = [];
      const between = (query: Query, field: string, range: { from: string; through: string }) =>
        query.where(field, '>=', range.from).where(field, '<', range.through);
      // Bound concurrency and return aggregate points only, never underlying customer/event rows.
      for (let i = 0; i < intervals.length; i += 3) {
        series.push(
          ...(await Promise.all(
            intervals.slice(i, i + 3).map(async (range) => {
              const [planned, newCustomers, before, after] = await Promise.all([
                count(
                  between(
                    bookings.where('status', 'in', ['planned', 'in_care', 'completed']),
                    'arrival',
                    range,
                  ),
                ),
                count(between(db.collection('customers'), 'createdAt', range)),
                between(db.collection('balanceOperations'), 'at', range)
                  .aggregate({ days: AggregateField.sum('before.days') })
                  .get(),
                between(db.collection('balanceOperations'), 'at', range)
                  .aggregate({ days: AggregateField.sum('after.days') })
                  .get(),
              ]);
              return {
                ...range,
                bookings: planned,
                newCustomers,
                balanceChange: after.data().days - before.data().days,
                revenueCents: null,
              };
            }),
          )),
        );
      }
      const serviceUsage = await Promise.all(
        (['dog', 'cat', 'rabbit'] as const).map(async (species) => ({
          species,
          stays: await count(
            between(bookings.where('species', '==', species), 'actualArrival', { from, through }),
          ),
        })),
      );
      return {
        series,
        serviceUsage,
        revenueAvailable: false,
        from,
        through,
        generatedAt,
        customers,
        pets,
        recordedDays: accounts.data().days,
        inCare,
        overdue,
        scheduledArrivals,
        scheduledPickups,
        actualArrivals,
        actualPickups,
      };
    },
  };
}
