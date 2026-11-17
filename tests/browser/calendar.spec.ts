import {test,type Page} from '@playwright/test';
async function coverStay(page:Page,days='10'){
 await page.getByRole('button',{name:'Add balance',exact:true}).click();
 await page.getByRole('dialog').last().getByRole('button',{name:'Add balance',exact:true}).click();
 await page.getByLabel('Days',{exact:true}).fill(days);await page.getByLabel('Reason',{exact:true}).fill('[TEST] preview credit');
 const dates=await page.evaluate(()=>{const year=new Date().getFullYear();return [year+'-01-01',(year+1)+'-12-31'];});
 await page.getByLabel('Valid from',{exact:true}).fill(dates[0]);await page.getByLabel('Valid through',{exact:true}).fill(dates[1]);
 await page.getByRole('dialog').last().getByRole('button',{name:'Add balance',exact:true}).click();
}
async function reviewDays(page:Page){await page.getByLabel('Required days',{exact:true}).fill('1');}

test('calendar prototype manages empty locations and time-aware pet placement',async({page:p})=>{
await p.setViewportSize({width:1440,height:1100});p.setDefaultTimeout(7000);const errors:string[]=[];p.on('pageerror',e=>errors.push(e.message));
await p.goto('/#/house-calendar');
await p.getByRole('button',{name:'Add house',exact:true}).click();await p.getByLabel('House name',{exact:true}).fill('Preview West');await p.getByRole('button',{name:'Apply to preview',exact:true}).click();
const house=p.locator('.hc-house').filter({hasText:'Preview West'});await house.getByRole('button',{name:'Add room',exact:true}).click();await p.getByLabel('Room name',{exact:true}).fill('Oak');await p.getByLabel('Maximum capacity',{exact:true}).fill('2');await p.getByLabel('Dog capacity usage',{exact:true}).fill('1');await p.getByRole('button',{name:'Apply to preview',exact:true}).click();
await p.getByRole('button',{name:'Add booking',exact:true}).click();await p.getByLabel('Pet',{exact:true}).selectOption('Willow');const times=await p.evaluate(()=>{const a=new Date();a.setHours(10,0,0,0);a.setDate(a.getDate()+2);const z=(d:Date)=>new Date(d.getTime()-d.getTimezoneOffset()*60000).toISOString().slice(0,16);return [z(a),z(new Date(a.getTime()+86400000))];});await p.getByLabel('Arrival',{exact:true}).fill(times[0]);await p.getByLabel('Pickup',{exact:true}).fill(times[1]);await reviewDays(p);await p.getByRole('button',{name:'Choose a room',exact:true}).click();await p.getByText('Capacity override & manual selection',{exact:true}).click();const houseId=await p.getByRole('dialog').getByLabel('House',{exact:true}).locator('option').filter({hasText:'Preview West'}).getAttribute('value');await p.getByRole('dialog').getByLabel('House',{exact:true}).selectOption(houseId!);const roomId=await p.getByRole('dialog').getByLabel('Room',{exact:true}).locator('option').filter({hasText:'Oak'}).getAttribute('value');await p.getByRole('dialog').getByLabel('Room',{exact:true}).selectOption(roomId!);await p.getByRole('button',{name:'Review stay',exact:true}).click();await coverStay(p);await p.getByRole('button',{name:'Add to preview',exact:true}).click();await p.getByRole('button',{name:'Remove placement: Willow',exact:true}).waitFor();
await p.getByRole('button',{name:'Room settings: Preview West · Oak',exact:true}).click();if(!await p.getByRole('button',{name:'Remove room',exact:true}).isDisabled())throw Error('Room removal with stay allowed');await p.getByRole('button',{name:'Cancel',exact:true}).click();
p.once('dialog',d=>d.accept());await p.getByRole('button',{name:'Remove placement: Willow',exact:true}).click();await p.getByRole('button',{name:'Room settings: Preview West · Oak',exact:true}).click();p.once('dialog',d=>d.accept());await p.getByRole('button',{name:'Remove room',exact:true}).click();await p.getByRole('button',{name:'House settings: Preview West',exact:true}).click();p.once('dialog',d=>d.accept());await p.getByRole('button',{name:'Remove house',exact:true}).click();if(await p.locator('.hc-house').filter({hasText:'Preview West'}).count())throw Error('House still visible');if(!await p.getByRole('button',{name:'Remove placement: Mochi',exact:true}).isDisabled())throw Error('In care removal allowed');
await p.getByRole('button',{name:'Add booking',exact:true}).click();await p.getByLabel('Pet',{exact:true}).selectOption('Miso');await p.getByLabel('Arrival',{exact:true}).fill(times[0]);await p.getByLabel('Pickup',{exact:true}).fill(times[1]);await reviewDays(p);await p.getByRole('button',{name:'Choose a room',exact:true}).click();if(!await p.getByRole('dialog').getByLabel('House',{exact:true}).locator('option[value="1"]').evaluate(e=>(e as HTMLOptionElement).disabled))throw Error('Unconfigured house enabled');await p.screenshot({path:'test-results/calendar-availability-desktop.png',fullPage:true});p.once('dialog',d=>d.accept());await p.getByRole('button',{name:'Cancel',exact:true}).click();await p.setViewportSize({width:390,height:844});await p.locator('.language-selector select').selectOption('zh');if(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth))throw Error('Mobile overflow');await p.screenshot({path:'test-results/calendar-mobile-zh.png',fullPage:true});if(errors.length)throw Error(errors.join());console.log('PASS create/remove house/room, configure capacity, place/remove pet, occupied removal guard, in-care guard, disabled availability, Chinese mobile');});

