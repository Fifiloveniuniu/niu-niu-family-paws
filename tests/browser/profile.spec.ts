import {test,expect} from '@playwright/test';

test('customer saves their own profile, keeps edits during access refresh, and retries without changing owner',async({page,request})=>{
  const email=`profile-${Date.now()}@example.test`;
  const response=await request.post('http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/accounts:signUp?key=demo-key',{data:{email,password:'emulator-only-password',returnSecureToken:true}});
  const {localId}=await response.json();
  await request.post('http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/projects/demo-niu-niu/accounts:update',{headers:{Authorization:'Bearer owner'},data:{localId,emailVerified:true}});
  let profile:any=null, writes:any[]=[];
  await page.route('**/api/customers/*/pets',route=>route.fulfill({json:{items:[],nextCursor:null}}));
  let loseResponse=true;
  await page.route('**/api/profile',async route=>{
    const req=route.request();expect(req.headers().authorization).toMatch(/^Bearer /);
    if(req.method()==='GET')return route.fulfill(profile?{json:profile}:{status:204});
    const input=req.postDataJSON();writes.push(input);
    expect(Object.keys(input).sort()).toEqual(['language','name','version']);
    profile={id:'10000000-0000-4000-8000-000000000010',...input,version:1,email:'',phone:'',loginEmail:email,createdAt:'2026-10-22T00:00:00Z',updatedAt:'2026-10-22T00:00:00Z'};
    if(loseResponse){loseResponse=false;return route.abort();}
    return route.fulfill({json:profile});
  });
  await page.setViewportSize({width:400,height:860});
  await page.goto('/#/login');
  await expect(page.getByRole('button',{name:'Continue with Google'})).toBeVisible();
  await page.evaluate(async({email})=>{
    const {auth}=await import('/apps/web/src/auth-client.ts');
    const {signInWithEmailAndPassword}=await import('/node_modules/.vite/deps/firebase_auth.js');
    await signInWithEmailAndPassword(auth,email,'emulator-only-password');
  },{email});
  await expect(page.getByRole('heading',{name:'My profile',exact:true})).toBeVisible();
  await expect(page.getByRole('button',{name:'Add customer',exact:true})).toHaveCount(0);
  await page.getByRole('textbox',{name:'Your name',exact:true}).fill('王小明');
  await page.getByRole('button',{name:'Refresh session',exact:true}).click();
  await expect(page.getByRole('textbox',{name:'Your name',exact:true})).toHaveValue('王小明');
  await page.getByRole('combobox',{name:'Your preferred language',exact:true}).selectOption('zh');
  await page.getByRole('combobox',{name:'Language / 语言',exact:true}).selectOption('zh');
  await expect(page.getByRole('textbox',{name:'您的姓名',exact:true})).toHaveValue('王小明');
  await expect(page.getByRole('combobox',{name:'您的首选语言',exact:true})).toHaveValue('zh');
  await page.getByRole('combobox',{name:'Language / 语言',exact:true}).selectOption('en');
  await expect(page.getByRole('combobox',{name:'Your preferred language',exact:true})).toHaveValue('zh');
  await page.getByRole('button',{name:'Save profile',exact:true}).click();
  await expect(page.getByRole('button',{name:'Retry profile save',exact:true})).toBeVisible();
  await expect(page.getByRole('textbox',{name:'Your name',exact:true})).toBeDisabled();
  await page.getByRole('button',{name:'Retry profile save',exact:true}).click();
  await expect(page.getByText('Your profile is saved.',{exact:true})).toBeVisible();
  expect(writes).toHaveLength(2);expect(writes[0]).toEqual(writes[1]);
  await page.getByRole('combobox',{name:'Language / 语言',exact:true}).selectOption('zh');
  await page.reload();
  await expect(page.getByRole('textbox',{name:'您的姓名',exact:true})).toHaveValue('王小明');
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await page.screenshot({path:'test-results/profile-mobile-zh.png',fullPage:true});
  await page.getByRole('button',{name:'退出登录',exact:true}).click();
  await expect(page.getByRole('heading',{name:'我的资料',exact:true})).toHaveCount(0);
});
