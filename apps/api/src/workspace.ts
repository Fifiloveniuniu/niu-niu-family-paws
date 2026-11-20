import { createHash } from 'node:crypto';
import { FieldPath, Filter, type Firestore } from 'firebase-admin/firestore';
import type { FastifyInstance } from 'fastify';
import type { components } from '../../../packages/contracts/generated.ts';
import { projectRoom } from './rooms.ts';
import spec from '../../../packages/contracts/openapi.json' with { type: 'json' };
import { timestamp } from './bookings.ts';
import { projectBoardingAccount, projectBoardingEvent } from './balances.ts';
import { requestIdentity, type Identity } from './request-context.ts';
import { PetAccess, PetMissing, PetInvalid, projectPet } from './pets.ts';
import { customerFromDocument } from './store.ts';
import { uuidSchema, emptyObjectSchema } from './validation.ts';
type Customer = components['schemas']['Customer'];
type WorkspacePets = components['schemas']['WorkspacePets'];
type WorkspaceLocations = components['schemas']['WorkspaceLocations'];
export interface WorkspaceStore {
  events(
    identity: Identity,
    input: components['schemas']['WorkspaceEventQuery'],
  ): Promise<components['schemas']['WorkspaceEvents']>;
  pets(
    identity: Identity,
    customerId?: string,
    cursor?: string,
    options?: { pageSize?: string; petId?: string },
  ): Promise<WorkspacePets>;
  locations(identity: Identity): Promise<WorkspaceLocations>;
  busy(
    identity: Identity,
    input: { customerId?: string; from: string; through: string; cursor?: string },
  ): Promise<{
    items: { houseId: string; roomId: string; from: string; through: string }[];
    nextCursor: string | null;
  }>;
}
export function workspaceStore(database: Firestore): WorkspaceStore {
  async function scope(
    tx: FirebaseFirestore.Transaction,
    identity: Identity,
    requested?: string,
  ): Promise<Customer | null> {
    let cid = requested;
    if (identity.admin !== true) {
      if (identity.google !== true) throw new PetAccess();
      const person = await tx.get(database.doc('people/' + identity.uid));
      if (!person.exists) {
        if (requested) throw new PetAccess();
        return null;
      }
      cid = person.data()!.customerId;
      if (requested && requested !== cid) throw new PetAccess();
    }
    if (!cid) return null;
    const customer = await tx.get(database.doc('customers/' + cid));
    if (!customer.exists) {
      if (identity.admin === true) throw new PetMissing();
      throw new PetAccess();
    }
    if (identity.admin !== true && customer.data()!.ownerUid !== identity.uid)
      throw new PetAccess();
    return customerFromDocument({ ...customer.data(), id: cid });
  }
  return {
    async pets(identity, customerId, cursor, options = {}) {
      const size = Number(options.pageSize ?? 100);
      return database.runTransaction(async (tx) => {
        const customer = await scope(tx, identity, customerId);
        if (!customer && identity.admin !== true)
          return { admin: false, customer: null, items: [], nextCursor: null };
        if (options.petId && !customer) throw new PetInvalid();
        const source = customer
          ? database.doc('customers/' + customer.id).collection('pets')
          : database.collectionGroup('pets');
        let query = source.orderBy(FieldPath.documentId()).limit(size + 1);
        if (options.petId)
          query = query.where(
            FieldPath.documentId(),
            '==',
            database.doc(`customers/${customer!.id}/pets/${options.petId}`),
          );
        if (cursor) {
          const [cid, pid] = cursor.split('/');
          if (!cid || !pid || (customer && customer.id !== cid)) throw new PetInvalid();
          query = query.startAfter(database.doc(`customers/${cid}/pets/${pid}`));
        }
        const result = await tx.get(query);
        const docs = result.docs.slice(0, size);
        const ids = [...new Set(docs.map((doc) => doc.ref.parent.parent!.id))];
        const customerDocs = ids.length
          ? await tx.getAll(...ids.map((cid) => database.doc('customers/' + cid)))
          : [];
        const customers = new Map(
          customerDocs.map((doc) => {
            if (!doc.exists) throw new PetMissing();
            return [doc.id, customerFromDocument({ ...doc.data(), id: doc.id })];
          }),
        );
        const accounts = docs.length
          ? await tx.getAll(...docs.map((doc) => doc.ref.collection('balances').doc('boarding')))
          : [];
        const items = docs.map((doc, index) => ({
          customer: customers.get(doc.ref.parent.parent!.id)!,
          pet: projectPet({ ...doc.data(), id: doc.id, customerId: doc.ref.parent.parent!.id }),
          account: accounts[index].exists ? projectBoardingAccount(accounts[index].data()!) : null,
        }));
        const last = docs.at(-1);
        return {
          admin: identity.admin === true,
          customer,
          items,
          nextCursor:
            result.size > size && last ? last.ref.parent.parent!.id + '/' + last.id : null,
        };
      });
    },
    async events(identity, input) {
      const size = Number(input.pageSize ?? 50);
      const from = input.from ? timestamp(input.from) : null,
        through = input.through ? timestamp(input.through) : null;
      if (from && through && through <= from) throw new PetInvalid();
      return database.runTransaction(async (tx) => {
        const customer = await scope(tx, identity, input.customerId);
        if (!customer && identity.admin !== true) return { items: [], nextCursor: null };
        if (input.petId && !customer) throw new PetInvalid();
        if (input.petId) {
          const pet = await tx.get(database.doc(`customers/${customer!.id}/pets/${input.petId}`));
          if (!pet.exists) throw new PetMissing();
        }
        const binding = createHash('sha256')
          .update(
            JSON.stringify([
              identity.uid,
              customer?.id ?? '',
              input.petId ?? '',
              input.kind ?? '',
              from,
              through,
            ]),
          )
          .digest('hex');
        let anchor: { at: string; id: string; source: string } | null = null;
        if (input.cursor) {
          try {
            const value = JSON.parse(Buffer.from(input.cursor, 'base64url').toString());
            if (
              value.binding !== binding ||
              typeof value.id !== 'string' ||
              !/^[a-f0-9-]{36}$/i.test(value.id) ||
              typeof value.at !== 'string' ||
              timestamp(value.at) !== value.at ||
              !['balanceOperations', 'bookingOperations'].includes(value.source)
            )
              throw Error();
            anchor = value;
          } catch {
            throw new PetInvalid();
          }
        }
        const isBookingKind = input.kind === 'booking' || input.kind === 'cancelled';
        function ordered(collection: string, booking: boolean) {
          let query: FirebaseFirestore.Query = database.collection(collection);
          if (customer)
            query = query.where(booking ? 'result.customerId' : 'customerId', '==', customer.id);
          if (input.petId)
            query = query.where(booking ? 'result.petId' : 'petId', '==', input.petId);
          if (input.kind)
            query = booking
              ? input.kind === 'cancelled'
                ? query.where('result.status', '==', 'cancelled')
                : query.where('result.status', 'in', ['planned', 'in_care', 'completed'])
              : query.where('kind', '==', input.kind);
          if (from) query = query.where('at', '>=', from);
          if (through) query = query.where('at', '<', through);
          query = query.orderBy('at', 'desc').orderBy(FieldPath.documentId(), 'desc');
          if (anchor) query = query.startAt(anchor.at, database.doc(collection + '/' + anchor.id));
          return query.limit(size + 2);
        }
        const [balances, bookings] = await Promise.all([
          isBookingKind ? Promise.resolve(null) : tx.get(ordered('balanceOperations', false)),
          input.kind && !isBookingKind
            ? Promise.resolve(null)
            : tx.get(ordered('bookingOperations', true)),
        ]);
        const combined = [
          ...(balances?.docs ?? []).map((doc) => ({ doc, booking: false })),
          ...(bookings?.docs ?? []).map((doc) => ({ doc, booking: true })),
        ]
          .filter(
            ({ doc, booking }) =>
              !anchor ||
              doc.data().at < anchor.at ||
              (doc.data().at === anchor.at &&
                (doc.id < anchor.id ||
                  (doc.id === anchor.id &&
                    (booking ? 'bookingOperations' : 'balanceOperations') < anchor.source))),
          )
          .sort(
            (a, b) =>
              b.doc.data().at.localeCompare(a.doc.data().at) ||
              b.doc.id.localeCompare(a.doc.id) ||
              Number(b.booking) - Number(a.booking),
          );
        const selected = combined.slice(0, size);
        const docs = selected.map(({ doc, booking }) => ({
          id: doc.id,
          data: () =>
            booking
              ? {
                  ...doc.data(),
                  customerId: doc.data().result.customerId,
                  petId: doc.data().result.petId,
                }
              : doc.data(),
        }));
        if (!docs.length) return { items: [], nextCursor: null };
        const balanceDocs = selected.filter((item) => !item.booking);
        const eventDocs = balanceDocs.length
          ? await tx.getAll(
              ...balanceDocs.map(({ doc }) =>
                database.doc(
                  `customers/${doc.data().customerId}/pets/${doc.data().petId}/balances/boarding/events/${doc.id}`,
                ),
              ),
            )
          : [];
        const events = new Map(eventDocs.map((doc) => [doc.id, doc]));
        const customerRefs = [...new Set(docs.map((doc) => doc.data().customerId as string))].map(
          (id) => database.doc('customers/' + id),
        );
        const petRefs = [
          ...new Set(
            docs.map((doc) => `customers/${doc.data().customerId}/pets/${doc.data().petId}`),
          ),
        ].map((path) => database.doc(path));
        const [customerDocs, petDocs] = await Promise.all([
          tx.getAll(...customerRefs),
          tx.getAll(...petRefs),
        ]);
        const customers = new Map(
          customerDocs.map((doc) => [
            doc.id,
            doc.exists ? customerFromDocument({ ...doc.data(), id: doc.id }) : null,
          ]),
        );
        const pets = new Map(
          petDocs.map((doc) => [
            doc.ref.path,
            doc.exists
              ? projectPet({ ...doc.data(), id: doc.id, customerId: doc.ref.parent.parent!.id })
              : null,
          ]),
        );
        const items = docs.map((doc, index) => {
          const owner = customers.get(doc.data().customerId),
            pet = pets.get(`customers/${doc.data().customerId}/pets/${doc.data().petId}`);
          if (!owner || !pet) throw new PetMissing();
          let event: components['schemas']['WorkspaceActivityEvent'];
          if (selected[index].booking) {
            const operation = doc.data(),
              booking = operation.result;
            event = {
              id: doc.id,
              customerId: booking.customerId,
              petId: booking.petId,
              version: booking.version,
              at: operation.at,
              delta: 0,
              daysAfter: null,
              validFrom: booking.arrival.slice(0, 10),
              validThrough: booking.pickup.slice(0, 10),
              reason: '',
              kind: booking.status === 'cancelled' ? 'cancelled' : 'booking',
              bookingId: booking.id,
              arrival: booking.arrival,
              pickup: booking.pickup,
              ...(identity.admin === true ? { actor: operation.actor } : {}),
            };
          } else {
            const saved = events.get(doc.id);
            if (!saved?.exists) throw new PetMissing();
            event = projectBoardingEvent(saved.data()!, identity.admin === true);
          }
          return { customer: owner, pet, event };
        });
        const last = docs.at(-1)!;
        return {
          items,
          nextCursor:
            combined.length > size
              ? Buffer.from(
                  JSON.stringify({
                    at: last.data().at,
                    id: last.id,
                    source: selected.at(-1)!.booking ? 'bookingOperations' : 'balanceOperations',
                    binding,
                  }),
                ).toString('base64url')
              : null,
        };
      });
    },
    async busy(identity, input) {
      const from = timestamp(input.from),
        through = timestamp(input.through);
      if (through <= from || Date.parse(through) - Date.parse(from) > 366 * 86400000)
        throw new PetInvalid();
      return database.runTransaction(async (tx) => {
        const customer = await scope(tx, identity, input.customerId);
        if (!customer) throw new PetAccess();
        let query = database
          .collection('bookings')
          .where(
            Filter.or(
              Filter.and(
                Filter.where('occupancyFrom', '<', through),
                Filter.where('occupancyThrough', '>', from),
              ),
              Filter.where('status', '==', 'in_care'),
            ),
          )
          .orderBy('occupancyFrom')
          .orderBy('occupancyThrough')
          .orderBy(FieldPath.documentId())
          .limit(101);
        if (input.cursor) {
          const anchor = await tx.get(database.doc('bookings/' + input.cursor));
          if (!anchor.exists) throw new PetInvalid();
          query = query.startAfter(
            anchor.data()!.occupancyFrom,
            anchor.data()!.occupancyThrough,
            input.cursor,
          );
        }
        const result = await tx.get(query),
          docs = result.docs.slice(0, 100);
        const items = docs
          .filter(
            (doc) =>
              doc.data().customerId !== customer.id &&
              ['planned', 'in_care'].includes(doc.data().status),
          )
          .map((doc) => {
            const booking = doc.data();
            return {
              houseId: booking.houseId,
              roomId: booking.roomId,
              from: new Date(
                Math.max(Date.parse(from), Date.parse(booking.occupancyFrom)),
              ).toISOString(),
              through:
                booking.status === 'in_care' && Date.parse(booking.pickup) < Date.now()
                  ? through
                  : new Date(
                      Math.min(Date.parse(through), Date.parse(booking.occupancyThrough)),
                    ).toISOString(),
            };
          })
          .filter((span) => span.through > span.from);
        return { items, nextCursor: result.size > 100 ? docs.at(-1)!.id : null };
      });
    },
    async locations(identity) {
      return database.runTransaction(async (tx) => {
        const customer = await scope(tx, identity);
        if (identity.admin !== true && !customer) return { items: [] };
        const [houses, rooms] = await Promise.all([
          tx.get(database.collection('houses')),
          tx.get(database.collectionGroup('rooms')),
        ]);
        return {
          items: houses.docs
            .map((doc) => ({
              house: {
                id: doc.id,
                name: doc.data().name,
                address: doc.data().address ?? '',
                timezone: doc.data().timezone,
                version: doc.data().version,
                createdAt: doc.data().createdAt,
                updatedAt: doc.data().updatedAt,
              },
              rooms: rooms.docs
                .filter((room) => room.ref.parent.parent!.id === doc.id)
                .map((room) => projectRoom({ ...room.data(), id: room.id, houseId: doc.id }))
                .sort((a, b) => a.name.localeCompare(b.name)),
            }))
            .sort((a, b) => a.house.name.localeCompare(b.house.name)),
        };
      });
    },
  };
}
export function workspaceRoutes(api: FastifyInstance, store: WorkspaceStore) {
  const uuid = '[a-fA-F0-9]{8}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{12}';
  api.get<{
    Querystring: { customerId?: string; cursor?: string; pageSize?: string; petId?: string };
  }>(
    '/workspace/pets',
    {
      schema: {
        querystring: {
          type: 'object',
          additionalProperties: false,
          properties: {
            customerId: uuidSchema,
            petId: uuidSchema,
            pageSize: { type: 'string', enum: ['25', '50', '100'] },
            cursor: { type: 'string', pattern: `^${uuid}/${uuid}$` },
          },
        },
      },
    },
    (request) =>
      store.pets(requestIdentity(request), request.query.customerId, request.query.cursor, {
        pageSize: request.query.pageSize,
        petId: request.query.petId,
      }),
  );
  api.get<{ Querystring: components['schemas']['WorkspaceEventQuery'] }>(
    '/workspace/events',
    { schema: { querystring: spec.components.schemas.WorkspaceEventQuery } },
    (request) => store.events(requestIdentity(request), request.query),
  );
  api.get<{ Querystring: { customerId?: string; from: string; through: string; cursor?: string } }>(
    '/workspace/busy',
    {
      schema: {
        querystring: {
          type: 'object',
          additionalProperties: false,
          required: ['from', 'through'],
          properties: {
            customerId: uuidSchema,
            from: { type: 'string', format: 'date-time' },
            through: { type: 'string', format: 'date-time' },
            cursor: uuidSchema,
          },
        },
      },
    },
    (request) => store.busy(requestIdentity(request), request.query),
  );
  api.get('/workspace/locations', { schema: { querystring: emptyObjectSchema } }, (request) =>
    store.locations(requestIdentity(request)),
  );
}
