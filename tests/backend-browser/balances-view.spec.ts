import { test, expect } from '@playwright/test';
for (const [width, lang] of [
  [1440, 'en'],
  [390, 'zh'],
] as const) {
  test(`balance views have clear pet activity and retained filters (${width}, ${lang})`, async ({
    page,
    request,
  }, testInfo) => {
    await page.setViewportSize({ width, height: 900 });
    const fixture = await (await request.get('/__test-fixture')).json();
    await page.goto(`/app/balances/?lang=${lang}&asCustomer=${fixture.cid}`);
    await page.evaluate(async (jwt) => {
      // @ts-ignore Test-only Vite module.
      const { auth } = await import('/apps/web/src/auth-client.ts');
      // @ts-ignore Test-only Vite dependency.
      const { GoogleAuthProvider, signInWithCredential } =
        await import('/node_modules/.vite/deps/firebase_auth.js');
      await signInWithCredential(auth, GoogleAuthProvider.credential(jwt));
    }, fixture.administrator.jwt);
    const current = page.getByRole('tab').first(),
      activity = page.getByRole('tab').last();
    await expect(current).toHaveAttribute('aria-selected', 'true');
    await expect(page.locator('#balances-panel tbody tr')).toHaveCount(3);
    await expect(page.locator('#activity-panel')).toBeHidden();
    await page.screenshot({ path: testInfo.outputPath('balances.png'), fullPage: true });
    await page
      .locator('#balances-panel tbody tr')
      .first()
      .getByRole('button', { name: lang === 'en' ? /View activity:/ : /查看变动记录:/ })
      .click();
    await expect(activity).toHaveAttribute('aria-selected', 'true');
    await expect(page.locator('#balances-panel')).toBeHidden();
    await expect(page.locator('#activity-panel')).toBeVisible();
    expect(new URL(page.url()).searchParams.get('pet')).toBeTruthy();
    await page.reload();
    await expect(activity).toHaveAttribute('aria-selected', 'true');
    await page.screenshot({ path: testInfo.outputPath('activity.png'), fullPage: true });
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
    ).toBeTruthy();
    await current.click();
    await expect(page.locator('#balances-panel tbody tr')).toHaveCount(1);
  });
}
