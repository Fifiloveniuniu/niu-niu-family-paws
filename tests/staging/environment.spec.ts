import {test,expect} from '@playwright/test';
test('development warning stays visible in both languages and across public/sign-in pages',async({page})=>{
 await page.goto('/');
 for(const width of [320,400,1280]){
  await page.setViewportSize({width,height:900});
  for(const language of ['en','zh']){
   await page.getByRole('combobox',{name:'Language / 语言',exact:true}).selectOption(language);
   await expect(page.locator('.test-environment')).toContainText(language==='en'?'TEST ENVIRONMENT':'测试环境');
   expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
   await page.getByRole('link',{name:language==='en'?'Sign in':'登录',exact:true}).click();
   await expect(page.getByRole('button',{name:language==='en'?'Continue with Google':'使用 Google 登录',exact:true})).toBeVisible();
   await expect(page.locator('.test-environment')).toBeVisible();
   expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
   await page.getByRole('link',{name:language==='en'?'← Back to website':'← 返回首页',exact:true}).click();
  }
 }
 await page.getByRole('combobox',{name:'Language / 语言',exact:true}).selectOption('en');
 await page.setViewportSize({width:400,height:860});
 await page.screenshot({path:'docs/screenshots/development-preview-mobile-en.png',fullPage:false});
});
