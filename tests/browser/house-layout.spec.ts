import {test,expect} from '@playwright/test';
test('admin configures a house map with editable spaces, sharing, species, weight limits and closures',async({page,request})=>{
  const email=`layout-${Date.now()}@example.test`,h='10000000-0000-4000-8000-000000000001';
  const signup=await request.post('http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/accounts:signUp?key=demo-key',{data:{email,password:'emulator-only-password',returnSecureToken:true}});const {localId}=await signup.json();
  await request.post('http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/projects/demo-niu-niu/accounts:update',{headers:{Authorization:'Bearer owner'},data:{localId,emailVerified:true,customAttributes:JSON.stringify({admin:true})}});
  let rooms:any[]=[];const writes:any[]=[];
  await page.route('**/api/customers?*',route=>route.fulfill({json:{items:[],nextCursor:null}}));await page.route('**/api/profile',route=>route.fulfill({status:204}));
  await page.route('**/api/houses',route=>route.fulfill({json:{items:[{id:h,name:'Demo house',address:'',timezone:'America/Los_Angeles',version:1}]}}));
  await page.route('**/api/houses/*/layout',route=>route.fulfill({json:{rooms}}));
  await page.route('**/api/houses/*/rooms/*',route=>{
    const body=route.request().postDataJSON(),id=route.request().url().split('/').at(-1),previous=rooms.find(x=>x.room.id===id);
    rooms=[...rooms.filter(x=>x.room.id!==id),{room:{...body,id,version:body.version+1},spaces:previous?.spaces??[]}];return route.fulfill({json:rooms.at(-1).room});
  });
  await page.route('**/api/houses/*/rooms/*/spaces/*',route=>{
    const body=route.request().postDataJSON(),parts=route.request().url().split('/'),id=parts.at(-1),roomId=parts.at(-3),space={...body,id,version:body.version+1};writes.push(body);
    rooms=rooms.map(x=>x.room.id===roomId?{...x,spaces:[...x.spaces.filter((s:any)=>s.id!==id),space]}:x);return route.fulfill({json:space});
  });
  await page.goto('/#/login');await page.evaluate(async({email})=>{const {auth}=await import('/apps/web/src/auth-client.ts');const {signInWithEmailAndPassword}=await import('/node_modules/.vite/deps/firebase_auth.js');await signInWithEmailAndPassword(auth,email,'emulator-only-password');},{email});
  await page.getByRole('button',{name:'House map',exact:true}).click();const map=page.getByRole('region',{name:'Rooms & spaces',exact:true});
  await expect(map.getByText('No rooms yet. Add a room to start your house map.',{exact:true})).toBeVisible();await map.getByRole('button',{name:'Add room',exact:true}).click();
  const dialog=page.getByRole('dialog');await expect(dialog.getByLabel('Room name',{exact:true})).toBeFocused();await dialog.getByLabel('Room name',{exact:true}).fill('Quiet room');await dialog.getByRole('button',{name:'Save',exact:true}).click();
  const room=map.getByRole('article',{name:'Quiet room',exact:true});await room.getByRole('button',{name:'Add space',exact:true}).click();await dialog.getByLabel('Space name',{exact:true}).fill('Space A');
  await dialog.getByRole('combobox',{name:'Sharing',exact:true}).selectOption('same-household');await dialog.getByLabel('Pet capacity',{exact:true}).fill('2');
  await dialog.getByRole('checkbox',{name:'Cat',exact:true}).check();await dialog.getByRole('checkbox',{name:'Rabbit',exact:true}).check();await dialog.getByLabel('Maximum weight per pet (optional)',{exact:true}).fill('5.5');await dialog.getByRole('combobox',{name:'Weight unit',exact:true}).selectOption('lb');
  await dialog.getByRole('button',{name:'Save',exact:true}).click();const space=room.getByRole('button',{name:'Edit space: Space A',exact:true});await expect(space).toContainText('Pet capacity: 2');await expect(space).toContainText('Cat · Rabbit');await expect(space).toContainText('Up to 5.5 lb');
  expect(writes.at(-1)).toMatchObject({capacity:2,species:['cat','rabbit'],sharing:'same-household',weightLimit:{value:5.5,unit:'lb'}});
  await space.click();await dialog.getByRole('combobox',{name:'Sharing',exact:true}).selectOption('individual');await expect(dialog.getByLabel('Pet capacity',{exact:true})).toHaveValue('1');await expect(dialog.getByLabel('Pet capacity',{exact:true})).toHaveAttribute('readonly','');
  page.once('dialog',d=>d.dismiss());await dialog.getByRole('button',{name:'Close',exact:true}).click();await expect(dialog).toBeVisible();page.once('dialog',d=>d.accept());await dialog.getByRole('button',{name:'Cancel',exact:true}).click();
  await room.getByRole('button',{name:'Edit room: Quiet room',exact:true}).click();await dialog.getByRole('checkbox',{name:'Close this room',exact:true}).check();await dialog.getByRole('button',{name:'Save',exact:true}).click();await expect(space).toContainText('Closed');
  await page.getByRole('combobox',{name:'Language / 语言',exact:true}).selectOption('zh');await page.setViewportSize({width:400,height:900});await page.getByRole('region',{name:'房间与空间',exact:true}).screenshot({path:'test-results/house-map-mobile-zh.png'});
  for(const width of [320,400,1280]){await page.setViewportSize({width,height:900});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);}
  await page.getByRole('button',{name:'编辑空间: Space A',exact:true}).click();await expect(dialog.getByLabel('宠物容量',{exact:true})).toHaveValue('2');await dialog.getByRole('button',{name:'取消',exact:true}).click();
});
