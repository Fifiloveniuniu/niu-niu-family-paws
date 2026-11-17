export type RouteKind='home'|'services'|'about'|'faqs'|'policy'|'login'|'calendar'|'customers'|'balances'|'settings'|'personal'|'not-found';
export type AppRoute={kind:RouteKind;path:string;search:string;customerId?:string;petId?:string;bookingId?:string;locationId?:string;locations?:boolean};
export const publicPaths=['/home/','/services/','/about/','/faqs/','/cancellation-policy/'];
const legacy:Record<string,string>={'/login':'/app/sign-in/','/admin':'/app/sign-in/','/house-calendar':'/app/calendar/','/customers':'/app/customers/','/balances':'/app/balances/','/transactions':'/app/balances/','/settings':'/app/settings/','/personal':'/app/account/profile/','/cancellation-policy':'/cancellation-policy/','services':'/services/','about':'/about/','faq':'/faqs/'};
export function canonicalUrl(input:string){const url=new URL(input,'https://family-paws.invalid');const hash=url.hash.slice(1),[old,query]=hash.split('?');if(legacy[old])return legacy[old]+(query?'?'+query:'');const path=url.pathname==='/'?'/':url.pathname.replace(/\/+$/,'')+'/';return (path==='/'?'/home/':path==='/app/'?'/app/calendar/':path)+url.search+url.hash;}
export function parseRoute(input:string):AppRoute{
 const url=new URL(canonicalUrl(input),'https://family-paws.invalid'),path=url.pathname,base={path,search:url.search};
 const simple:Record<string,RouteKind>={'/':'home','/home/':'home','/services/':'services','/about/':'about','/faqs/':'faqs','/cancellation-policy/':'policy','/app/sign-in/':'login','/app/':'calendar','/app/calendar/':'calendar','/app/customers/':'customers','/app/balances/':'balances','/app/settings/':'settings','/app/account/profile/':'personal'};
 if(simple[path])return {...base,kind:simple[path]};
 const id='([A-Za-z0-9_-]+)';let match=path.match(new RegExp('^/app/calendar/bookings/'+id+'/$'));if(match)return {...base,kind:'calendar',bookingId:match[1]};
 match=path.match(new RegExp('^/app/customers/'+id+'/(?:pets/'+id+'/)?$'));if(match)return {...base,kind:'customers',customerId:match[1],petId:match[2]};
 match=path.match(new RegExp('^/app/settings/locations/(?:'+id+'/)?$'));if(match)return {...base,kind:'settings',locations:true,locationId:match[1]};
 return {...base,kind:'not-found'};
}
export function safeReturnTo(value:string|null){if(!value||!value.startsWith('/app/')||value.startsWith('//')||/[\\\r\n]/.test(value))return null;const route=parseRoute(value);return route.kind!=='login'&&route.kind!=='not-found'?canonicalUrl(value):null;}
export const routeUrl=()=>window.location.pathname+window.location.search+window.location.hash;
export function currentRoute(){return parseRoute(routeUrl());}
export function navigate(to:string,replace=false){const url=new URL(to,window.location.origin);if(url.origin!==window.location.origin)return false;const target=canonicalUrl(url.href);if(target===routeUrl())return true;if(!window.dispatchEvent(new CustomEvent('family-paws:before-navigation',{cancelable:true,detail:{to:target}})))return false;const index=(Number(window.history.state?.familyPawsIndex)||0)+(replace?0:1);window.history[replace?'replaceState':'pushState']({...window.history.state,familyPawsIndex:index,familyPawsFrom:replace?window.history.state?.familyPawsFrom:routeUrl()},'',target);window.dispatchEvent(new Event('family-paws:navigation'));return true;}
export function closeRecord(parent:string){if(window.history.state?.familyPawsFrom===parent)window.history.back();else navigate(parent,true);}
export function updateQuery(values:Record<string,string|null|undefined>){const params=new URLSearchParams(location.search);for(const[key,value]of Object.entries(values)){if(value===null||value===undefined||value===''||value==='all')params.delete(key);else params.set(key,value);}return navigate(location.pathname+(params.size?'?'+params:''),true);}
