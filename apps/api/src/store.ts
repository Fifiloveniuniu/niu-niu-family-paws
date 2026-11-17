import { randomUUID } from 'node:crypto';
import { FieldPath, type Firestore } from 'firebase-admin/firestore';
import { Conflict, type CustomerStore } from './app.ts';
import type { components } from '../../../packages/contracts/generated.ts';
type Customer = components['schemas']['Customer'];
function customerFromDocument(data: FirebaseFirestore.DocumentData): Customer {
  const { id, name, email, phone, language, version, createdAt, updatedAt } = data;
  return {
    id,
    name,
    email,
    phone,
    language,
    version,
    createdAt,
    updatedAt,
    loginEmail: data.loginEmail ?? null,
  };
}
export function customerSearchKeys(name: string, email: string, loginEmail = ''): string[] {
  const keys = new Set<string>();
  for (const value of [name, email, loginEmail]) {
    const normalized = value.trim().toLowerCase();
    for (let length = 1; length <= normalized.length; length++)
      keys.add(normalized.slice(0, length));
  }
  return [...keys];
}
export function firestoreStore(database: Firestore): CustomerStore {
  const customers = database.collection('customers');
  const people = database.collection('people');
  return {
    async profile(identity) {
      return database.runTransaction(async (transaction) => {
        const person = await transaction.get(people.doc(identity.uid));
        if (!person.exists) return null;
        const customerRef = customers.doc(person.data()!.customerId);
        const snapshot = await transaction.get(customerRef);
        if (!snapshot.exists || snapshot.data()!.ownerUid !== identity.uid)
          throw new Error('Profile ownership mismatch');
        const previous = customerFromDocument(snapshot.data()!);
        if (previous.loginEmail === identity.email) return previous;
        // Refresh trusted identity metadata without copying the editable person profile.
        const now = new Date().toISOString();
        const customer = {
          ...previous,
          loginEmail: identity.email,
          version: previous.version + 1,
          updatedAt: now,
        };
        transaction.update(customerRef, {
          loginEmail: identity.email,
          version: customer.version,
          updatedAt: now,
          searchKeys: customerSearchKeys(customer.name, customer.email, identity.email),
        });
        transaction.create(customerRef.collection('history').doc(String(customer.version)), {
          actor: identity.uid,
          at: now,
          source: 'identity-sync',
          before: previous,
          after: customer,
        });
        return customer;
      });
    },
    async saveProfile(identity, input) {
      const personRef = people.doc(identity.uid);
      const newId = randomUUID();
      return database.runTransaction(async (transaction) => {
        const person = await transaction.get(personRef);
        const customerRef = customers.doc(person.exists ? person.data()!.customerId : newId);
        const snapshot = await transaction.get(customerRef);
        if (person.exists && (!snapshot.exists || snapshot.data()!.ownerUid !== identity.uid))
          throw new Error('Profile ownership mismatch');
        if (!person.exists && snapshot.exists) throw new Conflict();
        const previous = snapshot.exists ? customerFromDocument(snapshot.data()!) : null;
        const unchangedProfile =
          previous &&
          previous.name === input.name &&
          previous.language === input.language &&
          previous.loginEmail === identity.email;
        if (
          unchangedProfile &&
          (previous.version === input.version || previous.version === input.version + 1)
        )
          return previous;
        if ((previous?.version ?? 0) !== input.version) throw new Conflict();
        const now = new Date().toISOString();
        const customer: Customer = {
          id: customerRef.id,
          name: input.name,
          language: input.language,
          email: previous?.email ?? '',
          phone: previous?.phone ?? '',
          loginEmail: identity.email,
          version: input.version + 1,
          createdAt: previous?.createdAt ?? now,
          updatedAt: now,
        };
        transaction.set(
          customerRef,
          {
            ...customer,
            ownerUid: identity.uid,
            searchKeys: customerSearchKeys(customer.name, customer.email, identity.email),
          },
          { merge: true },
        );
        if (!person.exists)
          transaction.create(personRef, { customerId: customerRef.id, createdAt: now });
        transaction.create(customerRef.collection('history').doc(String(customer.version)), {
          actor: identity.uid,
          at: now,
          source: 'self',
          before: previous,
          after: customer,
        });
        return customer;
      });
    },
    async list(cursor, search) {
      let query = customers.orderBy(FieldPath.documentId()).limit(51);
      if (search) query = query.where('searchKeys', 'array-contains', search);
      if (cursor) query = query.startAfter(cursor);
      const snapshot = await query.get();
      const items = snapshot.docs.slice(0, 50).map((doc) => customerFromDocument(doc.data()));
      return { items, nextCursor: snapshot.size > 50 ? items.at(-1)!.id : null };
    },
    async save(id, input, actor) {
      const customerRef = customers.doc(id);
      return database.runTransaction(async (transaction) => {
        const snapshot = await transaction.get(customerRef);
        const previous = snapshot.exists ? customerFromDocument(snapshot.data()!) : null;
        // Replaying the same successful save returns the original record without another audit event.
        if (
          previous &&
          previous.version === input.version + 1 &&
          ['name', 'email', 'phone', 'language'].every(
            (key) => previous[key as keyof Customer] === input[key as keyof typeof input],
          )
        )
          return previous;
        if ((previous?.version ?? 0) !== input.version) throw new Conflict();
        const now = new Date().toISOString();
        const customer: Customer = {
          ...input,
          id,
          version: input.version + 1,
          createdAt: previous?.createdAt ?? now,
          updatedAt: now,
          loginEmail: previous?.loginEmail ?? null,
        };
        transaction.set(
          customerRef,
          {
            ...customer,
            searchKeys: customerSearchKeys(
              customer.name,
              customer.email,
              customer.loginEmail ?? '',
            ),
          },
          { merge: true },
        );
        transaction.create(customerRef.collection('history').doc(String(customer.version)), {
          actor,
          at: now,
          before: previous,
          after: customer,
        });
        return customer;
      });
    },
  };
}
