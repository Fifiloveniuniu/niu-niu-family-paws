import { test, expect } from '@playwright/test';
for (const [language, width, reason] of [
  ['en', 1440, 'Reason'],
  ['zh', 390, '原因'],
] as const) {
  test(`Access uses current accounts and keeps the reason label above its field (${language})`, async ({
    page,
    request,
  }) => {
    const fixture = await (await request.get('/__test-fixture')).json();
    await page.setViewportSize({ width, height: 900 });
    let writes = 0;
    page.on('request', (request) => {
      if (
        new URL(request.url()).pathname.startsWith('/api/access') &&
        !['GET', 'HEAD', 'OPTIONS'].includes(request.method())
      )
        writes++;
    });
    await page.goto('/app/access/?lang=' + language);
    await page.evaluate(async (jwt) => {
      // @ts-ignore Local Vite modules.
      const { auth } = await import('/apps/web/src/auth-client.ts');
      // @ts-ignore Local Vite modules.
      const { GoogleAuthProvider, signInWithCredential } =
        await import('/tests/helpers/browser-auth.ts');
      await signInWithCredential(auth, GoogleAuthProvider.credential(jwt));
    }, fixture.administrator.jwt);
    await page.getByRole('searchbox').fill(fixture.administrator.email);
    await expect(page.locator('.iam-account')).toHaveCount(1);
    const links = await page
      .locator('.app-header-nav a')
      .evaluateAll((nodes) =>
        nodes.map((node) => new URL((node as HTMLAnchorElement).href).pathname),
      );
    expect(links).toEqual([
      '/app/calendar/',
      '/app/balances/',
      '/app/customers/',
      '/app/pricing/',
      '/app/metrics/',
      '/app/payments/',
      '/app/access/',
    ]);
    await page.locator('.iam-account .iam-row-actions button').first().click();
    const field = page.getByRole('textbox', { name: reason, exact: true });
    await field.scrollIntoViewIfNeeded();
    const layout = await field.evaluate((element) => {
      const label = element.closest('label')!,
        range = document.createRange();
      range.selectNodeContents(label.firstChild!);
      const text = range.getBoundingClientRect(),
        box = element.getBoundingClientRect(),
        labelBox = label.getBoundingClientRect();
      return {
        display: getComputedStyle(label).display,
        above: text.bottom <= box.top,
        height: text.height,
        fullWidth: Math.abs(box.width - labelBox.width) < 1,
      };
    });
    expect(layout.display).toBe('grid');
    expect(layout.above).toBe(true);
    expect(layout.height).toBeLessThan(24);
    expect(layout.fullWidth).toBe(true);
    await expect(page.getByRole('dialog').getByRole('checkbox').first()).toBeDisabled();
    expect(writes).toBe(0);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
  });
}
test('customer cannot enter Access or call its directory API', async ({ page, request }) => {
  const fixture = await (await request.get('/__test-fixture')).json();
  await page.goto('/app/access/?lang=en');
  await page.evaluate(async (jwt) => {
    // @ts-ignore Local Vite modules.
    const { auth } = await import('/apps/web/src/auth-client.ts');
    // @ts-ignore Local Vite modules.
    const { GoogleAuthProvider, signInWithCredential } =
      await import('/tests/helpers/browser-auth.ts');
    await signInWithCredential(auth, GoogleAuthProvider.credential(jwt));
  }, fixture.owner.jwt);
  await expect(page.locator('.saved-workspace')).toBeVisible();
  await expect(page.locator('.identity-access')).toHaveCount(0);
  expect(
    await page.evaluate(async () => {
      // @ts-ignore Local Vite module.
      const { auth } = await import('/apps/web/src/auth-client.ts');
      return (
        await fetch('/api/access/accounts', {
          headers: { Authorization: 'Bearer ' + (await auth.currentUser!.getIdToken()) },
        })
      ).status;
    }),
  ).toBe(403);
});
