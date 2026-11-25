import type { Firestore } from 'firebase-admin/firestore';
import type { HolidayCatalog, HolidayGroup } from '../../../packages/pricing/holiday-catalog.ts';
export function holidayCatalogStore(db: Firestore) {
  return {
    async read(year: number): Promise<HolidayCatalog> {
      const [index, record] = await Promise.all([
        db.doc('configuration/holidayCatalog').get(),
        db.doc('configuration/holidayCatalog/years/' + year).get(),
      ]);
      return {
        year,
        years: index.data()?.years ?? [],
        groups: record.exists ? (record.data()!.groups as HolidayGroup[]) : [],
        available: record.exists,
      };
    },
  };
}
