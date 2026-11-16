import {test,expect} from '@playwright/test';

test('balances page fits desktop and phones with focused edits and retained history',async({page})=>{
 await page.setViewportSize({width:1440,height:1000});await page.goto('/#/balances');
 const panel=page.locator('.hc-balance-page'),sidebar=panel.locator('.hc-balance-sidebar'),content=panel.locator('.hc-balance-content');
 const left=await sidebar.boundingBox(),right=await content.boundingBox();expect(left!.x+left!.width).toBeLessThanOrEqual(right!.x+1);
 expect(await content.evaluate(e=>parseFloat(getComputedStyle(e).paddingLeft))).toBeGreaterThanOrEqual(24);
 await expect(page.getByRole('heading',{name:'Pets',exact:true})).toBeVisible();
 await page.getByRole('button',{name:'Add balance',exact:true}).click();const editor=page.getByRole('dialog',{name:'Add balance',exact:true});await expect(editor).toBeVisible();
 await page.getByLabel('Days',{exact:true}).fill('30');await page.getByLabel('Valid from',{exact:true}).fill('2026-01-01');await page.getByLabel('Valid through',{exact:true}).fill('2027-12-31');
 await page.getByLabel('Reason',{exact:true}).fill('[TEST] Initial boarding credit');
 page.once('dialog',d=>d.dismiss());await page.keyboard.press('Escape');await expect(editor).toBeVisible();await expect(page.getByLabel('Days',{exact:true})).toHaveValue('30');
 await editor.getByRole('button',{name:'Add balance',exact:true}).click();await expect(editor).toHaveCount(0);await expect(panel.getByRole('button',{name:'Add balance',exact:true})).toBeFocused();await expect(panel.locator('.hc-balance-metrics strong').first()).toHaveText('30');await expect(panel.locator('.hc-balance-history')).toContainText('[TEST] Initial boarding credit');
 await page.screenshot({path:'test-results/balances-layout-desktop.png',fullPage:true});
 for(const width of [820,700,390,320]){
  await page.setViewportSize({width,height:900});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  const details=await content.boundingBox();expect(details!.x).toBeGreaterThanOrEqual(0);expect(details!.x+details!.width).toBeLessThanOrEqual(width);
 }
 await page.setViewportSize({width:390,height:844});await page.getByRole('combobox',{name:'Language / 语言',exact:true}).selectOption('zh');await page.getByRole('button',{name:'余额: Miso',exact:true}).click();await expect(panel.getByRole('heading',{name:'Miso',exact:true})).toBeVisible();
 await page.getByRole('button',{name:'增加余额',exact:true}).click();await expect(page.getByRole('dialog',{name:'增加余额',exact:true})).toBeVisible();expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await page.screenshot({path:'test-results/balances-editor-mobile-zh.png'});await page.getByRole('button',{name:'取消',exact:true}).click();
 await page.getByRole('button',{name:'余额: Mochi',exact:true}).click();await expect(panel.locator('.hc-balance-metrics strong').first()).toHaveText('30');await page.screenshot({path:'test-results/balances-layout-mobile-zh.png',fullPage:true});
});
