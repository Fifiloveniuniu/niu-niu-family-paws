import { chooseOption } from './dropdown-helpers';
import { test, expect } from '@playwright/test';
test('admin manages multiple houses in dialogs with retry safety, filtering and bilingual responsive layout', async ({
  page,
  request,
}) => {
  const email = `houses-${Date.now()}@example.test`;
  const created = await request.post(
    'http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/accounts:signUp?key=demo-key',
    { data: { email, password: 'emulator-only-password', returnSecureToken: true } },
  );
  const { localId } = await created.json();
  await request.post(
    'http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/projects/demo-niu-niu/accounts:update',
    {
      headers: { Authorization: 'Bearer owner' },
      data: { localId, emailVerified: true, customAttributes: JSON.stringify({ admin: true }) },
    },
  );
  let items: any[] = [];
  let lose = false;
  const writes: any[] = [];
  await page.route('**/api/customers?*', (route) =>
    route.fulfill({ json: { items: [], nextCursor: null } }),
  );
  await page.route('**/api/profile', (route) =>
    route.request().headers().authorization
      ? route.fulfill({ status: 204 })
      : route.fulfill({ status: 401, json: { code: 'unauthenticated' } }),
  );
  await page.route('**/api/houses*', (route) => route.fulfill({ json: { items } }));
  await page.route('**/api/houses/*', (route) => {
    const body = route.request().postDataJSON();
    const id = route.request().url().split('/').at(-1);
    writes.push({ id, ...body });
    const prior = items.find((h) => h.id === id);
    const house =
      prior?.version === body.version + 1
        ? prior
        : {
            id,
            ...body,
            version: body.version + 1,
            createdAt: prior?.createdAt ?? '2026-11-15',
            updatedAt: '2026-11-15',
          };
    items = [...items.filter((h) => h.id !== id), house];
    if (lose) {
      lose = false;
      return route.fulfill({ status: 503, json: { code: 'unavailable' } });
    }
    return route.fulfill({ json: house });
  });
  const savedRooms: Record<string, any[]> = {};
  await page.route('**/api/houses/*/rooms', (route) => {
    const hid = route.request().url().split('/').at(-2)!;
    return route.fulfill({ json: { items: savedRooms[hid] ?? [] } });
  });
  await page.route('**/api/houses/*/rooms/*', (route) => {
    const parts = route.request().url().split('/');
    const hid = parts.at(-3)!;
    const id = parts.at(-1)!;
    const body = route.request().postDataJSON();
    const room = {
      ...body,
      id,
      houseId: hid,
      version: body.version + 1,
      createdAt: '2026-11-18',
      updatedAt: '2026-11-18',
    };
    savedRooms[hid] = [...(savedRooms[hid] ?? []).filter((r) => r.id !== id), room];
    return route.fulfill({ json: room });
  });
  await page.goto('/app/sign-in/');
  await page.evaluate(
    async ({ email }) => {
      const { auth } = await import('/apps/web/src/auth-client.ts');
      const { signInWithEmailAndPassword } = await import('/tests/helpers/browser-auth.ts');
      await signInWithEmailAndPassword(auth, email, 'emulator-only-password');
    },
    { email },
  );
  await page.getByRole('link', { name: 'Calendar', exact: true }).click();
  await page.getByRole('button', { name: 'Manage houses & rooms', exact: true }).click();
  const section = page.getByRole('region', { name: 'Houses', exact: true });
  await expect(
    section.getByText('No houses yet. Add your first house.', { exact: true }),
  ).toBeVisible();
  await section.getByRole('button', { name: 'Add house', exact: true }).click();
  const dialog = page.getByRole('dialog').last();
  await expect(dialog.getByLabel('House name', { exact: true })).toBeFocused();
  await dialog.getByLabel('House name', { exact: true }).fill('Demo West');
  await dialog.getByLabel('Address', { exact: true }).fill('Synthetic address');
  await chooseOption(
    dialog.getByRole('combobox', { name: 'Time zone', exact: true }),
    'America/Los_Angeles',
  );
  page.once('dialog', (d) => d.dismiss());
  await dialog.getByRole('button', { name: 'Close', exact: true }).click();
  await expect(dialog.getByLabel('House name', { exact: true })).toHaveValue('Demo West');
  await dialog.getByRole('button', { name: 'Save house', exact: true }).click();
  await expect(section.getByRole('heading', { name: 'Demo West', exact: true })).toBeVisible();
  await section.getByRole('button', { name: 'Add room', exact: true }).click();
  let roomDialog = page.getByRole('dialog', { name: 'Add room', exact: true });
  await roomDialog.getByLabel('Room name', { exact: true }).fill('[TEST] Oak');
  await roomDialog.getByLabel('Maximum capacity', { exact: true }).fill('3');
  await roomDialog.getByLabel('Dog', { exact: true }).fill('1');
  await roomDialog.getByRole('button', { name: 'Save room', exact: true }).click();
  await expect(section.getByText('[TEST] Oak', { exact: true })).toBeVisible();
  await section.getByRole('button', { name: 'Edit room: [TEST] Oak', exact: true }).click();
  roomDialog = page.getByRole('dialog', { name: 'Edit room', exact: true });
  await expect(roomDialog.getByLabel('Maximum capacity', { exact: true })).toHaveValue('3');
  await roomDialog.getByLabel('Maximum capacity', { exact: true }).fill('4');
  await roomDialog.getByRole('button', { name: 'Save room', exact: true }).click();
  expect(Object.values(savedRooms)[0][0].version).toBe(2);
  await section.getByRole('button', { name: 'Add house', exact: true }).click();
  await dialog.getByLabel('House name', { exact: true }).fill('Demo East');
  await dialog.getByLabel('Address', { exact: true }).fill('Synthetic east address');
  await chooseOption(
    dialog.getByRole('combobox', { name: 'Time zone', exact: true }),
    'Asia/Shanghai',
  );
  await dialog.getByRole('button', { name: 'Save house', exact: true }).click();
  await chooseOption(page.getByRole('combobox', { name: 'Show house', exact: true }), '');
  await expect(section.getByRole('heading', { level: 3 })).toHaveCount(2);
  await section.getByRole('button', { name: 'Edit house: Demo West', exact: true }).click();
  await dialog.getByLabel('House name', { exact: true }).fill('Demo West updated');
  lose = true;
  await dialog.getByRole('button', { name: 'Save house', exact: true }).click();
  await expect(dialog.getByRole('button', { name: 'Close', exact: true })).toBeDisabled();
  await expect(dialog.getByLabel('House name', { exact: true })).toBeDisabled();
  await dialog.getByRole('button', { name: 'Try again', exact: true }).click();
  expect(writes.at(-1)).toEqual(writes.at(-2));
  expect(items).toHaveLength(2);
  await expect(
    section.getByRole('heading', { name: 'Demo West updated', exact: true }),
  ).toBeVisible();
  await chooseOption(page.getByRole('combobox', { name: 'Show house', exact: true }), '');
  for (const language of ['en', 'zh']) {
    await page
      .getByRole('dialog')
      .first()
      .getByRole('button', { name: /^(Close|关闭)$/ })
      .click();
    await chooseOption(page.getByRole('button', { name: /^Language \/ 语言:/ }), language);
    await page
      .getByRole('button', {
        name: language === 'zh' ? '管理房屋与房间' : 'Manage houses & rooms',
        exact: true,
      })
      .click();
    for (const width of [320, 400, 1280]) {
      await page.setViewportSize({ width, height: 900 });
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
        true,
      );
    }
  }
  await page.getByRole('button', { name: '编辑房屋: Demo West updated', exact: true }).click();
  await expect(dialog.getByLabel('时区', { exact: true })).toHaveValue('America/Los_Angeles');
  await dialog.getByRole('button', { name: '取消', exact: true }).click();
  await page
    .getByRole('region', { name: '房屋', exact: true })
    .screenshot({ path: 'test-results/houses-desktop-zh.png' });
});

