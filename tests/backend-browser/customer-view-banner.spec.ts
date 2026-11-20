import { test, expect } from '@playwright/test';
for (const [language, width] of [
  ['en', 1440],
  ['zh', 390],
] as const) {
  test(`customer context stays named and can return to admin (${language}, ${width})`, async ({
    page,
    request,
  }) => {
    await page.setViewportSize({ width, height: 1000 });
    const fixture = await (await request.get('/__test-fixture')).json();
    await page.goto(`/app/calendar/?lang=${language}&asCustomer=${fixture.cid}`);
    await page.evaluate(async (jwt) => {
      // @ts-ignore Local Vite module.
      const { auth } = await import('/apps/web/src/auth-client.ts');
      // @ts-ignore Local dependency.
      const { GoogleAuthProvider, signInWithCredential } =
        await import('/node_modules/.vite/deps/firebase_auth.js');
      await signInWithCredential(auth, GoogleAuthProvider.credential(jwt));
    }, fixture.administrator.jwt);
    const banner = page.locator('.saved-workspace > .workspace-context');
    await expect(banner).toContainText('[TEST] Alice');
    await expect(banner).toContainText(language === 'en' ? 'administrator account' : '管理员账号');
    const back = banner.getByRole('button', {
      name: language === 'en' ? 'Return to admin' : '返回管理员视图',
      exact: true,
    });
    await expect(back).toBeVisible();
    // A failing read must not remove the escape hatch or replace the known customer's name.
    await page.route('**/api/workspace/pets?**', (route) =>
      route.fulfill({ status: 503, json: { code: 'unavailable' } }),
    );
    await page.evaluate(async () => {
      // @ts-ignore Local routing module.
      const { navigate } = await import('/apps/web/src/routing.ts');
      const query = new URLSearchParams(location.search);
      navigate('/app/balances/?' + query.toString());
    });
    await expect(page.locator('.workspace-error')).toBeVisible();
    await expect(banner).toContainText('[TEST] Alice');
    await expect(back).toBeVisible();
    await page.unroute('**/api/workspace/pets?**');
    await back.click();
    await expect(page).toHaveURL(/\/app\/metrics\//);
    expect(new URL(page.url()).searchParams.has('asCustomer')).toBe(false);
    await expect(banner).toHaveCount(0);
    await expect(page.locator('.business-metrics')).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
  });
}
