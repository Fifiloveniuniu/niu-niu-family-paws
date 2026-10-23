import {test,expect} from '@playwright/test';

test('explicit language choices persist across public and sign-in pages at phone and desktop widths',async({page})=>{
  await page.goto('/');
  const language=page.getByRole('combobox',{name:'Language / 语言',exact:true});
  await expect(language).toHaveValue('en');
  expect(await language.locator('option').allTextContents()).toEqual(['English','简体中文']);
  for(const width of [320,400,1280]){
    await page.setViewportSize({width,height:900});
    for(const value of ['zh','en']){
      await language.selectOption(value);
      await expect(page.locator('html')).toHaveAttribute('lang',value==='zh'?'zh-Hans':'en');
      expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
    }
  }
  await language.selectOption('zh');
  await page.getByRole('link',{name:'登录',exact:true}).click();
  await expect(language).toHaveValue('zh');
  await page.reload();
  await expect(language).toHaveValue('zh');
  await expect(page.getByRole('button',{name:'使用 Google 登录',exact:true})).toBeVisible();
  await language.selectOption('en');
  await page.getByRole('link',{name:'Back to website',exact:false}).click();
  await page.reload();
  await expect(language).toHaveValue('en');
  await page.setViewportSize({width:400,height:860});
  await language.selectOption('zh');
  await page.screenshot({path:'test-results/ui-public-mobile-zh.png'});
});