test('customer filtering combines with other filters and calendar tabs support keyboard navigation',async({page})=>{
 await page.goto('/#/house-calendar');
 const filters=page.getByRole('region',{name:'Filters',exact:true});
 await filters.getByRole('combobox',{name:'Customer',exact:true}).selectOption('1');
 await page.getByRole('button',{name:'Remove placement: Luna',exact:true}).waitFor();
 if(await page.locator('.hc-pet').count()!==3)throw Error('Customer filter');
 await filters.getByRole('combobox',{name:'Status',exact:true}).selectOption('in');
 if(await page.locator('.hc-pet').count()!==2)throw Error('Customer/status filter');
 await filters.getByRole('button',{name:'Clear filters',exact:true}).click();
 if(await page.locator('.hc-pet').count()!==9)throw Error('Clear customer filter');
 const weeks=page.getByRole('tab',{name:'Weeks',exact:true});await weeks.focus();await weeks.press('ArrowRight');
 await page.getByRole('tab',{name:'Month',exact:true,selected:true}).waitFor();
 await page.getByRole('tab',{name:'Month',exact:true}).press('End');
 await page.getByRole('tab',{name:'Year',exact:true,selected:true}).waitFor();
 await page.getByRole('tab',{name:'Year',exact:true}).press('Home');
 await page.getByRole('tab',{name:'Day',exact:true,selected:true}).waitFor();
 await page.getByRole('tabpanel',{name:'Day',exact:true}).waitFor();
 await weeks.click();
 await page.setViewportSize({width:390,height:844});await page.locator('.language-selector select').selectOption('zh');
 await page.getByRole('combobox',{name:'客户',exact:true}).selectOption('2');
 if(await page.locator('.hc-pet').count()!==3)throw Error('Chinese customer filter');
 if(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth))throw Error('Mobile overflow');
 await page.screenshot({path:'test-results/calendar-customer-mobile-zh.png',fullPage:true});
});

