import { test, expect } from '@playwright/test';

for (const [width, lang] of [
  [1440, 'en'],
  [390, 'zh'],
] as const) {
  test(`table content stays inside rounded corners (${width}, ${lang})`, async ({
    page,
    request,
  }) => {
    await page.setViewportSize({ width, height: 900 });
    const fixture = await (await request.get('/__test-fixture')).json();
    await page.goto(`/app/balances/?lang=${lang}`);
    await page.evaluate(async (jwt) => {
      // @ts-ignore Test module.
      const { auth } = await import('/apps/web/src/auth-client.ts');
      // @ts-ignore Test module.
      const { GoogleAuthProvider, signInWithCredential } =
        await import('/tests/helpers/browser-auth.ts');
      await signInWithCredential(auth, GoogleAuthProvider.credential(jwt));
    }, fixture.administrator.jwt);
    const table = page.locator('.workspace-table-scroll:visible').first();
    await expect(table.locator('tbody tr').first()).toBeVisible();
    // Content must not paint or receive pointer hits outside the curved border.
    expect(
      await table.evaluate((element) => {
        const box = element.getBoundingClientRect();
        return [box.left + 2, box.right - 2].every(
          (x) => !document.elementFromPoint(x, box.top + 2)?.closest('table'),
        );
      }),
    ).toBe(true);
    if (width > 760) {
      const scroll = page.locator('.record-list-scroll:visible').first();
      await scroll.evaluate((element) => {
        element.scrollTop = 200;
      });
      await expect
        .poll(async () => {
          const heading = await table.locator('th').first().boundingBox();
          const bounds = await scroll.boundingBox();
          return Math.abs(heading!.y - bounds!.y);
        })
        .toBeLessThan(2);
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
  });
}
