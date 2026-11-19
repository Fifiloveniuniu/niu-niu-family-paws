import { capacityIssue } from './booking-capacity.ts';
import { BookingConflict } from './bookings.ts';
import { createHash } from 'node:crypto';
import { FieldPath, Filter, type Firestore } from 'firebase-admin/firestore';
import type { FastifyInstance } from 'fastify';
import { assignedHouses, employeeHouse } from './employee-access.ts';
import { requestIdentity, type Identity } from './request-context.ts';
import { projectBooking, timestamp } from './bookings.ts';
import { projectPet, PetAccess, PetInvalid, PetMissing } from './pets.ts';
import { Conflict } from './app.ts';
import { uuidSchema, emptyObjectSchema } from './validation.ts';
import type { components } from '../../../packages/contracts/generated.ts';
type Booking = components['schemas']['Booking'];
export type OperationsRow = { booking: Booking; pet: components['schemas']['Pet'] };
export interface OperationsStore {
  houses(
    identity: Identity,
  ): Promise<{ items: { id: string; name: string; timezone: string; address: string }[] }>;
  list(
    identity: Identity,
    input: { houseId: string; from: string; through: string; cursor?: string; pageSize?: string },
  ): Promise<{ items: OperationsRow[]; nextCursor: string | null }>;
  correct(
    identity: Identity,
    id: string,
    input: {
      version: number;
      operationId: string;
      actualArrival: string;
      actualPickup: string | null;
    },
  ): Promise<Booking>;
  verifyWeight(
    identity: Identity,
    id: string,
    input: { version: number; operationId: string; weightKg: number },
  ): Promise<components['schemas']['Pet']>;
}
export function operationsStore(db: Firestore): OperationsStore {
  return {
    async houses(identity) {
      return db.runTransaction(async (tx) => {
        if (identity.employee !== true && identity.admin !== true) throw new PetAccess();
        const ids = await assignedHouses(tx, db, identity);
        const docs =
          identity.admin === true
            ? (await tx.get(db.collection('houses'))).docs
            : ids.length
              ? await tx.getAll(...ids.map((id) => db.doc('houses/' + id)))
              : [];
        return {
          items: docs
            .filter((doc) => doc.exists)
            .map((doc) => ({
              id: doc.id,
              name: doc.data()!.name,
              timezone: doc.data()!.timezone,
              address: doc.data()!.address ?? '',
            }))
            .sort((a, b) => a.name.localeCompare(b.name)),
        };
      });
    },
    async list(identity, input) {
      const from = timestamp(input.from),
        through = timestamp(input.through);
      if (through <= from) throw new PetInvalid();
      const size = Number(input.pageSize ?? 25);
      return db.runTransaction(async (tx) => {
        if (identity.admin !== true && !(await employeeHouse(tx, db, identity, input.houseId)))
          throw new PetAccess();
        let query = db
          .collection('bookings')
          .where('houseId', '==', input.houseId)
          .where('status', 'in', ['planned', 'in_care', 'completed'])
          .where('occupancyFrom', '<', through)
          .where(
            Filter.or(
              Filter.where('occupancyThrough', '>', from),
              Filter.where('status', '==', 'in_care'),
            ),
          )
          .orderBy('occupancyFrom', 'desc')
          .orderBy('occupancyThrough', 'desc')
          .orderBy(FieldPath.documentId(), 'desc')
          .limit(size + 1);
        if (input.cursor) {
          const last = await tx.get(db.doc('bookings/' + input.cursor));
          if (!last.exists || last.data()!.houseId !== input.houseId) throw new PetInvalid();
          query = query.startAfter(
            last.data()!.occupancyFrom,
            last.data()!.occupancyThrough,
            last.ref,
          );
        }
        const result = await tx.get(query),
          docs = result.docs.slice(0, size);
        const pets = docs.length
          ? await tx.getAll(
              ...docs.map((doc) =>
                db.doc(`customers/${doc.data().customerId}/pets/${doc.data().petId}`),
              ),
            )
          : [];
        return {
          items: docs.map((doc, index) => {
            if (!pets[index].exists) throw new PetMissing();
            return { booking: projectBooking(doc.data()), pet: projectPet(pets[index].data()!) };
          }),
          nextCursor: result.size > size ? docs.at(-1)!.id : null,
        };
      });
    },
    async correct(identity, id, input) {
      const actualArrival = timestamp(input.actualArrival),
        actualPickup = input.actualPickup ? timestamp(input.actualPickup) : null;
      if (
        Date.parse(actualArrival) > Date.now() ||
        (actualPickup && (actualPickup <= actualArrival || Date.parse(actualPickup) > Date.now()))
      )
        throw new PetInvalid();
      const hash = createHash('sha256')
        .update(JSON.stringify([identity.uid, id, input]))
        .digest('hex');
      return db.runTransaction(async (tx) => {
        const ref = db.doc('bookings/' + id),
          receipt = db.doc('bookingOperations/' + input.operationId);
        const old = await tx.get(ref);
        if (!old.exists) throw new PetMissing();
        const previous = projectBooking(old.data()!);
        if (identity.admin !== true && !(await employeeHouse(tx, db, identity, previous.houseId)))
          throw new PetAccess();
        const operation = await tx.get(receipt);
        if (operation.exists) {
          if (operation.data()!.signature !== hash) throw new Conflict();
          return operation.data()!.result;
        }
        if (previous.version !== input.version) throw new Conflict();
        if (
          !previous.actualArrival ||
          !['in_care', 'completed'].includes(previous.status) ||
          (previous.status === 'completed') !== !!actualPickup
        )
          throw new PetInvalid();
        const petLockId = createHash('sha256')
          .update(JSON.stringify([previous.customerId, previous.petId]))
          .digest('hex');
        const houseLock = db.doc('houseSchedules/' + previous.houseId),
          petLock = db.doc('petSchedules/' + petLockId);
        const [room, houseRevision, petRevision, houseStays, petStays] = await Promise.all([
          tx.get(db.doc(`houses/${previous.houseId}/rooms/${previous.roomId}`)),
          tx.get(houseLock),
          tx.get(petLock),
          tx.get(db.collection('bookings').where('houseId', '==', previous.houseId)),
          tx.get(
            db
              .collection('bookings')
              .where('customerId', '==', previous.customerId)
              .where('petId', '==', previous.petId),
          ),
        ]);
        if (!room.exists) throw new PetMissing();
        const next = {
          ...previous,
          actualArrival,
          actualPickup,
          occupancyFrom: actualArrival,
          occupancyThrough: actualPickup ?? previous.pickup,
          version: previous.version + 1,
          updatedAt: new Date().toISOString(),
        };
        const stays = [
          ...new Map(
            [...houseStays.docs, ...petStays.docs].map((doc) => [
              doc.id,
              projectBooking(doc.data()),
            ]),
          ).values(),
        ]
          .filter((row) => row.status !== 'cancelled')
          .map((row) => ({ ...row, status: row.status === 'completed' ? 'planned' : row.status }));
        const issue = capacityIssue(
          stays,
          { ...next, status: next.status === 'completed' ? 'planned' : next.status },
          room.data()!.capacity,
          Date.now(),
        );
        if (issue) throw new BookingConflict(issue);
        tx.set(ref, next);
        tx.set(houseLock, { revision: (houseRevision.data()?.revision ?? 0) + 1 });
        tx.set(petLock, { revision: (petRevision.data()?.revision ?? 0) + 1 });
        tx.create(ref.collection('history').doc(String(next.version)), {
          actor: identity.uid,
          at: next.updatedAt,
          kind: 'correct_handoff',
          before: previous,
          after: next,
          effectiveCustomerId: previous.customerId,
        });
        tx.create(receipt, { signature: hash, actor: identity.uid, result: next });
        return next;
      });
    },
    async verifyWeight(identity, id, input) {
      const signature = createHash('sha256')
        .update(JSON.stringify([identity.uid, id, input]))
        .digest('hex');
      return db.runTransaction(async (tx) => {
        const booking = await tx.get(db.doc('bookings/' + id));
        if (!booking.exists) throw new PetMissing();
        const record = booking.data()!;
        if (identity.admin !== true && !(await employeeHouse(tx, db, identity, record.houseId)))
          throw new PetAccess();
        const petRef = db.doc(`customers/${record.customerId}/pets/${record.petId}`),
          receipt = db.doc('weightVerificationOperations/' + input.operationId);
        const [pet, operation] = await Promise.all([tx.get(petRef), tx.get(receipt)]);
        if (operation.exists) {
          if (operation.data()!.signature !== signature) throw new Conflict();
          return operation.data()!.result;
        }
        if (!pet.exists) throw new PetMissing();
        if (record.status !== 'in_care' && identity.admin !== true) throw new PetAccess();
        const before = projectPet(pet.data()!);
        if (before.version !== input.version) throw new Conflict();
        const at = new Date().toISOString(),
          next = {
            ...before,
            weightKg: input.weightKg,
            version: before.version + 1,
            updatedAt: at,
            weightVerification: {
              weightKg: input.weightKg,
              actor: identity.uid,
              at,
              bookingId: id,
            },
          };
        tx.update(petRef, next);
        tx.create(petRef.collection('history').doc(String(next.version)), {
          actor: identity.uid,
          at,
          source: 'weight-verification',
          before,
          after: next,
        });
        tx.create(receipt, { signature, result: next });
        return next;
      });
    },
  };
}
export function operationsRoutes(api: FastifyInstance, store: OperationsStore) {
  api.get('/operations/houses', { schema: { querystring: emptyObjectSchema } }, (request) =>
    store.houses(requestIdentity(request)),
  );
  api.get<{
    Querystring: {
      houseId: string;
      from: string;
      through: string;
      cursor?: string;
      pageSize?: string;
    };
  }>(
    '/operations',
    {
      schema: {
        querystring: {
          type: 'object',
          additionalProperties: false,
          required: ['houseId', 'from', 'through'],
          properties: {
            houseId: uuidSchema,
            from: { type: 'string', format: 'date-time' },
            through: { type: 'string', format: 'date-time' },
            cursor: uuidSchema,
            pageSize: { type: 'string', enum: ['25', '50', '100'] },
          },
        },
      },
    },
    (request) => store.list(requestIdentity(request), request.query),
  );
  api.put<{
    Params: { id: string };
    Body: {
      version: number;
      operationId: string;
      actualArrival: string;
      actualPickup: string | null;
    };
  }>(
    '/operations/:id/handoff',
    {
      schema: {
        params: {
          type: 'object',
          additionalProperties: false,
          required: ['id'],
          properties: { id: uuidSchema },
        },
        querystring: emptyObjectSchema,
        body: {
          type: 'object',
          additionalProperties: false,
          required: ['version', 'operationId', 'actualArrival', 'actualPickup'],
          properties: {
            version: { type: 'integer', minimum: 1, maximum: 9007199254740990 },
            operationId: uuidSchema,
            actualArrival: { type: 'string', format: 'date-time' },
            actualPickup: { type: 'string', format: 'date-time', nullable: true },
          },
        },
      },
    },
    (request) => store.correct(requestIdentity(request), request.params.id, request.body),
  );
  api.put<{
    Params: { id: string };
    Body: { version: number; operationId: string; weightKg: number };
  }>(
    '/operations/:id/weight',
    {
      schema: {
        params: {
          type: 'object',
          additionalProperties: false,
          required: ['id'],
          properties: { id: uuidSchema },
        },
        querystring: emptyObjectSchema,
        body: {
          type: 'object',
          additionalProperties: false,
          required: ['version', 'operationId', 'weightKg'],
          properties: {
            version: { type: 'integer', minimum: 1, maximum: 9007199254740990 },
            operationId: uuidSchema,
            weightKg: { type: 'number', exclusiveMinimum: 0, maximum: 1000 },
          },
        },
      },
    },
    (request) => store.verifyWeight(requestIdentity(request), request.params.id, request.body),
  );
}
