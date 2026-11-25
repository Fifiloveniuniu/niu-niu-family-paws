import { assignedHouses } from './employee-access.ts';
import { uuidSchema, emptyObjectSchema, containsControlCharacters } from './validation.ts';
import { requestIdentity } from './request-context.ts';
import { createHash } from 'node:crypto';
import sharp from 'sharp';
import { FieldPath, type Firestore } from 'firebase-admin/firestore';
import type { FastifyInstance } from 'fastify';
import { Conflict, type Identity } from './app.ts';
import spec from '../../../packages/contracts/openapi.json' with { type: 'json' };
import type { components } from '../../../packages/contracts/generated.ts';

export type Pet = components['schemas']['Pet'];
export type PetWrite = components['schemas']['PetWrite'];
export class PetAccess extends Error {}
export class PetMissing extends Error {}
export class PetInvalid extends Error {}
export interface Photos {
  put(key: string, bytes: Buffer): Promise<void>;
  get(key: string): Promise<Buffer>;
}
export const projectPet = (data: FirebaseFirestore.DocumentData): Pet => {
  const { id, customerId, name, photo, version, createdAt, updatedAt } = data;
  return {
    id,
    customerId,
    name,
    photo,
    species: data.species ?? null,
    weightKg: data.weightKg ?? null,
    ...(data.weightVerification
      ? {
          weightVerification: {
            weightKg: data.weightVerification.weightKg,
            at: data.weightVerification.at,
          },
        }
      : {}),
    version,
    createdAt,
    updatedAt,
    ...(data.photoCredit ? { photoCredit: data.photoCredit } : {}),
  };
};
const photoKey = (pet: Pet) => `photos/${pet.customerId}/${pet.id}/${pet.photo}.webp`;
let decoding = false;
sharp.cache({ memory: 8, files: 0, items: 8 });
sharp.concurrency(1);
function prefixes(name: string) {
  const value = name.toLowerCase();
  return Array.from({ length: value.length }, (_, i) => value.slice(0, i + 1));
}
export async function preparePhoto(data: string): Promise<Buffer> {
  if (
    !data ||
    data.length > 4_194_304 ||
    data.length % 4 !== 0 ||
    !/^[A-Za-z0-9+/]*={0,2}$/.test(data)
  )
    throw new PetInvalid();
  if (decoding) throw Object.assign(new Error('Busy'), { statusCode: 429 });
  decoding = true;
  try {
    const bytes = Buffer.from(data, 'base64');
    const jpeg = bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255;
    const png = bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
    const webp =
      bytes.subarray(0, 4).toString() === 'RIFF' && bytes.subarray(8, 12).toString() === 'WEBP';
    if (!(jpeg || png || webp)) throw new PetInvalid();
    const image = sharp(bytes, { limitInputPixels: 16_000_000, failOn: 'warning' });
    const metadata = await image.metadata();
    if (!['jpeg', 'png', 'webp'].includes(metadata.format ?? '') || (metadata.pages ?? 1) !== 1)
      throw new PetInvalid();
    return await image
      .rotate()
      .resize({ width: 1200, height: 1200, fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 82 })
      .toBuffer();
  } catch {
    throw new PetInvalid();
  } finally {
    decoding = false;
  }
}
export function petStore(database: Firestore, photos: Photos) {
  const customerRef = (id: string) => database.collection('customers').doc(id);
  async function authorize(
    identity: Identity,
    customerId: string,
    transaction?: FirebaseFirestore.Transaction,
  ) {
    const ref = customerRef(customerId);
    const customer = await (transaction ? transaction.get(ref) : ref.get());
    if (
      !customer.exists ||
      !(
        identity.admin === true ||
        (identity.google === true && customer.data()!.ownerUid === identity.uid)
      )
    )
      throw new PetAccess();
    return customer;
  }
  return {
    async list(
      identity: Identity,
      customerId: string,
      cursor?: string,
      pageSize?: string,
      search?: string,
    ) {
      await authorize(identity, customerId);
      const size = Number(pageSize ?? 50);
      const term = search?.trim().toLowerCase();
      let query = customerRef(customerId)
        .collection('pets')
        .orderBy(FieldPath.documentId())
        .limit(term ? 251 : size + 1);
      if (cursor) query = query.startAfter(cursor);
      const result = await query.get();
      const window = result.docs.slice(0, term ? 250 : size + 1);
      const matches = window.filter(
        (doc) =>
          !term ||
          (typeof doc.data().name === 'string' && doc.data().name.toLowerCase().includes(term)),
      );
      const docs = matches.slice(0, size);
      return {
        items: docs.map((doc) => projectPet(doc.data())),
        nextCursor:
          matches.length > size
            ? docs.at(-1)!.id
            : term && result.size > 250
              ? window.at(-1)!.id
              : null,
      };
    },
    async save(identity: Identity, customerId: string, id: string, input: PetWrite) {
      // Authorize before decoding or storing a file; repeat inside the transaction.
      await authorize(identity, customerId);
      let photo: string | undefined;
      if (input.photoData !== undefined) {
        const bytes = await preparePhoto(input.photoData);
        photo = createHash('sha256').update(bytes).digest('hex');
        await photos.put(`photos/${customerId}/${id}/${photo}.webp`, bytes);
      }
      const ref = customerRef(customerId).collection('pets').doc(id);
      return database.runTransaction(async (transaction) => {
        await authorize(identity, customerId, transaction);
        const snapshot = await transaction.get(ref);
        const previous = snapshot.exists ? projectPet(snapshot.data()!) : null;
        const desiredPhoto = photo ?? previous?.photo ?? null;
        const species = input.species === undefined ? (previous?.species ?? null) : input.species;
        const weightKg =
          input.weightKg === undefined ? (previous?.weightKg ?? null) : input.weightKg;
        if (
          previous &&
          previous.name === input.name &&
          previous.photo === desiredPhoto &&
          previous.species === species &&
          previous.weightKg === weightKg &&
          [input.version, input.version + 1].includes(previous.version)
        )
          return previous;
        if ((previous?.version ?? 0) !== input.version) throw new Conflict();
        const now = new Date().toISOString();
        const pet: Pet = {
          ...(input.photoData === undefined && previous?.photoCredit
            ? { photoCredit: previous.photoCredit }
            : {}),
          id,
          customerId,
          name: input.name,
          photo: desiredPhoto,
          species,
          weightKg,
          version: input.version + 1,
          createdAt: previous?.createdAt ?? now,
          updatedAt: now,
        };
        transaction.set(ref, {
          ...pet,
          ...(previous?.weightKg === weightKg && snapshot.data()?.weightVerification
            ? { weightVerification: snapshot.data()!.weightVerification }
            : {}),
          nameKeys: prefixes(pet.name),
        });
        transaction.create(ref.collection('history').doc(String(pet.version)), {
          actor: identity.uid,
          source: identity.admin === true ? 'admin' : 'self',
          at: now,
          before: previous,
          after: pet,
        });
        return pet;
      });
    },
    async photo(identity: Identity, customerId: string, id: string) {
      try {
        await authorize(identity, customerId);
      } catch (error) {
        if (!(error instanceof PetAccess) || identity.employee !== true) throw error;
        await database.runTransaction(async (tx) => {
          const ids = await assignedHouses(tx, database, identity);
          if (!ids.length) throw new PetAccess();
          const results = await Promise.all(
            Array.from({ length: Math.ceil(ids.length / 15) }, (_, index) =>
              tx.get(
                database
                  .collection('bookings')
                  .where('customerId', '==', customerId)
                  .where('petId', '==', id)
                  .where('houseId', 'in', ids.slice(index * 15, index * 15 + 15))
                  .where('status', 'in', ['planned', 'in_care'])
                  .limit(1),
              ),
            ),
          );
          if (results.every((result) => result.empty)) throw new PetAccess();
        });
      }
      const snapshot = await customerRef(customerId).collection('pets').doc(id).get();
      if (!snapshot.exists || !snapshot.data()!.photo) throw new PetMissing();
      return photos.get(photoKey(projectPet(snapshot.data()!)));
    },
    async search(identity: Identity, search: string, cursor?: string) {
      if (identity.admin !== true) throw new PetAccess();
      let query = database
        .collectionGroup('pets')
        .where('nameKeys', 'array-contains', search)
        .orderBy(FieldPath.documentId())
        .limit(51);
      if (cursor)
        query = query.startAfter(
          database.doc(`customers/${cursor.split('/')[0]}/pets/${cursor.split('/')[1]}`),
        );
      const results = await query.get();
      const items = await Promise.all(
        results.docs.slice(0, 50).map(async (doc) => {
          const pet = projectPet(doc.data());
          const customer = await customerRef(pet.customerId).get();
          if (!customer.exists) throw new PetMissing();
          return {
            pet,
            customer: {
              id: customer.id,
              name: customer.data()!.name,
              loginEmail: customer.data()!.loginEmail ?? null,
            },
          };
        }),
      );
      const last = items.at(-1)?.pet;
      return {
        items,
        nextCursor: results.size > 50 && last ? `${last.customerId}/${last.id}` : null,
      };
    },
  };
}
export type PetStore = ReturnType<typeof petStore>;
export function petRoutes(api: FastifyInstance, store: PetStore) {
  const params = {
    type: 'object',
    additionalProperties: false,
    required: ['customerId', 'id'],
    properties: { customerId: uuidSchema, id: uuidSchema },
  };
  api.get<{
    Params: { customerId: string };
    Querystring: { cursor?: string; pageSize?: string; search?: string };
  }>(
    '/customers/:customerId/pets',
    {
      schema: {
        params: { ...params, required: ['customerId'], properties: { customerId: uuidSchema } },
        querystring: {
          ...emptyObjectSchema,
          properties: {
            cursor: uuidSchema,
            search: { type: 'string', maxLength: 120 },
            pageSize: { type: 'string', enum: ['25', '50', '100'] },
          },
        },
      },
    },
    (request) =>
      store.list(
        requestIdentity(request),
        request.params.customerId,
        request.query.cursor,
        request.query.pageSize,
        request.query.search?.trim().toLowerCase(),
      ),
  );
  api.put<{ Params: { customerId: string; id: string }; Body: PetWrite }>(
    '/customers/:customerId/pets/:id',
    {
      bodyLimit: 4_210_688,
      schema: { params, querystring: emptyObjectSchema, body: spec.components.schemas.PetWrite },
    },
    (request) => {
      const input = { ...request.body, name: request.body.name.trim() };
      if (!input.name || containsControlCharacters(input.name)) throw new PetInvalid();
      return store.save(
        requestIdentity(request),
        request.params.customerId,
        request.params.id,
        input,
      );
    },
  );
  api.get<{ Params: { customerId: string; id: string } }>(
    '/customers/:customerId/pets/:id/photo',
    { schema: { params, querystring: emptyObjectSchema } },
    async (request, reply) => {
      const bytes = await store.photo(
        requestIdentity(request),
        request.params.customerId,
        request.params.id,
      );
      return reply
        .header('Content-Type', 'image/webp')
        .header('Content-Disposition', 'inline; filename="pet.webp"')
        .send(bytes);
    },
  );
  api.get<{ Querystring: { search: string; cursor?: string } }>(
    '/pet-search',
    {
      schema: {
        querystring: {
          ...emptyObjectSchema,
          required: ['search'],
          properties: {
            search: { type: 'string', minLength: 1, maxLength: 120 },
            cursor: { type: 'string', pattern: '^[0-9a-f-]{36}/[0-9a-f-]{36}$' },
          },
        },
      },
    },
    (request) =>
      store.search(
        requestIdentity(request),
        request.query.search.trim().toLowerCase(),
        request.query.cursor,
      ),
  );
}
