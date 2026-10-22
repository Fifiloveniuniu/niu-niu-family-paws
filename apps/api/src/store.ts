import { randomUUID } from 'node:crypto';
import { FieldPath, type Firestore } from 'firebase-admin/firestore';
import { Conflict, type CustomerStore } from './app.ts';
import type { components } from '../../../packages/contracts/generated.ts';
type Customer = components['schemas']['Customer'];
function record(data: FirebaseFirestore.DocumentData): Customer {
  const { id, name, email, phone, language, version, createdAt, updatedAt } = data;
  return { id, name, email, phone, language, version, createdAt, updatedAt, loginEmail: data.loginEmail ?? null };
}
export function customerSearchKeys(name: string, email: string, loginEmail = ''): string[] {
  const keys = new Set<string>();
  for (const value of [name, email, loginEmail]) {
    const normalized = value.trim().toLowerCase();
    for (let length = 1; length <= normalized.length; length++) keys.add(normalized.slice(0, length));
  }
  return [...keys];
}
export function firestoreStore(db: Firestore): CustomerStore {
  const customers = db.collection('customers');
  const people = db.collection('people');
  return {
    async profile(identity) {
      return db.runTransaction(async transaction => {
        const person = await transaction.get(people.doc(identity.uid));
        if (!person.exists) return null;
        const ref = customers.doc(person.data()!.customerId);
        const snapshot = await transaction.get(ref);
        if (!snapshot.exists || snapshot.data()!.ownerUid !== identity.uid) throw new Error('Profile ownership mismatch');
        const previous = record(snapshot.data()!);
        if (previous.loginEmail === identity.email) return previous;
        // Refresh trusted identity metadata without copying the editable person profile.
        const now = new Date().toISOString();
        const customer = { ...previous, loginEmail: identity.email, version: previous.version + 1, updatedAt: now };
        transaction.update(ref, { loginEmail: identity.email, version: customer.version, updatedAt: now, searchKeys: customerSearchKeys(customer.name, customer.email, identity.email) });
        transaction.create(ref.collection('history').doc(String(customer.version)), { actor: identity.uid, at: now, source: 'identity-sync', before: previous, after: customer });
        return customer;
      });
    },
    async saveProfile(identity, input) {
      const personRef = people.doc(identity.uid);
      const newId = randomUUID();
      return db.runTransaction(async transaction => {
        const person = await transaction.get(personRef);
        const ref = customers.doc(person.exists ? person.data()!.customerId : newId);
        const snapshot = await transaction.get(ref);
        if (person.exists && (!snapshot.exists || snapshot.data()!.ownerUid !== identity.uid)) throw new Error('Profile ownership mismatch');
        if (!person.exists && snapshot.exists) throw new Conflict();
        const previous = snapshot.exists ? record(snapshot.data()!) : null;
        const same = previous && previous.name === input.name && previous.language === input.language && previous.loginEmail === identity.email;
        if (same && (previous.version === input.version || previous.version === input.version + 1)) return previous;
        if ((previous?.version ?? 0) !== input.version) throw new Conflict();
        const now = new Date().toISOString();
        const customer: Customer = {
          id: ref.id, name: input.name, language: input.language,
          email: previous?.email ?? '', phone: previous?.phone ?? '', loginEmail: identity.email,
          version: input.version + 1, createdAt: previous?.createdAt ?? now, updatedAt: now,
        };
        transaction.set(ref, { ...customer, ownerUid: identity.uid, searchKeys: customerSearchKeys(customer.name, customer.email, identity.email) }, { merge: true });
        if (!person.exists) transaction.create(personRef, { customerId: ref.id, createdAt: now });
        transaction.create(ref.collection('history').doc(String(customer.version)), { actor: identity.uid, at: now, source: 'self', before: previous, after: customer });
        return customer;
      });
    },
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
        const customer: Customer = { ...input, id, version: input.version + 1, createdAt: previous?.createdAt ?? now, updatedAt: now, loginEmail: previous?.loginEmail ?? null };
        transaction.set(ref, { ...customer, searchKeys: customerSearchKeys(customer.name, customer.email, customer.loginEmail ?? '') }, { merge: true });
        transaction.create(ref.collection('history').doc(String(customer.version)), { actor, at: now, before: previous, after: customer });
        return customer;
      });
    },
  };
}
