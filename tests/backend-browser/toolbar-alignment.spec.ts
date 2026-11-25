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
    if (width >= 1200) {
      const action = (await page.locator('.customer-filter-actions button').boundingBox())!;
      for (const input of await page.locator('.customer-filter-fields input').all()) {
        const box = (await input.boundingBox())!;
        expect(Math.abs(box.y + box.height - action.y - action.height)).toBeLessThan(2);
      }
    }
    const actionBeforeSearch = (await add.boundingBox())!;
    // A read-only visual fixture isolates result layout from direct-seed search indexing.
    await page.route('**/api/pet-search?**', (route) =>
      route.fulfill({
        json: {
          items: [
            {
              pet: {
                id: fixture.pid,
                customerId: fixture.cid,
                name: '[TEST] Search layout pet',
                species: 'dog',
                version: 1,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
              },
              customer: { id: fixture.cid, name: '[TEST] Alice', loginEmail: null },
            },
          ],
          nextCursor: null,
        },
      }),
    );
    await page.locator('.pet-search input').fill('[TEST] Alice');
    await page.locator('.pet-search form button[type="submit"]').click();
    await expect(page.locator('.pet-search .customer-list > li').first()).toBeVisible();
    expect(Math.abs((await add.boundingBox())!.y - actionBeforeSearch.y)).toBeLessThan(2);
    const row = page.locator('.customer-directory-panel > .customer-list > li').first();
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
