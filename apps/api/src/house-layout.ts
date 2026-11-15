import type {FastifyInstance, FastifyRequest} from 'fastify';
import type {Firestore} from 'firebase-admin/firestore';
import type {components} from '../../../packages/contracts/generated.ts';
import {petTypes, validCapacity} from '../../../packages/contracts/room-capacity.ts';
import spec from '../../../packages/contracts/openapi.json' with {type:'json'};
import {Conflict, type Identity} from './app.ts';
export type Room = components['schemas']['Room'];
export type Layout = components['schemas']['HouseLayout'];
type RoomWrite = components['schemas']['RoomWrite'];
export class HouseLayoutMissing extends Error {}
export interface LayoutStore {
  read(houseId: string): Promise<Layout>;
  room(houseId: string, id: string, input: RoomWrite, actor: string): Promise<Room>;
}
export function layoutStore(db: Firestore): LayoutStore {
  const house = (id: string) => db.collection('houses').doc(id);
  const room = (houseId: string, id: string) => house(houseId).collection('rooms').doc(id);
  function record(data: FirebaseFirestore.DocumentData): Room {
    // Keep existing rooms readable without inventing a capacity from former child entries.
    const costs = Object.fromEntries(petTypes.filter(type => validCapacity(data.petCosts?.[type])).map(type => [type, data.petCosts[type]]));
    return {id:data.id, name:data.name, closed:data.closed, capacity:validCapacity(data.capacity) ? data.capacity : null,
      petCosts:costs, version:data.version, createdAt:data.createdAt, updatedAt:data.updatedAt};
  }
  return {
    async read(houseId) {
      if (!(await house(houseId).get()).exists) throw new HouseLayoutMissing();
      const rooms = await house(houseId).collection('rooms').orderBy('name').get();
      return {rooms:rooms.docs.map(doc => record(doc.data()))};
    },
    async room(houseId, id, input, actor) {
      const ref = room(houseId, id);
      return db.runTransaction(async tx => {
        if (!(await tx.get(house(houseId))).exists) throw new HouseLayoutMissing();
        const snapshot = await tx.get(ref), previous = snapshot.exists ? record(snapshot.data()!) : null;
        const same = previous && previous.name === input.name && previous.closed === input.closed && previous.capacity === input.capacity
          && petTypes.every(type => previous.petCosts[type] === input.petCosts[type]);
        if (same && [input.version,input.version+1].includes(previous.version)) return previous;
        if ((previous?.version ?? 0) !== input.version) throw new Conflict();
        const now = new Date().toISOString();
        const next: Room = {...input, id, version:input.version+1, createdAt:previous?.createdAt ?? now, updatedAt:now};
        tx.set(ref, next);
        tx.create(ref.collection('history').doc(String(next.version)), {actor, at:now, before:previous, after:next});
        return next;
      });
    },
  };
}
export function layoutRoutes(api: FastifyInstance, store: LayoutStore) {
  const actor = (request: FastifyRequest) => (request as FastifyRequest & {identity:Identity}).identity;
  const uuid = {type:'string',pattern:'^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'};
  const empty = {type:'object',additionalProperties:false,properties:{}};
  const params = (keys: string[]) => ({type:'object',additionalProperties:false,required:keys,properties:Object.fromEntries(keys.map(key=>[key,uuid]))});
  api.register(async admin => {
    admin.addHook('onRequest',async(request,reply)=>{if(actor(request).admin!==true)return reply.code(403).send({code:'forbidden'});});
    admin.get<{Params:{houseId:string}}>('/houses/:houseId/layout',{schema:{params:params(['houseId']),querystring:empty}},request=>store.read(request.params.houseId));
    admin.put<{Params:{houseId:string;id:string};Body:RoomWrite}>('/houses/:houseId/rooms/:id',{
      schema:{params:params(['houseId','id']),querystring:empty,body:spec.components.schemas.RoomWrite},
    },(request,reply)=>{
      const input = {...request.body,name:request.body.name.trim(),petCosts:Object.fromEntries(petTypes.filter(type=>request.body.petCosts[type]!==undefined).map(type=>[type,request.body.petCosts[type]!]))};
      if(!input.name || /[\u0000-\u001f\u007f]/.test(input.name) || !validCapacity(input.capacity) || Object.values(input.petCosts).some(value=>!validCapacity(value))) return reply.code(400).send({code:'invalid_input'});
      return store.room(request.params.houseId,request.params.id,input,actor(request).uid);
    });
  });
}
