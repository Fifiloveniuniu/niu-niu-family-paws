import type { FastifyInstance, FastifyRequest } from 'fastify';
import type { Firestore } from 'firebase-admin/firestore';
import type { components } from '../../../packages/contracts/generated.ts';
import spec from '../../../packages/contracts/openapi.json' with { type: 'json' };
import { Conflict, type Identity } from './app.ts';
export type House = components['schemas']['House'];
export type HouseWrite = components['schemas']['HouseWrite'];
export interface HouseStore {
  list(): Promise<{items: House[]}>;
  save(id: string, input: HouseWrite, actor: string): Promise<House>;
}
export function validTimezone(value: string) {
  // Require named zones rather than ambiguous abbreviations or fixed offsets.
  if (value !== 'UTC' && !value.includes('/')) return false;
  try { new Intl.DateTimeFormat('en', {timeZone:value}).format(); return true; } catch { return false; }
}
export function houseStore(db: Firestore): HouseStore {
  const houses = db.collection('houses');
  const record = (data: FirebaseFirestore.DocumentData): House => ({id:data.id,name:data.name,address:data.address,timezone:data.timezone,version:data.version,createdAt:data.createdAt,updatedAt:data.updatedAt});
  return {
    async list() {
      const snapshot=await houses.orderBy('name').get();
      return {items:snapshot.docs.map(doc=>record(doc.data()))};
    },
    async save(id,input,actor) {
      const ref=houses.doc(id);
      return db.runTransaction(async tx=>{
        const snap=await tx.get(ref), previous=snap.exists?record(snap.data()!):null;
        const same=previous && previous.name===input.name && previous.address===input.address && previous.timezone===input.timezone;
        if(same && (previous.version===input.version || previous.version===input.version+1)) return previous;
        if((previous?.version??0)!==input.version)throw new Conflict();
        const now=new Date().toISOString();
        const next:House={...input,id,version:input.version+1,createdAt:previous?.createdAt??now,updatedAt:now};
        tx.set(ref,next);
        tx.create(ref.collection('history').doc(String(next.version)),{actor,at:now,before:previous,after:next});
        return next;
      });
    },
  };
}
export function houseRoutes(api: FastifyInstance, store:HouseStore) {
  const identity=(request:FastifyRequest)=>(request as FastifyRequest & {identity:Identity}).identity;
  api.register(async admin=>{
    admin.addHook('onRequest',async(request,reply)=>{if(identity(request).admin!==true)return reply.code(403).send({code:'forbidden'});});
    const empty={type:'object',additionalProperties:false,properties:{}};
    admin.get('/houses',{schema:{querystring:empty}},()=>store.list());
    admin.put<{Params:{id:string};Body:HouseWrite}>('/houses/:id',{schema:{querystring:empty,params:{type:'object',required:['id'],additionalProperties:false,properties:{id:{type:'string',pattern:'^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'}}},body:spec.components.schemas.HouseWrite}},async(request,reply)=>{
      const input={...request.body,name:request.body.name.trim(),address:request.body.address.trim(),timezone:request.body.timezone.trim()};
      if(!input.name || /[\u0000-\u001f\u007f]/.test(input.name+input.address) || !validTimezone(input.timezone))return reply.code(400).send({code:'invalid_input'});
      return store.save(request.params.id,input,identity(request).uid);
    });
  });
}
