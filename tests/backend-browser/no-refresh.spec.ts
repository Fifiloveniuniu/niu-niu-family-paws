import { test, expect } from '@playwright/test';

for (const lang of ['en', 'zh', 'es']) {
  test(`pages have no routine refresh buttons (${lang})`, async ({ page, request }) => {
    const fixture = await (await request.get('/__test-fixture')).json();
    await page.goto(`/app/metrics/?lang=${lang}`);
    await page.evaluate(async (jwt) => {
      // @ts-ignore Test module.
      const { auth } = await import('/apps/web/src/auth-client.ts');
      // @ts-ignore Test module.
      const { GoogleAuthProvider, signInWithCredential } =
        await import('/tests/helpers/browser-auth.ts');
      await signInWithCredential(auth, GoogleAuthProvider.credential(jwt));
    }, fixture.administrator.jwt);
    for (const width of [1440, 390]) {
      await page.setViewportSize({ width, height: 900 });
      for (const route of [
        'metrics',
        'access',
        'calendar',
        'customers',
        'balances',
        'payments',
        'pricing',
        'account/profile',
      ]) {
        await page.goto(`/app/${route}/?lang=${lang}`);
        await expect(
          page.locator(route === 'account/profile' ? '.profile-section' : '.saved-workspace'),
        ).toBeVisible();
        if (route === 'metrics')
          await expect(page.locator('[data-metric="customers"] dd').first()).toHaveText(/\d+/);
        if (route === 'access') await expect(page.locator('.iam-actions button')).toBeEnabled();
        await expect(
          page.getByRole('button', { name: /refresh|reload|刷新|重新加载|actualizar|recargar/i }),
        ).toHaveCount(0);
        expect(
          await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
        ).toBeTruthy();
      }
    }
  });
}
