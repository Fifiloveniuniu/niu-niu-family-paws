import { test, expect } from '@playwright/test';

for (const [lang, width] of [
  ['en', 1440],
  ['zh', 390],
] as const) {
  test(`pet details stay dismissed after Escape and reopen on a fresh interaction (${lang})`, async ({
    page,
    request,
  }) => {
    const fixture = await (await request.get('/__test-fixture')).json();
    await page.setViewportSize({ width, height: 900 });
    await page.goto(`/app/balances/?lang=${lang}&asCustomer=${fixture.cid}`);
    await page.evaluate(async (jwt) => {
      // @ts-ignore Test-only Vite module.
      const { auth } = await import('/apps/web/src/auth-client.ts');
      // @ts-ignore Test-only Vite dependency.
      const { GoogleAuthProvider, signInWithCredential } =
        await import('/tests/helpers/browser-auth.ts');
      await signInWithCredential(auth, GoogleAuthProvider.credential(jwt));
    }, fixture.administrator.jwt);
    const trigger = page.locator('.workspace-avatar-button').first();
    const popup = page.locator('.workspace-pet-popup');
    await expect(trigger).toBeVisible();
    for (let i = 0; i < 3; i++) {
      await page.locator('.marketing-header').hover();
      await trigger.hover();
      await expect(popup).toBeVisible();
      await page.keyboard.press('Escape');
      await expect(popup).toHaveCount(0);
      await expect(trigger).toHaveAttribute('aria-expanded', 'false');
    }
    await trigger.click();
    const modal = page.locator('dialog.pet-details-dialog');
    await expect(modal).toBeVisible();
    await expect(modal.locator('.workspace-avatar')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(modal).toHaveCount(0);
    await expect(trigger).toBeFocused();
    await expect(popup).toHaveCount(0);
    await trigger.click();
    await expect(modal).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(modal).toHaveCount(0);
    await expect(trigger).toBeFocused();
  });
}
