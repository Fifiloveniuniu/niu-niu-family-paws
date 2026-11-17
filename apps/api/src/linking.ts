import { uuidSchema, emptyObjectSchema } from './validation.ts';
import { requestIdentity } from './request-context.ts';
import { createHash, randomBytes } from 'node:crypto';
import type { Firestore } from 'firebase-admin/firestore';
import type { FastifyInstance } from 'fastify';
import { Conflict, type ProfileIdentity } from './app.ts';
import { customerSearchKeys } from './store.ts';
import spec from '../../../packages/contracts/openapi.json' with { type: 'json' };
import type { components } from '../../../packages/contracts/generated.ts';

type LinkState = components['schemas']['LinkState'];
type LinkDecision = components['schemas']['LinkDecision'];
type StoredLink = {
  digest: string;
  status: 'open' | 'requested' | 'approved' | 'rejected' | 'cancelled';
  version: number;
  expiresAt: string;
  requesterUid?: string;
  requestedEmail?: string;
  actor: string;
};
export class LinkUnavailable extends Error {}
export interface LinkStore {
  issue(customerId: string, actor: string): Promise<{ code: string; state: LinkState }>;
  adminState(customerId: string): Promise<LinkState>;
  request(identity: ProfileIdentity, code: string): Promise<{ status: string; expiresAt?: string }>;
  ownState(uid: string): Promise<{ status: string; expiresAt?: string }>;
  decide(customerId: string, input: LinkDecision, actor: string): Promise<LinkState>;
}
export function linkStore(
  database: Firestore,
  verifiedPerson: (uid: string) => Promise<ProfileIdentity>,
  now = () => Date.now(),
): LinkStore {
  const customer = (id: string) => database.collection('customers').doc(id);
  const link = (id: string) => customer(id).collection('accountLink').doc('current');
  const person = (uid: string) => database.collection('people').doc(uid);
  const requestRef = (uid: string) => database.collection('accountLinkRequests').doc(uid);
  const expired = (state: StoredLink) => Date.parse(state.expiresAt) <= now();
  const publicState = (state: StoredLink | undefined, version: number): LinkState => ({
    status: state
      ? expired(state) && ['open', 'requested'].includes(state.status)
        ? 'expired'
        : state.status
      : 'none',
    version: state?.version ?? 0,
    customerVersion: version,
    ...(state
      ? {
          expiresAt: state.expiresAt,
          ...(state.requestedEmail ? { requestedEmail: state.requestedEmail } : {}),
        }
      : {}),
  });
  const audit = (transaction: FirebaseFirestore.Transaction, id: string, state: StoredLink) =>
    transaction.create(customer(id).collection('linkHistory').doc(String(state.version)), {
      ...state,
      at: new Date(now()).toISOString(),
    });
  return {
    async adminState(id) {
      const [c, s] = await Promise.all([customer(id).get(), link(id).get()]);
      if (!c.exists) throw new LinkUnavailable();
      return {
        ...publicState(s.data() as StoredLink | undefined, c.data()!.version),
        customerName: c.data()!.name,
      };
    },
    async issue(id, actor) {
      const raw = randomBytes(16).toString('hex').toUpperCase();
      const code = raw.match(/.{4}/g)!.join('-');
      const digest = createHash('sha256').update(raw).digest('hex');
      return database.runTransaction(async (transaction) => {
        const [c, s] = await Promise.all([
          transaction.get(customer(id)),
          transaction.get(link(id)),
        ]);
        if (!c.exists || c.data()!.ownerUid) throw new Conflict();
        const state: StoredLink = {
          digest,
          status: 'open',
          version: (s.data()?.version ?? 0) + 1,
          actor,
          expiresAt: new Date(now() + 86400000).toISOString(),
        };
        transaction.set(link(id), state);
        transaction.create(database.collection('accountLinkCodes').doc(digest), { customerId: id });
        audit(transaction, id, state);
        return {
          code,
          state: { ...publicState(state, c.data()!.version), customerName: c.data()!.name },
        };
      });
    },
    async ownState(uid) {
      const requestSnapshot = await requestRef(uid).get();
      if (!requestSnapshot.exists) return { status: 'none' };
      const state = (await link(requestSnapshot.data()!.customerId).get()).data() as
        StoredLink | undefined;
      if (!state || state.digest !== requestSnapshot.data()!.digest || state.requesterUid !== uid)
        return { status: 'cancelled' };
      return { status: publicState(state, 0).status, expiresAt: state.expiresAt };
    },
    async request(identity, code) {
      const raw = code.replace(/[-\s]/g, '').toUpperCase();
      if (!/^[A-F0-9]{32}$/.test(raw)) throw new LinkUnavailable();
      const digest = createHash('sha256').update(raw).digest('hex');
      return database.runTransaction(async (transaction) => {
        const [lookup, p, r] = await Promise.all([
          transaction.get(database.collection('accountLinkCodes').doc(digest)),
          transaction.get(person(identity.uid)),
          transaction.get(requestRef(identity.uid)),
        ]);
        if (p.exists || !lookup.exists) throw new LinkUnavailable();
        const id = lookup.data()!.customerId;
        const [c, s, prior] = await Promise.all([
          transaction.get(customer(id)),
          transaction.get(link(id)),
          r.exists && r.data()!.customerId !== id
            ? transaction.get(link(r.data()!.customerId))
            : Promise.resolve(null),
        ]);
        const state = s.data() as StoredLink | undefined;
        const old = prior?.data() as StoredLink | undefined;
        if (old && old.requesterUid === identity.uid && old.status === 'requested' && !expired(old))
          throw new Conflict();
        if (!c.exists || c.data()!.ownerUid || !state || state.digest !== digest || expired(state))
          throw new LinkUnavailable();
        if (
          state.status === 'requested' &&
          state.requesterUid === identity.uid &&
          state.requestedEmail === identity.email
        )
          return { status: 'requested', expiresAt: state.expiresAt };
        if (state.status !== 'open') throw new LinkUnavailable();
        const next: StoredLink = {
          ...state,
          status: 'requested',
          version: state.version + 1,
          requesterUid: identity.uid,
          requestedEmail: identity.email,
          actor: identity.uid,
        };
        transaction.set(link(id), next);
        transaction.set(requestRef(identity.uid), { customerId: id, digest });
        audit(transaction, id, next);
        return { status: 'requested', expiresAt: state.expiresAt };
      });
    },
    async decide(id, input, actor) {
      const initial = (await link(id).get()).data() as StoredLink | undefined;
      let identity: ProfileIdentity | undefined;
      if (input.action === 'approve') {
        if (!initial?.requesterUid) throw new Conflict();
        try {
          identity = await verifiedPerson(initial.requesterUid);
        } catch {
          throw new LinkUnavailable();
        }
      }
      return database.runTransaction(async (transaction) => {
        const [c, s, p] = await Promise.all([
          transaction.get(customer(id)),
          transaction.get(link(id)),
          identity ? transaction.get(person(identity.uid)) : Promise.resolve(null),
        ]);
        const state = s.data() as StoredLink | undefined;
        if (!c.exists || !state) throw new Conflict();
        const target =
          input.action === 'approve'
            ? 'approved'
            : input.action === 'reject'
              ? 'rejected'
              : 'cancelled';
        if (state.status === target && state.version === input.version + 1 && state.actor === actor)
          return { ...publicState(state, c.data()!.version), customerName: c.data()!.name };
        if (
          state.version !== input.version ||
          c.data()!.version !== input.customerVersion ||
          expired(state) ||
          !['open', 'requested'].includes(state.status) ||
          c.data()!.ownerUid
        )
          throw new Conflict();
        if (input.action !== 'cancel' && state.status !== 'requested') throw new Conflict();
        if (
          identity &&
          (p?.exists ||
            state.requesterUid !== identity.uid ||
            state.requestedEmail !== identity.email)
        )
          throw new Conflict();
        const next: StoredLink = { ...state, status: target, version: state.version + 1, actor };
        if (identity) {
          const before = c.data()!;
          const at = new Date(now()).toISOString();
          const after = {
            ...before,
            ownerUid: identity.uid,
            loginEmail: identity.email,
            version: before.version + 1,
            updatedAt: at,
            searchKeys: customerSearchKeys(before.name, before.email, identity.email),
          };
          transaction.update(customer(id), after);
          transaction.create(person(identity.uid), { customerId: id, createdAt: at });
          transaction.create(customer(id).collection('history').doc(String(after.version)), {
            actor,
            effectiveUid: identity.uid,
            source: 'account-link',
            at,
            before,
            after,
          });
        }
        transaction.set(link(id), next);
        audit(transaction, id, next);
        return {
          ...publicState(next, c.data()!.version + (identity ? 1 : 0)),
          customerName: c.data()!.name,
        };
      });
    },
  };
}