test('add-pet calendar selects available stays and grays out continuous unavailable time ranges',async({page})=>{
 await page.goto('/#/house-calendar');
 await page.getByRole('button',{name:'Room settings: Sample house A · Room 1',exact:true}).click();
 await page.getByLabel('Maximum capacity',{exact:true}).fill('4');
 await page.getByLabel('Dog capacity usage',{exact:true}).fill('1');
 await page.getByRole('button',{name:'Apply to preview',exact:true}).click();
 await page.getByRole('button',{name:'Add booking',exact:true}).click();
 const dialog=page.getByRole('dialog');
 await dialog.getByRole('combobox',{name:'Pet',exact:true}).selectOption('Willow');
 const dates=await page.evaluate(()=>{const a=new Date();a.setHours(11,0,0,0);a.setDate(a.getDate()+1);const end=new Date(a);end.setDate(end.getDate()+1);const local=(d:Date)=>new Date(d.getTime()-d.getTimezoneOffset()*60000).toISOString().slice(0,16);return [local(a),local(end)];});
 await dialog.getByLabel('Arrival',{exact:true}).fill(dates[0]);await dialog.getByLabel('Pickup',{exact:true}).fill(dates[1]);
 await reviewDays(page);await dialog.getByRole('button',{name:'Choose a room',exact:true}).click();
 const calendar=page.getByRole('region',{name:'Room availability calendar',exact:true});
 const blocked=calendar.locator('button.hc-time-unavailable');
 if(!await blocked.count())throw Error('No blackout cells');
 if(!await blocked.first().isDisabled())throw Error('Blackout cell enabled');
 if(await blocked.first().evaluate(e=>getComputedStyle(e).backgroundColor)!=='rgb(229, 231, 227)')throw Error('Unavailable range is not gray');
 await calendar.getByRole('button',{name:'Choose Sample house A · Room 1',exact:true}).click();
 await dialog.getByRole('button',{name:'Review stay',exact:true}).waitFor();
 if(await dialog.getByRole('button',{name:'Review stay',exact:true}).isDisabled())throw Error('Available stay not selectable');
 if(await calendar.locator('.hc-time-request.picked').count()!==1)throw Error('Selected stay not marked');
 const track=calendar.locator('.hc-time-track').first();const box=await track.boundingBox();if(!box)throw Error('Timeline missing');
 await track.click({position:{x:box.width*.5,y:10}});
 if(await calendar.locator('.hc-time-request.picked').count()!==1)throw Error('Free-time click did not select stay');
 await dialog.getByRole('button',{name:'Review stay',exact:true}).click();
 await coverStay(page);
 await dialog.getByRole('button',{name:'Add to preview',exact:true}).click();
 await page.getByRole('button',{name:'Remove placement: Willow',exact:true}).waitFor();
 await page.setViewportSize({width:390,height:844});await page.locator('.language-selector select').selectOption('zh');
 await page.getByRole('button',{name:'添加预约',exact:true}).click();
 await page.getByRole('combobox',{name:'宠物',exact:true}).selectOption('Miso');
 await page.getByLabel('到店时间',{exact:true}).fill(dates[0]);await page.getByLabel('接回时间',{exact:true}).fill(dates[1]);
 await page.getByLabel('所需天数',{exact:true}).fill('1');await page.getByRole('button',{name:'选择房间',exact:true}).click();
 if(!await page.locator('.hc-time-unavailable').count())throw Error('Chinese blackouts missing');
 if(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth))throw Error('Mobile page overflow');
 await page.getByRole('button',{name:'下一周',exact:true}).click();
 await page.screenshot({path:'test-results/add-pet-calendar-mobile-zh.png',fullPage:true});
});

