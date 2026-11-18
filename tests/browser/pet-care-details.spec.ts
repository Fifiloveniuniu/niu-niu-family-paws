import { test, expect } from '@playwright/test';
import { chooseOption } from './dropdown-helpers';
test('pet type and weight remain editable in clean bilingual dialogs', async ({
  page,
  request,
}) => {
  const email = `pet-details-${Date.now()}@example.test`;
  const created = await request.post(
    'http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/accounts:signUp?key=demo-key',
    { data: { email, password: 'emulator-only-password', returnSecureToken: true } },
  );
  const { localId } = await created.json();
  await request.post(
    'http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/projects/demo-niu-niu/accounts:update',
    { headers: { Authorization: 'Bearer owner' }, data: { localId, emailVerified: true } },
  );
  const cid = '10000000-0000-4000-8000-000000000020';
  const profile = {
    id: cid,
    name: '[TEST] Owner',
    email: '',
    phone: '',
    language: 'en',
    version: 1,
    loginEmail: email,
    createdAt: '2026-11-18',
    updatedAt: '2026-11-18',
  };
  await page.route('**/api/profile', (r) =>
    r.request().headers().authorization
      ? r.fulfill({ json: profile })
      : r.fulfill({ status: 401, json: { code: 'unauthenticated' } }),
  );
  let pets: any[] = [];
  await page.route('**/api/customers/*/pets**', (r) => {
    if (r.request().method() === 'GET')
      return r.fulfill({ json: { items: pets, nextCursor: null } });
    const body = r.request().postDataJSON();
    const pet = {
      ...body,
      id: r.request().url().split('/').at(-1),
      customerId: cid,
      photo: null,
      version: body.version + 1,
      createdAt: '2026-11-18',
      updatedAt: '2026-11-18',
    };
    pets = [pet];
    return r.fulfill({ json: pet });
  });
  await page.goto('/app/sign-in/?lang=en');
  await page.evaluate(async (email) => {
    const { auth } = await import('/apps/web/src/auth-client.ts');
    const { signInWithEmailAndPassword } =
      await import('/node_modules/.vite/deps/firebase_auth.js');
    await signInWithEmailAndPassword(auth, email, 'emulator-only-password');
  }, email);
  await page.goto('/app/account/profile/?lang=en');
  await page.getByRole('button', { name: 'Add pet', exact: true }).click();
  let dialog = page.getByRole('dialog', { name: 'Add pet', exact: true });
  await dialog.getByRole('textbox', { name: 'Pet name', exact: true }).fill('[TEST] Pet');
  await chooseOption(dialog.getByRole('combobox', { name: 'Pet type', exact: true }), 'dog');
  await dialog.getByRole('spinbutton', { name: 'Weight (kg)', exact: true }).fill('12.75');
  await dialog.getByRole('button', { name: 'Save pet', exact: true }).click();
  await expect(page.getByText('Dog · 12.75 kg', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Edit pet: [TEST] Pet', exact: true }).click();
  dialog = page.getByRole('dialog', { name: 'Edit pet', exact: true });
  await expect(dialog.getByRole('spinbutton', { name: 'Weight (kg)', exact: true })).toHaveValue(
    '12.75',
  );
  await dialog.getByRole('spinbutton', { name: 'Weight (kg)', exact: true }).fill('');
  await chooseOption(dialog.getByRole('combobox', { name: 'Pet type', exact: true }), '');
  await dialog.getByRole('button', { name: 'Save pet', exact: true }).click();
  await expect(page.getByText('N/A · N/A', { exact: true })).toBeVisible();
  await chooseOption(page.getByRole('button', { name: /^Language \/ 语言:/ }), 'zh');
  await page.getByRole('button', { name: '编辑宠物: [TEST] Pet', exact: true }).click();
  await expect(page.getByRole('spinbutton', { name: '体重（公斤）', exact: true })).toHaveValue('');
});
