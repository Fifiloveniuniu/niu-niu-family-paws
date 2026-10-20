import { FieldPath, type Firestore } from 'firebase-admin/firestore';
import { Conflict, type CustomerStore } from './app.ts';
import type { components } from '../../../packages/contracts/generated.ts';
type Customer = components['schemas']['Customer'];
function record(data: FirebaseFirestore.DocumentData): Customer {
  const { id, name, email, phone, language, version, createdAt, updatedAt } = data;
  return { id, name, email, phone, language, version, createdAt, updatedAt };
}
export function customerSearchKeys(name: string, email: string): string[] {
  const keys = new Set<string>();
  for (const value of [name, email]) {
    const normalized = value.trim().toLowerCase();
    for (let length = 1; length <= normalized.length; length++) keys.add(normalized.slice(0, length));
  }
  return [...keys];
}
export function firestoreStore(db: Firestore): CustomerStore {
  const customers = db.collection('customers');
  return {
    async list(cursor, search) {
      let query = customers.orderBy(FieldPath.documentId()).limit(51);
      if (search) query = query.where('searchKeys', 'array-contains', search);
      if (cursor) query = query.startAfter(cursor);
      const snapshot = await query.get();
      const items = snapshot.docs.slice(0, 50).map(doc => record(doc.data()));
      return { items, nextCursor: snapshot.size > 50 ? items.at(-1)!.id : null };
    },
    async save(id, input, actor) {
      const ref = customers.doc(id);
      return db.runTransaction(async transaction => {
        const snapshot = await transaction.get(ref);
        const previous = snapshot.exists ? record(snapshot.data()!) : null;
        // Replaying the same successful save returns the original record without another audit event.
        if (previous && previous.version === input.version + 1 && ['name','email','phone','language'].every(key => previous[key as keyof Customer] === input[key as keyof typeof input])) return previous;
        if ((previous?.version ?? 0) !== input.version) throw new Conflict();
        const now = new Date().toISOString();
        const customer: Customer = { ...input, id, version: input.version + 1, createdAt: previous?.createdAt ?? now, updatedAt: now };
        transaction.set(ref, { ...customer, searchKeys: customerSearchKeys(customer.name, customer.email) });
        transaction.create(ref.collection('history').doc(String(customer.version)), { actor, at: now, before: previous, after: customer });
        return customer;
      });
    },
  };
}