export function linkRoutes(api: FastifyInstance, store: LinkStore) {
  api.register(async (own) => {
    own.addHook('onRequest', async (request, reply) => {
      if (!requestIdentity(request).google || !requestIdentity(request).email)
        return reply.code(403).send({ code: 'forbidden' });
    });
    own.get('/account-link', { schema: { querystring: emptyObjectSchema } }, (request) =>
      store.ownState(requestIdentity(request).uid),
    );
    own.post<{ Body: { code: string } }>(
      '/account-link',
      {
        config: {
          rateLimit: {
            max: 10,
            timeWindow: '1 minute',
            keyGenerator: (request) => requestIdentity(request)?.uid ?? request.ip,
          },
        },
        schema: { querystring: emptyObjectSchema, body: spec.components.schemas.LinkCode },
      },
      (request) =>
        store.request(
          { uid: requestIdentity(request).uid, email: requestIdentity(request).email! },
          request.body.code,
        ),
    );
  });
  api.register(async (admin) => {
    admin.addHook('onRequest', async (request, reply) => {
      if (requestIdentity(request).admin !== true)
        return reply.code(403).send({ code: 'forbidden' });
    });
    const params = {
      type: 'object',
      additionalProperties: false,
      required: ['id'],
      properties: { id: uuidSchema },
    };
    admin.get<{ Params: { id: string } }>(
      '/customers/:id/account-link',
      { schema: { params, querystring: emptyObjectSchema } },
      (request) => store.adminState(request.params.id),
    );
    admin.post<{ Params: { id: string } }>(
      '/customers/:id/account-link',
      { schema: { params, querystring: emptyObjectSchema, body: emptyObjectSchema } },
      (request) => store.issue(request.params.id, requestIdentity(request).uid),
    );
    admin.put<{ Params: { id: string }; Body: LinkDecision }>(
      '/customers/:id/account-link',
      {
        schema: {
          params,
          querystring: emptyObjectSchema,
          body: spec.components.schemas.LinkDecision,
        },
      },
      (request) => store.decide(request.params.id, request.body, requestIdentity(request).uid),
    );
  });
}