test('boarding balance history stays separate by pet and rejects invalid adjustments',async({page})=>{
 await page.goto('/#/house-calendar');await page.getByRole('button',{name:/^Mochi: Checked in/}).click();await page.getByRole('button',{name:'View pet balance',exact:true}).click();await page.getByLabel('Balance customer',{exact:true}).selectOption('all');
 await page.getByRole('button',{name:'Add balance',exact:true}).click();
 await page.getByLabel('Days',{exact:true}).fill('3');await page.getByLabel('Reason',{exact:true}).fill('[TEST] opening days');
 const dates=await page.evaluate(()=>{const y=new Date().getFullYear();return [y+'-01-01',(y+1)+'-12-31'];});
 await page.getByLabel('Valid from',{exact:true}).fill(dates[0]);await page.getByLabel('Valid through',{exact:true}).fill(dates[1]);
 await page.getByRole('button',{name:'Add balance',exact:true}).click();
 if(await page.locator('.hc-balance-metrics strong').first().textContent()!=='3')throw Error('Opening balance');
 await page.getByRole('button',{name:'Balance: Biscuit',exact:true}).click();
 if(await page.locator('.hc-balance-metrics strong').first().textContent()!=='—')throw Error('Borrowed another pet balance');
 await page.getByRole('button',{name:'Balance: Mochi',exact:true}).click();

 if(await page.getByRole('button',{name:'Daycare',exact:true}).count())throw Error('Daycare must not be offered');
 await page.getByRole('button',{name:'Add balance',exact:true}).click();
 await page.getByLabel('Adjustment',{exact:true}).selectOption('remove');await page.getByLabel('Days',{exact:true}).fill('4');await page.getByLabel('Reason',{exact:true}).fill('[TEST] invalid correction');
 await page.getByRole('button',{name:'Save adjustment',exact:true}).click();await page.getByRole('alert').waitFor();
 page.once('dialog',async d=>{await d.accept();});await page.getByRole('button',{name:'Cancel',exact:true}).click();
 if(await page.locator('.hc-balance-metrics strong').first().textContent()!=='3')throw Error('Invalid adjustment changed balance');

 if(await page.locator('.hc-balance-history>div').count()!==1)throw Error('Invalid adjustment added history');
 await page.getByRole('button',{name:'Close',exact:true}).click();await page.setViewportSize({width:390,height:844});await page.locator('.language-selector select').selectOption('zh');await page.getByRole('button',{name:/^Mochi: 已入住/}).click();await page.getByRole('button',{name:'查看宠物余额',exact:true}).click();await page.getByLabel('余额客户',{exact:true}).selectOption('all');
 if(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth))throw Error('Balance mobile overflow');
 await page.screenshot({path:'test-results/pet-balances-mobile-zh.png'});
});

test('stay review blocks insufficient balance and tracks planned coverage after correction',async({page})=>{
 await page.setViewportSize({width:1440,height:1100});
 await page.goto('/#/house-calendar');await page.getByRole('button',{name:'Room settings: Sample house A · Room 1',exact:true}).click();await page.getByLabel('Maximum capacity',{exact:true}).fill('4');await page.getByLabel('Dog capacity usage',{exact:true}).fill('1');await page.getByRole('button',{name:'Apply to preview',exact:true}).click();
 await page.getByRole('button',{name:'Add booking',exact:true}).click();await page.getByRole('combobox',{name:'Pet',exact:true}).selectOption('Willow');
 const dates=await page.evaluate(()=>{const a=new Date();a.setDate(a.getDate()+1);a.setHours(11,0,0,0);const b=new Date(a);b.setDate(b.getDate()+1);const key=(d:Date)=>new Date(d.getTime()-d.getTimezoneOffset()*60000).toISOString().slice(0,16);return [key(a),key(b)];});
 await page.getByLabel('Arrival',{exact:true}).fill(dates[0]);await page.getByLabel('Pickup',{exact:true}).fill(dates[1]);await reviewDays(page);await page.getByLabel('Required days',{exact:true}).fill('2');await page.getByRole('button',{name:'Choose a room',exact:true}).click();await page.getByRole('button',{name:'Choose Sample house A · Room 1',exact:true}).click();await page.getByRole('button',{name:'Review stay',exact:true}).click();
 if(!await page.getByRole('button',{name:'Add to preview',exact:true}).isDisabled())throw Error('Missing balance allowed stay');
 await coverStay(page,'1');await page.getByRole('heading',{name:'Not enough days for this stay',exact:true}).waitFor();
 if(!await page.getByRole('button',{name:'Add to preview',exact:true}).isDisabled())throw Error('Insufficient balance allowed stay');
 await page.getByRole('button',{name:'Manage pet balance',exact:true}).click();await page.getByRole('button',{name:'Add balance',exact:true}).click();await page.getByLabel('Days',{exact:true}).fill('2');await page.getByLabel('Reason',{exact:true}).fill('[TEST] add coverage');await page.getByRole('button',{name:'Add balance',exact:true}).click();
 await page.getByRole('heading',{name:'Balance covers this stay',exact:true}).waitFor();await page.screenshot({path:'test-results/stay-balance-review.png'});await page.getByRole('button',{name:'Add to preview',exact:true}).click();
 await page.getByRole('button',{name:/^Mochi: Checked in/}).click();await page.getByRole('button',{name:'View pet balance',exact:true}).click();await page.getByLabel('Balance customer',{exact:true}).selectOption('all');await page.getByRole('button',{name:'Balance: Willow',exact:true}).click();
 const metrics=await page.locator('.hc-balance-metrics strong').allTextContents();if(metrics.join()!=='3,2,1')throw Error('Planned balance not tracked: '+metrics.join());
});

