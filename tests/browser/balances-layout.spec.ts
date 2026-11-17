import {test,expect} from '@playwright/test';
test('balances share customer/pet filters with statement and keep focused edits',async({page})=>{
 await page.setViewportSize({width:1440,height:1000});await page.goto('/app/balances/?pet=Mochi');
 const panel=page.locator('.hc-balance-page');await expect(page.getByLabel('Statement pet',{exact:true})).toHaveCount(1);await expect(page.getByRole('navigation',{name:'Balance views'})).toHaveCount(0);
 expect(await panel.locator('.hc-balance-content').evaluate(e=>parseFloat(getComputedStyle(e).paddingLeft))).toBeGreaterThanOrEqual(24);
 await page.getByRole('button',{name:'Add balance',exact:true}).click();const editor=page.getByRole('dialog',{name:'Add balance',exact:true});
 await page.getByLabel('Days',{exact:true}).fill('30');await page.getByLabel('Valid from',{exact:true}).fill('2026-01-01');await page.getByLabel('Valid through',{exact:true}).fill('2027-12-31');await page.getByLabel('Reason',{exact:true}).fill('[TEST] Initial boarding credit');
 page.once('dialog',d=>d.dismiss());await page.keyboard.press('Escape');await expect(editor).toBeVisible();await expect(page.getByLabel('Days',{exact:true})).toHaveValue('30');await editor.getByRole('button',{name:'Add balance',exact:true}).click();
 await expect(panel.getByRole('button',{name:'Add balance',exact:true})).toBeFocused();await expect(panel.locator('.hc-balance-metrics strong').first()).toHaveText('30');await expect(page.locator('.hc-statement-row')).toContainText('[TEST] Initial boarding credit');
 await page.getByLabel('Statement pet',{exact:true}).selectOption('Miso');await expect(panel.getByRole('heading',{name:'Miso',exact:true})).toBeVisible();await expect(page.locator('.hc-statement-row')).toHaveCount(0);await page.getByLabel('Statement pet',{exact:true}).selectOption('Mochi');await expect(page.locator('.hc-statement-row')).toHaveCount(1);
 await page.screenshot({path:'test-results/balances-layout-desktop.png',fullPage:true});
 for(const width of [820,700,390,320]){await page.setViewportSize({width,height:900});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);}
 await page.setViewportSize({width:390,height:844});await page.getByRole('combobox',{name:'Language / 语言',exact:true}).selectOption('zh');await page.getByLabel('明细宠物',{exact:true}).selectOption('Miso');await page.getByRole('button',{name:'增加余额',exact:true}).click();await expect(page.getByRole('dialog',{name:'增加余额',exact:true})).toBeVisible();await page.screenshot({path:'test-results/balances-editor-mobile-zh.png'});await page.getByRole('button',{name:'取消',exact:true}).click();await page.getByLabel('明细宠物',{exact:true}).selectOption('Mochi');await page.screenshot({path:'test-results/balances-layout-mobile-zh.png',fullPage:true});
});
