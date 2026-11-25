import { expectReadableText } from './readability';
import { test, expect } from '@playwright/test';
for (const [width, lang, palette] of [
  [1440, 'en', 'google'],
  [390, 'zh', 'google'],
  [1440, 'en', 'vscode-dark'],
  [390, 'zh', 'apple'],
  [390, 'en', 'vscode-light'],
] as const) {
  test(`business metrics use server totals and recover from errors (${width}, ${lang}, ${palette})`, async ({
    page,
    request,
  }, testInfo) => {
    await page.setViewportSize({ width, height: 900 });
    await page.addInitScript(
      (palette) =>
        localStorage.setItem('family-paws:appearance', JSON.stringify({ version: 2, palette })),
      palette,
    );
    const fixture = await (await request.get('/__test-fixture')).json();
    await page.goto(`/app/metrics/?lang=${lang}&zone=America%2FLos_Angeles`);
    await page.evaluate(async (jwt) => {
      // @ts-ignore Test module.
      const { auth } = await import('/apps/web/src/auth-client.ts');
      // @ts-ignore Test module.
      const { GoogleAuthProvider, signInWithCredential } =
        await import('/tests/helpers/browser-auth.ts');
      await signInWithCredential(auth, GoogleAuthProvider.credential(jwt));
    }, fixture.administrator.jwt);
    await expect(
      page.locator('[data-metric="customers"] dd:not(.business-metric-hint)'),
    ).toHaveText(/\d+/);
    expect(
      Number(
        await page.locator('[data-metric="customers"] dd:not(.business-metric-hint)').innerText(),
      ),
    ).toBeGreaterThanOrEqual(100);
    expect(
      Number(await page.locator('[data-metric="pets"] dd:not(.business-metric-hint)').innerText()),
    ).toBeGreaterThanOrEqual(300);
    await expect(page.locator('.metric-chart-placeholder')).toContainText(
      lang === 'en' ? 'Revenue not available' : '暂无营收数据',
    );
    if (width > 800)
      await expect(
        page.getByRole('link', {
          name: lang === 'en' ? 'Metrics' : '指标',
          exact: true,
        }),
      ).toHaveAttribute('aria-current', 'page');
    const firstRequest = page.waitForResponse(
      (r) => r.url().includes('/api/business-metrics?') && r.ok(),
    );
    await page.locator('.business-period-presets button').first().click();
    const first = await firstRequest;
    const query = new URL(first.url()).searchParams;
    expect(Date.parse(query.get('through')!) - Date.parse(query.get('from')!)).toBeLessThanOrEqual(
      8 * 86400000,
    );
    await expect(
      page.locator('[data-metric="customers"] dd:not(.business-metric-hint)'),
    ).toHaveText(/\d+/);
    await page.screenshot({ path: testInfo.outputPath('business-metrics.png'), fullPage: true });
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
    ).toBeTruthy();
    await page.route('**/api/business-metrics?**', (route) =>
      route.fulfill({ status: 503, json: { code: 'unavailable' } }),
    );
    await page
      .getByRole('button', {
        name: lang === 'en' ? 'Refresh metrics' : '刷新经营数据',
        exact: true,
      })
      .click();
    await expect(page.locator('.business-metrics-error')).toBeVisible();
    await expect(
      page.locator('[data-metric="customers"] dd:not(.business-metric-hint)'),
    ).toHaveText('—');
    await page.unroute('**/api/business-metrics?**');
    await page.locator('.business-metrics-error button').click();
    await expect(
      page.locator('[data-metric="customers"] dd:not(.business-metric-hint)'),
    ).toHaveText(/\d+/);
    await page.reload();
    await expect(page.locator('.business-period-presets button').first()).toHaveAttribute(
      'aria-pressed',
      'true',
    );
  });
}
test('customers cannot open business metrics or select another customer to gain access', async ({
  page,
  request,
}) => {
  const fixture = await (await request.get('/__test-fixture')).json();
  await page.goto('/app/calendar/?lang=en');
  await page.evaluate(async (jwt) => {
    // @ts-ignore Test module.
    const { auth } = await import('/apps/web/src/auth-client.ts');
    // @ts-ignore Test module.
    const { GoogleAuthProvider, signInWithCredential } =
      await import('/tests/helpers/browser-auth.ts');
    await signInWithCredential(auth, GoogleAuthProvider.credential(jwt));
  }, fixture.owner.jwt);
  await expect(page.locator('.saved-workspace')).toBeVisible();
  await expect(page.getByRole('link', { name: 'Business metrics', exact: true })).toHaveCount(0);
  const status = await page.evaluate(async () => {
    // @ts-ignore Test module.
    const { auth } = await import('/apps/web/src/auth-client.ts');
    return (
      await fetch('/api/business-metrics?from=2030-01-01T00:00:00Z&through=2030-02-01T00:00:00Z', {
        headers: { Authorization: 'Bearer ' + (await auth.currentUser!.getIdToken()) },
      })
    ).status;
  });
  expect(status).toBe(403);
  await page.goto('/app/metrics/?lang=en');
  await expect(page.locator('.business-metrics')).toHaveCount(0);
  await expect(page.getByRole('alert')).toBeVisible();
});
