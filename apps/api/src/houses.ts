import { uuidSchema, emptyObjectSchema, containsControlCharacters } from './validation.ts';
import { requestIdentity } from './request-context.ts';
import type { FastifyInstance } from 'fastify';
import type { Firestore } from 'firebase-admin/firestore';
import type { components } from '../../../packages/contracts/generated.ts';
import spec from '../../../packages/contracts/openapi.json' with { type: 'json' };
import { Conflict } from './app.ts';
export type House = components['schemas']['House'];
export type HouseWrite = components['schemas']['HouseWrite'];
export interface HouseStore {
  list(): Promise<{ items: House[] }>;
  save(id: string, input: HouseWrite, actor: string): Promise<House>;
}
export function validTimezone(value: string) {
  // Require named zones rather than ambiguous abbreviations or fixed offsets.
  if (value !== 'UTC' && !value.includes('/')) return false;
  try {
    new Intl.DateTimeFormat('en', { timeZone: value }).format();
    return true;
  } catch {
    return false;
  }
}
export function houseStore(database: Firestore): HouseStore {
  const houses = database.collection('houses');
  const houseFromDocument = (data: FirebaseFirestore.DocumentData): House => ({
    id: data.id,
    name: data.name,
    address: data.address,
    timezone: data.timezone,
    version: data.version,
    createdAt: data.createdAt,
    updatedAt: data.updatedAt,
  });
  return {
    async list() {
      const snapshot = await houses.orderBy('name').get();
      return { items: snapshot.docs.map((doc) => houseFromDocument(doc.data())) };
    },
    async save(id, input, actor) {
      const houseRef = houses.doc(id);
      return database.runTransaction(async (transaction) => {
        const snapshot = await transaction.get(houseRef);
        const previous = snapshot.exists ? houseFromDocument(snapshot.data()!) : null;
        const unchangedHouse =
          previous &&
          previous.name === input.name &&
          previous.address === input.address &&
          previous.timezone === input.timezone;
        if (
          unchangedHouse &&
          (previous.version === input.version || previous.version === input.version + 1)
        )
          return previous;
        if ((previous?.version ?? 0) !== input.version) throw new Conflict();
        const now = new Date().toISOString();
        const next: House = {
          ...input,
          id,
          version: input.version + 1,
          createdAt: previous?.createdAt ?? now,
          updatedAt: now,
        };
        transaction.set(houseRef, next);
        transaction.create(houseRef.collection('history').doc(String(next.version)), {
          actor,
          at: now,
          before: previous,
          after: next,
        });
        return next;
      });
    },
  };
}
export function houseRoutes(api: FastifyInstance, store: HouseStore) {
  api.register(async (admin) => {
    admin.addHook('onRequest', async (request, reply) => {
      if (requestIdentity(request).admin !== true)
        return reply.code(403).send({ code: 'forbidden' });
    });
    admin.get('/houses', { schema: { querystring: emptyObjectSchema } }, () => store.list());
    admin.put<{ Params: { id: string }; Body: HouseWrite }>(
      '/houses/:id',
      {
        schema: {
          querystring: emptyObjectSchema,
          params: {
            type: 'object',
            required: ['id'],
            additionalProperties: false,
            properties: { id: uuidSchema },
          },
          body: spec.components.schemas.HouseWrite,
        },
      },
      async (request, reply) => {
        const input = {
          ...request.body,
          name: request.body.name.trim(),
          address: request.body.address.trim(),
          timezone: request.body.timezone.trim(),
        };
        if (
          !input.name ||
          containsControlCharacters(input.name + input.address) ||
          !validTimezone(input.timezone)
        )
          return reply.code(400).send({ code: 'invalid_input' });
        return store.save(request.params.id, input, requestIdentity(request).uid);
      },
    );
  });
}
