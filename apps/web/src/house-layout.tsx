import React from 'react';
import {useTranslation} from 'react-i18next';
import Modal from './modal';
import Icon from './icons';
import UnsavedChanges,{confirmDiscardChanges} from './unsaved-changes';
import {houseApi,HouseError} from './house-api';
import {petTypes,validCapacity,maximumPets,type PetType} from '../../../packages/contracts/room-capacity';
import type {components} from '../../../packages/contracts/generated';
type House=components['schemas']['House'];
type Room=components['schemas']['Room'];
type Layout=components['schemas']['HouseLayout'];
type Draft={id:string;name:string;closed:boolean;version:number;capacity:string;costs:Record<PetType,string>};
const en={rooms:'Rooms',details:'Room details',add:'Add room',edit:'Edit room',name:'Room name',empty:'No rooms yet. Add your first room.',noHouse:'Add a house to start configuring rooms.',select:'Choose a room to see its capacity.',capacity:'Total room capacity',perPet:'Capacity used per pet',hint:'Leave a pet type blank if it cannot use this room.',units:'units',notAllowed:'Not allowed',maximum:'Maximum if the room holds only this pet type',emptyRoom:'Based on an otherwise empty room.',closed:'Closed',close:'Close this room',save:'Save room',cancel:'Cancel',loading:'Loading rooms…',saving:'Saving…',retry:'Try again',error:'Couldn’t load or save rooms. Please try again.',invalid:'Enter a name, a positive room capacity, and a positive capacity cost for at least one pet type. Use up to three decimal places.',conflict:'This room changed elsewhere. Your draft is kept. Close and reopen it to edit the latest version.',denied:'Administrator access is required. Please sign in again.',missing:'This house is no longer available. Choose it again from Houses.',saved:'Room saved.',cat:'Cat',dog:'Dog',rabbit:'Rabbit',unset:'Capacity not set',setup:'Set this room’s total capacity and capacity used per pet to finish its setup.',back:'← Rooms'};
const zh:typeof en={rooms:'房间',details:'房间详情',add:'添加房间',edit:'编辑房间',name:'房间名称',empty:'暂无房间，请添加第一个房间。',noHouse:'请先添加房屋，再配置房间。',select:'选择房间，查看容量设置。',capacity:'房间总容量',perPet:'每只宠物占用的容量',hint:'某种宠物不能使用此房间时，请留空。',units:'容量单位',notAllowed:'不允许',maximum:'房间只接待此类宠物时的数量上限',emptyRoom:'按房间尚未入住宠物计算。',closed:'已关闭',close:'关闭此房间',save:'保存房间',cancel:'取消',loading:'正在加载房间…',saving:'正在保存…',retry:'重试',error:'未能加载或保存房间，请重试。',invalid:'请填写名称、正数总容量，以及至少一种宠物的正数容量用量，最多支持三位小数。',conflict:'房间已在其他页面更新。草稿仍保留，请关闭后重新打开最新资料再修改。',denied:'需要管理员权限，请重新登录。',missing:'此房屋已不可用，请在房屋列表中重新选择。',saved:'房间已保存。',cat:'猫',dog:'狗',rabbit:'兔子',unset:'尚未设置容量',setup:'请设置房间总容量及每只宠物占用的容量，完成房间配置。',back:'← 房间列表'};
export default function RoomCapacity({house,navigation}:{house:House|null;navigation:React.ReactNode}){
  const {i18n}=useTranslation(),t=i18n.language==='zh'?zh:en;
  const [layout,setLayout]=React.useState<Layout>({rooms:[]}),[selected,setSelected]=React.useState('');
  const [loading,setLoading]=React.useState(false),[saving,setSaving]=React.useState(false),[uncertain,setUncertain]=React.useState(false);
  const [editor,setEditor]=React.useState<Draft|null>(null),[error,setError]=React.useState<keyof typeof en|null>(null),[saved,setSaved]=React.useState(false);
  const alive=React.useRef(true),generation=React.useRef(0),baseline=React.useRef(''),form=React.useRef<HTMLFormElement>(null);
  const detail=React.useRef<HTMLElement>(null),directory=React.useRef<HTMLElement>(null);
  const blocked=saving||uncertain,room=layout.rooms.find(value=>value.id===selected);
  const number=(value:number)=>new Intl.NumberFormat(i18n.language==='zh'?'zh-CN':'en',{maximumFractionDigits:3}).format(value);
  function report(error:unknown){const status=error instanceof HouseError?error.status:0;setError(status===409?'conflict':status===403||status===401?'denied':status===404?'missing':status===400?'invalid':'error');}
  async function load(){
    if(!house)return;
    const request=++generation.current;setLoading(true);setError(null);
    try{const result=await houseApi<Layout>('/'+house.id+'/layout');if(alive.current&&request===generation.current){setLayout(result);setSelected(previous=>result.rooms.some(room=>room.id===previous)?previous:result.rooms[0]?.id??'');}}
    catch(error){if(alive.current&&request===generation.current)report(error);}
    finally{if(alive.current&&request===generation.current)setLoading(false);}
  }
  React.useEffect(()=>{alive.current=true;void load();return()=>{alive.current=false;++generation.current;};},[house?.id]);
  function choose(id:string){
    if(!confirmDiscardChanges(i18n.language,form.current))return;
    setSelected(id);setSaved(false);
    if(window.matchMedia('(max-width: 800px)').matches)requestAnimationFrame(()=>{detail.current?.focus({preventScroll:true});detail.current?.scrollIntoView({block:'start',behavior:'instant'});});
  }
  function open(value?:Room){
    if(!confirmDiscardChanges(i18n.language,form.current))return;
    const next:Draft={id:value?.id??crypto.randomUUID(),name:value?.name??'',closed:value?.closed??false,version:value?.version??0,capacity:value?.capacity==null?'':String(value.capacity),costs:{cat:value?.petCosts.cat===undefined?'':String(value.petCosts.cat),dog:value?.petCosts.dog===undefined?'':String(value.petCosts.dog),rabbit:value?.petCosts.rabbit===undefined?'':String(value.petCosts.rabbit)}};
    baseline.current=JSON.stringify(next);setEditor(next);setError(null);setSaved(false);setUncertain(false);
  }
  function close(){if(!blocked&&confirmDiscardChanges(i18n.language,form.current)){setEditor(null);setError(null);if(error==='conflict')void load();}}
  async function save(event:React.FormEvent){
    event.preventDefault();if(!editor||saving||!house)return;
    const types=petTypes.filter(type=>editor.costs[type]!=='');
    if(!editor.name.trim()||!validCapacity(Number(editor.capacity))||!types.length||types.some(type=>!validCapacity(Number(editor.costs[type])))){setError('invalid');return;}
    const body={name:editor.name,closed:editor.closed,version:editor.version,capacity:Number(editor.capacity),petCosts:Object.fromEntries(types.map(type=>[type,Number(editor.costs[type])]))};
    setSaving(true);setError(null);setSaved(false);
    try{const result=await houseApi<Room>('/'+house.id+'/rooms/'+editor.id,body);if(!alive.current)return;++generation.current;setLoading(false);setLayout(previous=>({rooms:[result,...previous.rooms.filter(room=>room.id!==result.id)].sort((a,b)=>a.name.localeCompare(b.name))}));setSelected(result.id);setEditor(null);setUncertain(false);setSaved(true);}
    catch(error){if(alive.current){report(error);setUncertain(!(error instanceof HouseError)||error.status>=500);}}
    finally{if(alive.current)setSaving(false);}
  }
  return <div className="houses-split">
    <aside ref={directory} tabIndex={-1} className="house-directory" aria-label={t.rooms}>
      {navigation}
      {house&&<><div className="room-list-heading"><h3>{t.rooms}</h3><button className="button" disabled={blocked} onClick={()=>open()}>{t.add}</button></div>
        {loading&&<p role="status">{t.loading}</p>}{!loading&&!layout.rooms.length&&!error&&<p className="customer-intro">{t.empty}</p>}
        <ul className="room-list">{layout.rooms.map(value=><li key={value.id}><button className="room-select" aria-label={value.name} aria-pressed={selected===value.id} disabled={blocked} onClick={()=>choose(value.id)}><strong>{value.name}</strong><span>{value.capacity==null?t.unset:`${number(value.capacity)} ${t.units}`}{value.closed?` · ${t.closed}`:''}</span></button></li>)}</ul>
      </>}
      {error&&!editor&&<p role="alert">{t[error]}</p>}{error==='error'&&!editor&&<button className="language" disabled={loading} onClick={()=>void load()}>{t.retry}</button>}
    </aside>
    <section ref={detail} tabIndex={-1} className="room-details" aria-label={t.details}>
      {house&&<header className="room-house-heading"><h2>{house.name}</h2>{house.address&&<p>{house.address}</p>}<p>{house.timezone}</p></header>}
      {saved&&<p role="status">{t.saved}</p>}
      {room?<><button className="back-to-rooms" onClick={()=>{directory.current?.focus({preventScroll:true});directory.current?.scrollIntoView({block:'start',behavior:'instant'});}}>{t.back}</button>
        <div className="room-heading"><h3>{room.name}</h3><button className="icon-button" title={t.edit} aria-label={`${t.edit}: ${room.name}`} disabled={blocked} onClick={()=>open(room)}><Icon name="edit"/></button></div>
        {room.closed&&<p className="room-status">{t.closed}</p>}
        {room.capacity==null?<p>{t.setup}</p>:<>
          <div className="room-capacity-total"><span>{t.capacity}</span><strong>{number(room.capacity)} <small>{t.units}</small></strong></div>
          <h4>{t.perPet}</h4><div className="pet-capacity-rules">{petTypes.map(type=><article key={type} aria-label={t[type]}><h5>{t[type]}</h5>{room.petCosts[type]===undefined?<p>{t.notAllowed}</p>:<><p><strong>{number(room.petCosts[type]!)}</strong> {t.units}</p><p className="capacity-maximum"><span>{t.maximum}</span><strong>{maximumPets(room.capacity!,room.petCosts[type]!)}</strong></p></>}</article>)}</div><p className="customer-intro">{t.emptyRoom}</p>
        </>}
      </>:<p className="room-empty">{house?t.select:t.noHouse}</p>}
    </section>
    {editor&&<Modal title={editor.version?t.edit:t.add} disabled={blocked} onClose={close}><form ref={form} className="customer-form" onSubmit={event=>void save(event)}>
      <UnsavedChanges active={JSON.stringify(editor)!==baseline.current||saving||uncertain}/>{error&&<p role="alert">{t[error]}</p>}
      <fieldset disabled={blocked}>
        <label>{t.name}<input required maxLength={120} value={editor.name} onChange={event=>setEditor({...editor,name:event.target.value})}/></label>
        <label>{t.capacity}<input required type="number" min={0.001} max={1000000} step={0.001} value={editor.capacity} onChange={event=>setEditor({...editor,capacity:event.target.value})}/></label>
        <fieldset className="capacity-inputs"><legend>{t.perPet}</legend><p className="customer-intro">{t.hint}</p><div>{petTypes.map(type=><label key={type}>{t[type]}<input type="number" min={0.001} max={1000000} step={0.001} placeholder={t.notAllowed} value={editor.costs[type]} onChange={event=>setEditor({...editor,costs:{...editor.costs,[type]:event.target.value}})}/></label>)}</div></fieldset>
        <label className="room-check"><input type="checkbox" checked={editor.closed} onChange={event=>setEditor({...editor,closed:event.target.checked})}/>{t.close}</label>
      </fieldset>
      <div className="portal-actions"><button className="button" type="submit" disabled={saving||error==='conflict'||error==='denied'||error==='missing'}>{saving?t.saving:uncertain?t.retry:t.save}</button><button className="language" type="button" disabled={blocked} onClick={close}>{t.cancel}</button></div>
    </form></Modal>}
  </div>;
}
