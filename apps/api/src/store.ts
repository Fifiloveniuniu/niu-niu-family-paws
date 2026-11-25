import { randomUUID, createHash } from 'node:crypto';
import { FieldPath, type Firestore } from 'firebase-admin/firestore';
import { uuidSchema } from './validation.ts';
import { Conflict, type CustomerStore } from './app.ts';
import type { components } from '../../../packages/contracts/generated.ts';
type Customer = components['schemas']['Customer'];
export function customerFromDocument(data: FirebaseFirestore.DocumentData): Customer {
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
const scanLimit = 250;
const uuid = new RegExp(uuidSchema.pattern);
const invalidCursor = () => Object.assign(new Error('Invalid cursor'), { validation: true });
function customerMatches(data: FirebaseFirestore.DocumentData, query?: string) {
  if (!query) return true;
  return [data.name, data.email, data.loginEmail].some(
    (value) => typeof value === 'string' && value.toLowerCase().includes(query),
  );
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
    async list(cursor, search, pageSize, petSearch, customerId) {
      const size = Number(pageSize ?? 50);
      search = search?.trim().toLowerCase();
      petSearch = petSearch?.trim().toLowerCase();
      if (petSearch) {
        const binding = createHash('sha256')
          .update(JSON.stringify([search ?? '', petSearch, customerId ?? '', size]))
          .digest('hex');
        let after: string | undefined;
        let emitted: string | null = null;
        if (cursor) {
          try {
            const parsed = JSON.parse(Buffer.from(cursor, 'base64url').toString());
            const [cid, pid, extra] = String(parsed.after).split('/');
            if (
              parsed.v !== 1 ||
              parsed.binding !== binding ||
              !uuid.test(cid) ||
              !uuid.test(pid) ||
              extra ||
              (parsed.emitted !== null && !uuid.test(parsed.emitted))
            )
              throw Error();
            after = parsed.after;
            emitted = parsed.emitted;
          } catch {
            throw invalidCursor();
          }
        }
        let query: FirebaseFirestore.Query = customerId
          ? customers.doc(customerId).collection('pets')
          : database.collectionGroup('pets');
        query = query.orderBy(FieldPath.documentId()).limit(scanLimit + 1);
        if (after) {
          const [cid, pid] = after.split('/');
          if (customerId && cid !== customerId) throw invalidCursor();
          query = query.startAfter(customers.doc(cid).collection('pets').doc(pid));
        }
        const snapshot = await query.get();
        const window = snapshot.docs.slice(0, scanLimit);
        const candidates = window.filter(
          (doc) =>
            typeof doc.data().name === 'string' &&
            doc.data().name.toLowerCase().includes(petSearch!),
        );
        const ids = [...new Set(candidates.map((doc) => doc.ref.parent.parent!.id))].filter(
          (id) => id !== emitted,
        );
        const roots = ids.length
          ? await database.getAll(...ids.map((id) => customers.doc(id)))
          : [];
        const records = new Map(
          roots
            .filter((doc) => doc.exists && customerMatches(doc.data()!, search))
            .map((doc) => [doc.id, customerFromDocument(doc.data()!)]),
        );
        const found: { customer: Customer; after: string }[] = [];
        const seen = new Set<string>(emitted ? [emitted] : []);
        for (const doc of candidates) {
          const cid = doc.ref.parent.parent!.id;
          if (seen.has(cid)) continue;
          seen.add(cid);
          const customer = records.get(cid);
          if (customer) found.push({ customer, after: `${cid}/${doc.id}` });
        }
        const returned = found.slice(0, size);
        const last = returned.at(-1);
        const continuation =
          found.length > size
            ? last!.after
            : snapshot.size > scanLimit
              ? `${window.at(-1)!.ref.parent.parent!.id}/${window.at(-1)!.id}`
              : null;
        return {
          items: returned.map((item) => item.customer),
          nextCursor:
            continuation && !(customerId && returned.length)
              ? Buffer.from(
                  JSON.stringify({
                    v: 1,
                    binding,
                    after: continuation,
                    emitted: last?.customer.id ?? emitted,
                  }),
                ).toString('base64url')
              : null,
        };
      }
      if (cursor && !uuid.test(cursor)) throw invalidCursor();
      if (customerId) {
        const snapshot = await customers.doc(customerId).get();
        return {
          items:
            snapshot.exists && customerMatches(snapshot.data()!, search)
              ? [customerFromDocument(snapshot.data()!)]
              : [],
          nextCursor: null,
        };
      }
      let query = customers
        .orderBy(FieldPath.documentId())
        .limit(search ? scanLimit + 1 : size + 1);
      if (cursor) query = query.startAfter(cursor);
      const snapshot = await query.get();
      const window = snapshot.docs.slice(0, search ? scanLimit : size + 1);
      const matched = window.filter((doc) => customerMatches(doc.data(), search));
      const docs = matched.slice(0, size);
      const continuation =
        matched.length > size
          ? docs.at(-1)!.id
          : search && snapshot.size > scanLimit
            ? window.at(-1)!.id
            : null;
      return {
        items: docs.map((doc) => customerFromDocument(doc.data())),
        nextCursor: continuation,
      };
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
