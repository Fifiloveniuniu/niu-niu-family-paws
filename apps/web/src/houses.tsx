import React from 'react';
import {useTranslation} from 'react-i18next';
import HouseLayout from './house-layout';
import {houseApi as api,HouseError} from './house-api';
import Modal from './modal';
import Icon from './icons';
import UnsavedChanges,{confirmDiscardChanges} from './unsaved-changes';
import type {components} from '../../../packages/contracts/generated';
type House=components['schemas']['House'];
type HouseWrite=components['schemas']['HouseWrite'];
const en={title:'Houses',add:'Add house',edit:'Edit house',name:'House name',address:'Address (optional)',timezone:'Time zone',zoneHint:'Choose the house’s local time zone. Future stays will use this time zone.',zoneExample:'For example: America/Los_Angeles',filter:'Show house',all:'All houses',empty:'No houses yet. Add your first house.',save:'Save house',cancel:'Cancel',loading:'Loading houses…',saving:'Saving…',retry:'Try again',error:'Couldn’t load or save houses. Please try again.',conflict:'This house changed elsewhere. Your draft is kept. Close it and reopen the latest house before saving.',denied:'Administrator access is required. Please sign in again.',invalid:'Check the house name and select a valid time zone.',saved:'House saved.',noAddress:'No address added',intro:'Choose a house and room to manage its capacity.',choose:'Choose a time zone',openMap:'Open map'};
const zh:typeof en={title:'房屋',add:'添加房屋',edit:'编辑房屋',name:'房屋名称',address:'地址（选填）',timezone:'时区',zoneHint:'请选择房屋所在地的时区。之后的寄养安排将使用该时区。',zoneExample:'例如：America/Los_Angeles',filter:'显示房屋',all:'所有房屋',empty:'暂无房屋，请添加第一处房屋。',save:'保存房屋',cancel:'取消',loading:'正在加载房屋…',saving:'正在保存…',retry:'重试',error:'未能加载或保存房屋，请重试。',conflict:'房屋资料已在其他页面更新。草稿仍保留，请关闭后重新打开最新资料再修改。',denied:'需要管理员权限，请重新登录。',invalid:'请检查房屋名称，并选择有效的时区。',saved:'房屋已保存。',noAddress:'尚未填写地址',intro:'选择房屋及房间，管理容量设置。',choose:'请选择时区',openMap:'打开地图'};
export default function Houses(){
  const {i18n}=useTranslation(),t=i18n.language==='zh'?zh:en;
  const [items,setItems]=React.useState<House[]>([]),[selected,setSelected]=React.useState('');
  const [loading,setLoading]=React.useState(true),[saving,setSaving]=React.useState(false),[uncertain,setUncertain]=React.useState(false);
  const [error,setError]=React.useState<keyof typeof en|null>(null),[saved,setSaved]=React.useState(false);
  const [editor,setEditor]=React.useState<{id:string;input:HouseWrite}|null>(null);
  const firstSelection=React.useRef(true);
  const baseline=React.useRef(''),form=React.useRef<HTMLFormElement>(null),generation=React.useRef(0),alive=React.useRef(true);
  const zones=React.useMemo(()=>['UTC',...Intl.supportedValuesOf('timeZone')],[]);
  const fieldId=React.useId();
  function report(error:unknown){const status=error instanceof HouseError?error.status:0;setError(status===409?'conflict':status===401||status===403?'denied':status===400?'invalid':'error');}
  async function load(){
    const request=++generation.current;setLoading(true);setError(null);
    try{const result=await api<{items:House[]}>();if(alive.current&&request===generation.current){setItems(result.items);if(firstSelection.current){setSelected(result.items[0]?.id??'');firstSelection.current=false;}}}
    catch(error){if(alive.current&&request===generation.current)report(error);}
    finally{if(alive.current&&request===generation.current)setLoading(false);}
  }
  React.useEffect(()=>{alive.current=true;void load();return()=>{alive.current=false;++generation.current;};},[]);
  function close(){if(!saving&&!uncertain&&confirmDiscardChanges(i18n.language,form.current)){setEditor(null);setError(null);if(error==='conflict')void load();}}
  function open(house?:House){
    if(!confirmDiscardChanges(i18n.language,form.current))return;
    const input:HouseWrite=house?{name:house.name,address:house.address,timezone:house.timezone,version:house.version}:{name:'',address:'',timezone:'',version:0};
    baseline.current=JSON.stringify(input);setEditor({id:house?.id??crypto.randomUUID(),input});setError(null);setSaved(false);setUncertain(false);
  }
  async function save(event:React.FormEvent){
    event.preventDefault();if(!editor||saving)return;setSaving(true);setError(null);setSaved(false);
    try{
      const house=await api<House>('/'+editor.id,editor.input);if(!alive.current)return;
      ++generation.current;setLoading(false);setItems(previous=>[house,...previous.filter(h=>h.id!==house.id)].sort((a,b)=>a.name.localeCompare(b.name)));
      setSelected(house.id);setEditor(null);setUncertain(false);setSaved(true);
    }catch(error){if(alive.current){report(error);setUncertain(!(error instanceof HouseError)||error.status>=500);}}
    finally{if(alive.current)setSaving(false);}
  }
  const blocked=saving||uncertain;
  return <section className="customer-section" aria-label={t.title}>
    <div className="customer-heading"><h2 id={fieldId+'-title'}>{t.title}</h2><button className={selected?"language":"button"} disabled={blocked} onClick={()=>open()}>{t.add}</button></div>
    <p className="customer-intro">{t.intro}</p>
    {saved&&<p role="status">{t.saved}</p>}
    {error&&!editor&&<p role="alert">{t[error]}</p>}
    {loading&&<p role="status">{t.loading}</p>}
    <HouseLayout key={selected||'empty'} house={items.find(house=>house.id===selected)??null} navigation={<>
      {!!items.length&&<div className="house-picker"><label className="house-filter">{t.filter}<select value={selected} disabled={blocked} onChange={event=>setSelected(event.target.value)}>{items.map(house=><option key={house.id} value={house.id}>{house.name}</option>)}</select></label><button className="icon-button" title={t.edit} aria-label={`${t.edit}: ${items.find(house=>house.id===selected)?.name??''}`} disabled={blocked} onClick={()=>open(items.find(house=>house.id===selected))}><Icon name="edit"/></button></div>}
      {!loading&&!items.length&&!error&&<p>{t.empty}</p>}
    </>}/>
    {error==='error'&&!editor&&<button className="language" disabled={loading} onClick={()=>void load()}>{t.retry}</button>}
    {editor&&<Modal title={editor.input.version?t.edit:t.add} disabled={blocked} onClose={close}><form ref={form} className="customer-form" onSubmit={event=>void save(event)}>
      <UnsavedChanges active={JSON.stringify(editor.input)!==baseline.current||saving||uncertain}/>
      {error&&<p role="alert">{t[error]}</p>}
      <fieldset disabled={blocked}>
        <label>{t.name}<input required maxLength={120} value={editor.input.name} onChange={event=>setEditor({...editor,input:{...editor.input,name:event.target.value}})}/></label>
        <label>{t.address}<input maxLength={500} autoComplete="street-address" value={editor.input.address} onChange={event=>setEditor({...editor,input:{...editor.input,address:event.target.value}})}/></label>
        <label>{t.timezone}<input required list={fieldId+'-zones'} aria-describedby={fieldId+'-zone-hint'} placeholder={t.zoneExample} maxLength={100} value={editor.input.timezone} onChange={event=>setEditor({...editor,input:{...editor.input,timezone:event.target.value}})}/></label>
        <datalist id={fieldId+'-zones'}>{zones.map(zone=><option key={zone} value={zone}/>)}</datalist>
        <p id={fieldId+'-zone-hint'} className="customer-intro">{t.zoneHint}</p>
      </fieldset>
      <div className="portal-actions"><button className="button" type="submit" disabled={saving||error==='conflict'||error==='denied'}>{saving?t.saving:uncertain?t.retry:t.save}</button><button className="language" type="button" disabled={blocked} onClick={close}>{t.cancel}</button></div>
    </form></Modal>}
  </section>;
}
