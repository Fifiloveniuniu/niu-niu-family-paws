import { createHash, randomBytes } from 'node:crypto';
import type { Firestore } from 'firebase-admin/firestore';
import type { FastifyInstance, FastifyRequest } from 'fastify';
import { Conflict, type Identity, type ProfileIdentity } from './app.ts';
import { customerSearchKeys } from './store.ts';
import spec from '../../../packages/contracts/openapi.json' with { type: 'json' };
import type { components } from '../../../packages/contracts/generated.ts';

type LinkState = components['schemas']['LinkState'];
type LinkDecision = components['schemas']['LinkDecision'];
type StoredLink = { digest: string; status: 'open' | 'requested' | 'approved' | 'rejected' | 'cancelled'; version: number; expiresAt: string; requesterUid?: string; requestedEmail?: string; actor: string };
export class LinkUnavailable extends Error {}
export interface LinkStore {
  issue(customerId: string, actor: string): Promise<{ code: string; state: LinkState }>;
  adminState(customerId: string): Promise<LinkState>;
  request(identity: ProfileIdentity, code: string): Promise<{ status: string; expiresAt?: string }>;
  ownState(uid: string): Promise<{ status: string; expiresAt?: string }>;
  decide(customerId: string, input: LinkDecision, actor: string): Promise<LinkState>;
}
export function linkStore(db: Firestore, verifiedPerson: (uid: string) => Promise<ProfileIdentity>, now = () => Date.now()): LinkStore {
  const customer = (id: string) => db.collection('customers').doc(id);
  const link = (id: string) => customer(id).collection('accountLink').doc('current');
  const person = (uid: string) => db.collection('people').doc(uid);
  const requestRef = (uid: string) => db.collection('accountLinkRequests').doc(uid);
  const expired = (state: StoredLink) => Date.parse(state.expiresAt) <= now();
  const publicState = (state: StoredLink | undefined, version: number): LinkState => ({ status: state ? expired(state) && ['open','requested'].includes(state.status) ? 'expired' : state.status : 'none', version: state?.version ?? 0, customerVersion: version, ...(state ? { expiresAt: state.expiresAt, ...(state.requestedEmail ? { requestedEmail: state.requestedEmail } : {}) } : {}) });
  const audit = (tx: FirebaseFirestore.Transaction, id: string, state: StoredLink) => tx.create(customer(id).collection('linkHistory').doc(String(state.version)), { ...state, at: new Date(now()).toISOString() });
  return {
    async adminState(id) {
      const [c,s] = await Promise.all([customer(id).get(), link(id).get()]);
      if (!c.exists) throw new LinkUnavailable();
      return {...publicState(s.data() as StoredLink | undefined, c.data()!.version),customerName:c.data()!.name};
    },
    async issue(id, actor) {
      const raw = randomBytes(16).toString('hex').toUpperCase();
      const code = raw.match(/.{4}/g)!.join('-'), digest = createHash('sha256').update(raw).digest('hex');
      return db.runTransaction(async tx => {
        const [c,s] = await Promise.all([tx.get(customer(id)),tx.get(link(id))]);
        if (!c.exists || c.data()!.ownerUid) throw new Conflict();
        const state: StoredLink = { digest, status: 'open', version: (s.data()?.version ?? 0) + 1, actor, expiresAt: new Date(now() + 86400000).toISOString() };
        tx.set(link(id), state); tx.create(db.collection('accountLinkCodes').doc(digest), { customerId: id }); audit(tx,id,state);
        return { code, state: {...publicState(state,c.data()!.version),customerName:c.data()!.name} };
      });
    },
    async ownState(uid) {
      const r = await requestRef(uid).get();
      if (!r.exists) return { status: 'none' };
      const state = (await link(r.data()!.customerId).get()).data() as StoredLink | undefined;
      if (!state || state.digest !== r.data()!.digest || state.requesterUid !== uid) return { status: 'cancelled' };
      return { status: publicState(state,0).status, expiresAt: state.expiresAt };
    },
    async request(identity, code) {
      const raw = code.replace(/[-\s]/g,'').toUpperCase();
      if (!/^[A-F0-9]{32}$/.test(raw)) throw new LinkUnavailable();
      const digest = createHash('sha256').update(raw).digest('hex');
      return db.runTransaction(async tx => {
        const [lookup,p,r] = await Promise.all([tx.get(db.collection('accountLinkCodes').doc(digest)),tx.get(person(identity.uid)),tx.get(requestRef(identity.uid))]);
        if (p.exists || !lookup.exists) throw new LinkUnavailable();
        const id = lookup.data()!.customerId;
        const [c,s,prior] = await Promise.all([tx.get(customer(id)),tx.get(link(id)),r.exists && r.data()!.customerId !== id ? tx.get(link(r.data()!.customerId)) : Promise.resolve(null)]);
        const state = s.data() as StoredLink | undefined, old = prior?.data() as StoredLink | undefined;
        if (old && old.requesterUid === identity.uid && old.status === 'requested' && !expired(old)) throw new Conflict();
        if (!c.exists || c.data()!.ownerUid || !state || state.digest !== digest || expired(state)) throw new LinkUnavailable();
        if (state.status === 'requested' && state.requesterUid === identity.uid && state.requestedEmail === identity.email) return { status: 'requested', expiresAt: state.expiresAt };
        if (state.status !== 'open') throw new LinkUnavailable();
        const next: StoredLink = { ...state, status: 'requested', version: state.version + 1, requesterUid: identity.uid, requestedEmail: identity.email, actor: identity.uid };
        tx.set(link(id),next); tx.set(requestRef(identity.uid),{customerId:id,digest}); audit(tx,id,next);
        return { status: 'requested', expiresAt: state.expiresAt };
      });
    },
    async decide(id,input,actor) {
      const initial = (await link(id).get()).data() as StoredLink | undefined;
      let identity: ProfileIdentity | undefined;
      if (input.action === 'approve') {
        if (!initial?.requesterUid) throw new Conflict();
        try { identity = await verifiedPerson(initial.requesterUid); } catch { throw new LinkUnavailable(); }
      }
      return db.runTransaction(async tx => {
        const [c,s,p] = await Promise.all([tx.get(customer(id)),tx.get(link(id)),identity ? tx.get(person(identity.uid)) : Promise.resolve(null)]);
        const state = s.data() as StoredLink | undefined;
        if (!c.exists || !state) throw new Conflict();
        const target = input.action === 'approve' ? 'approved' : input.action === 'reject' ? 'rejected' : 'cancelled';
        if (state.status === target && state.version === input.version + 1 && state.actor === actor) return {...publicState(state,c.data()!.version),customerName:c.data()!.name};
        if (state.version !== input.version || c.data()!.version !== input.customerVersion || expired(state) || !['open','requested'].includes(state.status) || c.data()!.ownerUid) throw new Conflict();
        if (input.action !== 'cancel' && state.status !== 'requested') throw new Conflict();
        if (identity && (p?.exists || state.requesterUid !== identity.uid || state.requestedEmail !== identity.email)) throw new Conflict();
        const next: StoredLink = {...state,status:target,version:state.version+1,actor};
        if (identity) {
          const before = c.data()!, at = new Date(now()).toISOString();
          const after = { ...before, ownerUid: identity.uid, loginEmail: identity.email, version: before.version+1, updatedAt:at, searchKeys:customerSearchKeys(before.name,before.email,identity.email) };
          tx.update(customer(id),after); tx.create(person(identity.uid),{customerId:id,createdAt:at});
          tx.create(customer(id).collection('history').doc(String(after.version)),{actor,effectiveUid:identity.uid,source:'account-link',at,before,after});
        }
        tx.set(link(id),next); audit(tx,id,next);
        return {...publicState(next,c.data()!.version+(identity?1:0)),customerName:c.data()!.name};
      });
    },
  };
}

