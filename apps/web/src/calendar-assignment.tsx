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
 const [week,setWeek]=React.useState(0);
 React.useEffect(()=>setWeek(0),[start]);
 const [dirty,setDirty]=React.useState(false),form=React.useRef<HTMLFormElement>(null);
 const selected=pets.find(p=>p.name===pet),offset=(s:string)=>(new Date(s).getTime()-anchor.getTime()-9*3600000)/86400000;
 const begin=offset(start),finish=offset(end),valid=!!selected&&Number.isFinite(begin)&&Number.isFinite(finish)&&finish>begin;
 const issue=(h:PlacementHouse,r:PlacementHouse['rooms'][number])=>!valid?'dates':placementIssue(stays,pet,selected!.species,begin,finish,h.id,r.id,Number(r.capacity),Number(override||r.costs?.[selected!.species]));
 const reasons:Record<Exclude<PlacementIssue,null>,string>={dates:t('Choose a pet and valid times first','请先选择宠物和有效时间'),duplicate:t('Pet already has a stay at this time','该宠物在此时段已有安排'),species:t('Another species is staying here','此时段有其他种类的宠物'),overdue:t('Overdue pickup · availability needs review','接回逾期 · 可用性需核实'),boundary:t('Back-to-back stay · turnover rule needed','相邻时段 · 需确认周转规则'),capacity:t('Not enough capacity for the whole stay','整个托管时段内容量不足'),unconfigured:t('Configure room capacity and pet usage','请配置房间容量和宠物用量')};
 const chosenHouse=houses.find(h=>String(h.id)===house),chosenRoom=chosenHouse?.rooms.find(r=>String(r.id)===room),problem=chosenHouse&&chosenRoom?issue(chosenHouse,chosenRoom):'dates';
 const calendarStart=Number.isFinite(new Date(start).getTime())?new Date(start):new Date(anchor);
 calendarStart.setHours(0,0,0,0);calendarStart.setDate(calendarStart.getDate()+week*7);
 const days=Array.from({length:7},(_,i)=>{const day=new Date(calendarStart);day.setDate(day.getDate()+i);return day;});
 const locale=zh?'zh-CN':'en-US';
 function candidate(day:Date){
   const arrival=new Date(start),pickup=new Date(end),dayDelta=Math.round((Date.UTC(day.getFullYear(),day.getMonth(),day.getDate())-Date.UTC(arrival.getFullYear(),arrival.getMonth(),arrival.getDate()))/86400000);
   arrival.setDate(arrival.getDate()+dayDelta);pickup.setDate(pickup.getDate()+dayDelta);
   return {arrival,pickup,begin:offset(local(arrival)),finish:offset(local(pickup))};
 }
 function calendarIssue(h:PlacementHouse,r:PlacementHouse['rooms'][number],day:Date):PlacementIssue{
   if(!valid)return 'dates';const stay=candidate(day);
   return placementIssue(stays,pet,selected!.species,stay.begin,stay.finish,h.id,r.id,Number(r.capacity),Number(override||r.costs?.[selected!.species]));
 }
 function choose(h:PlacementHouse,r:PlacementHouse['rooms'][number],day:Date){
   if(calendarIssue(h,r,day))return;const stay=candidate(day);
   setStart(local(stay.arrival));setEnd(local(stay.pickup));setHouse(String(h.id));setRoom(String(r.id));setDirty(true);
 }
 const close=()=>{if(confirmDiscardChanges(i18n.language,form.current))onClose();};
 const invalidate=()=>{setDirty(true);setHouse('');setRoom('');};
 return <Modal className="hc-assignment-dialog" title={t('Add pet to room','添加宠物到房间')} onClose={close}><form ref={form} className="hc-settings-form" onSubmit={e=>{e.preventDefault();if(!selected||!chosenHouse||!chosenRoom||problem)return;onApply({id:crypto.randomUUID(),name:pet,species:selected.species,house:chosenHouse.id,room:chosenRoom.id,start:begin,end:finish,status:'upcoming',units:Number(override||chosenRoom.costs?.[selected.species])});}}>
 <UnsavedChanges active={dirty}/><p className="hc-setup-note">{t('Preview only · Browser-local times. No booking, balance or check-in changes.','仅供预览 · 使用浏览器当地时间。不修改预约、余额或入住记录。')}</p>
 <label>{t('Pet','宠物')}<select aria-label={t('Pet','宠物')} required value={pet} onChange={e=>{setPet(e.target.value);invalidate();}}><option value="">{t('Select a pet','选择宠物')}</option>{pets.map(p=><option key={p.name} value={p.name}>{p.name} · {t(p.species,{dog:'狗',cat:'猫',rabbit:'兔'}[p.species]||p.species)}</option>)}</select></label>
 <div className="hc-time-fields"><label>{t('Arrival','到店时间')}<input type="datetime-local" required value={start} onChange={e=>{setStart(e.target.value);invalidate();}}/></label><label>{t('Pickup','接回时间')}<input type="datetime-local" required value={end} onChange={e=>{setEnd(e.target.value);invalidate();}}/></label></div>
 <section className="hc-schedule-picker" aria-label={t('Room availability calendar','房间可用日历')}>
 <div className="hc-schedule-heading"><h3>{t('Choose a room on the calendar','在日历上选择房间')}</h3><div><button type="button" title={t('Previous week','上一周')} aria-label={t('Previous week','上一周')} onClick={()=>setWeek(week-1)}>‹</button><span>{days[0].toLocaleDateString(locale,{month:'short',day:'numeric'})} – {days[6].toLocaleDateString(locale,{month:'short',day:'numeric'})}</span><button type="button" title={t('Next week','下一周')} aria-label={t('Next week','下一周')} onClick={()=>setWeek(week+1)}>›</button></div></div>
 <p className="hc-setup-note">{valid?t('Each date checks the entire stay starting that day, with the same times and length as above. Dark cells cannot be selected.','每个日期检查从该日开始、时间及长度与上方一致的整个托管时段。深色格不可选。'):t('Select a pet and enter arrival and pickup first. Available starting dates will appear here.','请先选择宠物并填写到店、接回时间，然后在此选择可用开始日期。')}</p>
 <div className="hc-schedule-scroll" tabIndex={0} aria-label={t('Scroll room availability calendar','滚动房间可用日历')}><table className="hc-schedule-table"><thead><tr><th scope="col">{t('House / room','房屋 / 房间')}</th>{days.map(day=><th scope="col" key={day.toISOString()}><small>{day.toLocaleDateString(locale,{weekday:'short'})}</small>{day.toLocaleDateString(locale,{month:'numeric',day:'numeric'})}</th>)}</tr></thead><tbody>{houses.map(h=><React.Fragment key={h.id}><tr className="hc-schedule-house"><th scope="rowgroup" colSpan={8}>{h.name}</th></tr>{!h.rooms.length&&<tr><td colSpan={8}>{t('No rooms yet','暂无房间')}</td></tr>}{h.rooms.map(r=><tr key={r.id}><th scope="row">{r.name}</th>{days.map(day=>{const reason=calendarIssue(h,r,day),picked=String(h.id)===house&&String(r.id)===room&&day.toDateString()===new Date(start).toDateString();const explanation=reason?reasons[reason]:t('Available','可用');return <td key={day.toISOString()}><button type="button" className={'hc-schedule-cell '+(!valid?'pending':reason?'blocked':picked?'picked':'available')} disabled={!!reason} aria-pressed={picked&&!reason} aria-label={`${h.name} · ${r.name} · ${day.toLocaleDateString(locale)} · ${explanation}`} title={explanation} onClick={()=>choose(h,r,day)}>{!valid?'—':reason?<><span aria-hidden="true">×</span><small>{explanation}</small></>:picked?t('Selected','已选择'):t('Available','可用')}</button></td>;})}</tr>)}</React.Fragment>)}</tbody></table></div>
 <div className="hc-schedule-legend"><span><i/>{t('Available','可用')}</span><span><i className="blocked"/>{t('Unavailable · blocked','不可用 · 已屏蔽')}</span></div>
 {chosenHouse&&chosenRoom&&!problem&&<p className="hc-schedule-selection" role="status">{chosenHouse.name} · {chosenRoom.name} · {new Date(start).toLocaleString(locale)} → {new Date(end).toLocaleString(locale)}</p>}
 </section>
 <details className="hc-placement-options"><summary>{t('Capacity override & manual selection','容量覆盖值与手动选择')}</summary>
 <label>{t('Pet capacity override (optional)','宠物容量覆盖值（选填）')}<input type="number" min="0.01" step="0.01" value={override} placeholder={t('Use room pet-type rule','使用房间宠物种类规则')} onChange={e=>{setOverride(e.target.value);invalidate();}}/></label>
 <label>{t('House','房屋')}<select aria-label={t('House','房屋')} required value={house} onChange={e=>{setHouse(e.target.value);setRoom('');setDirty(true);}}><option value="">{t('Select an available house','选择可用房屋')}</option>{houses.map(h=>{const available=valid&&h.rooms.some(r=>!issue(h,r));return <option key={h.id} value={h.id} disabled={!available}>{h.name}{!available?' · '+t('No suitable rooms','无合适房间'):''}</option>;})}</select></label>
 <label>{t('Room','房间')}<select aria-label={t('Room','房间')} required value={room} onChange={e=>{setRoom(e.target.value);setDirty(true);}}><option value="">{t('Select an available room','选择可用房间')}</option>{chosenHouse?.rooms.map(r=>{const reason=issue(chosenHouse,r);return <option key={r.id} value={r.id} disabled={!!reason}>{r.name}{reason?' · '+reasons[reason]:''}</option>;})}</select></label>
 </details>
 {valid&&chosenRoom&&problem&&<p className="hc-setup-note" role="alert">{reasons[problem]}</p>}

 <div className="hc-settings-actions"><button className="hc-apply" disabled={!chosenRoom||!!problem}>{t('Add to preview','添加到预览')}</button><button className="hc-manage" type="button" onClick={close}>{t('Cancel','取消')}</button></div>
 </form></Modal>;
}
