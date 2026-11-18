import { chooseOption } from './dropdown-helpers';
import { test, expect } from '@playwright/test';

test('custom language choices persist across public and sign-in pages', async ({ page }) => {
  await page.route('**/api/profile', (route) =>
    route.fulfill({ status: 401, json: { code: 'unauthenticated' } }),
  );
  await page.goto('/home/');
  const language = page.getByRole('button', { name: /^Language \/ 语言:/ });
  for (const width of [320, 400, 1280]) {
    await page.setViewportSize({ width, height: 900 });
    for (const value of ['zh', 'en']) {
      await chooseOption(language, value);
      await expect(page.locator('html')).toHaveAttribute('lang', value === 'zh' ? 'zh-Hans' : 'en');
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
        true,
      );
    }
  }
  await chooseOption(language, 'zh');
  await page.goto('/app/sign-in/');
  await expect(language).toContainText('简体中文');
  await page.reload();
  await expect(language).toContainText('简体中文');
  await expect(page.getByRole('button', { name: '使用 Google 登录', exact: true })).toBeVisible();
  await chooseOption(language, 'en');
  await page.goto('/home/');
  await expect(language).toContainText('English');
});
