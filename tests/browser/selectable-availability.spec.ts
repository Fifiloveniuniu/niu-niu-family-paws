import { test, expect } from '@playwright/test';
import { chooseOption } from './dropdown-helpers';
for (const lang of ['en', 'zh'])
  for (const width of [390, 1440])
    test(`available space and empty practice room ${lang} ${width}`, async ({ page }) => {
      const t = (en: string, zh: string) => (lang === 'en' ? en : zh);
      await page.setViewportSize({ width, height: 900 });
      await page.route('**/api/profile', (r) =>
        r.fulfill({ status: 401, json: { code: 'unauthenticated' } }),
      );
      await page.goto(`/app/calendar/?lang=${lang}`);
      await page.getByRole('button', { name: t('Add booking', '添加预约'), exact: true }).click();
      const dialog = page.getByRole('dialog', { name: t('Add booking', '添加预约'), exact: true });
      await chooseOption(
        dialog.getByRole('combobox', { name: t('Customer', '客户'), exact: true }),
        '4',
      );
      await chooseOption(
        dialog.getByRole('combobox', { name: t('Pet', '宠物'), exact: true }),
        'Willow',
      );
      const times = await page.evaluate(() => {
        const a = new Date();
        a.setDate(a.getDate() + 40);
        a.setHours(10, 0, 0, 0);
        const b = new Date(a);
        b.setDate(b.getDate() + 2);
        return [a, b].map((d) =>
          new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16),
        );
      });
      await dialog
        .getByRole('combobox', { name: t('Arrival', '到店时间'), exact: true })
        .fill(times[0]);
      await dialog
        .getByRole('combobox', { name: t('Pickup', '接回时间'), exact: true })
        .fill(times[1]);
      await dialog
        .getByRole('button', { name: t('Choose a room', '选择房间'), exact: true })
        .click();
      const free = dialog.getByRole('button', {
        name:
          lang === 'en'
            ? /^Available space: House A · Practice room/
            : /^可用空间: 房屋 A · 练习房间/,
      });
      await expect(free).toBeEnabled();
      await free.focus();
      await free.press('Enter');
      await expect(dialog.locator('.hc-time-request.picked')).toHaveCount(1);
      await dialog.getByRole('button', { name: t('Review stay', '确认托管'), exact: true }).click();
      await expect(
        dialog
          .locator('.hc-review-card')
          .getByText(t('Practice room', '练习房间'), { exact: false }),
      ).toBeVisible();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
        true,
      );
    });
