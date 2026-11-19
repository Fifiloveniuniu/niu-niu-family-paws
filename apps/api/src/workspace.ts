import { FieldPath, type Firestore } from 'firebase-admin/firestore';
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
  pets(identity: Identity, customerId?: string, cursor?: string): Promise<WorkspacePets>;
  locations(identity: Identity): Promise<WorkspaceLocations>;
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
    async pets(identity, customerId, cursor) {
      return database.runTransaction(async (tx) => {
        const customer = await scope(tx, identity, customerId);
        if (!customer && identity.admin !== true)
          return { admin: false, customer: null, items: [], nextCursor: null };
        const source = customer
          ? database.doc('customers/' + customer.id).collection('pets')
          : database.collectionGroup('pets');
        let query = source.orderBy(FieldPath.documentId()).limit(101);
        if (cursor) {
          const [cid, pid] = cursor.split('/');
          if (!cid || !pid || (customer && customer.id !== cid)) throw new PetInvalid();
          query = query.startAfter(database.doc(`customers/${cid}/pets/${pid}`));
        }
        const result = await tx.get(query);
        const docs = result.docs.slice(0, 100);
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
          nextCursor: result.size > 100 && last ? last.ref.parent.parent!.id + '/' + last.id : null,
        };
      });
    },
    async events(identity, input) {
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
        let query: FirebaseFirestore.Query = database.collection('balanceOperations');
        if (customer) query = query.where('customerId', '==', customer.id);
        if (input.petId) query = query.where('petId', '==', input.petId);
        if (input.kind) query = query.where('kind', '==', input.kind);
        if (from) query = query.where('at', '>=', from);
        if (through) query = query.where('at', '<', through);
        query = query.orderBy('at', 'desc').orderBy(FieldPath.documentId(), 'desc').limit(51);
        if (input.cursor) {
          const last = await tx.get(database.doc('balanceOperations/' + input.cursor));
          if (
            !last.exists ||
            (customer && last.data()!.customerId !== customer.id) ||
            (input.petId && last.data()!.petId !== input.petId)
          )
            throw new PetInvalid();
          query = query.startAfter(last.data()!.at, last.ref);
        }
        const operations = await tx.get(query);
        const docs = operations.docs.slice(0, 50);
        if (!docs.length) return { items: [], nextCursor: null };
        const eventDocs = await tx.getAll(
          ...docs.map((doc) =>
            database.doc(
              `customers/${doc.data().customerId}/pets/${doc.data().petId}/balances/boarding/events/${doc.id}`,
            ),
          ),
        );
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
          if (!owner || !pet || !eventDocs[index].exists) throw new PetMissing();
          return {
            customer: owner,
            pet,
            event: projectBoardingEvent(eventDocs[index].data()!, identity.admin === true),
          };
        });
        return { items, nextCursor: operations.size > 50 ? docs.at(-1)!.id : null };
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
  api.get<{ Querystring: { customerId?: string; cursor?: string } }>(
    '/workspace/pets',
    {
      schema: {
        querystring: {
          type: 'object',
          additionalProperties: false,
          properties: {
            customerId: uuidSchema,
            cursor: { type: 'string', pattern: `^${uuid}/${uuid}$` },
          },
        },
      },
    },
    (request) =>
      store.pets(requestIdentity(request), request.query.customerId, request.query.cursor),
  );
  api.get<{ Querystring: components['schemas']['WorkspaceEventQuery'] }>(
    '/workspace/events',
    { schema: { querystring: spec.components.schemas.WorkspaceEventQuery } },
    (request) => store.events(requestIdentity(request), request.query),
  );
  api.get('/workspace/locations', { schema: { querystring: emptyObjectSchema } }, (request) =>
    store.locations(requestIdentity(request)),
  );
}
