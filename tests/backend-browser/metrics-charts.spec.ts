import { test, expect } from '@playwright/test';
import { expectReadableText } from './readability';
for (const [width, lang] of [
  [1440, 'en'],
  [390, 'zh'],
] as const) {
  test(`metrics charts, shared tabs and grouped filters work (${width}, ${lang})`, async ({
    page,
    request,
  }, testInfo) => {
    test.setTimeout(60000);
    await page.setViewportSize({ width, height: 900 });
    const fixture = await (await request.get('/__test-fixture')).json();
    await page.goto(`/app/metrics/?lang=${lang}`);
    await page.evaluate(async (jwt) => {
      // @ts-ignore Test-only Vite module.
      const { auth } = await import('/apps/web/src/auth-client.ts');
      // @ts-ignore Test-only Vite dependency.
      const { GoogleAuthProvider, signInWithCredential } =
        await import('/node_modules/.vite/deps/firebase_auth.js');
      await signInWithCredential(auth, GoogleAuthProvider.credential(jwt));
    }, fixture.administrator.jwt);
    // Populate only this run's named emulator database through the real authorized API.
    await page.evaluate(
      async ({ fixture, lang }) => {
        // @ts-ignore Test-only Vite module.
        const { auth } = await import('/apps/web/src/auth-client.ts');
        const headers = {
          Authorization: 'Bearer ' + (await auth.currentUser!.getIdToken()),
          'Content-Type': 'application/json',
        };
        const write = async (path: string, body: any, method = 'PUT') => {
          const response = await fetch('/api' + path, {
            method,
            headers,
            body: JSON.stringify(body),
          });
          if (!response.ok) throw Error('Chart fixture failed ' + response.status + ' ' + path);
          return response.json();
        };
        const customerId = 'ffffffff' + crypto.randomUUID().slice(8),
          petId = crypto.randomUUID(),
          houseId = crypto.randomUUID(),
          roomId = crypto.randomUUID(),
          bookingId = crypto.randomUUID();
        await write('/customers/' + customerId, {
          name: '[TEST] Metrics ' + lang,
          email: '',
          phone: '',
          language: lang,
          version: 0,
        });
        const photo = await (
          await fetch(`/api/customers/${fixture.cid}/pets/${fixture.pid}/photo`, { headers })
        ).arrayBuffer();
        await write(`/customers/${customerId}/pets/${petId}`, {
          name: '[TEST] Metrics pet',
          species: 'dog',
          weightKg: 8,
          photoData: btoa(String.fromCharCode(...new Uint8Array(photo))),
          version: 0,
        });
        let account = await write(`/customers/${customerId}/pets/${petId}/balance`, {
          operationId: crypto.randomUUID(),
          version: 0,
          delta: 5,
          validFrom: '2026-01-01',
          validThrough: '2031-12-31',
          reason: '[TEST] Recorded days',
        });
        await write(`/customers/${customerId}/pets/${petId}/balance`, {
          operationId: crypto.randomUUID(),
          version: account.version,
          delta: -2,
          validFrom: '2026-01-01',
          validThrough: '2031-12-31',
          reason: '[TEST] Recorded correction',
        });
        await write('/houses/' + houseId, {
          name: '[TEST] Z metrics ' + lang,
          address: '[TEST] Chart fixture, not a business address',
          timezone: 'UTC',
          version: 0,
        });
        await write(`/houses/${houseId}/rooms/${roomId}`, {
          name: '[TEST] Z chart room',
          capacity: 2,
          costs: { dog: 1 },
          version: 0,
        });
        const now = Date.now();
        let booking = await write('/bookings/' + bookingId, {
          operationId: crypto.randomUUID(),
          version: 0,
          customerId,
          petId,
          houseId,
          roomId,
          arrival: new Date(now - 3600000).toISOString(),
          pickup: new Date(now + 3600000).toISOString(),
        });
        booking = await write(
          '/bookings/' + bookingId + '/actions',
          {
            operationId: crypto.randomUUID(),
            version: booking.version,
            action: 'check_in',
            at: new Date(now - 1800000).toISOString(),
          },
          'POST',
        );
        await write(
          '/bookings/' + bookingId + '/actions',
          {
            operationId: crypto.randomUUID(),
            version: booking.version,
            action: 'check_out',
            at: new Date(now - 60000).toISOString(),
          },
          'POST',
        );
      },
      { fixture, lang },
    );
    await page.reload();
    await expect(page.locator('.metric-chart')).toHaveCount(6);
    await expect(
      page.locator('[data-metric="customers"] dd:not(.business-metric-hint)'),
    ).toHaveText(/\d+/);
    await expect(page.locator('.metric-chart-placeholder').first()).toContainText(
      lang === 'en' ? 'Revenue not available' : '暂无营收数据',
    );
    const chart = page
      .locator('.metric-chart')
      .filter({ has: page.locator('#bookings-trend-title') });
    await expect(chart.locator('.metric-chart-point').first()).toBeVisible();
    await chart.locator('.metric-chart-point').first().focus();
    await page.keyboard.press('End');
    await expect(chart.locator('.metric-chart-point').last()).toBeFocused();
    expect(
      Number((await chart.locator('figcaption strong').innerText()).split(' ')[0]),
    ).toBeGreaterThanOrEqual(1);
    await chart
      .getByRole('button', {
        name: lang === 'en' ? 'View chart data: Bookings' : '查看图表数据: 预约',
        exact: true,
      })
      .click();
    const count = await chart.locator('tbody tr').count();
    expect(count).toBeGreaterThan(0);
    expect(count).toBeLessThanOrEqual(12);
    await expectReadableText(page);
    await page.screenshot({ path: testInfo.outputPath('metrics.png'), fullPage: true });
    if (width > 800)
      await expect(page.locator('.app-header-nav a').first()).toHaveText(
        lang === 'en' ? 'Metrics' : '指标',
      );
    await page.goto(`/app/balances/?lang=${lang}`);
    await expect(page.locator('#balances-panel tbody tr').first()).toBeVisible();
    const tabs = page.locator('.workspace-view-tabs');
    await expect(tabs).toHaveClass(/hc-scales/);
    const selectedStyle = await tabs.locator('[aria-selected="true"]').evaluate((e) => {
      const s = getComputedStyle(e);
      return [s.backgroundColor, s.borderRadius, s.minHeight, s.padding];
    });
    await page.getByRole('tab').last().click();
    await expect(page.locator('#activity-panel')).toBeVisible();
    await expect(
      page.getByRole('button', { name: lang === 'en' ? 'Export CSV' : '导出 CSV', exact: true }),
    ).toHaveAttribute('title', lang === 'en' ? 'Export CSV' : '导出 CSV');
    await page.screenshot({ path: testInfo.outputPath('activity.png'), fullPage: true });
    await page.goto(`/app/pricing/?lang=${lang}`);
    const priceTab = page.locator('.admin-pricing .hc-scales [aria-selected="true"]');
    await expect(priceTab).toBeVisible();
    expect(
      await priceTab.evaluate((e) => {
        const s = getComputedStyle(e);
        return [s.backgroundColor, s.borderRadius, s.minHeight, s.padding];
      }),
    ).toEqual(selectedStyle);
    await page.goto(`/app/calendar/?lang=${lang}`);
    await expect(page.locator('.saved-calendar-grid')).toBeVisible();
    await expect(page.locator('.calendar-filter-panel fieldset')).toHaveCount(2);
    const filterBounds = await page.locator('.calendar-filter-panel').boundingBox();
    expect(filterBounds!.height).toBeLessThan(width >= 1200 ? 220 : 400);
    await expect(page.locator('.calendar-filter-panel .workspace-clock')).toHaveCount(0);
    await expect(page.locator('.calendar-results .workspace-clock')).toBeVisible();
    if (width >= 1200) {
      const centers = await page.locator('.calendar-results .hc-toolbar').evaluate((toolbar) => {
        const controls = toolbar.querySelectorAll(
          '.hc-range, .workspace-clock, .calendar-toolbar-actions > button, .calendar-toolbar-actions > a, .workspace-range-controls > .custom-date-input, .workspace-range-controls > .shared-tabs',
        );
        return [...controls].map((node) => {
          const rect = node.getBoundingClientRect();
          return rect.top + rect.height / 2;
        });
      });
      expect(Math.max(...centers) - Math.min(...centers)).toBeLessThan(2);
    }

    await expect(page.locator('.calendar-results .saved-calendar-grid')).toBeVisible();
    await page.screenshot({ path: testInfo.outputPath('calendar-filters.png'), fullPage: true });
    await page
      .getByRole('button', { name: lang === 'en' ? 'Hide filters' : '收起筛选', exact: true })
      .click();
    await expect(page.locator('#calendar-filter-fields')).toBeHidden();
    await expect(page.locator('.calendar-results .workspace-clock')).toBeVisible();
    await expect(page.locator('.calendar-results')).toBeVisible();
    await page
      .getByRole('button', { name: lang === 'en' ? 'Show filters' : '展开筛选', exact: true })
      .click();
    await expect(page.locator('#calendar-filter-fields')).toBeVisible();
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
    ).toBeTruthy();
  });
}
