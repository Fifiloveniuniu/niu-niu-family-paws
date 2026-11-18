import { test, expect } from '@playwright/test';

for (const width of [390, 1440])
  for (const language of ['en', 'zh']) {
    test(`calendar pet info supports hover, focus and tap ${language} ${width}`, async ({
      page,
    }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.addInitScript((lang) => localStorage.setItem('language', lang), language);
      await page.route('**/api/profile', (route) =>
        route.fulfill({ status: 401, json: { code: 'unauthenticated' } }),
      );
      await page.goto('/app/calendar/');
      const avatar = page.getByRole('button', {
        name: `${language === 'en' ? 'View pet details' : '查看宠物详情'}: Mochi`,
        exact: true,
      });
      await avatar.hover();
      const popup = page.getByRole('dialog', { name: 'Mochi', exact: true });
      await expect(popup).toBeVisible();
      await expect(
        popup.getByText(language === 'en' ? 'Weight' : '体重', { exact: true }),
      ).toBeVisible();
      await expect(popup.getByText('N/A', { exact: true }).first()).toBeVisible();
      await expect(
        popup.getByText(language === 'en' ? 'Family 1' : '家庭 1', { exact: true }),
      ).toBeVisible();
      expect(
        await popup
          .locator('.hc-pet-preview-photo')
          .evaluate((e) => e.getBoundingClientRect().width),
      ).toBe(112);
      await popup.hover();
      await expect(popup).toBeVisible();
      const rect = await popup.boundingBox();
      expect(rect!.x).toBeGreaterThanOrEqual(0);
      expect(rect!.x + rect!.width).toBeLessThanOrEqual(width);
      await page.keyboard.press('Escape');
      await expect(popup).toHaveCount(0);
      await expect(avatar).toBeFocused();
      await avatar.click();
      await expect(popup).toBeVisible();
      await popup
        .getByRole('button', {
          name: language === 'en' ? 'Close pet details' : '关闭宠物详情',
          exact: true,
        })
        .click();
      await expect(popup).toHaveCount(0);
      await page
        .getByRole('combobox', { name: language === 'en' ? 'House' : '房屋', exact: true })
        .focus();
      await avatar.focus();
      await expect(popup).toBeVisible();
      await popup
        .getByRole('link', { name: language === 'en' ? 'View balance' : '查看余额', exact: true })
        .click();
      await expect(page).toHaveURL(/\/app\/balances\/\?pet=Mochi/);
      expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(
        false,
      );
    });
  }