export function linkRoutes(api: FastifyInstance, store: LinkStore) {
  const identity = (r: FastifyRequest) => (r as FastifyRequest & {identity:Identity}).identity;
  const empty = {type:'object',additionalProperties:false,properties:{}};
  api.register(async own => {
    own.addHook('onRequest',async(r,reply)=>{if(!identity(r).google || !identity(r).email)return reply.code(403).send({code:'forbidden'});});
    own.get('/account-link',{schema:{querystring:empty}},r=>store.ownState(identity(r).uid));
    own.post<{Body:{code:string}}>('/account-link',{config:{rateLimit:{max:10,timeWindow:'1 minute',keyGenerator:r=>identity(r)?.uid ?? r.ip}},schema:{querystring:empty,body:spec.components.schemas.LinkCode}},r=>store.request({uid:identity(r).uid,email:identity(r).email!},r.body.code));
  });
  api.register(async admin => {
    admin.addHook('onRequest',async(r,reply)=>{if(identity(r).admin!==true)return reply.code(403).send({code:'forbidden'});});
    const params = {type:'object',additionalProperties:false,required:['id'],properties:{id:{type:'string',pattern:'^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'}}};
    admin.get<{Params:{id:string}}>('/customers/:id/account-link',{schema:{params,querystring:empty}},r=>store.adminState(r.params.id));
    admin.post<{Params:{id:string}}>('/customers/:id/account-link',{schema:{params,querystring:empty,body:empty}},r=>store.issue(r.params.id,identity(r).uid));
    admin.put<{Params:{id:string};Body:LinkDecision}>('/customers/:id/account-link',{schema:{params,querystring:empty,body:spec.components.schemas.LinkDecision}},r=>store.decide(r.params.id,r.body,identity(r).uid));
  });
}
