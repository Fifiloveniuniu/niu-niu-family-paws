import {test,expect} from '@playwright/test';

test('administrator and customer complete linking without exposing records before approval',async({browser,request})=>{
  const adminContext=await browser.newContext(),customerContext=await browser.newContext({viewport:{width:400,height:860}});
  const admin=await adminContext.newPage(),customer=await customerContext.newPage();
  const id='10000000-0000-4000-8000-000000000077',code='ABCD-1234-ABCD-1234-ABCD-1234-ABCD-1234';
  let state:any={status:'none',version:0,customerVersion:1,customerName:'Existing customer'},linked=false;
  const record={id,name:'Existing customer',email:'contact@example.test',phone:'',language:'zh',version:1,loginEmail:null,createdAt:'2026-10-22',updatedAt:'2026-10-22'};
  const adminEmail=`link-admin-${Date.now()}@example.test`,customerEmail=`link-owner-${Date.now()}@example.test`;
  async function create(email:string,isAdmin:boolean){
    const r=await request.post('http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/accounts:signUp?key=demo-key',{data:{email,password:'emulator-only-password',returnSecureToken:true}});
    const {localId}=await r.json();await request.post('http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/projects/demo-niu-niu/accounts:update',{headers:{Authorization:'Bearer owner'},data:{localId,emailVerified:true,customAttributes:JSON.stringify(isAdmin?{admin:true}:{})}});
  }
  await create(adminEmail,true);await create(customerEmail,false);
  for(const context of [adminContext,customerContext]){
    await context.route('**/api/profile',route=>route.fulfill(linked&&context===customerContext?{json:{...record,loginEmail:customerEmail,version:2}}:{status:204}));
    await context.route('**/api/customers?*',route=>route.fulfill({json:{items:[{...record,loginEmail:linked?customerEmail:null}],nextCursor:null}}));
    await context.route('**/api/customers/*/pets',route=>route.fulfill({json:{items:[{id:'10000000-0000-4000-8000-000000000078',customerId:id,name:'Original pet',photo:null,version:1}],nextCursor:null}}));
    await context.route('**/api/account-link',route=>{
      if(route.request().method()==='POST'){expect(route.request().postDataJSON()).toEqual({code});state={...state,status:'requested',version:state.version+1,requestedEmail:customerEmail};}
      return route.fulfill({json:{status:state.status==='open'?'none':state.status}});
    });
    await context.route('**/api/customers/*/account-link',route=>{
      const method=route.request().method();
      if(method==='POST')state={...state,status:'open',version:state.version+1,expiresAt:'2099-10-23T00:00:00Z'};
      if(method==='PUT'){expect(route.request().postDataJSON()).toEqual({action:'approve',version:state.version,customerVersion:1});linked=true;state={...state,status:'approved',version:state.version+1,customerVersion:2};}
      return route.fulfill({json:method==='POST'?{code,state}:state});
    });
  }
  async function login(page:typeof admin,email:string){await page.goto('/#/login');await expect(page.getByRole('button',{name:'Continue with Google'})).toBeVisible();await page.evaluate(async({email})=>{const {auth}=await import('/apps/web/src/auth-client.ts');const {signInWithEmailAndPassword}=await import('/node_modules/.vite/deps/firebase_auth.js');await signInWithEmailAndPassword(auth,email,'emulator-only-password');},{email});}
  await login(admin,adminEmail);
  await admin.getByRole('button',{name:'Link Google account: Existing customer',exact:true}).click();
  const panel=admin.getByRole('region',{name:'Link a Google account',exact:true});
  await panel.getByRole('button',{name:'Generate linking code',exact:true}).click();
  await expect(panel.getByText(code,{exact:true})).toBeVisible();
  await login(customer,customerEmail);
  await expect(customer.getByRole('heading',{name:'Original pet',exact:true})).toHaveCount(0);
  const claim=customer.getByRole('region',{name:'Already registered with us?',exact:true});
  await claim.getByRole('textbox',{name:'Linking code',exact:true}).fill(code);
  await claim.getByRole('button',{name:'Request account link',exact:true}).click();
  await expect(claim.getByText('Waiting for administrator approval',{exact:true})).toBeVisible();
  await expect(customer.getByRole('textbox',{name:'Your name',exact:true})).toBeHidden();
  await panel.getByRole('button',{name:'Check status',exact:true}).click();
  await expect(panel.getByText(customerEmail,{exact:true})).toBeVisible();
  admin.once('dialog',dialog=>dialog.dismiss());await panel.getByRole('button',{name:'Approve account link',exact:true}).click();
  await expect(panel.getByRole('button',{name:'Approve account link',exact:true})).toBeVisible();
  admin.once('dialog',dialog=>dialog.accept());await panel.getByRole('button',{name:'Approve account link',exact:true}).click();
  await expect(panel.getByText('Account linked',{exact:true})).toBeVisible();
  await customer.getByRole('combobox',{name:'Language / 语言',exact:true}).selectOption('zh');
  await customer.getByRole('button',{name:'查看最新状态',exact:true}).click();
  await expect(customer.getByRole('textbox',{name:'您的姓名',exact:true})).toHaveValue('Existing customer');
  await expect(customer.getByRole('heading',{name:'Original pet',exact:true})).toBeVisible();
  expect(await customer.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await customer.screenshot({path:'test-results/linking-customer-mobile-zh.png',fullPage:true});
  await adminContext.close();await customerContext.close();
});
