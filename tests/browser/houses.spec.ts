import {test,expect} from '@playwright/test';
test('admin manages multiple houses in dialogs with retry safety, filtering and bilingual responsive layout',async({page,request})=>{
  const email=`houses-${Date.now()}@example.test`;
  const created=await request.post('http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/accounts:signUp?key=demo-key',{data:{email,password:'emulator-only-password',returnSecureToken:true}});
  const {localId}=await created.json();
  await request.post('http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/projects/demo-niu-niu/accounts:update',{headers:{Authorization:'Bearer owner'},data:{localId,emailVerified:true,customAttributes:JSON.stringify({admin:true})}});
  let items:any[]=[],lose=false;const writes:any[]=[];
  await page.route('**/api/customers?*',route=>route.fulfill({json:{items:[],nextCursor:null}}));
  await page.route('**/api/profile',route=>route.fulfill({status:204}));
  await page.route('**/api/houses*',route=>route.fulfill({json:{items}}));
  await page.route('**/api/houses/*',route=>{
    const body=route.request().postDataJSON(),id=route.request().url().split('/').at(-1);writes.push({id,...body});
    const prior=items.find(h=>h.id===id),house=prior?.version===body.version+1?prior:{id,...body,version:body.version+1,createdAt:prior?.createdAt??'2026-11-15',updatedAt:'2026-11-15'};
    items=[...items.filter(h=>h.id!==id),house];
    if(lose){lose=false;return route.fulfill({status:503,json:{code:'unavailable'}});}return route.fulfill({json:house});
  });
  await page.goto('/#/login');
  await page.evaluate(async({email})=>{
    const {auth}=await import('/apps/web/src/auth-client.ts');const {signInWithEmailAndPassword}=await import('/node_modules/.vite/deps/firebase_auth.js');
    await signInWithEmailAndPassword(auth,email,'emulator-only-password');
  },{email});
  await page.getByRole('link',{name:'Calendar',exact:true}).click();
  await page.getByRole('button',{name:'Manage houses & rooms',exact:true}).click();
  const section=page.getByRole('region',{name:'Houses',exact:true});
  await expect(section.getByText('No houses yet. Add your first house.',{exact:true})).toBeVisible();
  await section.getByRole('button',{name:'Add house',exact:true}).click();
  const dialog=page.getByRole('dialog').last();
  await expect(dialog.getByLabel('House name',{exact:true})).toBeFocused();
  await dialog.getByLabel('House name',{exact:true}).fill('Demo West');
  await dialog.getByLabel('Address (optional)',{exact:true}).fill('Synthetic address');
  await dialog.getByLabel('Time zone',{exact:true}).fill('America/Los_Angeles');
  page.once('dialog',d=>d.dismiss());await dialog.getByRole('button',{name:'Close',exact:true}).click();
  await expect(dialog.getByLabel('House name',{exact:true})).toHaveValue('Demo West');
  await dialog.getByRole('button',{name:'Save house',exact:true}).click();
  await expect(section.getByRole('heading',{name:'Demo West',exact:true})).toBeVisible();
  await section.getByRole('button',{name:'Add house',exact:true}).click();
  await dialog.getByLabel('House name',{exact:true}).fill('Demo East');await dialog.getByLabel('Time zone',{exact:true}).fill('Asia/Shanghai');
  await dialog.getByRole('button',{name:'Save house',exact:true}).click();
  await page.getByRole('combobox',{name:'Show house',exact:true}).selectOption('');
  await expect(section.getByRole('heading',{level:3})).toHaveCount(2);
  await section.getByRole('button',{name:'Edit house: Demo West',exact:true}).click();
  await dialog.getByLabel('House name',{exact:true}).fill('Demo West updated');lose=true;
  await dialog.getByRole('button',{name:'Save house',exact:true}).click();
  await expect(dialog.getByRole('button',{name:'Close',exact:true})).toBeDisabled();
  await expect(dialog.getByLabel('House name',{exact:true})).toBeDisabled();
  await dialog.getByRole('button',{name:'Try again',exact:true}).click();
  expect(writes.at(-1)).toEqual(writes.at(-2));expect(items).toHaveLength(2);
  await expect(section.getByRole('heading',{name:'Demo West updated',exact:true})).toBeVisible();
  await page.getByRole('combobox',{name:'Show house',exact:true}).selectOption('');
  for(const language of ['en','zh']){
    await page.getByRole('dialog').first().getByRole('button',{name:/^(Close|关闭)$/}).click();
    await page.getByRole('combobox',{name:'Language / 语言',exact:true}).selectOption(language);
    await page.getByRole('button',{name:language==='zh'?'管理房屋与房间':'Manage houses & rooms',exact:true}).click();
    for(const width of [320,400,1280]){
      await page.setViewportSize({width,height:900});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
    }
  }
  await page.getByRole('button',{name:'编辑房屋: Demo West updated',exact:true}).click();
  await expect(dialog.getByLabel('时区',{exact:true})).toHaveValue('America/Los_Angeles');
  await dialog.getByRole('button',{name:'取消',exact:true}).click();
  await page.getByRole('region',{name:'房屋',exact:true}).screenshot({path:'test-results/houses-desktop-zh.png'});
});
