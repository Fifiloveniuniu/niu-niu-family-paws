import React from 'react';
import {useTranslation} from 'react-i18next';
import PetBalances,{type BalancePet} from './pet-balances';
import BoardingStatement,{StatementFilterPanel} from './boarding-statement-page';
import {emptyStatementFilters,type StatementFilters} from './boarding-statement';
import {balanceKey,type PetBalance,type BalanceChange,type BalancePolicyTemplate,type PlannedCoverage} from './pet-balance';
export default function BalancesPage({accounts,pets,plans,templates,onSaveTemplate,initialPet,onSelectPet,onSave,onManageBalance}:{accounts:Record<string,PetBalance>;pets:BalancePet[];plans:PlannedCoverage[];templates:BalancePolicyTemplate[];onSaveTemplate:(template:BalancePolicyTemplate)=>void;initialPet?:string;onSelectPet:(pet:string)=>void;onSave:(change:BalanceChange)=>void;onManageBalance:(pet:string)=>void}){
 const {i18n}=useTranslation(),zh=i18n.language==='zh',t=(en:string,cn:string)=>zh?cn:en;
 const [filters,setFilters]=React.useState<StatementFilters>(()=>({...emptyStatementFilters,pet:pets.some(p=>p.name===initialPet)?initialPet!:'all'}));
 React.useEffect(()=>onSelectPet(filters.pet),[filters.pet,onSelectPet]);
 const scoped=pets.filter(p=>filters.customer==='all'||p.customer===filters.customer);
 return <section className="hc-balances-workspace"><div className="hc-title"><div><h1>{t('Balances','寄养余额')}</h1><p>{t('Pet credits and their complete statement, together.','在同一页面管理宠物额度及完整交易明细。')}</p></div></div>
 <StatementFilterPanel pets={pets} filters={filters} onChange={setFilters}/>
 <div className="hc-balance-overview">{filters.pet!=='all'?<PetBalances key={filters.pet} embedded summaryOnly accounts={accounts} pets={pets} plans={plans} templates={templates} onSaveTemplate={onSaveTemplate} initial={{pet:filters.pet,service:'boarding'}} onSave={onSave} onClose={()=>{}}/>:<section className="hc-all-balances"><h2>{t('Pet balances','宠物余额')}</h2><p>{t('Balances belong to each pet. Choose a pet to make an adjustment.','余额归每只宠物所有，选择宠物后可进行调整。')}</p><div>{scoped.map(p=>{const account=accounts[balanceKey(p.name,'boarding')];return <button className="hc-balance-pick" key={p.name} onClick={()=>setFilters({...filters,pet:p.name})}><strong>{p.name}</strong><span>{p.customerName}</span><b>{account?account.days+' '+t('days','天'):t('Not configured','尚未配置')}</b></button>;})}</div></section>}</div>
 <BoardingStatement embedded hideFilters accounts={accounts} pets={pets} sharedFilters={filters} onFiltersChange={setFilters} onManageBalance={onManageBalance}/>
 </section>;
}
