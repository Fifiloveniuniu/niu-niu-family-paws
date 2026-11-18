import { test, expect } from '@playwright/test';

for (const language of ['en', 'zh']) {
  test(`API outage and retry recovery (${language})`, async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.addInitScript((language) => localStorage.setItem('language', language), language);
    let unavailable = true;
    await page.route('**/api/profile', (route) =>
      unavailable
        ? route.fulfill({ status: 502, body: 'Bad gateway' })
        : route.fulfill({
            status: 401,
            contentType: 'application/json',
            body: JSON.stringify({ code: 'unauthenticated' }),
          }),
    );
    await page.goto('/app');
    await expect(
      page.getByRole('heading', {
        name: language === 'zh' ? '无法连接服务器' : 'Unable to connect',
      }),
    ).toBeVisible();
    await expect(page.getByRole('heading', { name: 'House calendar', exact: true })).toBeHidden();
    unavailable = false;
    await page
      .getByRole('button', { name: language === 'zh' ? '重试' : 'Try again', exact: true })
      .click();
    await expect(page.getByRole('alert')).toBeHidden();
    await expect(
      page.getByRole('navigation', { name: language === 'zh' ? '工作区' : 'Workspace' }),
    ).toBeVisible();
  });
}
