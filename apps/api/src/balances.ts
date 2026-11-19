import { createHash } from 'node:crypto';
import type { Firestore } from 'firebase-admin/firestore';
import type { FastifyInstance } from 'fastify';
import type { components } from '../../../packages/contracts/generated.ts';
import spec from '../../../packages/contracts/openapi.json' with { type: 'json' };
import { Conflict } from './app.ts';
import { PetAccess, PetMissing, PetInvalid } from './pets.ts';
import { requestIdentity, type Identity } from './request-context.ts';
import { uuidSchema, containsControlCharacters } from './validation.ts';
export type BoardingAccount = components['schemas']['BoardingAccount'];
export type BoardingAdjustment = components['schemas']['BoardingAdjustment'];
export type BoardingEvent = components['schemas']['BoardingEvent'];
export interface BalanceStore {
  read(
    identity: Identity,
    customerId: string,
    petId: string,
    cursor?: number,
  ): Promise<{
    account: BoardingAccount | null;
    events: BoardingEvent[];
    nextCursor: number | null;
  }>;
  adjust(
    identity: Identity,
    customerId: string,
    petId: string,
    input: BoardingAdjustment,
  ): Promise<BoardingAccount>;
}
export function projectBoardingAccount(data: FirebaseFirestore.DocumentData): BoardingAccount {
  const {
    customerId,
    petId,
    service,
    days,
    validFrom,
    validThrough,
    version,
    createdAt,
    updatedAt,
  } = data;
  return {
    customerId,
    petId,
    service,
    days,
    validFrom,
    validThrough,
    version,
    createdAt,
    updatedAt,
  };
}
export function projectBoardingEvent(
  data: FirebaseFirestore.DocumentData,
  includeActor = false,
): BoardingEvent {
  const { id, customerId, petId, version, delta, daysAfter, validFrom, validThrough, reason, at } =
    data;
  return {
    id,
    customerId,
    petId,
    version,
    delta,
    daysAfter,
    validFrom,
    validThrough,
    reason,
    at,
    ...(includeActor && data.actor ? { actor: data.actor } : {}),
  };
}
export function validDay(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || value < '0001-01-01') return false;
  const timestamp = Date.parse(value + 'T00:00:00Z');
  return Number.isFinite(timestamp) && new Date(timestamp).toISOString().slice(0, 10) === value;
}
export function balanceStore(database: Firestore): BalanceStore {
  const refs = (cid: string, pid: string) => {
    const customer = database.doc('customers/' + cid);
    const pet = customer.collection('pets').doc(pid);
    return { customer, pet, account: pet.collection('balances').doc('boarding') };
  };
  function authorize(
    identity: Identity,
    customer: FirebaseFirestore.DocumentSnapshot,
    pet: FirebaseFirestore.DocumentSnapshot,
  ) {
    if (
      !customer.exists ||
      !(
        identity.admin === true ||
        (identity.google === true && customer.data()!.ownerUid === identity.uid)
      )
    )
      throw new PetAccess();
    if (!pet.exists) throw new PetMissing();
  }
  return {
    async read(identity, cid, pid, cursor) {
      const { customer, pet, account } = refs(cid, pid);
      return database.runTransaction(async (tx) => {
        const [c, p, a] = await Promise.all([tx.get(customer), tx.get(pet), tx.get(account)]);
        authorize(identity, c, p);
        let query = account.collection('events').orderBy('version', 'desc').limit(51);
        if (cursor) query = query.startAfter(cursor);
        const events = await tx.get(query);
        const items = events.docs
          .slice(0, 50)
          .map((doc) => projectBoardingEvent(doc.data(), identity.admin === true));
        return {
          account: a.exists ? projectBoardingAccount(a.data()!) : null,
          events: items,
          nextCursor: events.size > 50 ? items.at(-1)!.version : null,
        };
      });
    },
    async adjust(identity, cid, pid, input) {
      if (identity.admin !== true) throw new PetAccess();
      if (
        !validDay(input.validFrom) ||
        !validDay(input.validThrough) ||
        input.validThrough < input.validFrom ||
        containsControlCharacters(input.reason)
      )
        throw new PetInvalid();
      const { customer, pet, account } = refs(cid, pid);
      const operation = database.doc('balanceOperations/' + input.operationId);
      const signature = createHash('sha256')
        .update(
          JSON.stringify([
            identity.uid,
            cid,
            pid,
            input.version,
            input.delta,
            input.validFrom,
            input.validThrough,
            input.reason,
          ]),
        )
        .digest('hex');
      return database.runTransaction(async (tx) => {
        const [c, p, a, op] = await Promise.all([
          tx.get(customer),
          tx.get(pet),
          tx.get(account),
          tx.get(operation),
        ]);
        authorize(identity, c, p);
        if (op.exists) {
          if (op.data()!.signature !== signature) throw new Conflict();
          return op.data()!.result as BoardingAccount;
        }
        const previous = a.exists ? projectBoardingAccount(a.data()!) : null;
        if ((previous?.version ?? 0) !== input.version) throw new Conflict();
        if (
          !Number.isSafeInteger(input.version + 1) ||
          !Number.isSafeInteger(input.delta) ||
          (!previous && input.delta <= 0)
        )
          throw new PetInvalid();
        const days = (previous?.days ?? 0) + input.delta;
        if (!Number.isSafeInteger(days) || days < 0) throw new PetInvalid();
        const now = new Date().toISOString();
        const next: BoardingAccount = {
          customerId: cid,
          petId: pid,
          service: 'boarding',
          days,
          validFrom: input.validFrom,
          validThrough: input.validThrough,
          version: input.version + 1,
          createdAt: previous?.createdAt ?? now,
          updatedAt: now,
        };
        const event: BoardingEvent = {
          id: input.operationId,
          customerId: cid,
          petId: pid,
          version: next.version,
          delta: input.delta,
          daysAfter: days,
          validFrom: input.validFrom,
          validThrough: input.validThrough,
          reason: input.reason,
          actor: identity.uid,
          at: now,
        };
        tx.set(account, next);
        tx.create(account.collection('events').doc(input.operationId), event);
        tx.create(operation, {
          signature,
          kind: input.delta > 0 ? 'added' : input.delta < 0 ? 'correction' : 'terms',
          result: next,
          actor: identity.uid,
          customerId: cid,
          petId: pid,
          at: now,
          before: previous,
          after: next,
        });
        return next;
      });
    },
  };
}
export function balanceRoutes(api: FastifyInstance, store: BalanceStore) {
  const params = {
    type: 'object',
    additionalProperties: false,
    required: ['customerId', 'petId'],
    properties: { customerId: uuidSchema, petId: uuidSchema },
  };
  api.get<{ Params: { customerId: string; petId: string }; Querystring: { cursor?: string } }>(
    '/customers/:customerId/pets/:petId/balance',
    {
      schema: {
        params,
        querystring: {
          type: 'object',
          additionalProperties: false,
          properties: { cursor: { type: 'string', pattern: '^[1-9][0-9]{0,14}$' } },
        },
      },
    },
    (request) =>
      store.read(
        requestIdentity(request),
        request.params.customerId,
        request.params.petId,
        request.query.cursor ? Number(request.query.cursor) : undefined,
      ),
  );
  api.put<{ Params: { customerId: string; petId: string }; Body: BoardingAdjustment }>(
    '/customers/:customerId/pets/:petId/balance',
    {
      schema: {
        params,
        querystring: { type: 'object', additionalProperties: false },
        body: spec.components.schemas.BoardingAdjustment,
      },
    },
    (request) => {
      if (requestIdentity(request).admin !== true) throw new PetAccess();
      return store.adjust(
        requestIdentity(request),
        request.params.customerId,
        request.params.petId,
        { ...request.body, reason: request.body.reason.trim() },
      );
    },
  );
}
