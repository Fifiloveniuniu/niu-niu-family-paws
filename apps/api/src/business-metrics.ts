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
  return { from, through };
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
      return {
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
