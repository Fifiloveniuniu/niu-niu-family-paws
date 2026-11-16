import type {PetBalance} from './pet-balance';
export type StatementPet={name:string;customer:string;customerName:string};
export type StatementKind='added'|'correction'|'terms';
export type StatementEntry={id:string;pet:string;customer:string;customerName:string;at:string;kind:StatementKind;delta:number;before:number;after:number;reason:string;sequence:number};
export type StatementFilters={customer:string;pet:string;from:string;through:string;kind:string};
export const emptyStatementFilters:StatementFilters={customer:'all',pet:'all',from:'',through:'',kind:'all'};
export function statementEntries(accounts:Record<string,PetBalance>,pets:StatementPet[]):StatementEntry[]{
 return Object.values(accounts).filter(a=>a.service==='boarding').flatMap(account=>{
  const pet=pets.find(p=>p.name===account.pet);if(!pet)return [];
  return account.history.map((entry,index)=>({id:entry.id,pet:pet.name,customer:pet.customer,customerName:pet.customerName,at:entry.at,kind:entry.delta>0?'added' as const:entry.delta<0?'correction' as const:'terms' as const,delta:entry.delta,before:entry.after-entry.delta,after:entry.after,reason:entry.reason,sequence:index+1}));
 }).sort((a,b)=>Date.parse(b.at)-Date.parse(a.at)||b.sequence-a.sequence||a.pet.localeCompare(b.pet));
}
const validDate=(value:string)=>/^\d{4}-\d{2}-\d{2}$/.test(value)&&Number.isFinite(Date.parse(value+'T00:00:00Z'))&&new Date(value+'T00:00:00Z').toISOString().slice(0,10)===value;
export function validStatementRange(from:string,through:string){return (!from||validDate(from))&&(!through||validDate(through))&&(!from||!through||from<=through);}
export function filterStatement(entries:StatementEntry[],filters:StatementFilters){
 if(!validStatementRange(filters.from,filters.through))return [];
 return entries.filter(entry=>{
  const at=new Date(entry.at),day=new Date(at.getTime()-at.getTimezoneOffset()*60000).toISOString().slice(0,10);
  return (filters.customer==='all'||entry.customer===filters.customer)&&(filters.pet==='all'||entry.pet===filters.pet)&&(filters.kind==='all'||entry.kind===filters.kind)&&(!filters.from||day>=filters.from)&&(!filters.through||day<=filters.through);
 });
}
export function statementTotals(entries:StatementEntry[]){return entries.reduce((sum,entry)=>({added:sum.added+Math.max(0,entry.delta),removed:sum.removed+Math.max(0,-entry.delta),net:sum.net+entry.delta}),{added:0,removed:0,net:0});}
// Quote all text, protect spreadsheet formulas, and keep numeric fields numeric.
const csvCell=(value:string|number)=>typeof value==='number'?String(value):'"'+(/^[\s]*[=+\-@]/.test(value)?"'"+value:value).replaceAll('"','""')+'"';
export function statementCsv(entries:StatementEntry[],headers:string[],labels:Record<StatementKind,string>){
 const rows:(string|number)[][]=[headers,...entries.map(e=>[e.at,e.id,e.customerName,e.pet,labels[e.kind],e.delta,e.before,e.after,e.reason])];
 return '\ufeff'+rows.map(row=>row.map(csvCell).join(',')).join('\r\n');
}