test('balance policy templates reuse dates without sharing credits and reasons are optional',async({page})=>{
 await page.setViewportSize({width:1440,height:1100});
 await page.goto('/#/house-calendar');await page.getByRole('button',{name:/^Mochi: Checked in/}).click();await page.getByRole('button',{name:'View pet balance',exact:true}).click();await page.getByLabel('Balance customer',{exact:true}).selectOption('all');
 await page.getByRole('button',{name:'Add balance',exact:true}).click();
 await page.locator('.hc-template-create summary').click();await page.getByRole('button',{name:'Save template',exact:true}).click();await page.getByRole('alert').waitFor();
 await page.getByLabel('Valid from',{exact:true}).fill('2026-01-01');await page.getByLabel('Valid through',{exact:true}).fill('2026-12-31');
 await page.getByLabel('New template name',{exact:true}).fill('Reviewed boarding dates');await page.getByRole('button',{name:'Save template',exact:true}).click();
 if(await page.getByText('Eligible months',{exact:true}).count())throw Error('Redundant month policy');
 await page.screenshot({path:'test-results/balance-policy-template-desktop.png'});
 await page.getByLabel('Days',{exact:true}).fill('10');await page.getByRole('button',{name:'Add balance',exact:true}).click();
 await page.getByRole('button',{name:'Balance: Biscuit',exact:true}).click();await page.getByRole('button',{name:'Add balance',exact:true}).click();
 await page.getByLabel('Policy template',{exact:true}).selectOption({label:'Reviewed boarding dates'});
 if(await page.getByLabel('Valid through',{exact:true}).inputValue()!=='2026-12-31')throw Error('Template dates not copied');
 await page.getByLabel('Valid through',{exact:true}).fill('2026-11-30');await page.getByLabel('Days',{exact:true}).fill('5');await page.getByRole('button',{name:'Add balance',exact:true}).click();
 await page.getByRole('button',{name:'Close',exact:true}).click();await page.getByRole('button',{name:/^Mochi: Checked in/}).click();await page.getByRole('button',{name:'View pet balance',exact:true}).click();await page.getByLabel('Balance customer',{exact:true}).selectOption('all');
 if(await page.locator('.hc-balance-metrics strong').first().textContent()!=='10')throw Error('Template shared credits');
 await page.getByText('2026-01-01 → 2026-12-31',{exact:true}).waitFor();
 await page.getByRole('button',{name:'Add balance',exact:true}).click();
 if(await page.locator('.hc-balance-policy').getAttribute('open')!==null)throw Error('Adjustment policy should be collapsed');
 await page.locator('.hc-balance-policy>summary').click();
 await page.getByLabel('Policy template',{exact:true}).selectOption({label:'Reviewed boarding dates'});
 await page.getByRole('button',{name:'Cancel',exact:true}).click();await page.getByRole('button',{name:'Close',exact:true}).click();
 await page.setViewportSize({width:390,height:844});await page.locator('.language-selector select').selectOption('zh');await page.getByRole('button',{name:/^Mochi: 已入住/}).click();await page.getByRole('button',{name:'查看宠物余额',exact:true}).click();await page.getByLabel('余额客户',{exact:true}).selectOption('all');await page.getByRole('button',{name:'增加余额',exact:true}).click();
 if(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth))throw Error('Setup mobile overflow');
 await page.screenshot({path:'test-results/balance-setup-mobile-zh.png'});
});
