import React from 'react';
export default function Icon({name}:{name:'edit'|'link'|'close'|'logout'}) {
  return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">{name==='edit'?<><path d="m15 4 5 5M4 20l4-1L20 7a2.1 2.1 0 0 0-3-3L5 16l-1 4Z"/></>:name==='link'?<><path d="m10 13 4-4M8 16l-1 1a4.2 4.2 0 0 1-6-6l4-4a4.2 4.2 0 0 1 6 0M13 8l1-1a4.2 4.2 0 0 1 6 6l-4 4a4.2 4.2 0 0 1-6 0" transform="translate(1 0)"/></>:name==='close'?<path d="m6 6 12 12M6 18 18 6"/>:<><path d="M9 4H5v16h4M10 12h11m-4-4 4 4-4 4"/></>}</svg>;
}
