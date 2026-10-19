import { test, expect } from '@playwright/test';

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
  await expect(page.getByRole('heading',{name:'Administrator access required'})).toBeVisible();
  const update=async (claims:object)=>{
    const response=await request.post('http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/projects/demo-niu-niu/accounts:update',{headers:{Authorization:'Bearer owner'},data:{localId,emailVerified:true,customAttributes:JSON.stringify(claims)}});
    expect(response.ok(),await response.text()).toBe(true);
    await page.getByRole('button',{name:'Refresh access'}).click();
  };
  await update({admin:'true'});
  await expect(page.getByRole('heading',{name:'Administrator access required'})).toBeVisible();
  await update({admin:true});
  await expect(page.getByRole('heading',{name:'Administrator dashboard'})).toBeVisible();
  await page.screenshot({path:'test-results/admin-dashboard-en.png',fullPage:true});
  await page.reload();
  await expect(page.getByRole('heading',{name:'Administrator dashboard'})).toBeVisible();
  await update({});
  await expect(page.getByRole('heading',{name:'Administrator access required'})).toBeVisible();
  await page.getByRole('button',{name:'Sign out'}).click();
  await expect(page.getByRole('button',{name:'Continue with Google'})).toBeVisible();
  await page.reload();
  await expect(page.getByRole('button',{name:'Continue with Google'})).toBeVisible();
});
