import { test, expect } from '@playwright/test';
for (const [width, lang] of [
  [1440, 'en'],
  [390, 'zh'],
] as const) {
  test(`compact customer directory retains editing and pet navigation (${width}, ${lang})`, async ({
    page,
    request,
  }, testInfo) => {
    await page.setViewportSize({ width, height: 900 });
    const fixture = await (await request.get('/__test-fixture')).json();
    await page.goto(`/app/customers/?lang=${lang}`);
    await page.evaluate(async (jwt) => {
      // @ts-ignore Test-only Vite module.
      const { auth } = await import('/apps/web/src/auth-client.ts');
      // @ts-ignore Test-only Vite dependency.
      const { GoogleAuthProvider, signInWithCredential } =
        await import('/node_modules/.vite/deps/firebase_auth.js');
      await signInWithCredential(auth, GoogleAuthProvider.credential(jwt));
    }, fixture.administrator.jwt);
    await expect(page.locator('.customer-list > li')).toHaveCount(25);
    await page.screenshot({ path: testInfo.outputPath('directory.png'), fullPage: true });
    const search = page.locator('#customer-search');
    await search.fill('[TEST] Alice');
    await search.press('Enter');
    const row = page.locator('.customer-list > li');
    await expect(row).toHaveCount(1);
    await row
      .getByRole('button', {
        name: lang === 'en' ? 'Edit customer: [TEST] Alice' : '编辑客户: [TEST] Alice',
        exact: true,
      })
      .click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toHaveCount(1);
    await dialog.locator('input[name="phone"]').fill('555-0123');
    await dialog.locator('button[type="submit"]').click();
    await expect(dialog).toHaveCount(0);
    await expect(row).toContainText('555-0123');
    await row.getByRole('button', { name: '[TEST] Alice', exact: true }).click();
    await expect(page.locator('.admin-pets .pet-card')).toHaveCount(3);
    if (width < 800) {
      await expect(page.locator('.customer-directory-panel')).toBeHidden();
      await expect(page.locator('.customer-filters')).toBeHidden();
    }
    await page.screenshot({ path: testInfo.outputPath('customer-pets.png'), fullPage: true });
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
    ).toBeTruthy();
    if (width < 800) {
      await page.locator('.back-to-customers').click();
      await expect(row).toBeVisible();
      await expect(page.locator('.admin-pets')).toBeHidden();
      await expect(search).toHaveValue('[TEST] Alice');
    }
  });
}
