import React from 'react';
import {useTranslation} from 'react-i18next';
import Modal from './modal';
import UnsavedChanges,{confirmDiscardChanges} from './unsaved-changes';
import {placementIssue,type Placement,type PlacementIssue} from './calendar-placement';
export type PlacementHouse={id:number;name:string;rooms:{id:number;name:string;capacity:string;costs?:Record<string,string>}[]};
export default function AssignmentDialog({houses,stays,pets,anchor,initial,onClose,onApply}:{houses:PlacementHouse[];stays:Placement[];pets:{name:string;species:string}[];anchor:Date;initial?:{house:number;room:number};onClose:()=>void;onApply:(stay:Placement)=>void}){
 const {i18n}=useTranslation(),zh=i18n.language==='zh',t=(en:string,cn:string)=>zh?cn:en;
 const local=(d:Date)=>new Date(d.getTime()-d.getTimezoneOffset()*60000).toISOString().slice(0,16);
 const [pet,setPet]=React.useState(''),[start,setStart]=React.useState(local(new Date(anchor.getTime()+9*3600000))),[end,setEnd]=React.useState(''),[house,setHouse]=React.useState(initial?String(initial.house):''),[room,setRoom]=React.useState(initial?String(initial.room):''),[override,setOverride]=React.useState('');
 const [dirty,setDirty]=React.useState(false),form=React.useRef<HTMLFormElement>(null);
 const selected=pets.find(p=>p.name===pet),offset=(s:string)=>(new Date(s).getTime()-anchor.getTime()-9*3600000)/86400000;
 const begin=offset(start),finish=offset(end),valid=!!selected&&Number.isFinite(begin)&&Number.isFinite(finish)&&finish>begin;
 const issue=(h:PlacementHouse,r:PlacementHouse['rooms'][number])=>!valid?'dates':placementIssue(stays,pet,selected!.species,begin,finish,h.id,r.id,Number(r.capacity),Number(override||r.costs?.[selected!.species]));
 const reasons:Record<Exclude<PlacementIssue,null>,string>={dates:t('Choose a pet and valid times first','请先选择宠物和有效时间'),duplicate:t('Pet already has a stay at this time','该宠物在此时段已有安排'),species:t('Another species is staying here','此时段有其他种类的宠物'),overdue:t('Overdue pickup · availability needs review','接回逾期 · 可用性需核实'),boundary:t('Back-to-back stay · turnover rule needed','相邻时段 · 需确认周转规则'),capacity:t('Not enough capacity for the whole stay','整个托管时段内容量不足'),unconfigured:t('Configure room capacity and pet usage','请配置房间容量和宠物用量')};
 const chosenHouse=houses.find(h=>String(h.id)===house),chosenRoom=chosenHouse?.rooms.find(r=>String(r.id)===room),problem=chosenHouse&&chosenRoom?issue(chosenHouse,chosenRoom):'dates';
 const close=()=>{if(confirmDiscardChanges(i18n.language,form.current))onClose();};
 const invalidate=()=>{setDirty(true);setHouse('');setRoom('');};
 return <Modal title={t('Add pet to room','添加宠物到房间')} onClose={close}><form ref={form} className="hc-settings-form" onSubmit={e=>{e.preventDefault();if(!selected||!chosenHouse||!chosenRoom||problem)return;onApply({id:crypto.randomUUID(),name:pet,species:selected.species,house:chosenHouse.id,room:chosenRoom.id,start:begin,end:finish,status:'upcoming',units:Number(override||chosenRoom.costs?.[selected.species])});}}>
 <UnsavedChanges active={dirty}/><p className="hc-setup-note">{t('Preview only · Browser-local times. No booking, balance or check-in changes.','仅供预览 · 使用浏览器当地时间。不修改预约、余额或入住记录。')}</p>
 <label>{t('Pet','宠物')}<select aria-label={t('Pet','宠物')} required value={pet} onChange={e=>{setPet(e.target.value);invalidate();}}><option value="">{t('Select a pet','选择宠物')}</option>{pets.map(p=><option key={p.name} value={p.name}>{p.name} · {t(p.species,{dog:'狗',cat:'猫',rabbit:'兔'}[p.species]||p.species)}</option>)}</select></label>
 <div className="hc-time-fields"><label>{t('Arrival','到店时间')}<input type="datetime-local" required value={start} onChange={e=>{setStart(e.target.value);invalidate();}}/></label><label>{t('Pickup','接回时间')}<input type="datetime-local" required value={end} onChange={e=>{setEnd(e.target.value);invalidate();}}/></label></div>
 <label>{t('Pet capacity override (optional)','宠物容量覆盖值（选填）')}<input type="number" min="0.01" step="0.01" value={override} placeholder={t('Use room pet-type rule','使用房间宠物种类规则')} onChange={e=>{setOverride(e.target.value);invalidate();}}/></label>
 <label>{t('House','房屋')}<select aria-label={t('House','房屋')} required value={house} onChange={e=>{setHouse(e.target.value);setRoom('');setDirty(true);}}><option value="">{t('Select an available house','选择可用房屋')}</option>{houses.map(h=>{const available=valid&&h.rooms.some(r=>!issue(h,r));return <option key={h.id} value={h.id} disabled={!available}>{h.name}{!available?' · '+t('No suitable rooms','无合适房间'):''}</option>;})}</select></label>
 <label>{t('Room','房间')}<select aria-label={t('Room','房间')} required value={room} onChange={e=>{setRoom(e.target.value);setDirty(true);}}><option value="">{t('Select an available room','选择可用房间')}</option>{chosenHouse?.rooms.map(r=>{const reason=issue(chosenHouse,r);return <option key={r.id} value={r.id} disabled={!!reason}>{r.name}{reason?' · '+reasons[reason]:''}</option>;})}</select></label>
 {valid&&<div className="hc-availability" aria-live="polite"><strong>{t('Availability for the entire stay','整个托管时段的可用性')}</strong>{houses.map(h=><div key={h.id}><p>{h.name}</p>{h.rooms.length?h.rooms.map(r=>{const reason=issue(h,r);return <small key={r.id}>{r.name} · {reason?reasons[reason]:t('Available','可用')}</small>;}):<small>{t('No rooms yet','暂无房间')}</small>}</div>)}</div>}
 <div className="hc-settings-actions"><button className="hc-apply" disabled={!chosenRoom||!!problem}>{t('Add to preview','添加到预览')}</button><button className="hc-manage" type="button" onClick={close}>{t('Cancel','取消')}</button></div>
 </form></Modal>;
}
