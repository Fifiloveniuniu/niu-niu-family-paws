import type { Firestore } from 'firebase-admin/firestore';
import type { FastifyInstance } from 'fastify';
import type { components } from '../../../packages/contracts/generated.ts';
import spec from '../../../packages/contracts/openapi.json' with { type: 'json' };
import { fitsCapacity, occupancyStart, occupancyEnd, type Occupancy } from './booking-capacity.ts';
import { Conflict } from './app.ts';
import { PetMissing, PetInvalid } from './pets.ts';
import { requestIdentity } from './request-context.ts';
import { uuidSchema, emptyObjectSchema, containsControlCharacters } from './validation.ts';
export type Room = components['schemas']['Room'];
export type RoomWrite = components['schemas']['RoomWrite'];
export interface RoomStore {
  list(houseId: string): Promise<{ items: Room[] }>;
  save(houseId: string, id: string, input: RoomWrite, actor: string): Promise<Room>;
}
export function roomStore(database: Firestore): RoomStore {
  const houses = database.collection('houses');
  return {
    async list(houseId) {
      const house = await houses.doc(houseId).get();
      if (!house.exists) throw new PetMissing();
      const result = await houses.doc(houseId).collection('rooms').orderBy('name').get();
      return { items: result.docs.map((doc) => doc.data() as Room) };
    },
    async save(houseId, id, input, actor) {
      const house = houses.doc(houseId);
      const ref = house.collection('rooms').doc(id);
      const lock = database.doc('houseSchedules/' + houseId);
      return database.runTransaction(async (tx) => {
        const [houseDoc, previousDoc, lockDoc, bookings] = await Promise.all([
          tx.get(house),
          tx.get(ref),
          tx.get(lock),
          tx.get(database.collection('bookings').where('roomId', '==', id)),
        ]);
        if (!houseDoc.exists) throw new PetMissing();
        if (!houseDoc.data()!.address?.trim()) throw new PetInvalid();
        const previous = previousDoc.exists ? (previousDoc.data() as Room) : null;
        const unchanged =
          previous &&
          previous.name === input.name &&
          previous.capacity === input.capacity &&
          (['dog', 'cat', 'rabbit'] as const).every((s) => previous.costs[s] === input.costs[s]);
        if (unchanged && [input.version, input.version + 1].includes(previous.version))
          return previous;
        if ((previous?.version ?? 0) !== input.version) throw new Conflict();
        const active = bookings.docs
          .map((doc) => doc.data())
          .filter((b) => b.status === 'planned' || b.status === 'in_care');
        // Reconfiguration never silently changes an existing stay's saved consumption.
        if (
          previous &&
          active.length &&
          (['dog', 'cat', 'rabbit'] as const).some((s) => previous.costs[s] !== input.costs[s])
        )
          throw new Conflict();
        const nowMs = Date.now();
        const stays = active as Occupancy[];
        const points = stays.map(occupancyStart);
        if (
          points.some(
            (point) =>
              !fitsCapacity(
                stays
                  .filter(
                    (stay) => occupancyStart(stay) <= point && occupancyEnd(stay, nowMs) > point,
                  )
                  .map((stay) => stay.units),
                input.capacity,
              ),
          )
        )
          throw new Conflict();
        const now = new Date().toISOString();
        const next: Room = {
          ...input,
          id,
          houseId,
          version: input.version + 1,
          createdAt: previous?.createdAt ?? now,
          updatedAt: now,
        };
        tx.set(ref, next);
        tx.set(lock, { revision: (lockDoc.data()?.revision ?? 0) + 1 });
        tx.create(ref.collection('history').doc(String(next.version)), {
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
export function roomRoutes(api: FastifyInstance, store: RoomStore) {
  api.register(async (admin) => {
    admin.addHook('onRequest', async (request, reply) => {
      if (requestIdentity(request).admin !== true)
        return reply.code(403).send({ code: 'forbidden' });
    });
    const params = {
      type: 'object',
      additionalProperties: false,
      required: ['houseId'],
      properties: { houseId: uuidSchema },
    };
    admin.get<{ Params: { houseId: string } }>(
      '/houses/:houseId/rooms',
      { schema: { params, querystring: emptyObjectSchema } },
      (request) => store.list(request.params.houseId),
    );
    admin.put<{ Params: { houseId: string; id: string }; Body: RoomWrite }>(
      '/houses/:houseId/rooms/:id',
      {
        schema: {
          params: {
            ...params,
            required: ['houseId', 'id'],
            properties: { houseId: uuidSchema, id: uuidSchema },
          },
          querystring: emptyObjectSchema,
          body: spec.components.schemas.RoomWrite,
        },
      },
      (request) => {
        const input = { ...request.body, name: request.body.name.trim() };
        if (!input.name || containsControlCharacters(input.name)) throw new PetInvalid();
        return store.save(
          request.params.houseId,
          request.params.id,
          input,
          requestIdentity(request).uid,
        );
      },
    );
  });
}
