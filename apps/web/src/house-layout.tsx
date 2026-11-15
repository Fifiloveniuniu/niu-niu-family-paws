import React from 'react';
import {useTranslation} from 'react-i18next';
import Modal from './modal';
import Icon from './icons';
import UnsavedChanges,{confirmDiscardChanges} from './unsaved-changes';
import {houseApi,HouseError} from './house-api';
import type {components} from '../../../packages/contracts/generated';
type Layout=components['schemas']['HouseLayout'];
type Room=components['schemas']['Room'];
type Space=components['schemas']['Space'];
type Species='cat'|'dog'|'rabbit';
type Draft={kind:'room'|'space';id:string;roomId:string;name:string;closed:boolean;version:number;capacity:string;species:Species[];sharing:Space['sharing']|'';weight:string;unit:'kg'|'lb'};
const en={title:'Rooms & spaces',intro:'Choose a room or space to edit its rules.',addRoom:'Add room',editRoom:'Edit room',addSpace:'Add space',editSpace:'Edit space',roomName:'Room name',spaceName:'Space name',empty:'No rooms yet. Add a room to start your house map.',emptyRoom:'No spaces yet.',capacity:'Pet capacity',species:'Allowed pets',sharing:'Sharing',choose:'Choose a sharing rule',individual:'One pet',household:'Same household only',compatible:'Shared · admin assigns',weight:'Maximum weight per pet (optional)',unit:'Weight unit',closedRoom:'Close this room',closedSpace:'Close this space',closed:'Closed',open:'Configured',save:'Save',cancel:'Cancel',loading:'Loading rooms…',saving:'Saving…',retry:'Try again',error:'Couldn’t load or save the layout. Please try again.',invalid:'Enter a name, capacity, allowed pets and sharing rule. Any weight limit must be greater than zero.',conflict:'This configuration changed elsewhere. Your draft is kept. Close and reopen it to edit the latest version.',denied:'Administrator access is required. Please sign in again.',missing:'This house or room is no longer available. Return to Houses and choose it again.',saved:'Layout saved.',cat:'Cat',dog:'Dog',rabbit:'Rabbit',upTo:'Up to',pets:'pets'};
const zh:typeof en={title:'房间与空间',intro:'选择房间或空间，修改使用规则。',addRoom:'添加房间',editRoom:'编辑房间',addSpace:'添加空间',editSpace:'编辑空间',roomName:'房间名称',spaceName:'空间名称',empty:'暂无房间。添加房间，开始设置房屋地图。',emptyRoom:'尚未添加空间。',capacity:'宠物容量',species:'允许的宠物',sharing:'共用规则',choose:'请选择共用规则',individual:'单只宠物',household:'仅限同一家庭',compatible:'可共用 · 管理员安排',weight:'每只宠物的体重上限（选填）',unit:'体重单位',closedRoom:'关闭此房间',closedSpace:'关闭此空间',closed:'已关闭',open:'已配置',save:'保存',cancel:'取消',loading:'正在加载房间…',saving:'正在保存…',retry:'重试',error:'未能加载或保存地图，请重试。',invalid:'请填写名称、容量、允许的宠物及共用规则，体重上限须大于零。',conflict:'配置已在其他页面更新。草稿仍保留，请关闭后重新打开最新配置再修改。',denied:'需要管理员权限，请重新登录。',missing:'此房屋或房间已不可用，请返回房屋列表重新选择。',saved:'地图已保存。',cat:'猫',dog:'狗',rabbit:'兔子',upTo:'不超过',pets:'只宠物'};
export default function HouseLayout({houseId}:{houseId:string}){
  const {i18n}=useTranslation(),t=i18n.language==='zh'?zh:en;
  const [layout,setLayout]=React.useState<Layout>({rooms:[]}),[loading,setLoading]=React.useState(true),[saving,setSaving]=React.useState(false),[uncertain,setUncertain]=React.useState(false);
  const [editor,setEditor]=React.useState<Draft|null>(null),[error,setError]=React.useState<keyof typeof en|null>(null),[saved,setSaved]=React.useState(false);
  const alive=React.useRef(true),generation=React.useRef(0),baseline=React.useRef(''),form=React.useRef<HTMLFormElement>(null);
  const blocked=saving||uncertain;
  function report(error:unknown){const status=error instanceof HouseError?error.status:0;setError(status===409?'conflict':status===403||status===401?'denied':status===404?'missing':status===400?'invalid':'error');}
  async function load(){const request=++generation.current;setLoading(true);setError(null);try{const result=await houseApi<Layout>('/'+houseId+'/layout');if(alive.current&&request===generation.current)setLayout(result);}catch(error){if(alive.current&&request===generation.current)report(error);}finally{if(alive.current&&request===generation.current)setLoading(false);}}
  React.useEffect(()=>{alive.current=true;void load();return()=>{alive.current=false;++generation.current;};},[houseId]);
  function open(kind:'room'|'space',room?:Room,space?:Space){
    if(!confirmDiscardChanges(i18n.language,form.current))return;
    const value=kind==='room'?room:space;
    const next:Draft={kind,id:value?.id??crypto.randomUUID(),roomId:room?.id??'',name:value?.name??'',closed:value?.closed??false,version:value?.version??0,capacity:space?String(space.capacity):'',species:space?[...space.species]:[],sharing:space?.sharing??'',weight:space?.weightLimit?String(space.weightLimit.value):'',unit:space?.weightLimit?.unit??'kg'};
    baseline.current=JSON.stringify(next);setEditor(next);setError(null);setSaved(false);setUncertain(false);
  }
  function close(){if(!blocked&&confirmDiscardChanges(i18n.language,form.current)){setEditor(null);setError(null);if(error==='conflict')void load();}}
  async function save(event:React.FormEvent){
    event.preventDefault();if(!editor||saving)return;
    if(editor.kind==='space'&&(!editor.species.length||!editor.sharing||!Number.isInteger(Number(editor.capacity))||Number(editor.capacity)<1||(editor.weight!==''&&(!Number.isFinite(Number(editor.weight))||Number(editor.weight)<=0)))){setError('invalid');return;}
    setSaving(true);setError(null);setSaved(false);
    const base={name:editor.name,closed:editor.closed,version:editor.version};
    const body=editor.kind==='room'?base:{...base,capacity:Number(editor.capacity),species:editor.species,sharing:editor.sharing,...(editor.weight!==''?{weightLimit:{value:Number(editor.weight),unit:editor.unit}}:{})};
    const path='/'+houseId+'/rooms/'+(editor.kind==='room'?editor.id:editor.roomId+'/spaces/'+editor.id);
    try{await houseApi(path,body);if(!alive.current)return;setEditor(null);setUncertain(false);setSaved(true);void load();}
    catch(error){if(alive.current){report(error);setUncertain(!(error instanceof HouseError)||error.status>=500);}}
    finally{if(alive.current)setSaving(false);}
  }
  const set=(change:Partial<Draft>)=>editor&&setEditor({...editor,...change});
  return <section className="house-layout" aria-label={t.title}>
    <div className="customer-heading"><h2>{t.title}</h2><button className="button" disabled={blocked} onClick={()=>open('room')}>{t.addRoom}</button></div><p className="customer-intro">{t.intro}</p>
    {loading&&<p role="status">{t.loading}</p>}{saved&&<p role="status">{t.saved}</p>}{error&&!editor&&<p role="alert">{t[error]}</p>}
    {!loading&&!error&&!layout.rooms.length&&<p>{t.empty}</p>}
    <div className="room-map">{layout.rooms.map(({room,spaces})=><article className={'room-card'+(room.closed?' room-closed':'')} key={room.id} aria-label={room.name}>
      <div className="room-heading"><h3>{room.name}</h3><button className="icon-button" aria-label={`${t.editRoom}: ${room.name}`} title={t.editRoom} disabled={blocked} onClick={()=>open('room',room)}><Icon name="edit"/></button></div>
      {room.closed&&<p className="room-status">{t.closed}</p>}
      <div className="space-map">{spaces.map(space=><button className={'space-card'+(room.closed||space.closed?' space-closed':'')} key={space.id} disabled={blocked} aria-label={`${t.editSpace}: ${space.name}`} title={t.editSpace} onClick={()=>open('space',room,space)}>
        <strong>{space.name}</strong><span>{room.closed||space.closed?t.closed:t.open}</span><span>{t.capacity}: {space.capacity}</span><span>{space.species.map(species=>t[species]).join(' · ')}</span><span>{space.sharing==='individual'?t.individual:space.sharing==='same-household'?t.household:t.compatible}</span>{space.weightLimit&&<span>{t.upTo} {space.weightLimit.value} {space.weightLimit.unit}</span>}
      </button>)}</div>
      {!spaces.length&&<p className="customer-intro">{t.emptyRoom}</p>}<button className="language" disabled={blocked} onClick={()=>open('space',room)}>{t.addSpace}</button>
    </article>)}</div>
    {error==='error'&&!editor&&<button className="language" disabled={loading} onClick={()=>void load()}>{t.retry}</button>}
    {editor&&<Modal title={editor.kind==='room'?(editor.version?t.editRoom:t.addRoom):(editor.version?t.editSpace:t.addSpace)} disabled={blocked} onClose={close}><form ref={form} className="customer-form" onSubmit={event=>void save(event)}>
      <UnsavedChanges active={JSON.stringify(editor)!==baseline.current||saving||uncertain}/>{error&&<p role="alert">{t[error]}</p>}
      <fieldset disabled={blocked}>
        <label>{editor.kind==='room'?t.roomName:t.spaceName}<input required maxLength={120} value={editor.name} onChange={event=>set({name:event.target.value})}/></label>
        {editor.kind==='space'&&<>
          <label>{t.sharing}<select required value={editor.sharing} onChange={event=>set({sharing:event.target.value as Draft['sharing'],...(event.target.value==='individual'?{capacity:'1'}:{})})}><option value="" disabled>{t.choose}</option><option value="individual">{t.individual}</option><option value="same-household">{t.household}</option><option value="compatible">{t.compatible}</option></select></label>
          <label>{t.capacity}<input required type="number" min={1} max={1000} step={1} readOnly={editor.sharing==='individual'} value={editor.capacity} onChange={event=>set({capacity:event.target.value})}/></label>
          <fieldset className="space-species"><legend>{t.species}</legend>{(['cat','dog','rabbit'] as const).map(species=><label key={species}><input type="checkbox" checked={editor.species.includes(species)} onChange={event=>set({species:event.target.checked?[...editor.species,species]:editor.species.filter(value=>value!==species)})}/>{t[species]}</label>)}</fieldset>
          <label>{t.weight}<input type="number" min={0.001} max={1000000} step="any" value={editor.weight} onChange={event=>set({weight:event.target.value})}/></label>
          <label>{t.unit}<select value={editor.unit} onChange={event=>set({unit:event.target.value as 'kg'|'lb'})}><option value="kg">kg</option><option value="lb">lb</option></select></label>
        </>}
        <label className="space-check"><input type="checkbox" checked={editor.closed} onChange={event=>set({closed:event.target.checked})}/>{editor.kind==='room'?t.closedRoom:t.closedSpace}</label>
      </fieldset>
      <div className="portal-actions"><button className="button" type="submit" disabled={saving||error==='conflict'||error==='denied'||error==='missing'}>{saving?t.saving:uncertain?t.retry:t.save}</button><button className="language" type="button" disabled={blocked} onClick={close}>{t.cancel}</button></div>
    </form></Modal>}
  </section>;
}
