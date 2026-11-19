import { test, expect } from '@playwright/test';
for (const language of ['en', 'zh'])
  test(`public prices retain supplied rates and omit daycare and invented package terms (${language})`, async ({
    page,
  }) => {
    await page.goto('/pricing/?lang=' + language);
    const prices = page.locator('.public-source-prices');
    await expect(prices).toBeVisible();
    await expect(prices).toContainText('$115.00');
    await expect(prices).toContainText('$52.00');
    await expect(
      page.getByRole('link', { name: language === 'en' ? 'Daycare' : '日间托管', exact: true }),
    ).toHaveCount(0);
    await expect(page.locator('.pricing-page')).not.toContainText('$480');
    await expect(page.locator('#boarding-packages')).toContainText(
      language === 'en' ? 'must be confirmed' : '仍需确认',
    );
    const rows = prices.getByRole('row').filter({
      hasText: language === 'en' ? 'X-Large Dog - Long Hair/ Double Coat' : '超大型长毛／双层毛犬',
    });
    await expect(rows).toHaveCount(1);
    await expect(rows).toContainText('$115.00');
    await page.setViewportSize({ width: 390, height: 844 });
    await expect
      .poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth))
      .toBeTruthy();
    await page.screenshot({
      path: `test-results-backend/public-pricing-${language}.png`,
      fullPage: true,
    });
    await page.goto('/services/?lang=' + language);
    await expect(page.locator('#daycare')).toHaveCount(0);
    await expect(page.locator('#boarding')).toBeVisible();
  });

test('public prices show an outage and retry instead of silently presenting stale rates', async ({
  page,
}) => {
  let fail = true;
  await page.route('**/api/public/pricing', async (route) =>
    fail ? route.fulfill({ status: 503, body: '{}' }) : route.continue(),
  );
  await page.goto('/pricing/?lang=en');
  const prices = page.locator('.public-source-prices');
  await expect(prices.getByRole('alert')).toContainText('Current prices could not be loaded');
  await expect(prices.getByRole('table')).toHaveCount(0);
  fail = false;
  await prices.getByRole('button', { name: 'Try again', exact: true }).click();
  await expect(prices).toContainText('$52.00');
  await expect(prices.getByRole('alert')).toHaveCount(0);
});
