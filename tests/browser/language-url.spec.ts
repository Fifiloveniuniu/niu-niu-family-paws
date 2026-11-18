import { test, expect } from '@playwright/test';
import { chooseOption } from './dropdown-helpers';

test('shared links override storage and keep language through navigation and history', async ({
  page,
}) => {
  await page.addInitScript(() => localStorage.setItem('language', 'en'));
  await page.goto('/home/?lang=zh');
  await expect(page.locator('html')).toHaveAttribute('lang', 'zh-Hans');
  const services = page
    .getByRole('navigation', { name: '主导航', exact: true })
    .getByRole('link', { name: '服务项目', exact: true });
  await expect(services).toHaveAttribute('href', '/services/?lang=zh');
  await services.click();
  await expect(page).toHaveURL(/\/services\/\?lang=zh/);
  await page
    .getByRole('navigation', { name: '主导航', exact: true })
    .getByRole('link', { name: '价格', exact: true })
    .click();
  await expect(page).toHaveURL(/\/pricing\/\?lang=zh/);
  await page.goBack();
  await expect(page).toHaveURL(/\/services\/\?lang=zh/);
  await expect(page.locator('html')).toHaveAttribute('lang', 'zh-Hans');
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('lang', 'zh-Hans');
});

test('switching language preserves calendar filters and updates copyable links', async ({
  page,
}) => {
  await page.route('**/api/profile', (route) =>
    route.fulfill({ status: 401, json: { code: 'unauthenticated' } }),
  );
  await page.goto('/app/calendar/?house=1&lang=zh');
  await expect(page.getByRole('combobox', { name: '房屋', exact: true })).toHaveAttribute(
    'data-value',
    '1',
  );
  await chooseOption(page.getByRole('button', { name: /^Language \/ 语言:/ }), 'en');
  await expect.poll(() => new URL(page.url()).searchParams.get('lang')).toBe('en');
  await expect(page.getByRole('combobox', { name: 'House', exact: true })).toHaveAttribute(
    'data-value',
    '1',
  );
  await chooseOption(page.getByRole('combobox', { name: 'House', exact: true }), '2');
  await expect.poll(() => new URL(page.url()).searchParams.get('house')).toBe('2');
  expect(new URL(page.url()).searchParams.get('lang')).toBe('en');
  await expect(page.getByRole('link', { name: 'Balances', exact: true })).toHaveAttribute(
    'href',
    '/app/balances/?lang=en',
  );
});

test('a language-only URL change keeps a profile draft without confirmation', async ({
  page,
  request,
}) => {
  const email = `language-query-${Date.now()}@example.test`;
  const response = await request.post(
    'http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/accounts:signUp?key=demo-key',
    { data: { email, password: 'emulator-only-password', returnSecureToken: true } },
  );
  const { localId } = await response.json();
  await request.post(
    'http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/projects/demo-niu-niu/accounts:update',
    { headers: { Authorization: 'Bearer owner' }, data: { localId, emailVerified: true } },
  );
  await page.route('**/api/profile', (route) =>
    route.fulfill(
      route.request().headers().authorization
        ? { status: 204 }
        : { status: 401, json: { code: 'unauthenticated' } },
    ),
  );
  await page.goto('/app/sign-in/?lang=en');
  await page.evaluate(
    async ({ email }) => {
      const { auth } = await import('/apps/web/src/auth-client.ts');
      const { signInWithEmailAndPassword } =
        await import('/node_modules/.vite/deps/firebase_auth.js');
      await signInWithEmailAndPassword(auth, email, 'emulator-only-password');
    },
    { email },
  );
  await page.getByRole('textbox', { name: 'Your name', exact: true }).fill('[TEST] draft');
  const confirmations: string[] = [];
  page.on('dialog', async (dialog) => {
    confirmations.push(dialog.type());
    await dialog.dismiss();
  });
  await chooseOption(page.getByRole('button', { name: /^Language \/ 语言:/ }), 'zh');
  await expect(page.getByRole('textbox', { name: '您的姓名', exact: true })).toHaveValue(
    '[TEST] draft',
  );
  expect(new URL(page.url()).searchParams.get('lang')).toBe('zh');
  expect(confirmations).toHaveLength(0);
});
