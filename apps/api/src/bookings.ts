import { bookingActivity } from './booking-activity.ts';
import { bookingFunding } from './booking-funding.ts';
import type { FundingQuote } from '../../../packages/payments/types.ts';
import { employeeHouse } from './employee-access.ts';
import { createHash, randomUUID } from 'node:crypto';
import { FieldPath, Filter, type Firestore } from 'firebase-admin/firestore';
import type { FastifyInstance } from 'fastify';
import type { components } from '../../../packages/contracts/generated.ts';
import spec from '../../../packages/contracts/openapi.json' with { type: 'json' };
import { Conflict } from './app.ts';
import { PetAccess, PetMissing, PetInvalid } from './pets.ts';
import { requestIdentity, type Identity } from './request-context.ts';
import { uuidSchema, emptyObjectSchema } from './validation.ts';
import { validDay } from './balances.ts';
import { validTimezone } from './houses.ts';
import { capacityIssue, blockedSpans, type Occupancy } from './booking-capacity.ts';
export type Booking = components['schemas']['Booking'];
export type BookingWrite = components['schemas']['BookingWrite'];
export type BookingAction = components['schemas']['BookingAction'];
export type AvailabilityInput = components['schemas']['AvailabilityInput'];
export type AvailabilityResult = components['schemas']['AvailabilityResult'];
type Room = components['schemas']['Room'];
type House = components['schemas']['House'];
export function projectBooking(data: FirebaseFirestore.DocumentData): Booking {
  const {
    id,
    customerId,
    petId,
    houseId,
    roomId,
    arrival,
    pickup,
    occupancyFrom,
    occupancyThrough,
    species,
    units,
    timezone,
    status,
    billingStatus,
    funding,
    actualArrival,
    actualPickup,
    version,
    createdAt,
    updatedAt,
  } = data;
  return {
    id,
    customerId,
    petId,
    houseId,
    roomId,
    arrival,
    pickup,
    occupancyFrom,
    occupancyThrough,
    species,
    units,
    timezone,
    status,
    billingStatus,
    ...(funding ? { funding } : {}),
    actualArrival,
    actualPickup,
    version,
    createdAt,
    updatedAt,
  };
}
export class BookingConflict extends Error {
  issue: string;
  constructor(issue: string) {
    super('Booking conflict');
    this.issue = issue;
  }
}
export class BookingPolicyMissing extends Error {}
export interface BookingStore {
  quote?(identity: Identity, input: BookingWrite): Promise<FundingQuote>;
  get(identity: Identity, id: string): Promise<Booking>;
  list(
    identity: Identity,
    customerId?: string,
    cursor?: string,
    window?: { from: string; through: string },
    options?: { petId?: string; pageSize?: string },
  ): Promise<{ items: Booking[]; nextCursor: string | null }>;
  availability(identity: Identity, input: AvailabilityInput): Promise<AvailabilityResult>;
  save(identity: Identity, id: string, input: BookingWrite): Promise<Booking>;
  action(identity: Identity, id: string, input: BookingAction): Promise<Booking>;
}
export function timestamp(value: string) {
  if (
    !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/.test(value) ||
    !validDay(value.slice(0, 10))
  )
    throw new PetInvalid();
  const date = new Date(value);
  if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0, 19) !== value.slice(0, 19))
    throw new PetInvalid();
  return date.toISOString();
}
const signature = (value: unknown) =>
  createHash('sha256').update(JSON.stringify(value)).digest('hex');
