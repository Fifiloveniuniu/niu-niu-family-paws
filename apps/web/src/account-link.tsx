import React from 'react';
import {useTranslation} from 'react-i18next';
import {auth} from './auth-client';
import type {components} from '../../../packages/contracts/generated';
type State = components['schemas']['LinkState'];
const en = {
  title:'Link a Google account', intro:'For an existing customer who has not created a personal profile yet. Give the code to the customer privately, then verify their identity before approving.',
  generate:'Generate linking code', regenerate:'Replace linking code', once:'This code is shown once. Share it privately. It expires in 24 hours; a replacement invalidates the previous code and request.',
  refresh:'Check status', approve:'Approve account link', reject:'Reject request', cancel:'Cancel linking code',
  verify:'Verify that this Google email belongs to this customer before approving. Approval gives this account access to the customer’s existing profile, pets and private photos.',
  email:'Verified Google email', error:'Couldn’t complete account linking. Check the status and try again. The code may be expired, replaced or already used, or the account may already have a profile.',
  confirm:'Have you verified this customer and Google email? Approve access to their existing profile, pets and private photos?',
  replace:'Replace this code and cancel any pending request?', busy:'Please wait…',
  requestTitle:'Already registered with us?', requestIntro:'Ask an administrator for a linking code to connect your existing customer and pet records. Submit it here, then wait for the administrator to verify and approve your account. No records are shared before approval.',
  code:'Linking code', submit:'Request account link', pending:'Request submitted. An administrator needs to verify and approve your Google account.',
  note:'If you already saved a separate personal profile, ask the administrator for help. The website will not merge or overwrite records automatically.',
  status:'Status', expires:'Expires', none:'No linking request', open:'Waiting for customer', requested:'Waiting for administrator approval', approved:'Account linked', rejected:'Request rejected', cancelled:'Code cancelled or replaced', expired:'Code expired',
};
const zh:typeof en = {
  title:'关联 Google 账号', intro:'适用于已有客户、但尚未创建个人资料的账号。请私下把关联码交给客户，核实身份后再批准申请。',
  generate:'生成关联码', regenerate:'重新生成关联码', once:'关联码只显示这一次，请私下交给客户。24 小时内有效；重新生成后，旧码及其待审核申请会失效。',
  refresh:'查看最新状态', approve:'批准关联', reject:'拒绝申请', cancel:'取消关联码',
  verify:'请先核实此 Google 邮箱属于这位客户。批准后，该账号即可查看和编辑原有个人资料、宠物及私密照片。',
  email:'已验证的 Google 邮箱', error:'关联未完成，请查看最新状态后重试。关联码可能已过期、被替换或使用，账号也可能已经有个人资料。',
  confirm:'已核实这位客户和 Google 邮箱吗？批准后，该账号将能访问原有个人资料、宠物及私密照片。',
  replace:'确定重新生成吗？旧关联码和待审核申请将失效。', busy:'请稍候…',
  requestTitle:'之前已登记过资料？', requestIntro:'请向管理员索取关联码，用来关联已有客户和宠物资料。在这里提交后，等待管理员核实并批准。批准前，账号无法访问原资料。',
  code:'关联码', submit:'申请关联账号', pending:'申请已提交，请等待管理员核实您的 Google 账号并批准。',
  note:'如果已经另存了一份个人资料，请联系管理员处理。网站不会自动合并或覆盖两份资料。',
  status:'状态', expires:'有效期至', none:'暂无关联申请', open:'等待客户提交', requested:'等待管理员批准', approved:'账号已关联', rejected:'申请已被拒绝', cancelled:'关联码已取消或替换', expired:'关联码已过期',
};
async function api<T>(path:string,method='GET',body?:unknown):Promise<T> {
  const user=auth.currentUser;if(!user)throw new Error('Sign in required');
  const response=await fetch('/api'+path,{method,cache:'no-store',headers:{Authorization:`Bearer ${await user.getIdToken()}`,...(body?{'Content-Type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{})});
  if(!response.ok)throw new Error('Account link failed');return response.json();
}
export function AdminAccountLink({customerId,onLinked}:{customerId:string;onLinked:()=>void}) {
  const {i18n}=useTranslation(),t=i18n.language==='zh'?zh:en;
  const [state,setState]=React.useState<State|null>(null),[code,setCode]=React.useState(''),[busy,setBusy]=React.useState(false),[error,setError]=React.useState(false);
  const alive=React.useRef(true),generation=React.useRef(0),path=`/customers/${customerId}/account-link`;
  async function run(action:(current:()=>boolean)=>Promise<void>){const id=++generation.current,current=()=>alive.current&&id===generation.current;setBusy(true);setError(false);try{await action(current);}catch{if(current())setError(true);}finally{if(current())setBusy(false);}}
  async function load(current:()=>boolean){const next=await api<State>(path);if(current())setState(next);}
  React.useEffect(()=>{alive.current=true;void run(load);return()=>{alive.current=false;};},[customerId]);
  async function issue(){if(state && ['open','requested'].includes(state.status) && !window.confirm(t.replace))return;setCode('');await run(async current=>{const next=await api<{code:string;state:State}>(path,'POST',{});if(current()){setState(next.state);setCode(next.code);}});}
  async function decide(action:'approve'|'reject'|'cancel'){if(!state || (action==='approve'&&!window.confirm(t.confirm)))return;await run(async current=>{const next=await api<State>(path,'PUT',{action,version:state.version,customerVersion:state.customerVersion});if(current()){setState(next);setCode('');if(action==='approve')onLinked();}});}
  return <section className="customer-section" aria-label={t.title} aria-busy={busy}><h3>{t.title}</h3><p>{t.intro}</p>
    {error&&<p role="alert">{t.error}</p>}{busy&&<p role="status">{t.busy}</p>}
    {state&&<><h4>{state.customerName}</h4><p>{t.status}: <strong>{t[state.status]}</strong></p>{state.expiresAt&&<p>{t.expires}: {new Date(state.expiresAt).toLocaleString(i18n.language==='zh'?'zh-CN':'en-US')}</p>}
      {code&&<div className="unsaved-notice"><p>{t.once}</p><code className="link-code">{code}</code></div>}
      {state.requestedEmail&&<p className="profile-identity"><span>{t.email}</span><strong>{state.requestedEmail}</strong></p>}
      {state.status==='requested'&&<><p>{t.verify}</p><div className="portal-actions"><button className="button" disabled={busy} onClick={()=>void decide('approve')}>{t.approve}</button><button className="language" disabled={busy} onClick={()=>void decide('reject')}>{t.reject}</button></div></>}
      <div className="portal-actions">{state.status!=='approved'&&<button className="language" disabled={busy} onClick={()=>void issue()}>{state.status==='none'?t.generate:t.regenerate}</button>}{['open','requested'].includes(state.status)&&<button className="language" disabled={busy} onClick={()=>void decide('cancel')}>{t.cancel}</button>}<button className="language" disabled={busy} onClick={()=>void run(load)}>{t.refresh}</button></div>
    </>}
  </section>;
}
export function AccountLinkRequest({onLinked,onPending}:{onLinked:()=>void;onPending:(pending:boolean)=>void}) {
  const {i18n}=useTranslation(),t=i18n.language==='zh'?zh:en;
  const [code,setCode]=React.useState(''),[status,setStatus]=React.useState('none'),[busy,setBusy]=React.useState(false),[error,setError]=React.useState(false);
  const alive=React.useRef(true),generation=React.useRef(0);
  async function run(submit=false){const id=++generation.current,current=()=>alive.current&&id===generation.current;setBusy(true);setError(false);try{const next=await api<{status:string}>('/account-link',submit?'POST':'GET',submit?{code}:undefined);if(current()){setStatus(next.status);onPending(next.status==='requested');if(submit)setCode('');if(next.status==='approved')onLinked();}}catch{if(current())setError(true);}finally{if(current())setBusy(false);}}
  React.useEffect(()=>{alive.current=true;void run();return()=>{alive.current=false;};},[]);
  return <section className="customer-form" aria-label={t.requestTitle}><h3>{t.requestTitle}</h3><p>{t.requestIntro}</p><p>{t.note}</p>
    {error&&<p role="alert">{t.error}</p>}{status!=='none'&&<p role="status">{t[status as keyof typeof en] ?? t.none}</p>}
    {status==='requested'?<p>{t.pending}</p>:status!=='approved'&&<form onSubmit={e=>{e.preventDefault();void run(true);}}><label>{t.code}<input autoComplete="off" spellCheck={false} minLength={32} maxLength={80} required value={code} onChange={e=>setCode(e.target.value)}/></label><button className="button" disabled={busy} type="submit">{t.submit}</button></form>}
    <button className="language" disabled={busy} onClick={()=>void run()}>{busy?t.busy:t.refresh}</button>
  </section>;
}
