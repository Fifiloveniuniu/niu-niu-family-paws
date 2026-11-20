import { test, expect } from '@playwright/test';
import { expectReadableText } from './readability';
for (const [lang, width, palette] of [
  ['en', 1440, 'google'],
  ['zh', 390, 'apple'],
  ['en', 390, 'vscode-dark'],
  ['zh', 1440, 'vscode-light'],
  ['en', 320, 'google'],
  ['zh', 320, 'vscode-dark'],
] as const) {
  test(`dashboard has coherent samples and consistent cards (${lang}, ${width}, ${palette})`, async ({
    page,
    request,
  }, testInfo) => {
    await page.setViewportSize({ width, height: 1000 });
    await page.addInitScript(
      (palette) =>
        localStorage.setItem('family-paws:appearance', JSON.stringify({ version: 2, palette })),
      palette,
    );
    const fixture = await (await request.get('/__test-fixture')).json();
    let metricsReads = 0,
      writes = 0;
    page.on('request', (r) => {
      if (r.url().includes('/api/business-metrics?')) metricsReads++;
      if (r.url().includes('/api/') && ['PUT', 'POST', 'DELETE', 'PATCH'].includes(r.method()))
        writes++;
    });
    await page.goto(`/app/metrics/?lang=${lang}&data=sample`);
    await page.evaluate(async (jwt) => {
      // @ts-ignore Test-only Vite module.
      const { auth } = await import('/apps/web/src/auth-client.ts');
      // @ts-ignore Test-only Vite dependency.
      const { GoogleAuthProvider, signInWithCredential } =
        await import('/node_modules/.vite/deps/firebase_auth.js');
      await signInWithCredential(auth, GoogleAuthProvider.credential(jwt));
    }, fixture.administrator.jwt);
    const charts = page.locator('.metric-chart');
    await expect(charts).toHaveCount(6);
    await expect(page.locator('.metric-sample-label')).toHaveCount(6);
    await expect(page.locator('.metrics-data-source [role="status"]')).toContainText(
      lang === 'en' ? 'Fictional' : '虚构',
    );
    for (const card of await charts.all())
      await expect(card.locator('.metric-chart-total strong')).not.toHaveText('—');
    expect(metricsReads).toBe(0);
    expect(writes).toBe(0);
    const sourceColors = await page
      .locator('.metrics-data-source button')
      .evaluateAll((nodes) => nodes.map((node) => getComputedStyle(node).backgroundColor));
    expect(sourceColors[0]).not.toBe(sourceColors[1]);
    const boxes = await charts.evaluateAll((nodes) =>
      nodes.map((node) => {
        const r = node.getBoundingClientRect();
        return { width: r.width, top: r.top };
      }),
    );
    expect(
      Math.max(...boxes.map((b) => b.width)) - Math.min(...boxes.map((b) => b.width)),
    ).toBeLessThan(2);
    if (width > 800) expect(Math.abs(boxes[0].top - boxes[1].top)).toBeLessThan(2);
    await expectReadableText(page);
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
    ).toBeTruthy();
    await page.screenshot({ path: testInfo.outputPath('dashboard.png'), fullPage: true });
    const services = charts.filter({ has: page.locator('#services-trend-title') });
    await services.getByRole('button', { name: /^(View chart data|查看图表数据):/ }).click();
    await expect(services.locator('thead th').first()).toHaveText(
      lang === 'en' ? 'Pet type' : '宠物种类',
    );
    const before = await charts.first().locator('.metric-chart-total strong').innerText();
    await page.locator('.business-period-presets button').first().click();
    await expect(charts.first().locator('.metric-chart-total strong')).not.toHaveText(before);
    expect(new URL(page.url()).searchParams.get('data')).toBe('sample');
    await page
      .getByRole('button', { name: lang === 'en' ? 'Saved records' : '已保存记录', exact: true })
      .click();
    await expect(
      page.locator('[data-metric="customers"] dd:not(.business-metric-hint)'),
    ).toHaveText(/\d+/);
    await expect(page.locator('.metric-sample-label')).toHaveCount(0);
    await expect(charts.first().locator('.metric-chart-total strong')).toHaveText('—');
    await expect(charts.first().locator('.metric-chart-placeholder')).toContainText(
      lang === 'en' ? 'Revenue not available' : '暂无营收数据',
    );
    expect(metricsReads).toBeGreaterThan(0);
    expect(writes).toBe(0);
  });
}
