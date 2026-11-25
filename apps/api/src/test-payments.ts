import { FieldPath, type Firestore } from 'firebase-admin/firestore';
import type { FastifyInstance } from 'fastify';
import { timestamp } from './bookings.ts';
export type PaymentFilters = { from?: string; through?: string; search?: string };
import { PetAccess, PetMissing, PetInvalid } from './pets.ts';
import { Conflict } from './app.ts';
import { requestIdentity, type Identity } from './request-context.ts';
import { uuidSchema } from './validation.ts';
import type { TestCard, TestCharge, TestPaymentRead } from '../../../packages/payments/types.ts';

export function testPaymentStore(db: Firestore) {
  // This simulator must never be attached to a production database.
  if (
    (db as Firestore & { projectId: string }).projectId !== 'demo-niu-niu' ||
    process.env.FIRESTORE_EMULATOR_HOST !== '127.0.0.1:8085'
  )
    throw Error('Test payments require isolated demo Firestore');
  async function authorize(tx: FirebaseFirestore.Transaction, identity: Identity, cid: string) {
    const customer = await tx.get(db.doc('customers/' + cid));
    if (!customer.exists) throw new PetMissing();
    if (identity.admin !== true && !(identity.google && customer.data()!.ownerUid === identity.uid))
      throw new PetAccess();
  }
  return {
    async read(
      identity: Identity,
      cid: string,
      cursor?: string,
      pageSize = 25,
      filters: PaymentFilters = {},
    ): Promise<TestPaymentRead> {
      const from = filters.from ? timestamp(filters.from) : undefined;
      const through = filters.through ? timestamp(filters.through) : undefined;
      if (from && through && through <= from) throw new PetInvalid();
      const search = filters.search?.trim().toLowerCase() ?? '';
      if (search.length > 80) throw new PetInvalid();
      return db.runTransaction(async (tx) => {
        await authorize(tx, identity, cid);
        const ref = db.doc(`customers/${cid}/testPayments/card`);
        const card = await tx.get(ref);
        let query = ref
          .collection('charges')
          .orderBy('at', 'desc')
          .orderBy(FieldPath.documentId(), 'desc')
          .limit((search ? 250 : pageSize) + 1);
        if (from) query = query.where('at', '>=', from);
        if (through) query = query.where('at', '<', through);
        if (cursor) {
          const anchor = await tx.get(ref.collection('charges').doc(cursor));
          if (!anchor.exists) throw new Conflict();
          query = query.startAfter(anchor);
        }
        const result = await tx.get(query);
        const charges: TestCharge[] = [];
        let consumed = 0;
        for (const doc of result.docs.slice(0, search ? 250 : pageSize)) {
          consumed++;
          const charge = doc.data() as TestCharge;
          if (
            !search ||
            charge.bookingId.toLowerCase().includes(search) ||
            charge.last4.includes(search)
          )
            charges.push(charge);
          if (charges.length === pageSize) break;
        }
        return {
          card: card.exists
            ? (card.data() as TestCard)
            : { scenario: 'none', last4: null, version: 0 },
          charges,
          nextCursor: result.size > consumed ? result.docs[consumed - 1].id : null,
        };
      });
    },
    async save(
      identity: Identity,
      cid: string,
      input: { version: number; scenario: TestCard['scenario'] },
    ) {
      return db.runTransaction(async (tx) => {
        await authorize(tx, identity, cid);
        const ref = db.doc(`customers/${cid}/testPayments/card`),
          old = await tx.get(ref);
        if ((old.data()?.version ?? 0) !== input.version) throw new Conflict();
        const card: TestCard = {
          scenario: input.scenario,
          last4: input.scenario === 'none' ? null : input.scenario === 'approved' ? '4242' : '0002',
          version: input.version + 1,
        };
        tx.set(ref, card);
        tx.create(ref.collection('history').doc(String(card.version)), {
          ...card,
          actor: identity.uid,
          at: new Date().toISOString(),
        });
        return card;
      });
    },
  };
}
export function testPaymentRoutes(
  api: FastifyInstance,
  store: ReturnType<typeof testPaymentStore>,
) {
  const params = {
    type: 'object',
    additionalProperties: false,
    required: ['customerId'],
    properties: { customerId: uuidSchema },
  };
  api.get<{
    Params: { customerId: string };
    Querystring: PaymentFilters & { cursor?: string; pageSize?: string };
  }>(
    '/customers/:customerId/test-payments',
    {
      schema: {
        params,
        querystring: {
          type: 'object',
          additionalProperties: false,
          properties: {
            cursor: uuidSchema,
            from: { type: 'string', format: 'date-time' },
            through: { type: 'string', format: 'date-time' },
            search: { type: 'string', maxLength: 80 },
            pageSize: { type: 'string', enum: ['25', '50', '100'] },
          },
        },
      },
    },
    (req) =>
      store.read(
        requestIdentity(req),
        req.params.customerId,
        req.query.cursor,
        Number(req.query.pageSize ?? 25),
        { from: req.query.from, through: req.query.through, search: req.query.search },
      ),
  );
  api.put<{
    Params: { customerId: string };
    Body: { version: number; scenario: TestCard['scenario'] };
  }>(
    '/customers/:customerId/test-payments',
    {
      schema: {
        params,
        body: {
          type: 'object',
          additionalProperties: false,
          required: ['version', 'scenario'],
          properties: {
            version: { type: 'integer', minimum: 0, maximum: 1e9 },
            scenario: { type: 'string', enum: ['approved', 'declined', 'none'] },
          },
        },
      },
    },
    (req) => store.save(requestIdentity(req), req.params.customerId, req.body),
  );
}
