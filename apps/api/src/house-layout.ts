import type {FastifyInstance,FastifyRequest} from 'fastify';
import type {Firestore} from 'firebase-admin/firestore';
import type {components} from '../../../packages/contracts/generated.ts';
import spec from '../../../packages/contracts/openapi.json' with {type:'json'};
import {Conflict,type Identity} from './app.ts';
export type Room=components['schemas']['Room'];
export type Space=components['schemas']['Space'];
export type Layout=components['schemas']['HouseLayout'];
type RoomWrite=components['schemas']['RoomWrite'];
type SpaceWrite=components['schemas']['SpaceWrite'];
export class HouseLayoutMissing extends Error{}
export interface LayoutStore {
  read(houseId:string):Promise<Layout>;
  room(houseId:string,id:string,input:RoomWrite,actor:string):Promise<Room>;
  space(houseId:string,roomId:string,id:string,input:SpaceWrite,actor:string):Promise<Space>;
}
export function layoutStore(db:Firestore):LayoutStore {
  const house=(id:string)=>db.collection('houses').doc(id);
  const room=(houseId:string,id:string)=>house(houseId).collection('rooms').doc(id);
  function record(data:FirebaseFirestore.DocumentData,kind:'room'|'space'){
    const base={id:data.id,name:data.name,closed:data.closed,version:data.version,createdAt:data.createdAt,updatedAt:data.updatedAt};
    return kind==='room'?base:{...base,capacity:data.capacity,species:data.species,sharing:data.sharing,...(data.weightLimit?{weightLimit:data.weightLimit}:{})};
  }
  async function save(kind:'room'|'space',houseId:string,roomId:string|null,id:string,input:RoomWrite|SpaceWrite,actor:string){
    const parent=kind==='room'?house(houseId):room(houseId,roomId!),ref=kind==='room'?room(houseId,id):parent.collection('spaces').doc(id);
    return db.runTransaction(async tx=>{
      const parents=await tx.getAll(house(houseId),parent);
      if(parents.some(p=>!p.exists))throw new HouseLayoutMissing();
      const snapshot=await tx.get(ref),previous=snapshot.exists?record(snapshot.data()!,kind):null;
      const fields=kind==='room'?['name','closed']:['name','closed','capacity','species','sharing','weightLimit'];
      const same=previous&&fields.every(key=>JSON.stringify((previous as Record<string,unknown>)[key])===JSON.stringify((input as unknown as Record<string,unknown>)[key]));
      if(same&&[input.version,input.version+1].includes(previous.version))return previous;
      if((previous?.version??0)!==input.version)throw new Conflict();
      const now=new Date().toISOString(),next={...input,id,version:input.version+1,createdAt:previous?.createdAt??now,updatedAt:now};
      tx.set(ref,next);tx.create(ref.collection('history').doc(String(next.version)),{actor,at:now,before:previous,after:next});return next;
    });
  }
  return {
    async read(houseId){
      if(!(await house(houseId).get()).exists)throw new HouseLayoutMissing();
      const rooms=await house(houseId).collection('rooms').orderBy('name').get();
      return {rooms:await Promise.all(rooms.docs.map(async doc=>({room:record(doc.data(),'room') as Room,spaces:(await doc.ref.collection('spaces').orderBy('name').get()).docs.map(space=>record(space.data(),'space') as Space)})))};
    },
    room:(h,id,input,actor)=>save('room',h,null,id,input,actor) as Promise<Room>,
    space:(h,r,id,input,actor)=>save('space',h,r,id,input,actor) as Promise<Space>,
  };
}
export function layoutRoutes(api:FastifyInstance,store:LayoutStore){
  const actor=(request:FastifyRequest)=>(request as FastifyRequest&{identity:Identity}).identity;
  const uuid={type:'string',pattern:'^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'},empty={type:'object',additionalProperties:false,properties:{}};
  const params=(keys:string[])=>({type:'object',additionalProperties:false,required:keys,properties:Object.fromEntries(keys.map(k=>[k,uuid]))});
  api.register(async admin=>{
    admin.addHook('onRequest',async(request,reply)=>{if(actor(request).admin!==true)return reply.code(403).send({code:'forbidden'});});
    admin.get<{Params:{houseId:string}}>('/houses/:houseId/layout',{schema:{params:params(['houseId']),querystring:empty}},request=>store.read(request.params.houseId));
    admin.put<{Params:{houseId:string;id:string};Body:RoomWrite}>('/houses/:houseId/rooms/:id',{schema:{params:params(['houseId','id']),querystring:empty,body:spec.components.schemas.RoomWrite}},(request,reply)=>{
      const input={...request.body,name:request.body.name.trim()};
      if(!input.name||/[\u0000-\u001f\u007f]/.test(input.name))return reply.code(400).send({code:'invalid_input'});
      return store.room(request.params.houseId,request.params.id,input,actor(request).uid);
    });
    // OpenAPI 3.0 uses a boolean exclusiveMinimum; JSON Schema/Ajv expects a numeric bound.
    const spaceBody=structuredClone(spec.components.schemas.SpaceWrite) as Record<string,any>;
    spaceBody.properties.weightLimit.properties.value={type:'number',exclusiveMinimum:0,maximum:1_000_000};
    admin.put<{Params:{houseId:string;roomId:string;id:string};Body:SpaceWrite}>('/houses/:houseId/rooms/:roomId/spaces/:id',{schema:{params:params(['houseId','roomId','id']),querystring:empty,body:spaceBody}},(request,reply)=>{
      const input={...request.body,name:request.body.name.trim(),species:[...request.body.species].sort()};
      if(!input.name||/[\u0000-\u001f\u007f]/.test(input.name)||(input.sharing==='individual'&&input.capacity!==1))return reply.code(400).send({code:'invalid_input'});
      return store.space(request.params.houseId,request.params.roomId,request.params.id,input,actor(request).uid);
    });
  });
}
