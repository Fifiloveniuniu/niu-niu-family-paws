import { readFile } from 'node:fs/promises';
import { test, expect } from '@playwright/test';
for (const [language, width] of [
  ['en', 1440],
  ['zh', 390],
] as const) {
  test(`customer and pricing actions are grouped and aligned (${language}, ${width})`, async ({
    page,
    request,
  }, testInfo) => {
    await page.setViewportSize({ width, height: 1000 });
    const messages = JSON.parse(
      await readFile(
        new URL(`../../apps/web/src/locales/${language}.json`, import.meta.url),
        'utf8',
      ),
    );
    const fixture = await (await request.get('/__test-fixture')).json();
    await page.goto(`/app/customers/?lang=${language}`);
    await page.evaluate(async (jwt) => {
      // @ts-ignore Local Vite module.
      const { auth } = await import('/apps/web/src/auth-client.ts');
      // @ts-ignore Local dependency.
      const { GoogleAuthProvider, signInWithCredential } =
        await import('/tests/helpers/browser-auth.ts');
      await signInWithCredential(auth, GoogleAuthProvider.credential(jwt));
    }, fixture.administrator.jwt);
    const add = page.getByRole('button', {
      name: messages['ui.customers.labels'].add,
      exact: true,
    });
    await expect(page.locator('.customer-workspace > .customer-heading')).toContainText(
      messages['ui.customers.labels'].add,
    );
    await expect(add.locator('.paws-icon')).toHaveCount(1);
    await expect(page.locator('.customer-filters button')).toHaveCount(0);
    if (width >= 1200) {
      const inputs = await page.locator('.customer-filter-fields input').all();
      const first = (await inputs[0].boundingBox())!;
      for (const input of inputs) {
        const box = (await input.boundingBox())!;
        expect(Math.abs(box.y - first.y)).toBeLessThan(2);
        expect(box.height).toBe(44);
      }
      const own = (await page.locator('.customer-ownership-filter').boundingBox())!;
      expect(Math.abs(own.y + own.height / 2 - first.y - first.height / 2)).toBeLessThan(2);
    }
    const actionBeforeSearch = (await add.boundingBox())!;
    const filtered = page.waitForResponse((response) => {
      const url = new URL(response.url());
      return (
        url.pathname === '/api/customers' &&
        url.searchParams.get('petSearch') === 'ice pet 0' &&
        response.ok()
      );
    });
    await page.locator('.pet-search input').fill('ice pet 0');
    await filtered;
    const matching = page.locator('.customer-directory-panel .customer-list > li');
    const more = page.locator('.customer-directory-panel .list-load-more button');
    await expect(async () => {
      if ((await matching.count()) === 0 && (await more.isVisible())) await more.click();
      await expect(matching).toHaveCount(1, { timeout: 500 });
    }).toPass({ timeout: 15000 });
    await expect(matching).toContainText('[TEST] Alice');
    expect(Math.abs((await add.boundingBox())!.y - actionBeforeSearch.y)).toBeLessThan(2);
    const row = page.locator('.customer-directory-panel .customer-list > li').first();
    await expect(row).toBeVisible();
    await row.hover();
    const rowShape = await row.evaluate((node) => ({
      radius: parseFloat(getComputedStyle(node).borderRadius),
      border: parseFloat(getComputedStyle(node).borderBottomWidth),
    }));
    expect(rowShape.radius).toBeGreaterThan(0);
    expect(rowShape.border).toBe(0);
    await page.keyboard.press('Tab');
    await row.locator('.customer-select').focus();
    await expect(row).toHaveCSS('outline-offset', '-2px');
    await expect(row.locator('.customer-select')).toHaveCSS('outline-style', 'none');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    await page.screenshot({ path: testInfo.outputPath('customers-aligned.png'), fullPage: true });
    await page.locator('.pet-search input').fill('');
    await expect(page.locator('.customer-directory-panel .customer-list > li')).toHaveCount(25);
    await expect(page.locator('.customer-filters button')).toHaveCount(0);
    await page.goto(`/app/pricing/?lang=${language}`);
    const priceAdd = page.getByRole('button', {
      name: messages['ui.pricingAdmin.add'],
      exact: true,
    });
    const holidays = page.getByRole('button', {
      name: messages['ui.pricingAdmin.holidays'],
      exact: true,
    });
    const addBox = (await priceAdd.boundingBox())!,
      holidaysBox = (await holidays.boundingBox())!;
    expect(addBox.x).toBeGreaterThan(holidaysBox.x);
    expect(
      Math.abs(addBox.y + addBox.height / 2 - holidaysBox.y - holidaysBox.height / 2),
    ).toBeLessThan(2);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    await page.screenshot({ path: testInfo.outputPath('pricing-aligned.png'), fullPage: true });
  });
}
