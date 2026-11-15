import {auth} from './auth-client';
export class HouseError extends Error{constructor(public status:number){super('House request failed');}}
export async function houseApi<T>(path='',body?:unknown):Promise<T>{
  if(!auth.currentUser)throw new HouseError(401);
  const token=await auth.currentUser.getIdToken();
  const result=await fetch('/api/houses'+path,{method:body?'PUT':'GET',cache:'no-store',headers:{Authorization:`Bearer ${token}`,...(body?{'Content-Type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{})});
  if(!result.ok)throw new HouseError(result.status);return result.json();
}
