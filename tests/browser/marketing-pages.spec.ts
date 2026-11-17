import { test, expect } from '@playwright/test';

async function language(page: import('@playwright/test').Page, value: string) {
  const menu = page.locator('.marketing-menu-toggle');
  if ((await menu.isVisible()) && !(await page.locator('select').isVisible())) await menu.click();
  await page.locator('select').selectOption(value);
  if ((await menu.isVisible()) && (await page.locator('select').isVisible())) await menu.click();
}

test('marketing pages share navigation, bilingual mobile layouts and a complete footer', async ({
  page,
}) => {
  for (const width of [320, 390, 1024, 1440]) {
    await page.setViewportSize({ width, height: 950 });
    for (const lang of ['en', 'zh']) {
      await page.goto('/home/');
      await language(page, lang);
      for (const route of [
        '/services/',
        '/spaces/',
        '/about/',
        '/pricing/',
        '/faqs/',
        '/contact/',
        '/academy/',
      ]) {
        await page.goto(route);
        await page.evaluate(() => document.fonts.ready);
        await expect(page.locator('main h1')).toHaveCount(1);
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
          true,
        );
        await expect(page.locator('.marketing-footer')).toBeVisible();
        await expect(
          page.locator('.marketing-footer a[href="/pricing/#cancellation-policy"]'),
        ).toHaveCount(1);
        expect(await page.locator('main').innerText()).not.toContain('undefined');
      }
    }
  }
});

test('mobile menu, service submenu, policy alias and service links navigate correctly', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/home/');
  const toggle = page.getByRole('button', { name: 'Menu' });
  await toggle.click();
  await page.getByRole('button', { name: 'Show services' }).click();
  await page.locator('#service-menu a[href="/academy/"]').click();
  await expect(page).toHaveURL(/\/academy\/$/);
  await expect(page.locator('#marketing-menu')).toBeHidden();
  await toggle.click();
  await page.keyboard.press('Escape');
  await expect(toggle).toBeFocused();
  await expect(page.locator('#marketing-menu')).toBeHidden();
  await page.goto('/cancellation-policy/');
  await expect(page).toHaveURL(/\/pricing\/#cancellation-policy$/);
  await expect(page.locator('#cancellation-policy')).toBeInViewport();
  await page.locator('#cancellation-policy a[href="/services/"]').click();
  await expect(page).toHaveURL(/\/services\/$/);
  await page.setViewportSize({ width: 1440, height: 950 });
  const labels = await page
    .locator('.marketing-header nav > a,.marketing-header nav > .nav-services > a')
    .allTextContents();
  expect(labels.map((s) => s.trim())).toEqual([
    'Home',
    'Services',
    'Our Spaces',
    'About us',
    'Pricing',
    'FAQs',
    'Contact us ↗',
  ]);
});
