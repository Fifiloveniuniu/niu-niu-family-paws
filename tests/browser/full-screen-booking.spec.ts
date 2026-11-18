import { test, expect } from '@playwright/test';
import { chooseOption } from './dropdown-helpers';

for (const width of [390, 1440])
  for (const language of ['en', 'zh']) {
    test(`near-full-screen booking without manual day/capacity fields ${language} ${width}`, async ({
      page,
    }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.addInitScript((lang) => localStorage.setItem('language', lang), language);
      await page.route('**/api/profile', (route) =>
        route.fulfill({ status: 401, json: { code: 'unauthenticated' } }),
      );
      const translate = (en: string, cn: string) => (language === 'zh' ? cn : en);
      await page.goto('/app/calendar/');
      await page
        .getByRole('button', { name: translate('Add house', '添加房屋'), exact: true })
        .click();
      await page
        .getByLabel(translate('House name', '房屋名称'), { exact: true })
        .fill('[TEST] House');
      await page
        .getByRole('button', { name: translate('Apply changes', '应用修改'), exact: true })
        .click();
      const house = page.locator('.hc-house').filter({ hasText: '[TEST] House' });
      await house
        .getByRole('button', { name: translate('Add room', '添加房间'), exact: true })
        .click();
      await page
        .getByLabel(translate('Room name', '房间名称'), { exact: true })
        .fill('[TEST] Room');
      await page.getByLabel(translate('Maximum capacity', '最大容量'), { exact: true }).fill('2');
      await page
        .getByLabel(translate('Dog capacity usage', '狗容量用量'), { exact: true })
        .fill('1');
      await page
        .getByRole('button', { name: translate('Apply changes', '应用修改'), exact: true })
        .click();
      await page
        .getByRole('button', { name: translate('Add booking', '添加预约'), exact: true })
        .click();
      const dialog = page.getByRole('dialog');
      const rect = await dialog.boundingBox();
      const edge = width <= 700 ? 12 : 24;
      expect(rect).toMatchObject({
        x: edge,
        y: edge,
        width: width - 2 * edge,
        height: 900 - 2 * edge,
      });
      await expect(
        dialog.getByText(translate('Required days', '所需天数'), { exact: true }),
      ).toHaveCount(0);
      await expect(
        dialog.getByText(
          translate('Capacity override & manual selection', '容量覆盖值与手动选择'),
          { exact: true },
        ),
      ).toHaveCount(0);
      const next = dialog.getByRole('button', {
        name: translate('Choose a room', '选择房间'),
        exact: true,
      });
      await expect(next).toBeDisabled();
      await chooseOption(
        dialog.getByRole('combobox', { name: translate('Pet', '宠物'), exact: true }),
        'Willow',
      );
      const times = await page.evaluate(() => {
        const start = new Date();
        start.setDate(start.getDate() + 40);
        start.setHours(10, 0, 0, 0);
        const end = new Date(start);
        end.setDate(end.getDate() + 2);
        const local = (date: Date) =>
          new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
        return [local(start), local(end)];
      });
      await dialog.getByLabel(translate('Arrival', '到店时间'), { exact: true }).fill(times[0]);
      await dialog.getByLabel(translate('Pickup', '接回时间'), { exact: true }).fill(times[1]);
      await expect(next).toBeEnabled();
      await next.click();
      await dialog
        .getByRole('button', {
          name: `${translate('Choose', '选择')} [TEST] House · [TEST] Room`,
          exact: true,
        })
        .click();
      await dialog
        .getByRole('button', { name: translate('Review stay', '确认托管'), exact: true })
        .click();
      await expect(dialog.locator('.hc-coverage-card dd')).toHaveText(['N/A', 'N/A', 'N/A']);
      await expect(
        dialog.getByText(
          translate(
            'Day usage awaits the billing rule. Saving this schedule does not deduct or reserve balance days.',
            '使用天数待计费规则确定后计算。保存此安排不会扣减或预留余额天数。',
          ),
          { exact: true },
        ),
      ).toBeVisible();
      await expect(
        dialog.getByRole('button', {
          name: translate('Add to calendar', '添加到日历'),
          exact: false,
        }),
      ).toBeInViewport();
      await page.screenshot({ path: `test-results/booking-full-screen-${language}-${width}.png` });
      await dialog
        .getByRole('button', { name: translate('Add to calendar', '添加到日历'), exact: false })
        .click();
      await expect(dialog).toHaveCount(0);
      await expect(page.locator('.hc-pet').filter({ hasText: 'Willow' })).toBeVisible();
      expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(
        false,
      );
    });
  }
