import { test, expect } from '@playwright/test';
import { chooseOption } from './dropdown-helpers';

for (const width of [390, 1440])
  for (const language of ['en', 'zh']) {
    test(`custom filters, keyboard, and exclusivity ${language} ${width}`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.addInitScript((lang) => localStorage.setItem('language', lang), language);
      await page.route('**/api/profile', (route) =>
        route.fulfill({ status: 401, json: { code: 'unauthenticated' } }),
      );
      await page.goto('/app/calendar/');
      const house = page.getByRole('combobox', {
        name: language === 'en' ? 'House' : '房屋',
        exact: true,
      });
      const status = page.getByRole('combobox', {
        name: language === 'en' ? 'Status' : '状态',
        exact: true,
      });
      await house.click();
      await expect(page.getByRole('listbox')).toHaveCount(1);
      await status.click();
      await expect(house).toHaveAttribute('aria-expanded', 'false');
      await expect(page.getByRole('listbox')).toHaveCount(1);
      await status.press('ArrowDown');
      await status.press('Enter');
      await expect(page).toHaveURL(/status=in/);
      await chooseOption(house, '2');
      await expect(page).toHaveURL(/house=2/);
      const timezone = page.getByRole('combobox', {
        name: language === 'en' ? 'Clock timezone' : '时钟时区',
        exact: true,
      });
      await timezone.click();
      await timezone.press('End');
      await expect(page.locator('[role="option"][data-active]')).toBeInViewport();
      await timezone.press('Escape');
      await expect(timezone).toBeFocused();
      await expect(page.getByRole('listbox')).toHaveCount(0);
      await timezone.click();
      const menu = page.getByRole('button', {
        name: language === 'en' ? 'Menu' : '菜单',
        exact: true,
      });
      if (width === 390) await menu.click();
      await page.getByRole('button', { name: /^Language \/ 语言:/ }).click();
      await expect(page.getByRole('listbox')).toHaveCount(0);
      await expect(page.getByRole('menu')).toHaveCount(1);
      await page.keyboard.press('Escape');
      if (width === 390) await page.locator('.marketing-menu-toggle').click();
      await expect(page.locator('select:not(.custom-select-native)')).toHaveCount(0);
      expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(
        false,
      );
    });
  }

test('custom selector stays visible inside a modal and Escape closes only the dropdown', async ({
  page,
}) => {
  await page.route('**/api/profile', (route) =>
    route.fulfill({ status: 401, json: { code: 'unauthenticated' } }),
  );
  await page.goto('/app/calendar/');
  await page.getByRole('button', { name: 'Add booking', exact: true }).click();
  const dialog = page.getByRole('dialog');
  const pet = dialog.getByRole('combobox', { name: 'Pet', exact: true });
  await pet.click();
  await expect(page.getByRole('listbox')).toBeVisible();
  await chooseOption(pet, 'Miso');
  await expect(pet).toContainText('Miso');
  await pet.click();
  await pet.press('Escape');
  await expect(page.getByRole('listbox')).toHaveCount(0);
  await expect(dialog).toBeVisible();
  await expect(pet).toBeFocused();
});

test('marketing navigation and language menus are mutually exclusive', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/home/');
  const group = page.locator('.nav-dropdown').first();
  const services = group.locator('.nav-submenu-toggle');
  await group.hover();
  await expect(services).toHaveAttribute('aria-expanded', 'true');
  await page.getByRole('button', { name: /^Language \/ 语言:/ }).click();
  await expect(services).toHaveAttribute('aria-expanded', 'false');
  await expect(page.getByRole('menu')).toBeVisible();
  await group.hover();
  await expect(page.getByRole('menu')).toHaveCount(0);
  await expect(services).toHaveAttribute('aria-expanded', 'true');
});

test('account, language and profile selectors share one open-menu state and preserve form changes', async ({
  page,
  request,
}) => {
  const email = `custom-dropdown-${Date.now()}@example.test`;
  const response = await request.post(
    'http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/accounts:signUp?key=demo-key',
    { data: { email, password: 'emulator-only-password', returnSecureToken: true } },
  );
  const { localId } = await response.json();
  await request.post(
    'http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/projects/demo-niu-niu/accounts:update',
    {
      headers: { Authorization: 'Bearer owner' },
      data: { localId, emailVerified: true, customAttributes: JSON.stringify({ admin: true }) },
    },
  );
  await page.route('**/api/profile', (route) =>
    route.fulfill(
      route.request().headers().authorization
        ? { status: 204 }
        : { status: 401, json: { code: 'unauthenticated' } },
    ),
  );
  await page.route('**/api/customers**', (route) =>
    route.fulfill({ json: { items: [], nextCursor: null } }),
  );
  await page.goto('/app/sign-in/');
  await page.evaluate(
    async ({ email }) => {
      const { auth } = await import('/apps/web/src/auth-client.ts');
      const { signInWithEmailAndPassword } =
        await import('/node_modules/.vite/deps/firebase_auth.js');
      await signInWithEmailAndPassword(auth, email, 'emulator-only-password');
    },
    { email },
  );
  await page.goto('/app/account/profile/');
  const language = page.getByRole('button', { name: /^Language \/ 语言:/ });
  const account = page.locator('.hc-account-menu');
  await account.locator('summary').click();
  await expect(account).toHaveAttribute('open', '');
  await language.click();
  await expect(account).not.toHaveAttribute('open', '');
  await expect(page.getByRole('menu')).toBeVisible();
  await account.locator('summary').click();
  await expect(page.getByRole('menu')).toHaveCount(0);
  const preference = page.getByRole('combobox', { name: 'Your preferred language', exact: true });
  await chooseOption(preference, 'zh');
  await expect(account).not.toHaveAttribute('open', '');
  await expect(preference).toHaveAttribute('data-value', 'zh');
  await expect(page.getByText('You have unsaved changes.', { exact: false })).toBeVisible();
});
