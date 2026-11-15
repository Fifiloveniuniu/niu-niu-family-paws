import React from 'react';
import {useTranslation} from 'react-i18next';
import Modal from './modal';
import UnsavedChanges,{confirmDiscardChanges} from './unsaved-changes';
import {placementIssue,unavailableRanges,type Placement,type PlacementIssue} from './calendar-placement';
export type PlacementHouse={id:number;name:string;rooms:{id:number;name:string;capacity:string;costs?:Record<string,string>}[]};
export default function AssignmentDialog({houses,stays,pets,anchor,initial,onClose,onApply}:{houses:PlacementHouse[];stays:Placement[];pets:{name:string;species:string}[];anchor:Date;initial?:{house:number;room:number};onClose:()=>void;onApply:(stay:Placement)=>void}){
 const {i18n}=useTranslation(),zh=i18n.language==='zh',t=(en:string,cn:string)=>zh?cn:en;
 const local=(d:Date)=>new Date(d.getTime()-d.getTimezoneOffset()*60000).toISOString().slice(0,16);
 const [pet,setPet]=React.useState(''),[start,setStart]=React.useState(local(new Date(anchor.getTime()+9*3600000))),[end,setEnd]=React.useState(''),[house,setHouse]=React.useState(initial?String(initial.house):''),[room,setRoom]=React.useState(initial?String(initial.room):''),[override,setOverride]=React.useState('');
 const [week,setWeek]=React.useState(0),[feedback,setFeedback]=React.useState('');

 React.useEffect(()=>setWeek(0),[start]);
 const [dirty,setDirty]=React.useState(false),form=React.useRef<HTMLFormElement>(null);
 const selected=pets.find(p=>p.name===pet),offset=(s:string)=>(new Date(s).getTime()-anchor.getTime()-9*3600000)/86400000;
 const begin=offset(start),finish=offset(end),valid=!!selected&&Number.isFinite(begin)&&Number.isFinite(finish)&&finish>begin;
 const issue=(h:PlacementHouse,r:PlacementHouse['rooms'][number])=>!valid?'dates':placementIssue(stays,pet,selected!.species,begin,finish,h.id,r.id,Number(r.capacity),Number(override||r.costs?.[selected!.species]));
 const reasons:Record<Exclude<PlacementIssue,null>,string>={dates:t('Choose a pet and valid times first','请先选择宠物和有效时间'),duplicate:t('Pet already has a stay at this time','该宠物在此时段已有安排'),species:t('Another species is staying here','此时段有其他种类的宠物'),overdue:t('Overdue pickup · availability needs review','接回逾期 · 可用性需核实'),boundary:t('Back-to-back stay · turnover rule needed','相邻时段 · 需确认周转规则'),capacity:t('Not enough capacity for the whole stay','整个托管时段内容量不足'),unconfigured:t('Configure room capacity and pet usage','请配置房间容量和宠物用量')};
 const rangeReasons={...reasons,capacity:t('At capacity','容量已满'),species:t('Different pet type','其他种类宠物'),duplicate:t('Pet already scheduled','宠物已有安排'),unconfigured:t('Setup needed','需要配置'),overdue:t('Pickup overdue','接回逾期')};
 const chosenHouse=houses.find(h=>String(h.id)===house),chosenRoom=chosenHouse?.rooms.find(r=>String(r.id)===room),problem=chosenHouse&&chosenRoom?issue(chosenHouse,chosenRoom):'dates';
 const calendarStart=Number.isFinite(new Date(start).getTime())?new Date(start):new Date(anchor);
 calendarStart.setHours(0,0,0,0);calendarStart.setDate(calendarStart.getDate()+week*7);
 const days=Array.from({length:7},(_,i)=>{const day=new Date(calendarStart);day.setDate(day.getDate()+i);return day;});
 const locale=zh?'zh-CN':'en-US';
 const calendarEnd=new Date(calendarStart);calendarEnd.setDate(calendarEnd.getDate()+7);
 const viewFrom=offset(local(calendarStart)),viewTo=offset(local(calendarEnd)),viewLength=viewTo-viewFrom;
 const position=(value:number)=>(value-viewFrom)/viewLength*100;
 const timeFor=(value:number)=>new Date(anchor.getTime()+9*3600000+value*86400000);
 const rangeLabel=(a:number,b:number)=>timeFor(a).toLocaleString(locale,{month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'})+' – '+timeFor(b).toLocaleString(locale,{month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'});
 function chooseRange(h:PlacementHouse,r:PlacementHouse['rooms'][number],arrival=begin,pickup=finish){
   if(!valid){setFeedback(reasons.dates);return;}
   const reason=placementIssue(stays,pet,selected!.species,arrival,pickup,h.id,r.id,Number(r.capacity),Number(override||r.costs?.[selected!.species]));
   if(reason){setFeedback(reasons[reason]);return;}
   setStart(local(timeFor(arrival)));setEnd(local(timeFor(pickup)));setHouse(String(h.id));setRoom(String(r.id));setDirty(true);setFeedback('');
 }
 function chooseTime(event:React.MouseEvent<HTMLDivElement>,h:PlacementHouse,r:PlacementHouse['rooms'][number]){
   if(!valid){setFeedback(reasons.dates);return;}
   const rect=event.currentTarget.getBoundingClientRect();
   const arrival=Math.round((viewFrom+(event.clientX-rect.left)/rect.width*viewLength)*1440)/1440;
   chooseRange(h,r,arrival,arrival+(finish-begin));
 }
 const close=()=>{if(confirmDiscardChanges(i18n.language,form.current))onClose();};
 const invalidate=()=>{setDirty(true);setHouse('');setRoom('');setFeedback('');};
 return <Modal className="hc-assignment-dialog" title={t('Add pet to room','添加宠物到房间')} onClose={close}><form ref={form} className="hc-settings-form" onSubmit={e=>{e.preventDefault();if(!selected||!chosenHouse||!chosenRoom||problem)return;onApply({id:crypto.randomUUID(),name:pet,species:selected.species,house:chosenHouse.id,room:chosenRoom.id,start:begin,end:finish,status:'upcoming',units:Number(override||chosenRoom.costs?.[selected.species])});}}>
 <UnsavedChanges active={dirty}/><p className="hc-setup-note">{t('Preview only · Browser-local times. No booking, balance or check-in changes.','仅供预览 · 使用浏览器当地时间。不修改预约、余额或入住记录。')}</p>
 <label>{t('Pet','宠物')}<select aria-label={t('Pet','宠物')} required value={pet} onChange={e=>{setPet(e.target.value);invalidate();}}><option value="">{t('Select a pet','选择宠物')}</option>{pets.map(p=><option key={p.name} value={p.name}>{p.name} · {t(p.species,{dog:'狗',cat:'猫',rabbit:'兔'}[p.species]||p.species)}</option>)}</select></label>
 <div className="hc-time-fields"><label>{t('Arrival','到店时间')}<input type="datetime-local" required value={start} onChange={e=>{setStart(e.target.value);invalidate();}}/></label><label>{t('Pickup','接回时间')}<input type="datetime-local" required value={end} onChange={e=>{setEnd(e.target.value);invalidate();}}/></label></div>
 <section className="hc-schedule-picker" aria-label={t('Room availability calendar','房间可用日历')}>
 <div className="hc-schedule-heading"><h3>{t('Choose a room on the calendar','在日历上选择房间')}</h3><div><button type="button" title={t('Previous week','上一周')} aria-label={t('Previous week','上一周')} onClick={()=>setWeek(week-1)}>‹</button><span>{days[0].toLocaleDateString(locale,{month:'short',day:'numeric'})} – {days[6].toLocaleDateString(locale,{month:'short',day:'numeric'})}</span><button type="button" title={t('Next week','下一周')} aria-label={t('Next week','下一周')} onClick={()=>setWeek(week+1)}>›</button></div></div>
 <p className="hc-setup-note">{t('Gray bands show unavailable time ranges. Enter arrival and pickup, then choose a room or tap a free starting time. The full stay must fit.','灰色条表示不可用时段。填写到店和接回时间后，选择房间或点击空白处选开始时间。整个托管时段都必须可用。')}</p>
 <div className="hc-schedule-scroll" tabIndex={0} aria-label={t('Scroll room availability calendar','滚动房间可用日历')}><div className="hc-range-calendar">
 <div className="hc-range-axis"><div>{t('House / room','房屋 / 房间')}</div><div className="hc-range-dates">{days.map(day=><div key={day.toISOString()} style={{left:`${position(offset(local(day)))}%`}}><small>{day.toLocaleDateString(locale,{weekday:'short'})}</small>{day.toLocaleDateString(locale,{month:'numeric',day:'numeric'})}</div>)}</div></div>
 {houses.map(h=><React.Fragment key={h.id}><div className="hc-range-house">{h.name}</div>{!h.rooms.length&&<p className="hc-room-empty">{t('No rooms yet','暂无房间')}</p>}{h.rooms.map(r=>{const unavailable=selected?unavailableRanges(stays,pet,selected.species,viewFrom,viewTo,h.id,r.id,Number(r.capacity),Number(override||r.costs?.[selected.species])):[];
 const problem=issue(h,r),picked=String(h.id)===house&&String(r.id)===room;
 const left=Math.max(0,position(begin)),right=Math.min(100,position(finish));
 return <div className="hc-range-room" key={r.id}><div className="hc-range-room-name"><strong>{r.name}</strong><button type="button" disabled={!!problem} title={problem?reasons[problem]:t('Choose this room for the entered times','选择此房间及已填写的时段')} aria-label={`${t('Choose','选择')} ${h.name} · ${r.name}`} onClick={()=>chooseRange(h,r)}>{picked&&!problem?t('Selected','已选择'):t('Choose room','选择房间')}</button></div>
 <div className={'hc-time-track'+(!selected?' pending':'')} aria-label={`${h.name} · ${r.name}`} onClick={event=>chooseTime(event,h,r)}>
 {selected&&unavailable.map((range,i)=><button key={i} type="button" disabled className="hc-time-unavailable" style={{left:`${position(range.start)}%`,width:`${position(range.end)-position(range.start)}%`}} title={`${rangeLabel(range.start,range.end)} · ${reasons[range.reason]}`} aria-label={`${h.name} · ${r.name} · ${rangeLabel(range.start,range.end)} · ${reasons[range.reason]}`}><span>{rangeReasons[range.reason]}</span></button>)}
 {valid&&!problem&&right>left&&<button type="button" className={'hc-time-request'+(picked?' picked':'')} style={{left:`${left}%`,width:`${right-left}%`}} aria-label={`${t('Choose','选择')} ${h.name} · ${r.name} · ${rangeLabel(begin,finish)}`} aria-pressed={picked} onClick={event=>{event.stopPropagation();chooseRange(h,r);}}>{picked?t('Selected','已选择'):t('Choose','选择')}</button>}
 {!selected&&<span className="hc-time-placeholder">{t('Select a pet to see availability','选择宠物以查看可用时段')}</span>}
 </div></div>;})}</React.Fragment>)}
 </div></div>
 <div className="hc-schedule-legend"><span><i/>{t('Available time','可用时段')}</span><span><i className="unavailable"/>{t('Unavailable time range','不可用时段')}</span></div>
 {feedback&&<p className="hc-range-feedback" role="alert">{feedback}</p>}

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
