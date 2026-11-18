import { test, expect } from '@playwright/test';
for (const timezoneId of ['America/Los_Angeles', 'Pacific/Kiritimati', 'America/Havana'])
  test(`calendar wall dates stay stable in ${timezoneId}`, async ({ browser }) => {
    const context = await browser.newContext({ timezoneId });
    const page = await context.newPage();
    try {
      await page.route('**/api/profile', (route) =>
        route.fulfill({ status: 401, json: { code: 'unauthenticated' } }),
      );
      await page.goto('/app/balances/?lang=en');
      const from = page.getByRole('combobox', { name: 'Statement from', exact: true });
      await from.fill('2026-03-08');
      await expect(from).not.toHaveAttribute('aria-invalid', 'true');
      await from.press('ArrowDown');
      const calendar = page.getByRole('dialog', { name: 'Statement from', exact: true });
      await calendar.locator('[data-date="2026-03-08"]').click();
      await expect(from).toHaveAttribute('data-value', '2026-03-08');
      await from.fill('2028-02-29');
      await from.press('ArrowDown');
      await page.keyboard.press('PageUp');
      await page.keyboard.press('Enter');
      await expect(from).toHaveAttribute('data-value', '2028-01-29');
    } finally {
      await context.close();
    }
  });
