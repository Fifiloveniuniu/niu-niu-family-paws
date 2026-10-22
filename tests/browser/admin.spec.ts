import { test, expect } from '@playwright/test';

test.beforeEach(async ({page})=>{
  await page.route('**/api/profile',route=>route.fulfill({status:204}));
});

test('signed-out portal, bilingual navigation, and public FAQs work on mobile', async ({page}) => {
  await page.setViewportSize({width:400,height:860});
  await page.goto('/#/admin');
  await expect(page.getByRole('button',{name:'Continue with Google'})).toBeVisible();
  await expect(page.getByRole('heading',{name:'Administrator dashboard'})).toHaveCount(0);
  await page.getByRole('button',{name:'简体中文'}).click();
  await page.reload();
  await expect(page.getByRole('button',{name:'使用 Google 继续'})).toBeVisible();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await page.screenshot({path:'test-results/admin-sign-in-mobile-zh.png',fullPage:true});
  await page.getByRole('link',{name:'返回网站'}).click();
  await page.getByText('如何安排托管？',{exact:true}).click();
  await expect(page.locator('details').first()).toHaveAttribute('open','');
});

test('only verified admins see dashboard; sign-out clears access', async ({page,request}) => {
  const email=`portal-${Date.now()}@example.test`;
  const created=await request.post('http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/accounts:signUp?key=demo-key', {data:{email,password:'emulator-only-password',returnSecureToken:true}});
  const {localId}=await created.json();
  expect(localId).toBeTruthy();
  await page.goto('/#/admin');
  await expect(page.getByRole('button',{name:'Continue with Google'})).toBeVisible();
  await page.evaluate(async ({email})=>{
    // The development server exposes modules only in this isolated test mode.
    const {auth}=await import('/apps/web/src/auth-client.ts');
    const {signInWithEmailAndPassword}=await import('/node_modules/.vite/deps/firebase_auth.js');
    await signInWithEmailAndPassword(auth,email,'emulator-only-password');
  },{email});
  await expect(page.getByRole('heading',{name:'Verified account required'})).toBeVisible();
  const update=async (claims:object)=>{
    const response=await request.post('http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/projects/demo-niu-niu/accounts:update',{headers:{Authorization:'Bearer owner'},data:{localId,emailVerified:true,customAttributes:JSON.stringify(claims)}});
    expect(response.ok(),await response.text()).toBe(true);
    await page.getByRole('button',{name:'Refresh access'}).click();
  };
  await update({admin:'true'});
  await expect(page.getByRole('heading',{name:'Customer account',exact:true})).toBeVisible();
  await update({employee:true});
  await expect(page.getByRole('heading',{name:'Staff account',exact:true})).toBeVisible();
  await expect(page.getByRole('heading',{name:'Administrator dashboard'})).toHaveCount(0);
  await update({admin:true});
  await expect(page.getByRole('heading',{name:'Administrator dashboard'})).toBeVisible();
  await page.screenshot({path:'test-results/admin-dashboard-en.png',fullPage:true});
  await page.reload();
  await expect(page.getByRole('heading',{name:'Administrator dashboard'})).toBeVisible();
  await update({});
  await expect(page.getByRole('heading',{name:'Customer account',exact:true})).toBeVisible();
  await expect(page.getByText('You’re signed in. Complete or update your profile below.', {exact:true})).toBeVisible();
  await page.getByRole('button',{name:'Sign out'}).click();
  await expect(page.getByRole('button',{name:'Continue with Google'})).toBeVisible();
  await page.reload();
  await expect(page.getByRole('button',{name:'Continue with Google'})).toBeVisible();
});

