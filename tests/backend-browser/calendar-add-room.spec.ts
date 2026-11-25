import { test, expect } from '@playwright/test';
for (const [width, lang] of [
  [1440, 'en'],
  [390, 'zh'],
] as const) {
  test(`house plus opens a focused room editor (${width}, ${lang})`, async ({ page, request }) => {
    await page.setViewportSize({ width, height: 900 });
    const fixture = await (await request.get('/__test-fixture')).json();
    await page.goto(`/app/calendar/?lang=${lang}`);
    await page.evaluate(async (jwt) => {
      // @ts-ignore Test-only Vite module.
      const { auth } = await import('/apps/web/src/auth-client.ts');
      // @ts-ignore Test-only Vite dependency.
      const { GoogleAuthProvider, signInWithCredential } =
        await import('/tests/helpers/browser-auth.ts');
      await signInWithCredential(auth, GoogleAuthProvider.credential(jwt));
    }, fixture.administrator.jwt);
    const house = page.locator('.hc-house').filter({ hasText: '[TEST] Practice house' });
    await house
      .locator('button')
      .filter({ has: page.locator('[data-icon-family]') })
      .last()
      .click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toHaveCount(1);
    const name = dialog.getByLabel(lang === 'en' ? 'Room name' : '房间名称', { exact: true });
    await expect(name).toHaveValue('');
    await name.fill(`[TEST] Plus room ${width}`);
    await dialog.locator('input[type="number"]').nth(0).fill('2');
    await dialog.locator('input[type="number"]').nth(1).fill('1');
    await dialog.locator('button[type="submit"]').click();
    await expect(dialog).toHaveCount(0);
    await expect(page.getByText(`[TEST] Plus room ${width}`, { exact: true })).toBeVisible();
    await page.reload();
    await expect(page.getByText(`[TEST] Plus room ${width}`, { exact: true })).toBeVisible();
    await house.locator('.workspace-house-address').click();
    await expect(dialog).toContainText('[TEST] Isolated browser fixture address');
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
    ).toBeTruthy();
  });
}
