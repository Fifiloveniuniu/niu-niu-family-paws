import React from 'react';
import {canonicalUrl,parseRoute,routeUrl,navigate} from './routing';
import {confirmDiscardChanges} from './unsaved-changes';
export default function useRoute(language:string,initialPath='/'){
 const [route,setRoute]=React.useState(()=>parseRoute(typeof window==='undefined'?initialPath:routeUrl()));
 React.useEffect(()=>{
  let previous=canonicalUrl(routeUrl()),index=Number(history.state?.familyPawsIndex)||0,reverting=false;
  history.replaceState({...history.state,familyPawsIndex:index},'',previous);
  const allowed=(next:string)=>{if(!previous.startsWith('/app/'))return true;const keep=next.startsWith('/app/')&&!next.startsWith('/app/sign-in/'),target=parseRoute(next);if(keep&&target.customerId&&target.customerId!==parseRoute(previous).customerId&&!confirmDiscardChanges(language,document.querySelector('[data-customer-workspace]')))return false;return confirmDiscardChanges(language,undefined,keep);};
  const before=(event:Event)=>{if(!allowed((event as CustomEvent<{to:string}>).detail.to))event.preventDefault();};
  const accept=()=>{previous=canonicalUrl(routeUrl());index=Number(history.state?.familyPawsIndex)||0;setRoute(parseRoute(previous));};
  const pop=()=>{if(reverting){reverting=false;return;}const next=canonicalUrl(routeUrl());if(next===previous)return;const nextIndex=typeof history.state?.familyPawsIndex==='number'?history.state.familyPawsIndex:index-1;if(!allowed(next)){const delta=index-nextIndex;if(delta){reverting=true;history.go(delta);}else history.replaceState({...history.state,familyPawsIndex:index},'',previous);return;}history.replaceState({...history.state,familyPawsIndex:nextIndex},'',next);accept();};
  const hash=()=>{if(reverting)return;const next=canonicalUrl(routeUrl());if(next===previous)return;if(!allowed(next)){history.replaceState({...history.state,familyPawsIndex:index},'',previous);return;}history.replaceState({...history.state,familyPawsIndex:index+1},'',next);accept();};
  const click=(event:MouseEvent)=>{if(event.defaultPrevented||event.button!==0||event.metaKey||event.ctrlKey||event.altKey||event.shiftKey)return;if(!(event.target instanceof Element))return;const anchor=event.target.closest<HTMLAnchorElement>('a[href]');if(!anchor||anchor.target||anchor.hasAttribute('download'))return;const url=new URL(anchor.href,location.href);if(url.origin!==location.origin)return;if(url.pathname===location.pathname&&url.search===location.search&&url.hash&&!url.hash.startsWith('#/')&&!['#services','#about','#faq'].includes(url.hash))return;event.preventDefault();navigate(url.href);};
  window.addEventListener('family-paws:before-navigation',before);window.addEventListener('family-paws:navigation',accept);window.addEventListener('popstate',pop);window.addEventListener('hashchange',hash);document.addEventListener('click',click);
  return()=>{window.removeEventListener('family-paws:before-navigation',before);window.removeEventListener('family-paws:navigation',accept);window.removeEventListener('popstate',pop);window.removeEventListener('hashchange',hash);document.removeEventListener('click',click);};
 },[language]);
 return route;
}
