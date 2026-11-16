import {test,expect} from '@playwright/test';

test('customer list selects the correct pets in bilingual responsive panels and protects drafts',async({page,request})=>{
  const email=`panels-${Date.now()}@example.test`;
  const signup=await request.post('http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/accounts:signUp?key=demo-key',{data:{email,password:'emulator-only-password',returnSecureToken:true}});
  const {localId}=await signup.json();
  await request.post('http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/projects/demo-niu-niu/accounts:update',{headers:{Authorization:'Bearer owner'},data:{localId,emailVerified:true,customAttributes:JSON.stringify({admin:true})}});
  const customers=['Sample Alex','示例小雨'].map((name,index)=>({id:`10000000-0000-4000-8000-00000000004${index}`,name,email:'',phone:'',language:'en',loginEmail:email,version:1}));
  await page.route('**/api/customers?*',route=>route.fulfill({json:{items:customers,nextCursor:null}}));
  let failPetLoad=true;
  await page.route('**/api/customers/*/pets',route=>{
    if(failPetLoad){return route.fulfill({status:503,json:{error:'unavailable'}});}
    const customerId=route.request().url().split('/').at(-2)!;
    return route.fulfill({json:{items:[{id:'10000000-0000-4000-8000-000000000050',customerId,name:customerId===customers[0].id?'Sample Mochi':'示例豆豆',photo:null,version:1}],nextCursor:null}});
  });
  await page.goto('/#/login');
  await expect(page.getByRole('button',{name:'Continue with Google'})).toBeVisible();
  await page.evaluate(async({email})=>{
    const {auth}=await import('/apps/web/src/auth-client.ts');
    const {signInWithEmailAndPassword}=await import('/node_modules/.vite/deps/firebase_auth.js');
    await signInWithEmailAndPassword(auth,email,'emulator-only-password');
  },{email});
  await expect(page.getByRole('button',{name:/Reload|Refresh session/})).toHaveCount(0);
  await page.getByRole('link',{name:'Customers',exact:true}).click();
  const left=page.getByRole('region',{name:'Customer list',exact:true});
  const right=page.getByRole('region',{name:'Selected customer pets',exact:true});
  await expect(right.getByText('Select a customer from the list to view and manage their pets.')).toBeVisible();
  await expect(left.getByRole('button',{name:/Manage pets/})).toHaveCount(0);
  const alexRow=left.locator('li').filter({has:page.getByRole('button',{name:'Sample Alex',exact:true})});
  const otherRow=left.locator('li').filter({has:page.getByRole('button',{name:'示例小雨',exact:true})});
  const background=await alexRow.evaluate(element=>getComputedStyle(element).backgroundColor);
  await alexRow.hover();
  await expect.poll(()=>alexRow.evaluate(element=>getComputedStyle(element).backgroundColor)).not.toBe(background);
  // Clicking the contact area, outside the name and action buttons, selects the row.
  await alexRow.click({position:{x:24,y:90}});
  await expect(left.getByRole('button',{name:'Sample Alex',exact:true})).toHaveAttribute('aria-pressed','true');
  await expect(right.getByRole('button',{name:'Try again',exact:true})).toBeVisible();
  failPetLoad=false;
  await right.getByRole('button',{name:'Try again',exact:true}).click();
  await expect(right.getByRole('button',{name:'Try again',exact:true})).toHaveCount(0);
  await expect(right.getByRole('heading',{name:'Sample Mochi',exact:true})).toBeVisible();
  await expect(page.getByRole('button',{name:/Reload|Refresh session/})).toHaveCount(0);
  await expect(alexRow).toHaveClass('selected-customer');
  await expect(page.getByText(/^(✓ Selected|SELECTED CUSTOMER)$/)).toHaveCount(0);
  await otherRow.hover();
  await expect(left.getByRole('button',{name:'Sample Alex',exact:true})).toHaveAttribute('aria-pressed','true');
  await expect(right.getByRole('heading',{name:'Sample Mochi',exact:true})).toBeVisible();
  await left.getByRole('button',{name:'Edit customer: 示例小雨',exact:true}).click();
  await expect(left.getByRole('textbox',{name:'Customer name',exact:true})).toHaveValue('示例小雨');
  await expect(left.getByRole('button',{name:'Sample Alex',exact:true})).toHaveAttribute('aria-pressed','true');
  await left.getByRole('button',{name:'Cancel',exact:true}).click();
  const l=await left.boundingBox(),r=await right.boundingBox();
  expect(l!.x+l!.width).toBeLessThan(r!.x);
  await expect(page.getByRole('region',{name:'Customer filters',exact:true})).toBeVisible();
  await expect(page.getByRole('searchbox',{name:'Start of pet name',exact:true})).toBeVisible();
  await page.locator('.customer-pet-layout').screenshot({path:'test-results/customer-panels-desktop.png'});
  await page.screenshot({path:'test-results/clean-workspace-desktop.png',fullPage:true});
  await right.getByRole('button',{name:'Add pet',exact:true}).click();
  await right.getByRole('textbox',{name:'Pet name',exact:true}).fill('Unsaved draft');
  page.once('dialog',dialog=>dialog.dismiss());
  await page.getByRole('button',{name:'Close',exact:true}).click();
  await expect(right.getByRole('textbox',{name:'Pet name',exact:true})).toHaveValue('Unsaved draft');
  await expect(left.getByRole('button',{name:'Sample Alex',exact:true})).toHaveAttribute('aria-pressed','true');
  page.once('dialog',dialog=>dialog.accept());
  await page.getByRole('button',{name:'Close',exact:true}).click();
  await left.getByRole('button',{name:'示例小雨',exact:true}).click();
  await expect(right.getByRole('heading',{name:'示例豆豆',exact:true})).toBeVisible();
  await expect(right.getByRole('heading',{name:'Sample Mochi',exact:true})).toHaveCount(0);
  for(const language of ['en','zh']){
    await page.getByRole('combobox',{name:'Language / 语言',exact:true}).selectOption(language);
    await expect(page.locator('.customer-directory-panel').getByRole('button',{name:/Manage pets|管理宠物/})).toHaveCount(0);
    await expect(page.locator('.selected-customer')).toHaveCount(1);
    await expect(page.getByText(/^(✓ Selected|SELECTED CUSTOMER|✓ 已选择|所选客户)$/)).toHaveCount(0);
    for(const width of [320,400,1280]){
      await page.setViewportSize({width,height:900});
      expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
    }
  }
  await page.setViewportSize({width:400,height:900});
  await page.locator('.customer-directory-panel').getByRole('button',{name:'Sample Alex',exact:true}).click();
  const mobilePets=page.getByRole('region',{name:'所选客户的宠物',exact:true});
  await expect(mobilePets).toBeFocused();
  await expect(mobilePets.getByText('尚未添加照片',{exact:true})).toBeInViewport();
  await mobilePets.getByRole('button',{name:'← 客户列表',exact:true}).click();
  await expect(page.locator('.customer-directory-panel')).toBeFocused();
  await page.locator('.customer-directory-panel').getByRole('button',{name:'Sample Alex',exact:true}).click();
  await expect(mobilePets).toBeFocused();
  await page.locator('.customer-pet-layout').screenshot({path:'test-results/customer-panels-mobile-zh.png'});
  await page.screenshot({path:'test-results/clean-workspace-mobile-zh.png',fullPage:true});
});
