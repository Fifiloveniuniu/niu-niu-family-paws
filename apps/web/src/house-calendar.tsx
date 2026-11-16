import React from 'react';
import {useTranslation} from 'react-i18next';
import LanguageSelector from './language-selector';
import Houses from './houses';
import CalendarSettingsDialog,{type CalendarSettings} from './calendar-settings';
import Icon from './icons';
import AssignmentDialog from './calendar-assignment';
import BoardingStatement from './boarding-statement-page';
import CancellationPolicyPage,{initialCancellationPolicy} from './cancellation-policy';
import PetBalances from './pet-balances';
import type {BalancePolicyTemplate} from './pet-balance';
import {CalendarPhotoProvider,PetProfileAvatar,CalendarPhotoCredits} from './calendar-pet-photos';
import {balanceKey,changePetBalance,validatePetCoverage,type PetBalance,type BalanceChange,type BalanceService,type PlannedCoverage} from './pet-balance';
import type {Placement} from './calendar-placement';
import Modal from './modal';
import {auth} from './auth-client';
import {onIdTokenChanged} from 'firebase/auth';
import {confirmDiscardChanges} from './unsaved-changes';
import './house-calendar.css';

type Scale='day'|'week'|'month'|'year';
type Stay=Placement;
type SampleStay=Omit<Stay,'id'|'units'>;
const initialStays:SampleStay[]=[
 {name:'Mochi',species:'dog',house:1,room:1,start:-3,end:3,status:'in'},
 {name:'Biscuit',species:'dog',house:1,room:1,start:-1,end:1,status:'in'},
 {name:'Luna',species:'dog',house:1,room:1,start:2,end:7,status:'upcoming'},
 {name:'Oliver',species:'cat',house:1,room:2,start:-4,end:-.2,status:'in',overdue:true},
 {name:'Coco',species:'cat',house:1,room:2,start:1,end:5,status:'upcoming'},
 {name:'Pip',species:'rabbit',house:1,room:3,start:-2,end:4,status:'in'},
 {name:'Maple',species:'dog',house:2,room:1,start:-5,end:-1,status:'out'},
 {name:'Teddy',species:'dog',house:2,room:1,start:0,end:6,status:'upcoming'},
 {name:'Nori',species:'cat',house:2,room:2,start:4,end:10,status:'upcoming'},
];
const DAY=86400000;
export default function HouseCalendar({onLanguageChange}:{onLanguageChange:(lang:'en'|'zh')=>void}){
 const {i18n}=useTranslation(),zh=i18n.language==='zh',t=(en:string,cn:string)=>zh?cn:en;
 const route=window.location.hash,view=route.split('?')[0]==='#/cancellation-policy'?'policy':route.split('?')[0]==='#/transactions'?'statement':'calendar';
 const [cancellationPolicy,setCancellationPolicy]=React.useState(initialCancellationPolicy);
 const [stays,setStays]=React.useState<Stay[]>(()=>initialStays.map((s,i)=>({...s,id:'sample-'+i,units:1})));
 const [locations,setLocations]=React.useState([{id:1,rooms:[1,2,3]},{id:2,rooms:[1,2]}]);
 const [assignment,setAssignment]=React.useState<{house:number;room:number}|null|false>(false);
 const [balanceTemplates,setBalanceTemplates]=React.useState<BalancePolicyTemplate[]>([]);
 const [balances,setBalances]=React.useState<Record<string,PetBalance>>({});
 const [balanceView,setBalanceView]=React.useState<{pet:string;service:BalanceService;fromStay?:boolean}|null>(null);
 const [notice,setNotice]=React.useState('');
 const nextId=React.useRef(10);
 const [customerFilter,setCustomerFilter]=React.useState('all');
 const customerFor=(name:string)=>{const index=initialStays.findIndex(p=>p.name===name);return index<0?'4':String(Math.floor(index/3)+1);};
 const customerName=(id:string)=>t('Sample family','示例家庭')+' '+id;
 const [config,setConfig]=React.useState<Record<string,CalendarSettings>>({});
 const [roomFilter,setRoomFilter]=React.useState('all'),[speciesFilter,setSpeciesFilter]=React.useState('all'),[statusFilter,setStatusFilter]=React.useState('all');
 const [settings,setSettings]=React.useState<{house:number;room?:number;creating?:boolean}|null>(null);
 const [manage,setManage]=React.useState(false),[admin,setAdmin]=React.useState(false);
 React.useEffect(()=>onIdTokenChanged(auth,user=>{setAdmin(false);if(user)void user.getIdTokenResult().then(token=>{if(auth.currentUser===user)setAdmin(token.claims.admin===true);}).catch(()=>{});}),[]);
 React.useEffect(()=>{if(!admin)setManage(false);},[admin]);
 const [now,setNow]=React.useState(()=>new Date());
 React.useEffect(()=>{const timer=setInterval(()=>setNow(new Date()),60000);return()=>clearInterval(timer);},[]);
 const anchor=React.useRef(new Date(new Date().setHours(0,0,0,0))).current;
 const [scale,setScale]=React.useState<Scale>('week'),[offset,setOffset]=React.useState(0),[house,setHouse]=React.useState('all'),[query,setQuery]=React.useState(''),[collapsed,setCollapsed]=React.useState<string[]>([]),[selected,setSelected]=React.useState<Stay|null>(null);
 const dialog=React.useRef<HTMLDialogElement>(null);
 React.useEffect(()=>{setBalanceView(null);setAssignment(false);setSettings(null);setManage(false);setSelected(null);dialog.current?.close();},[route]);
 React.useEffect(()=>{if(selected)dialog.current?.showModal();},[selected]);
 const span={day:1,week:14,month:35,year:365}[scale],before={day:0,week:3,month:7,year:30}[scale];
 const from=new Date(anchor.getTime()+(offset*span-before)*DAY),to=new Date(from.getTime()+span*DAY);
 const locale=zh?'zh-CN':'en-US';
 const date=(value:Date,options:Intl.DateTimeFormatOptions={month:'short',day:'numeric'})=>value.toLocaleDateString(locale,options);
 const when=(n:number)=>new Date(anchor.getTime()+n*DAY+9*3600000);
 const status=(s:Stay)=>s.status==='in'?t('Checked in','已入住'):s.status==='out'?t('Checked out','已离店'):t('Not checked in','未入住');
 const ticks=scale==='day'?Array.from({length:12},(_,i)=>new Date(from.getTime()+i*2*3600000)):scale==='year'?Array.from({length:12},(_,i)=>new Date(from.getTime()+i*span/12*DAY)):Array.from({length:span},(_,i)=>new Date(from.getTime()+i*DAY));
 const pos=(d:Date)=>(d.getTime()-from.getTime())/(span*DAY)*100;
 const houseName=(h:number)=>config['h'+h]?.name||t('Sample house','示例房屋')+' '+(h===1?'A':'B');
 const roomName=(h:number,r:number)=>config[h+'-'+r]?.name||t('Room','房间')+' '+r;
 const roster=[...initialStays.map(s=>({name:s.name,species:s.species})),{name:'Willow',species:'dog'},{name:'Pebble',species:'rabbit'},{name:'Miso',species:'cat'}].map(p=>({...p,customer:customerFor(p.name),customerName:customerName(customerFor(p.name))}));
 const dateKey=(d:Date)=>new Date(d.getTime()-d.getTimezoneOffset()*60000).toISOString().slice(0,10);
 const balancePlans:PlannedCoverage[]=stays.filter(s=>s.coverage&&s.status!=='out').map(s=>({id:s.id,pet:s.name,service:s.coverage!.service,days:s.coverage!.days,startDate:dateKey(when(s.start)),endDate:dateKey(when(s.end))}));
 function saveBalance(change:BalanceChange){const key=balanceKey(change.pet,change.service);const account=changePetBalance(balances[key],change,balancePlans,new Date().toISOString());setBalances(previous=>({...previous,[key]:account}));if(balanceView?.fromStay)setBalanceView(null);}
 const nowPos=pos(now),visible=stays.filter(s=>(house==='all'||String(s.house)===house)&&(roomFilter==='all'||s.house+'-'+s.room===roomFilter)&&(speciesFilter==='all'||s.species===speciesFilter)&&(statusFilter==='all'||(statusFilter==='overdue'?s.overdue:s.status===statusFilter))&&(customerFilter==='all'||customerFor(s.name)===customerFilter)&&s.name.toLowerCase().includes(query.trim().toLowerCase()));
 const settingKey=settings?(settings.room?settings.house+'-'+settings.room:'h'+settings.house):'';
 const settingValue=settings?(config[settingKey]||{name:settings.creating?'':settings.room?roomName(settings.house,settings.room):houseName(settings.house),address:'',timezone:Intl.DateTimeFormat().resolvedOptions().timeZone,capacity:''}):null;
 const scaleValues:Scale[]=['day','week','month','year'];
 function changeScale(value:Scale){setScale(value);setOffset(0);}
 const scales=<div className="hc-scales" role="tablist" aria-label={t('Calendar view','日历视图')}>{scaleValues.map((v,i)=><button key={v} id={'hc-tab-'+v} role="tab" aria-selected={scale===v} aria-controls="hc-timeline-panel" tabIndex={scale===v?0:-1} onClick={()=>changeScale(v)} onKeyDown={event=>{let next=i;if(event.key==='ArrowRight')next=(i+1)%4;else if(event.key==='ArrowLeft')next=(i+3)%4;else if(event.key==='Home')next=0;else if(event.key==='End')next=3;else return;event.preventDefault();changeScale(scaleValues[next]);document.getElementById('hc-tab-'+scaleValues[next])?.focus();}}>{t(['Day','Weeks','Month','Year'][i],['日','周','月','年'][i])}</button>)}</div>;


 return <CalendarPhotoProvider><main className="hc">
 <div className="hc-top"><a href="#">✿ <strong>NIU NIU</strong> <span>FAMILY PAWS</span></a><LanguageSelector onChange={onLanguageChange}/></div>
 <a className="hc-back" href="#/login">← {t('Back to workspace','返回工作区')}</a>
 <p className="hc-demo">{t('Prototype · Changes stay on this page · Existing sample stays use 1 illustrative capacity unit','原型 · 修改仅保留在本页 · 现有示例托管各使用 1 示例容量单位')}</p>
 <nav className="hc-work-nav" aria-label={t('Boarding workspace','寄养工作区')}><a href="#/house-calendar" aria-current={view==='calendar'?'page':undefined}>{t('House calendar','房屋日历')}</a><a href="#/cancellation-policy" aria-current={view==='policy'?'page':undefined}>{t('Cancellation policy','取消政策')}</a><a href="#/transactions" aria-current={view==='statement'?'page':undefined}>{t('Statement','交易明细')}</a></nav>
 {view==='statement'&&<BoardingStatement key={route} accounts={balances} pets={roster} initialPet={new URLSearchParams(route.split('?')[1]||'').get('pet')||undefined} onManageBalance={pet=>setBalanceView({pet,service:'boarding'})}/>}
 {view==='policy'&&<CancellationPolicyPage policy={cancellationPolicy} onSave={setCancellationPolicy}/>}
 <div hidden={view!=='calendar'}>
 <div className="hc-title"><div><h1>{t('House calendar','房屋日历')}</h1><p>{t('Stays and check-ins, by room.','按房间查看托管与入住。')}</p></div><div className="hc-title-actions"><div className="hc-main-actions"><button className="hc-manage" onClick={()=>setBalanceView({pet:'',service:'boarding'})}>{t('Boarding balances','寄养余额')}</button><button className="hc-apply hc-add-placement" onClick={()=>setAssignment(null)}><Icon name="plus"/>{t('Add pet to room','添加宠物到房间')}</button><button className="hc-manage hc-add-house" title={t('Add house','添加房屋')} aria-label={t('Add house','添加房屋')} onClick={()=>setSettings({house:nextId.current++,creating:true})}><Icon name="plus"/>{t('Add house','添加房屋')}</button>{admin?<button className="hc-settings hc-top-icon" title={t('Manage houses & rooms','管理房屋与房间')} aria-label={t('Manage houses & rooms','管理房屋与房间')} onClick={()=>setManage(true)}><Icon name="settings"/></button>:<a className="hc-manage" href="#/login">{t('Sign in to manage houses','登录以管理房屋')}</a>}</div><div className="hc-live"><span/> {t('Local time','当地时间')} · {now.toLocaleTimeString(locale,{hour:'2-digit',minute:'2-digit'})}<small>{t('Sample timezone','示例时区')}: {Intl.DateTimeFormat().resolvedOptions().timeZone}</small></div></div></div>
 {notice&&<p className="hc-notice" role="status">{notice}</p>}
 <section className="hc-filters" aria-label={t('Filters','筛选')}><div className="hc-filters-heading"><h2>{t('Filters','筛选')}</h2><button className="hc-clear" title={t('Clear filters','清除筛选')} aria-label={t('Clear filters','清除筛选')} disabled={house==='all'&&roomFilter==='all'&&speciesFilter==='all'&&statusFilter==='all'&&customerFilter==='all'&&!query} onClick={()=>{setHouse('all');setRoomFilter('all');setSpeciesFilter('all');setStatusFilter('all');setCustomerFilter('all');setQuery('');}}><Icon name="reset"/></button></div><div className="hc-filter-fields">
 <label>{t('House','房屋')}<select aria-label={t('House','房屋')} value={house} onChange={e=>{setHouse(e.target.value);setRoomFilter('all');}}><option value="all">{t('All houses','全部房屋')}</option>{locations.map(({id:h})=><option key={h} value={h}>{houseName(h)}</option>)}</select></label>
 <label>{t('Room','房间')}<select aria-label={t('Room','房间')} value={roomFilter} onChange={e=>setRoomFilter(e.target.value)}><option value="all">{t('All rooms','全部房间')}</option>{locations.filter(h=>house==='all'||house===String(h.id)).flatMap(({id:h,rooms})=>rooms.map(r=><option key={h+'-'+r} value={h+'-'+r}>{houseName(h)} · {roomName(h,r)}</option>))}</select></label>
 <label>{t('Pet type','宠物种类')}<select aria-label={t('Pet type','宠物种类')} value={speciesFilter} onChange={e=>setSpeciesFilter(e.target.value)}><option value="all">{t('All types','全部种类')}</option><option value="dog">{t('Dog','狗')}</option><option value="cat">{t('Cat','猫')}</option><option value="rabbit">{t('Rabbit','兔')}</option></select></label>
 <label>{t('Status','状态')}<select aria-label={t('Status','状态')} value={statusFilter} onChange={e=>setStatusFilter(e.target.value)}><option value="all">{t('All statuses','全部状态')}</option><option value="in">{t('Checked in','已入住')}</option><option value="upcoming">{t('Not checked in','未入住')}</option><option value="out">{t('Checked out','已离店')}</option><option value="overdue">{t('Pickup overdue','接回逾期')}</option></select></label>
 <label>{t('Customer','客户')}<select aria-label={t('Customer','客户')} value={customerFilter} onChange={e=>setCustomerFilter(e.target.value)}><option value="all">{t('All customers','全部客户')}</option>{['1','2','3','4'].map(id=><option key={id} value={id}>{customerName(id)}</option>)}</select></label>
 <label className="hc-search">{t('Find a pet','查找宠物')}<input placeholder={t('Search pet name…','搜索宠物名字…')} value={query} onChange={e=>setQuery(e.target.value)}/></label></div></section>

 <section className="hc-calendar" aria-label={t('Pet stay timeline','宠物托管时间轴')}><div className="hc-range"><div><button title={t('Previous period','上一时段')} aria-label={t('Previous period','上一时段')} onClick={()=>setOffset(offset-1)}>‹</button><button onClick={()=>setOffset(0)}>{t('Today','今天')}</button><button title={t('Next period','下一时段')} aria-label={t('Next period','下一时段')} onClick={()=>setOffset(offset+1)}>›</button></div><h2>{date(from)} – {date(to)} <span>{to.getFullYear()}</span></h2>{scales}</div>
 <div className="hc-scroll" id="hc-timeline-panel" role="tabpanel" aria-labelledby={'hc-tab-'+scale} tabIndex={0} aria-label={t('Scroll timeline horizontally','可横向滚动时间轴')}><div className={'hc-grid hc-'+scale}>
 {nowPos>=0&&nowPos<=100&&<div className="hc-now-overlay"><div style={{left:`${nowPos}%`}}><span className="hc-now-badge">{t('Now','现在')}</span></div></div>}
 <div className="hc-axis"><div className="hc-label">{t('House / room / pet','房屋 / 房间 / 宠物')}</div><div className="hc-track hc-ticks">{ticks.map((d,i)=><div key={i} style={{left:`${i/ticks.length*100}%`,width:`${100/ticks.length}%`}} className={date(d)===date(now)?'today':''}><small>{scale==='day'?date(d):scale==='year'?d.getFullYear():date(d,{weekday:'short'})}</small><strong>{scale==='day'?d.getHours()+':00':scale==='year'?date(d,{month:'short'}):d.getDate()}</strong></div>)}</div></div>
 {locations.filter(h=>(house==='all'||house===String(h.id))&&(!query&&speciesFilter==='all'&&statusFilter==='all'&&customerFilter==='all'&&roomFilter==='all'||visible.some(s=>s.house===h.id))).map(({id:h,rooms})=><React.Fragment key={h}><div className="hc-house">⌂ &nbsp;{houseName(h)} <small>{visible.filter(s=>s.house===h&&s.status==='in').length} {t('in care','只在店')}</small><button className="hc-settings" title={t('House settings','房屋设置')} aria-label={`${t('House settings','房屋设置')}: ${houseName(h)}`} onClick={()=>setSettings({house:h})}><Icon name="settings"/></button><button className="hc-settings" title={t('Add room','添加房间')} aria-label={t('Add room','添加房间')} onClick={()=>setSettings({house:h,room:nextId.current++,creating:true})}><Icon name="plus"/></button></div>{!rooms.length&&<p className="hc-empty">{t('No rooms yet. Add a room to place pets.','暂无房间，添加后可安排宠物。')}</p>}{rooms.filter(r=>roomFilter==='all'||roomFilter===h+'-'+r).filter(r=>!query&&speciesFilter==='all'&&statusFilter==='all'&&customerFilter==='all'||visible.some(s=>s.house===h&&s.room===r)).map(r=>{const key=h+'-'+r,rows=visible.filter(s=>s.house===h&&s.room===r),closed=collapsed.includes(key);return <React.Fragment key={r}><div className="hc-room-heading"><button className="hc-room" aria-expanded={!closed} onClick={()=>setCollapsed(closed?collapsed.filter(v=>v!==key):[...collapsed,key])}>{closed?'▸':'▾'} &nbsp;{roomName(h,r)}<small>{rows.length} {t('pets','只宠物')}</small></button><button className="hc-settings" title={t('Room settings','房间设置')} aria-label={`${t('Room settings','房间设置')}: ${houseName(h)} · ${roomName(h,r)}`} onClick={()=>setSettings({house:h,room:r})}><Icon name="settings"/></button><button className="hc-settings" title={t('Add pet','添加宠物')} aria-label={`${t('Add pet','添加宠物')}: ${houseName(h)} · ${roomName(h,r)}`} onClick={()=>setAssignment({house:h,room:r})}><Icon name="plus"/></button></div>{!closed&&!rows.length&&<p className="hc-room-empty">{t('No stays assigned','尚未安排托管')}</p>}{!closed&&rows.map(s=>{const left=pos(when(s.start)),right=pos(when(s.end)),actualEnd=s.overdue?nowPos:right;return <div className="hc-pet" key={s.id}><div className="hc-label"><PetProfileAvatar name={s.name} className={'hc-avatar '+s.species}/><div><strong title={customerName(customerFor(s.name))}>{s.name}</strong><small className={'hc-status '+s.status}>{status(s)}</small></div><button className="hc-remove-pet" title={s.status==='in'?t('Record pickup before removing an in-care pet','在店宠物需先记录接回'):t('Remove placement','移除安排')} aria-label={`${t('Remove placement','移除安排')}: ${s.name}`} disabled={s.status==='in'} onClick={()=>{if(window.confirm(t('Remove this placement from the preview? The pet profile is kept.','从预览中移除此安排？宠物档案会保留。'))){setStays(previous=>previous.filter(p=>p.id!==s.id));setNotice(t('Placement removed. Pet profile kept.','已移除安排，宠物档案保留。'));}}}><Icon name="trash"/></button></div><div className="hc-track" style={{backgroundSize:`${100/ticks.length}% 100%`}}>{actualEnd>0&&left<100&&<button className={'hc-stay '+s.status+(s.overdue?' overdue':'')} style={{left:`${Math.max(0,left)}%`,width:`${Math.min(100,actualEnd)-Math.max(0,left)}%`}} aria-label={`${s.name}: ${status(s)}, ${date(when(s.start))} – ${date(when(s.end))}${s.overdue?' · '+t('Pickup overdue','接回逾期'):''}`} onClick={()=>setSelected(s)}><span>{s.overdue?t('Pickup overdue','接回逾期'):date(when(s.start))+' – '+date(when(s.end))}</span></button>}</div></div>})}</React.Fragment>;})}</React.Fragment>)}
 {!visible.length&&<p className="hc-empty">{t('No pets match these filters.','没有符合筛选条件的宠物。')}</p>}

 </div></div><div className="hc-legend"><span><i className="in"/>{t('Checked in','已入住')}</span><span><i className="upcoming"/>{t('Upcoming · not checked in','即将到来 · 未入住')}</span><span><i className="out"/>{t('Checked out','已离店')}</span><span><i className="overdue"/>{t('Pickup overdue · still in care','接回逾期 · 仍在店')}</span></div></section>
 <p className="hc-foot">{t('Select a stay for details. Dates are planned; check-in status shows actual presence.','点击托管条查看详情。日期为计划时间，入住状态表示实际在店情况。')}</p>
 <CalendarPhotoCredits/>
 </div>
 {assignment!==false&&<AssignmentDialog houses={locations.map(h=>({id:h.id,name:houseName(h.id),rooms:h.rooms.map(r=>({id:r,name:roomName(h.id,r),capacity:config[h.id+'-'+r]?.capacity||'',costs:config[h.id+'-'+r]?.costs}))}))} stays={stays} pets={roster} balances={balances} balancePlans={balancePlans} onManageBalance={(pet,service)=>setBalanceView({pet,service,fromStay:true})} anchor={anchor} initial={assignment||undefined} onClose={()=>setAssignment(false)} onApply={stay=>{if(!stay.coverage||validatePetCoverage(balances[balanceKey(stay.name,stay.coverage.service)],stay.name,stay.coverage.service,stay.coverage.days,dateKey(when(stay.start)),dateKey(when(stay.end)),balancePlans).code!=='ok'){setNotice(t('Review this pet’s balance before adding the stay.','请先核对该宠物的余额。'));return;}setStays(previous=>[...previous,stay]);setHouse('all');setRoomFilter('all');setSpeciesFilter('all');setStatusFilter('all');setCustomerFilter('all');setQuery('');setCollapsed(previous=>previous.filter(key=>key!==stay.house+'-'+stay.room));setAssignment(false);setNotice(t('Pet added to the preview schedule.','宠物已添加至预览日程。'));}}/>}
 {balanceView&&<PetBalances templates={balanceTemplates} onSaveTemplate={item=>setBalanceTemplates(previous=>[...previous,item])} pets={roster} accounts={balances} plans={balancePlans} initial={balanceView} onClose={()=>setBalanceView(null)} onSave={saveBalance}/>}
 {settings&&settingValue&&<CalendarSettingsDialog key={settingKey} minimumCapacity={settings.room?Math.max(0,...stays.filter(s=>s.house===settings.house&&s.room===settings.room&&s.status!=='out').map(s=>stays.filter(p=>p.house===s.house&&p.room===s.room&&p.status!=='out'&&p.start<=s.start&&(p.overdue||p.end>s.start)).reduce((sum,p)=>sum+p.units,0))):0} creating={settings.creating} onRemove={settings.creating?undefined:()=>{setLocations(previous=>settings.room?previous.map(h=>h.id===settings.house?{...h,rooms:h.rooms.filter(r=>r!==settings.room)}:h):previous.filter(h=>h.id!==settings.house));setHouse('all');setRoomFilter('all');setSettings(null);}} removeReason={settings.room?(stays.some(s=>s.house===settings.house&&s.room===settings.room)?t('Remove placements first. In-care pets cannot be removed.','请先移除安排。在店宠物不能移除。'):undefined):(locations.find(h=>h.id===settings.house)?.rooms.length?t('Remove this house’s rooms first.','请先移除此房屋的房间。'):undefined)} room={!!settings.room} houseName={houseName(settings.house)} value={settingValue} onClose={()=>setSettings(null)} onApply={value=>{if(settings.creating)setLocations(previous=>settings.room?previous.map(h=>h.id===settings.house?{...h,rooms:[...h.rooms,settings.room!]}:h):[...previous,{id:settings.house,rooms:[]}]);setConfig(previous=>({...previous,[settingKey]:value}));setSettings(null);}}/>}
 {manage&&admin&&<Modal title={t('Manage houses & rooms','管理房屋与房间')} onClose={()=>{if(confirmDiscardChanges(i18n.language))setManage(false);}}><div className="hc-setup"><p className="hc-setup-note">{t('Saved house settings are separate from the sample calendar. Room setup is still in progress.','保存的房屋设置与示例日历分开。房间设置仍在开发中。')}</p><Houses/></div></Modal>}
 <dialog ref={dialog} aria-label={selected?.name} className="hc-dialog" onClose={()=>setSelected(null)}>{selected&&<><div className="hc-dialog-title"><h2>{selected.name}</h2><button onClick={()=>dialog.current?.close()} aria-label={t('Close','关闭')}>×</button></div><p className={'hc-status '+selected.status}>{status(selected)}{selected.overdue?' · '+t('Pickup overdue','接回逾期'):''}</p><dl><dt>{t('Customer','客户')}</dt><dd>{customerName(customerFor(selected.name))}</dd><dt>{t('Location','位置')}</dt><dd>{houseName(selected.house)} · {roomName(selected.house,selected.room)}</dd><dt>{t('Planned arrival','计划到店')}</dt><dd>{when(selected.start).toLocaleString(locale)}</dd><dt>{t('Planned pickup','计划接回')}</dt><dd>{when(selected.end).toLocaleString(locale)}</dd><dt>{t('Actual arrival','实际到店')}</dt><dd>{selected.status==='upcoming'?t('Not recorded','未记录'):when(selected.start).toLocaleString(locale)}</dd><dt>{t('Actual pickup','实际接回')}</dt><dd>{selected.status==='out'?when(selected.end).toLocaleString(locale):t('Not recorded','未记录')}</dd></dl><button className="hc-manage" onClick={()=>{dialog.current?.close();setBalanceView({pet:selected.name,service:selected.coverage?.service||'boarding'});}}>{t('View pet balance','查看宠物余额')}</button><p>{t('Illustrative stay only. No booking or attendance data is saved.','仅为示例，不保存预约或交接记录。')}</p></>}</dialog>
 </main></CalendarPhotoProvider>;
}
