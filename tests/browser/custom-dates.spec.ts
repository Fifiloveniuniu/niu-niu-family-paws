import { test, expect } from '@playwright/test';

for (const width of [390, 1440])
  for (const language of ['en', 'zh']) {
    test(`custom booking calendar selects a date/time and shares dropdown exclusivity ${language} ${width}`, async ({
      page,
    }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.route('**/api/profile', (route) =>
        route.fulfill({ status: 401, json: { code: 'unauthenticated' } }),
      );
      const label = (en: string, zh: string) => (language === 'en' ? en : zh);
      await page.goto(`/app/calendar/?lang=${language}`);
      await page
        .getByRole('button', { name: label('Add booking', '添加预约'), exact: true })
        .click();
      const booking = page.getByRole('dialog', {
        name: label('Add booking', '添加预约'),
        exact: true,
      });
      const pickup = booking.getByRole('combobox', {
        name: label('Pickup', '接回时间'),
        exact: true,
      });
      await pickup.click();
      const calendar = page.getByRole('dialog', { name: label('Pickup', '接回时间'), exact: true });
      await expect(calendar).toBeVisible();
      const date = await page.evaluate(() => {
        const day = new Date();
        day.setDate(day.getDate() + 3);
        return [
          day.getFullYear(),
          String(day.getMonth() + 1).padStart(2, '0'),
          String(day.getDate()).padStart(2, '0'),
        ].join('-');
      });
      await calendar.locator(`[data-date="${date}"]`).click();
      await calendar
        .getByRole('textbox', { name: label('Hour (24h)', '小时（24 小时制）'), exact: true })
        .fill('10');
      await calendar
        .getByRole('textbox', { name: label('Minute', '分钟'), exact: true })
        .fill('30');
      await calendar
        .getByRole('button', { name: label('Apply date and time', '应用日期与时间'), exact: true })
        .click();
      await expect(pickup).toHaveAttribute('data-value', date + 'T10:30');
      await expect(calendar).toHaveCount(0);
      await expect(pickup).toBeFocused();
      await pickup.click();
      await booking.getByRole('combobox', { name: label('Pet', '宠物'), exact: true }).click();
      await expect(calendar).toHaveCount(0);
      await expect(page.getByRole('listbox')).toHaveCount(1);
      await page.keyboard.press('Escape');
      await expect(booking).toBeVisible();
      await expect(
        page.locator('input[type="date"], input[type="datetime-local"], input[type="time"]'),
      ).toHaveCount(0);
      expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(
        false,
      );
    });
  }

test('date-only filters support keyboard selection and reject impossible typed dates', async ({
  page,
}) => {
  await page.route('**/api/profile', (route) =>
    route.fulfill({ status: 401, json: { code: 'unauthenticated' } }),
  );
  await page.goto('/app/balances/?lang=en');
  const from = page.getByRole('combobox', { name: 'Statement from', exact: true });
  await from.fill('2026-02-29');
  await expect(from).toHaveAttribute('aria-invalid', 'true');
  await expect(page.getByText('N/A', { exact: false }).first()).toBeVisible();
  await from.fill('2028-02-29');
  await expect(from).not.toHaveAttribute('aria-invalid', 'true');
  await from.press('ArrowDown');
  const calendar = page.getByRole('dialog', { name: 'Statement from', exact: true });
  await expect(calendar).toBeVisible();
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('Enter');
  await expect(from).toHaveAttribute('data-value', '2028-03-01');
  await expect(calendar).toHaveCount(0);
});

test('calendar month keys clamp the day at the end of shorter months', async ({ page }) => {
  await page.route('**/api/profile', (route) =>
    route.fulfill({ status: 401, json: { code: 'unauthenticated' } }),
  );
  await page.goto('/app/balances/?lang=en');
  const from = page.getByRole('combobox', { name: 'Statement from', exact: true });
  await from.fill('2028-01-31');
  await from.press('ArrowDown');
  await page.keyboard.press('PageDown');
  await page.keyboard.press('Enter');
  await expect(from).toHaveAttribute('data-value', '2028-02-29');
});
