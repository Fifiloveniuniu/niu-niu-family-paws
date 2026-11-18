import { FieldPath, type Firestore } from 'firebase-admin/firestore';
import type { FastifyInstance } from 'fastify';
import type { components } from '../../../packages/contracts/generated.ts';
import { projectRoom } from './rooms.ts';
import { projectBoardingAccount } from './balances.ts';
import { requestIdentity, type Identity } from './request-context.ts';
import { PetAccess, PetMissing, PetInvalid, projectPet } from './pets.ts';
import { customerFromDocument } from './store.ts';
import { uuidSchema, emptyObjectSchema } from './validation.ts';
type Customer = components['schemas']['Customer'];
type WorkspacePets = components['schemas']['WorkspacePets'];
type WorkspaceLocations = components['schemas']['WorkspaceLocations'];
export interface WorkspaceStore {
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
  api.get('/workspace/locations', { schema: { querystring: emptyObjectSchema } }, (request) =>
    store.locations(requestIdentity(request)),
  );
}