export function bookingStore(
  database: Firestore,
  clock = () => Date.now(),
  testBilling = false,
): BookingStore {
  if (
    testBilling &&
    ((database as Firestore & { projectId: string }).projectId !== 'demo-niu-niu' ||
      process.env.FIRESTORE_EMULATOR_HOST !== '127.0.0.1:8085')
  )
    throw Error('Billing simulator requires demo emulators');
  const bookings = database.collection('bookings');
  const activeQuery = (field: string, id: string) =>
    bookings.where(field, '==', id).where('status', 'in', ['planned', 'in_care']);
  const activePetQuery = (cid: string, pid: string) =>
    bookings
      .where('customerId', '==', cid)
      .where('petId', '==', pid)
      .where('status', 'in', ['planned', 'in_care']);
  const petLockId = (cid: string, pid: string) => signature([cid, pid]);
  async function authorize(
    tx: FirebaseFirestore.Transaction,
    identity: Identity,
    cid: string,
    pid?: string,
    houseId?: string,
  ) {
    const c = await tx.get(database.doc('customers/' + cid));
    if (
      !c.exists ||
      !(
        identity.admin === true ||
        (identity.google === true && c.data()!.ownerUid === identity.uid) ||
        (await employeeHouse(tx, database, identity, houseId))
      )
    )
      throw new PetAccess();
    if (!pid) return null;
    const p = await tx.get(c.ref.collection('pets').doc(pid));
    if (!p.exists) throw new PetMissing();
    return p.data() as components['schemas']['Pet'];
  }
  function requireCapacity(stays: Occupancy[], candidate: Booking, room: Room, now: number) {
    const issue = capacityIssue(stays, candidate, room.capacity, now);
    if (issue) throw new BookingConflict(issue);
  }
  async function context(
    tx: FirebaseFirestore.Transaction,
    identity: Identity,
    input: Pick<BookingWrite, 'customerId' | 'petId' | 'houseId' | 'roomId'>,
    previous?: Booking | null,
  ) {
    const pet = await authorize(tx, identity, input.customerId, input.petId, input.houseId);
    const houseRef = database.doc('houses/' + input.houseId),
      roomRef = houseRef.collection('rooms').doc(input.roomId);
    const lockIds = [...new Set([input.houseId, ...(previous ? [previous.houseId] : [])])];
    const lockRefs = lockIds.map((hid) => database.doc('houseSchedules/' + hid));
    const petLock = database.doc('petSchedules/' + petLockId(input.customerId, input.petId));
    const [houseDoc, roomDoc, houseStays, petStays, petRevision, ...locks] = await Promise.all([
      tx.get(houseRef),
      tx.get(roomRef),
      tx.get(activeQuery('houseId', input.houseId)),
      tx.get(activePetQuery(input.customerId, input.petId)),
      tx.get(petLock),
      ...lockRefs.map((ref) => tx.get(ref)),
    ]);
    if (!houseDoc.exists || !roomDoc.exists) throw new PetMissing();
    const house = houseDoc.data() as House,
      room = roomDoc.data() as Room;
    if (!house.address?.trim() || !validTimezone(house.timezone))
      throw new BookingConflict('house_setup');
    if (!pet!.species) throw new BookingConflict('pet_setup');
    const units = room.costs?.[pet!.species];
    if (!units) throw new BookingConflict('room_setup');
    const stays = [
      ...new Map(
        [...houseStays.docs, ...petStays.docs].map((doc) => [
          doc.id,
          { ...doc.data(), id: doc.id } as Booking,
        ]),
      ).values(),
    ];
    return {
      pet: pet!,
      house,
      room,
      units,
      stays,
      touch() {
        lockRefs.forEach((ref, index) =>
          tx.set(ref, { revision: (locks[index].data()?.revision ?? 0) + 1 }),
        );
        tx.set(petLock, { revision: (petRevision.data()?.revision ?? 0) + 1 });
      },
    };
  }
  function receipt(
    tx: FirebaseFirestore.Transaction,
    id: string,
    operationId: string,
    hash: string,
    identity: Identity,
    previous: Booking | null,
    next: Booking,
    kind: string,
  ) {
    const operation = database.doc('bookingOperations/' + operationId);
    tx.set(bookings.doc(id), next);
    tx.create(bookings.doc(id).collection('history').doc(String(next.version)), {
      actor: identity.uid,
      effectiveCustomerId: next.customerId,
      at: next.updatedAt,
      kind,
      before: previous,
      after: next,
    });
    tx.create(operation, {
      activity: bookingActivity(next),
      signature: hash,
      actor: identity.uid,
      effectiveCustomerId: next.customerId,
      at: next.updatedAt,
      result: next,
    });
    return next;
  }
  return {
    ...(testBilling
      ? {
          async quote(identity: Identity, input: BookingWrite) {
            if (identity.admin !== true) throw new PetAccess();
            return database.runTransaction(async (tx) => {
              const pet = await authorize(tx, identity, input.customerId, input.petId);
              const house = await tx.get(database.doc('houses/' + input.houseId));
              if (!house.exists || !validTimezone(house.data()!.timezone)) throw new PetInvalid();
              if (timestamp(input.pickup) <= timestamp(input.arrival)) throw new PetInvalid();
              return (
                await bookingFunding(
                  database,
                  tx,
                  { ...input, arrival: timestamp(input.arrival), pickup: timestamp(input.pickup) },
                  pet!,
                  house.data()!.timezone,
                )
              ).quote;
            });
          },
        }
      : {}),
    async get(identity, id) {
      return database.runTransaction(async (tx) => {
        const snapshot = await tx.get(bookings.doc(id));
        if (!snapshot.exists) throw new PetMissing();
        const booking = projectBooking(snapshot.data()!);
        await authorize(tx, identity, booking.customerId, booking.petId, booking.houseId);
        return booking;
      });
    },
    async list(identity, cid, cursor, window, options = {}) {
      const size = Number(options.pageSize ?? 100);
      const from = window ? timestamp(window.from) : null,
        through = window ? timestamp(window.through) : null;
      if (
        from &&
        through &&
        (through <= from || Date.parse(through) - Date.parse(from) > 366 * 86400000)
      )
        throw new PetInvalid();
      return database.runTransaction(async (tx) => {
        let scope = cid;
        if (identity.admin !== true) {
          if (identity.google !== true) throw new PetAccess();
          const person = await tx.get(database.doc('people/' + identity.uid));
          if (!person.exists) {
            if (cid) throw new PetAccess();
            return { items: [], nextCursor: null };
          }
          scope = person.data()!.customerId;
          if (cid && scope !== cid) throw new PetAccess();
          await authorize(tx, identity, scope!);
        } else if (scope) await authorize(tx, identity, scope);
        if (options.petId && !scope) throw new PetInvalid();
        if (options.petId) await authorize(tx, identity, scope!, options.petId);
        let base: FirebaseFirestore.Query = scope
          ? bookings.where('customerId', '==', scope)
          : bookings;
        if (options.petId) base = base.where('petId', '==', options.petId);
        let query =
          from && through
            ? base
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
                .limit(size + 1)
            : (options.petId
                ? base.orderBy('updatedAt', 'desc').orderBy(FieldPath.documentId(), 'desc')
                : base.orderBy(FieldPath.documentId())
              ).limit(size + 1);
        if (cursor) {
          if (from && through) {
            const last = await tx.get(bookings.doc(cursor));
            if (!last.exists || (scope && last.data()!.customerId !== scope))
              throw new PetInvalid();
            query = query.startAfter(
              last.data()!.occupancyFrom,
              last.data()!.occupancyThrough,
              cursor,
            );
          } else if (options.petId) {
            const last = await tx.get(bookings.doc(cursor));
            if (
              !last.exists ||
              last.data()!.customerId !== scope ||
              last.data()!.petId !== options.petId
            )
              throw new PetInvalid();
            query = query.startAfter(last.data()!.updatedAt, cursor);
          } else query = query.startAfter(cursor);
        }
        const result = await tx.get(query);
        const items = result.docs.slice(0, size).map((doc) => projectBooking(doc.data()));
        return { items, nextCursor: result.size > size ? items.at(-1)!.id : null };
      });
    },
    async availability(identity, input) {
      const arrival = timestamp(input.arrival),
        pickup = timestamp(input.pickup);
      if (pickup <= arrival) throw new PetInvalid();
      const from = timestamp(input.windowFrom ?? arrival),
        through = timestamp(input.windowThrough ?? pickup);
      if (
        through <= from ||
        !!input.windowFrom !== !!input.windowThrough ||
        Date.parse(through) - Date.parse(from) > 366 * 86400000
      )
        throw new PetInvalid();
      return database.runTransaction(async (tx) => {
        const pet = await authorize(tx, identity, input.customerId, input.petId);
        const previous = input.bookingId
          ? ((await tx.get(bookings.doc(input.bookingId))).data() as Booking | undefined)
          : undefined;
        if (
          input.bookingId &&
          (!previous || previous.customerId !== input.customerId || previous.petId !== input.petId)
        )
          throw new PetAccess();
        const [houseDocs, roomDocs, petStays] = await Promise.all([
          tx.get(database.collection('houses')),
          tx.get(database.collectionGroup('rooms')),
          tx.get(activePetQuery(input.customerId, input.petId)),
        ]);
        const houses = new Map(houseDocs.docs.map((doc) => [doc.id, doc.data() as House]));
        const houseStays = await Promise.all(
          houseDocs.docs.map((doc) => tx.get(activeQuery('houseId', doc.id))),
        );
        const stays = [
          ...new Map(
            [...houseStays.flatMap((result) => result.docs), ...petStays.docs].map((doc) => [
              doc.id,
              doc.data() as Booking,
            ]),
          ).values(),
        ];
        const now = clock();
        const rooms: AvailabilityResult['rooms'] = roomDocs.docs
          .map((doc) => {
            const room = doc.data() as Room,
              house = houses.get(room.houseId);
            if (!house) return null;
            const candidate: Occupancy = {
              id: previous?.id ?? '',
              petId: input.petId,
              customerId: input.customerId,
              houseId: house.id,
              roomId: room.id,
              species: pet!.species ?? '',
              units: pet!.species ? (room.costs?.[pet!.species] ?? 0) : 0,
              arrival,
              pickup,
              status: 'planned',
            };
            const setup: 'house_setup' | 'pet_setup' | null =
              !house.address?.trim() || !validTimezone(house.timezone)
                ? 'house_setup'
                : !pet!.species
                  ? 'pet_setup'
                  : null;
            const issue = setup ?? capacityIssue(stays, candidate, room.capacity, now);
            const blocked: AvailabilityResult['rooms'][number]['blocked'] = setup
              ? [{ from, through, issue: setup }]
              : blockedSpans(
                  stays,
                  candidate,
                  room.capacity,
                  Date.parse(from),
                  Date.parse(through),
                  now,
                );
            return {
              houseId: house.id,
              houseName: house.name,
              address: house.address ?? '',
              timezone: house.timezone,
              roomId: room.id,
              roomName: room.name,
              available: !issue,
              issue,
              blocked,
            };
          })
          .filter((room): room is NonNullable<typeof room> => room !== null)
          .sort(
            (a, b) =>
              a.houseName.localeCompare(b.houseName) || a.roomName.localeCompare(b.roomName),
          );
        return { rooms, from, through };
      });
    },
    async save(identity, id, input) {
      const arrival = timestamp(input.arrival),
        pickup = timestamp(input.pickup);
      if (pickup <= arrival) throw new PetInvalid();
      const normalized = { ...input, arrival, pickup };
      const hash = signature(['save', identity.uid, id, normalized]);
      const balanceOperationId = randomUUID();
      return database.runTransaction(async (tx) => {
        // Customer paid bookings stay disabled until the owner configures the financial lifecycle.
        if (identity.admin !== true) {
          await authorize(tx, identity, input.customerId, input.petId);
          throw new BookingPolicyMissing();
        }
        const [old, op] = await Promise.all([
          tx.get(bookings.doc(id)),
          tx.get(database.doc('bookingOperations/' + input.operationId)),
        ]);
        if (op.exists) {
          if (op.data()!.signature !== hash) throw new Conflict();
          return op.data()!.result as Booking;
        }
        const previous = old.exists ? (old.data() as Booking) : null;
        if ((previous?.version ?? 0) !== input.version) throw new Conflict();
        if (
          previous &&
          (previous.customerId !== input.customerId || previous.petId !== input.petId)
        )
          throw new BookingConflict('guest_changed');
        if (previous && (previous.status === 'cancelled' || previous.status === 'completed'))
          throw new BookingConflict('closed_booking');
        if (
          previous?.status === 'in_care' &&
          (previous.houseId !== input.houseId ||
            previous.roomId !== input.roomId ||
            previous.arrival !== arrival)
        )
          throw new BookingConflict('in_care_edit');
        const ctx = await context(tx, identity, input, previous);
        if (
          previous?.funding &&
          (previous.arrival !== arrival ||
            previous.pickup !== pickup ||
            previous.timezone !== ctx.house.timezone)
        )
          throw new BookingConflict('charged_edit');
        if (previous?.status === 'in_care' && previous.species !== ctx.pet.species)
          throw new BookingConflict('pet_setup');
        const funding =
          testBilling && !previous?.funding
            ? await bookingFunding(database, tx, normalized, ctx.pet, ctx.house.timezone)
            : null;
        if (funding) {
          if (input.quoteToken !== funding.quote.token) throw new BookingConflict('quote_changed');
          if (funding.quote.issue) throw new BookingConflict(funding.quote.issue);
          if (funding.quote.cardCents! > 0 && funding.card?.scenario === 'declined')
            throw new BookingConflict('payment_declined');
        }
        const now = new Date(clock()).toISOString();
        const next: Booking = {
          id,
          customerId: input.customerId,
          petId: input.petId,
          houseId: input.houseId,
          roomId: input.roomId,
          arrival,
          pickup,
          species: ctx.pet.species!,
          units: previous?.status === 'in_care' ? previous.units : ctx.units,
          timezone: ctx.house.timezone,
          status: previous?.status ?? 'planned',
          billingStatus: previous?.funding
            ? previous.billingStatus
            : funding
              ? funding.quote.cardCents! > 0
                ? 'test_paid'
                : 'balance'
              : 'unbilled',
          ...(previous?.funding
            ? { funding: previous.funding }
            : funding
              ? { funding: funding.quote }
              : {}),
          occupancyFrom: previous?.actualArrival ?? arrival,
          occupancyThrough: pickup,
          actualArrival: previous?.actualArrival ?? null,
          actualPickup: null,
          version: input.version + 1,
          createdAt: previous?.createdAt ?? now,
          updatedAt: now,
        };
        if (next.actualArrival && Date.parse(pickup) <= Date.parse(next.actualArrival))
          throw new PetInvalid();
        requireCapacity(ctx.stays, next, ctx.room, clock());
        if (funding) {
          const q = funding.quote;
          if (q.balanceDays > 0) {
            const account = {
              ...funding.account!,
              days: q.balanceAfter,
              version: funding.account!.version + 1,
              updatedAt: now,
            };
            tx.set(funding.accountRef, account);
            tx.create(funding.accountRef.collection('events').doc(balanceOperationId), {
              id: balanceOperationId,
              customerId: input.customerId,
              petId: input.petId,
              version: account.version,
              kind: 'booking_charge',
              delta: -q.balanceDays,
              daysAfter: account.days,
              validFrom: account.validFrom,
              validThrough: account.validThrough,
              reason: 'TEST booking ' + id,
              actor: identity.uid,
              at: now,
            });
            tx.create(database.doc('balanceOperations/' + balanceOperationId), {
              signature: hash,
              kind: 'booking_charge',
              result: account,
              actor: identity.uid,
              customerId: input.customerId,
              petId: input.petId,
              at: now,
              before: funding.account,
              after: account,
              bookingId: id,
            });
          }
          if (q.cardCents! > 0)
            tx.create(funding.cardRef.collection('charges').doc(input.operationId), {
              id: input.operationId,
              bookingId: id,
              amountCents: q.cardCents,
              last4: q.last4,
              at: now,
              testMode: true,
              actor: identity.uid,
            });
        }
        ctx.touch();
        return receipt(tx, id, input.operationId, hash, identity, previous, next, 'save');
      });
    },
    async action(identity, id, input) {
      if (identity.admin !== true && (identity.employee !== true || input.action === 'cancel'))
        throw new PetAccess();
      const at = timestamp(input.at);
      if (Date.parse(at) > clock()) throw new PetInvalid();
      const hash = signature(['action', identity.uid, id, { ...input, at }]);
      return database.runTransaction(async (tx) => {
        if (identity.admin !== true) {
          const current = await tx.get(bookings.doc(id));
          if (
            !current.exists ||
            !(await employeeHouse(tx, database, identity, current.data()!.houseId))
          )
            throw new PetAccess();
        }

        const [old, op] = await Promise.all([
          tx.get(bookings.doc(id)),
          tx.get(database.doc('bookingOperations/' + input.operationId)),
        ]);
        if (op.exists) {
          if (op.data()!.signature !== hash) throw new Conflict();
          return op.data()!.result as Booking;
        }
        if (!old.exists) throw new PetMissing();
        const previous = old.data() as Booking;
        if (previous.version !== input.version) throw new Conflict();
        if (
          (input.action === 'check_in' && previous.status !== 'planned') ||
          (input.action === 'check_out' && previous.status !== 'in_care') ||
          (input.action === 'cancel' && previous.status !== 'planned')
        )
          throw new BookingConflict('status');
        const ctx =
          input.action === 'check_in' ? await context(tx, identity, previous, previous) : null;
        if (
          input.action === 'check_in' &&
          (ctx!.pet.species !== previous.species || ctx!.units !== previous.units)
        )
          throw new BookingConflict('pet_setup');
        if (previous.billingStatus !== 'unbilled' && input.action === 'cancel')
          throw new BookingConflict('refund_unconfigured');
        const releaseRefs = ctx
          ? []
          : [
              database.doc('houseSchedules/' + previous.houseId),
              database.doc('petSchedules/' + petLockId(previous.customerId, previous.petId)),
            ];
        if (!ctx)
          await authorize(tx, identity, previous.customerId, previous.petId, previous.houseId);
        const releaseLocks = await Promise.all(releaseRefs.map((ref) => tx.get(ref)));
        const now = new Date(clock()).toISOString();
        const next: Booking = {
          ...previous,
          status:
            input.action === 'check_in'
              ? 'in_care'
              : input.action === 'check_out'
                ? 'completed'
                : 'cancelled',
          occupancyFrom: input.action === 'check_in' ? at : previous.occupancyFrom,
          occupancyThrough: input.action === 'check_out' ? at : previous.occupancyThrough,
          actualArrival: input.action === 'check_in' ? at : previous.actualArrival,
          actualPickup: input.action === 'check_out' ? at : previous.actualPickup,
          version: input.version + 1,
          updatedAt: now,
        };
        if (next.actualPickup && next.actualArrival && next.actualPickup < next.actualArrival)
          throw new PetInvalid();
        if (next.status === 'in_care') requireCapacity(ctx!.stays, next, ctx!.room, clock());
        if (ctx) ctx.touch();
        else
          releaseRefs.forEach((ref, index) =>
            tx.set(ref, { revision: (releaseLocks[index].data()?.revision ?? 0) + 1 }),
          );
        return receipt(tx, id, input.operationId, hash, identity, previous, next, input.action);
      });
    },
  };
}
export function bookingRoutes(api: FastifyInstance, store: BookingStore) {
  const params = {
    type: 'object',
    additionalProperties: false,
    required: ['id'],
    properties: { id: uuidSchema },
  };
  api.get<{
    Querystring: {
      customerId?: string;
      cursor?: string;
      from?: string;
      through?: string;
      petId?: string;
      pageSize?: string;
    };
  }>(
    '/bookings',
    {
      schema: {
        querystring: {
          type: 'object',
          additionalProperties: false,
          properties: {
            customerId: uuidSchema,
            petId: uuidSchema,
            pageSize: { type: 'string', enum: ['25', '50', '100'] },
            cursor: uuidSchema,
            from: { type: 'string', format: 'date-time' },
            through: { type: 'string', format: 'date-time' },
          },
        },
      },
    },
    (request) => {
      if (!!request.query.from !== !!request.query.through) throw new PetInvalid();
      return store.list(
        requestIdentity(request),
        request.query.customerId,
        request.query.cursor,
        request.query.from && request.query.through
          ? { from: request.query.from, through: request.query.through }
          : undefined,
        { petId: request.query.petId, pageSize: request.query.pageSize },
      );
    },
  );
  if (store.quote)
    api.post<{ Body: BookingWrite }>(
      '/bookings/quote',
      { schema: { querystring: emptyObjectSchema, body: spec.components.schemas.BookingWrite } },
      (req) => store.quote!(requestIdentity(req), req.body),
    );
  api.post<{ Body: AvailabilityInput }>(
    '/availability',
    { schema: { querystring: emptyObjectSchema, body: spec.components.schemas.AvailabilityInput } },
    (request) => store.availability(requestIdentity(request), request.body),
  );
  api.get<{ Params: { id: string } }>(
    '/bookings/:id',
    { schema: { params, querystring: emptyObjectSchema } },
    (request) => store.get(requestIdentity(request), request.params.id),
  );
  api.put<{ Params: { id: string }; Body: BookingWrite }>(
    '/bookings/:id',
    {
      schema: {
        params,
        querystring: emptyObjectSchema,
        body: spec.components.schemas.BookingWrite,
      },
    },
    (request) => store.save(requestIdentity(request), request.params.id, request.body),
  );
  api.post<{ Params: { id: string }; Body: BookingAction }>(
    '/bookings/:id/actions',
    {
      schema: {
        params,
        querystring: emptyObjectSchema,
        body: spec.components.schemas.BookingAction,
      },
    },
    (request) => store.action(requestIdentity(request), request.params.id, request.body),
  );
}