test('calendar shows house address and requires one before saving house settings', async ({
  page,
}) => {
  await page.route('**/api/profile', (route) =>
    route.fulfill({ status: 401, json: { code: 'unauthenticated' } }),
  );
  await page.goto('/app/calendar/?lang=en');
  await page.getByRole('button', { name: 'View address: House A', exact: true }).click();
  let dialog = page.getByRole('dialog', { name: 'House address', exact: true });
  await expect(dialog.getByText('N/A', { exact: true })).toBeVisible();
  await dialog.getByRole('button', { name: 'Close', exact: true }).click();
  await page.getByRole('button', { name: 'House settings: House A', exact: true }).click();
  dialog = page.getByRole('dialog', { name: 'House settings', exact: true });
  await expect(dialog.getByLabel('Address', { exact: true })).toHaveAttribute('required', '');
  await dialog.getByRole('button', { name: 'Apply changes', exact: true }).click();
  await expect(dialog).toBeVisible();
  await dialog.getByLabel('Address', { exact: true }).fill('[TEST] Synthetic local address');
  await dialog.getByRole('button', { name: 'Apply changes', exact: true }).click();
  await page.getByRole('button', { name: 'View address: House A', exact: true }).click();
  await expect(
    page
      .getByRole('dialog', { name: 'House address', exact: true })
      .getByText('[TEST] Synthetic local address', { exact: true }),
  ).toBeVisible();
});
