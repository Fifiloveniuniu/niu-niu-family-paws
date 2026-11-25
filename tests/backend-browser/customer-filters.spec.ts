import { test, expect } from '@playwright/test';
for (const [width, lang] of [
  [1440, 'en'],
  [390, 'zh'],
] as const) {
  test(`live substring filters narrow both customers and pets (${width}, ${lang})`, async ({
    page,
    request,
  }) => {
    await page.setViewportSize({ width, height: 900 });
    const fixture = await (await request.get('/__test-fixture')).json();
    await page.goto(`/app/customers/?lang=${lang}`);
    await page.evaluate(async (jwt) => {
      // @ts-ignore Test-only Vite module.
      const { auth } = await import('/apps/web/src/auth-client.ts');
      // @ts-ignore Test-only Vite dependency.
      const { GoogleAuthProvider, signInWithCredential } =
        await import('/tests/helpers/browser-auth.ts');
      await signInWithCredential(auth, GoogleAuthProvider.credential(jwt));
    }, fixture.administrator.jwt);
    const rows = page.locator('.customer-directory-panel .customer-list > li');
    await expect(rows).toHaveCount(25);
    await expect(page.locator('.customer-filters button')).toHaveCount(0);
    await page.locator('.pet-search input').fill('ICE pEt 0');
    await expect(rows).toHaveCount(1);
    await expect(rows).toContainText('[TEST] Alice');
    await rows.getByRole('button', { name: '[TEST] Alice', exact: true }).click();
    const cards = page.locator('.admin-pets .pet-card');
    await expect(cards).toHaveCount(1);
    await expect(cards).toContainText('[TEST] Alice pet 0');
    if (width < 800) await page.locator('.back-to-customers').click();
    await page.locator('#customer-search').fill('lic');
    await expect(rows).toHaveCount(1);
    await page.locator('.pet-search input').fill('no-pet-can-match-this');
    await expect(rows).toHaveCount(0);
    await expect(page.locator('.admin-pets .selected-customer-heading')).toHaveCount(0);
    await expect(page.getByText('No matching pets.', { exact: true })).toHaveCount(0);
    await expect(page.getByText(/^(All \d+ loaded|Loaded \d+)$/)).toHaveCount(0);
    await page.locator('.pet-search input').fill('');
    await expect(rows).toHaveCount(1);
    await page.locator('#customer-search').fill('');
    await expect(rows).toHaveCount(25);
  });
}