test('administrator can add, edit and search customers in both languages on mobile', async ({page,request}) => {
  const email=`customers-${Date.now()}@example.test`;
  const created=await request.post('http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/accounts:signUp?key=demo-key',{data:{email,password:'emulator-only-password',returnSecureToken:true}});
  const {localId}=await created.json();
  const updated=await request.post('http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/projects/demo-niu-niu/accounts:update',{headers:{Authorization:'Bearer owner'},data:{localId,emailVerified:true,customAttributes:JSON.stringify({admin:true})}});
  expect(updated.ok()).toBe(true);
  let customers:any[]=[];
  const queries:string[]=[];
  await page.route('**/api/customers**',async route=>{
    const req=route.request();
    expect(req.headers().authorization).toMatch(/^Bearer /);
    if(req.method()==='PUT'){
      const input=req.postDataJSON();
      const customer={...input,id:new URL(req.url()).pathname.split('/').at(-1),version:input.version+1,createdAt:'2026-10-19T00:00:00Z',updatedAt:'2026-10-19T00:00:00Z'};
      customers=[customer];
      await route.fulfill({json:customer});
    }else{
      const query=new URL(req.url()).searchParams.get('search')||'';queries.push(query);
      await route.fulfill({json:{items:customers.filter(c=>c.name.toLowerCase().startsWith(query.toLowerCase())),nextCursor:null}});
    }
  });
  await page.setViewportSize({width:400,height:860});
  await page.goto('/#/admin');
  await expect(page.getByRole('button',{name:'Continue with Google'})).toBeVisible();
  await page.evaluate(async ({email})=>{
    const {auth}=await import('/apps/web/src/auth-client.ts');
    const {signInWithEmailAndPassword}=await import('/node_modules/.vite/deps/firebase_auth.js');
    await signInWithEmailAndPassword(auth,email,'emulator-only-password');
  },{email});
  await page.getByRole('button',{name:'Add customer',exact:true}).click();
  await page.getByRole('textbox',{name:'Customer name'}).fill('Alice');
  await page.getByRole('textbox',{name:'Email (optional)',exact:true}).fill('alice@example.test');
  await page.getByRole('button',{name:'Save customer',exact:true}).click();
  await expect(page.getByRole('heading',{name:'Alice',exact:true})).toBeVisible();
  await page.getByRole('button',{name:'Edit customer: Alice',exact:true}).click();
  await page.getByRole('textbox',{name:'Customer name'}).fill('Alice Chen');
  await page.getByRole('button',{name:'Save customer',exact:true}).click();
  await expect(page.getByRole('heading',{name:'Alice Chen',exact:true})).toBeVisible();
  expect(customers[0].version).toBe(2);
  await page.getByRole('searchbox',{name:'Start of customer name, contact email, or Google email',exact:true}).fill('Bob');
  await page.getByRole('button',{name:'Search customers',exact:true}).click();
  await expect(page.getByText('No matching customers.',{exact:true})).toBeVisible();
  await page.getByRole('searchbox',{name:'Start of customer name, contact email, or Google email',exact:true}).fill('Alice');
  await page.getByRole('button',{name:'Search customers',exact:true}).click();
  await expect(page.getByRole('heading',{name:'Alice Chen',exact:true})).toBeVisible();
  expect(queries).toContain('Alice');
  const pets:any[]=[];
  await page.route('**/api/customers/*/pets**',async route=>{
    if(route.request().method()==='GET')return route.fulfill({json:{items:pets,nextCursor:null}});
    const input=route.request().postDataJSON(),id=route.request().url().split('/').at(-1);
    const pet={id,customerId:customers[0].id,...input,photo:null,version:input.version+1,createdAt:'2026-10-22',updatedAt:'2026-10-22'};
    const previous=pets.find(p=>p.id===id);if(previous)Object.assign(previous,pet);else pets.push(pet);
    return route.fulfill({json:pet});
  });
  await page.route('**/api/pet-search?**',route=>route.fulfill({json:{items:pets.map(pet=>({pet,customer:{id:customers[0].id,name:customers[0].name,loginEmail:null}})),nextCursor:null}}));
  await page.getByRole('combobox',{name:'Choose a customer to manage pets',exact:true}).selectOption(customers[0].id);
  const petSection=page.getByRole('region',{name:'Customer’s pets',exact:true});
  await petSection.getByRole('button',{name:'Add pet',exact:true}).click();
  await petSection.getByRole('textbox',{name:'Pet name',exact:true}).fill('Admin sample pet');
  await petSection.getByRole('button',{name:'Save pet',exact:true}).click();
  await expect(petSection.getByRole('heading',{name:'Admin sample pet',exact:true})).toBeVisible();
  await page.getByRole('searchbox',{name:'Start of pet name',exact:true}).fill('Admin');
  await page.getByRole('button',{name:'Search pet names',exact:true}).click();
  await expect(page.getByText('Customer: Alice Chen',{exact:true})).toBeVisible();
  await page.getByRole('button',{name:'Manage these pets',exact:true}).click();
  await petSection.getByRole('button',{name:'Edit pet: Admin sample pet',exact:true}).click();
  await petSection.getByRole('textbox',{name:'Pet name',exact:true}).fill('Admin renamed pet');
  await petSection.getByRole('button',{name:'Save pet',exact:true}).click();
  await expect(petSection.getByRole('heading',{name:'Admin renamed pet',exact:true})).toBeVisible();
  await page.getByRole('button',{name:'简体中文'}).click();
  await expect(page.getByRole('button',{name:'添加客户',exact:true})).toBeVisible();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await page.screenshot({path:'test-results/customers-mobile-zh.png',fullPage:true});
});

test('prominent shared sign-in works from the home page in English and Chinese', async ({page}) => {
  await page.goto('/');
  await expect(page.locator('header').getByRole('link',{name:'Sign in',exact:true})).toBeVisible();
  await expect(page.getByRole('link',{name:'Sign in',exact:true})).toHaveCount(1);
  await page.screenshot({path:'test-results/shared-login-desktop-en.png',fullPage:true});
  await page.locator('header').getByRole('link',{name:'Sign in',exact:true}).click();
  await expect(page).toHaveURL(/#\/login$/);
  await expect(page.getByRole('button',{name:'Continue with Google'})).toBeVisible();
  await expect(page.getByText('Continue with your Google account.',{exact:false})).toBeVisible();
  await page.getByRole('link',{name:'Back to website'}).click();
  await page.setViewportSize({width:400,height:860});
  await page.getByRole('button',{name:'简体中文'}).click();
  await expect(page.locator('header').getByRole('link',{name:'登录',exact:true})).toBeVisible();
  await expect(page.getByRole('link',{name:'登录',exact:true})).toHaveCount(1);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await page.screenshot({path:'test-results/shared-login-mobile-zh.png',fullPage:true});
  await page.locator('header').getByRole('link',{name:'登录',exact:true}).click();
  await expect(page.getByRole('button',{name:'使用 Google 继续'})).toBeVisible();
  await page.reload();
  await expect(page.getByRole('button',{name:'使用 Google 继续'})).toBeVisible();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await page.screenshot({path:'test-results/shared-login-portal-mobile-zh.png',fullPage:true});
});
