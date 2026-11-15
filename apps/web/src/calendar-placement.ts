export type Placement={id:string;name:string;species:string;house:number;room:number;start:number;end:number;status:'in'|'upcoming'|'out';overdue?:boolean;units:number};
export type PlacementIssue='dates'|'duplicate'|'species'|'overdue'|'boundary'|'capacity'|'unconfigured'|null;
// Prototype only: offsets are days from the sample anchor. No booking or payment writes.
export function placementIssue(stays:Placement[],pet:string,species:string,start:number,end:number,house:number,room:number,maximum:number,units:number):PlacementIssue{
 if(!Number.isFinite(start)||!Number.isFinite(end)||end<=start)return 'dates';
 const relevant=stays.filter(s=>s.status!=='out');
 const finish=(s:Placement)=>s.overdue?Infinity:s.end;
 if(relevant.some(s=>s.name===pet&&s.start<end&&finish(s)>start))return 'duplicate';
 const occupants=relevant.filter(s=>s.house===house&&s.room===room);
 if(occupants.some(s=>s.overdue&&s.start<end))return 'overdue';
 // Turnover policy is undecided. Do not silently allow back-to-back handoffs.
 if(occupants.some(s=>s.end===start||s.start===end))return 'boundary';
 const overlap=occupants.filter(s=>s.start<end&&finish(s)>start);
 if(overlap.some(s=>s.species!==species))return 'species';
 if(!Number.isFinite(maximum)||maximum<=0||!Number.isFinite(units)||units<=0)return 'unconfigured';
 const points=[start,...overlap.flatMap(s=>[s.start,s.end]).filter(v=>v>start&&v<end)];
 if(points.some(point=>units+overlap.filter(s=>s.start<=point&&finish(s)>point).reduce((sum,s)=>sum+s.units,0)>maximum))return 'capacity';
 return null;
}

export type UnavailableRange={start:number;end:number;reason:Exclude<PlacementIssue,null>};
// Sample occupancy changes only at stay endpoints. Evaluate each open interval,
// then join adjacent periods with the same reason; exact handoff boundaries
// still receive the separate placementIssue check when selecting a stay.
export function unavailableRanges(stays:Placement[],pet:string,species:string,from:number,to:number,house:number,room:number,maximum:number,units:number):UnavailableRange[]{
 if(!Number.isFinite(from)||!Number.isFinite(to)||to<=from)return [];
 const points=[...new Set([from,to,...stays.filter(s=>s.status!=='out').flatMap(s=>s.overdue?[s.start]:[s.start,s.end]).filter(t=>t>from&&t<to)])].sort((a,b)=>a-b);
 const ranges:UnavailableRange[]=[];
 for(let i=0;i<points.length-1;i++){
   const start=points[i],end=points[i+1],middle=(start+end)/2,epsilon=Math.min((end-start)/4,1/86400000);
   const reason=placementIssue(stays,pet,species,middle-epsilon,middle+epsilon,house,room,maximum,units);
   if(!reason)continue;
   const last=ranges.at(-1);
   if(last&&last.end===start&&last.reason===reason)last.end=end;
   else ranges.push({start,end,reason});
 }
 return ranges;
}
