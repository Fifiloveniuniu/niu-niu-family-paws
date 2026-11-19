import { readFile } from 'node:fs/promises';
import { test, expect } from '@playwright/test';
test('real saved workspace scopes all three tabs and persists manual credits', async ({
  page,
  request,
}) => {
  test.setTimeout(60000);
  const serverErrors: string[] = [];
  page.on('response', (response) => {
    if (response.url().includes('/api/') && response.status() >= 500)
      serverErrors.push(response.url());
  });
  const fixture = await (await request.get('/__test-fixture')).json();
  await page.goto('/app/calendar/?lang=en');
  await page.evaluate(async (jwt) => {
    // @ts-ignore Test-only Vite module import.
    const { auth } = await import('/apps/web/src/auth-client.ts');
    // @ts-ignore Test-only Vite dependency import.
    const { GoogleAuthProvider, signInWithCredential } =
      await import('/node_modules/.vite/deps/firebase_auth.js');
    await signInWithCredential(auth, GoogleAuthProvider.credential(jwt));
  }, fixture.administrator.jwt);
  await expect(
    page
      .getByRole('navigation')
      .filter({ has: page.getByRole('link', { name: 'Balances', exact: true }) }),
  ).toBeVisible();
  await expect(page.getByText('[TEST] Practice room', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Add booking', exact: true }).click();
  await page.getByRole('dialog').getByRole('combobox', { name: 'Customer', exact: true }).click();
  await expect(page.getByRole('option')).toHaveCount(100);
  await page.getByRole('option', { name: '[TEST] Alice', exact: true }).click();
  await page.getByRole('dialog').getByRole('combobox', { name: 'Pet', exact: true }).click();
  await expect(page.getByRole('option')).toHaveCount(3);
  await expect(page.locator('[role=listbox]:visible')).toHaveCount(1);
  await page.getByRole('option').filter({ hasText: '[TEST] Alice pet 0' }).click();
  const box = await page.getByRole('dialog').boundingBox();
  expect(box?.x).toBe(24);
  expect(box?.y).toBe(24);
  page.once('dialog', (dialog) => dialog.accept());
  await page.getByRole('button', { name: 'Cancel', exact: true }).click();
  await page.goto(`/app/balances/?lang=en&asCustomer=${fixture.cid}`);
  await expect(page.getByText(/Viewing as.*Alice/)).toBeVisible();
  await expect(page.getByRole('link', { name: 'Pets', exact: true })).toBeVisible();
  await expect(page.locator('.workspace-table tbody tr')).toHaveCount(3);
  await page.getByRole('button', { name: 'Add balance', exact: true }).click();
  await page.getByRole('combobox', { name: 'Pet', exact: true }).click();
  await page.getByRole('option').filter({ hasText: '[TEST] Alice pet 0' }).click();
  await page.getByLabel('Days to add or remove').fill('5');
  await page.getByRole('combobox', { name: 'Valid from', exact: true }).fill('2026-01-01');
  await page.getByRole('combobox', { name: 'Valid through', exact: true }).fill('2031-12-31');
  await page.getByRole('button', { name: 'Save changes', exact: true }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await page.reload();
  await expect(page.locator('.workspace-table').first()).toContainText('5');
  await expect(page.locator('.workspace-statement')).toContainText('5');
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export CSV', exact: true }).click();
  const csv = await readFile((await (await downloadPromise).path())!, 'utf8');
  expect(csv).toContain('[TEST] Alice pet 0');
  expect(csv).not.toContain('[TEST] Customer 001');

  await page.goto(`/app/calendar/?lang=en&asCustomer=${fixture.cid}`);
  await page.getByRole('button', { name: 'Add booking', exact: true }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByRole('combobox', { name: 'Pet', exact: true }).click();
  await expect(page.getByRole('option')).toHaveCount(3);
  await page.getByRole('option').filter({ hasText: '[TEST] Alice pet 0' }).click();
  await dialog.getByRole('combobox', { name: 'Arrival', exact: true }).fill('2030-11-05T10:00');
  await dialog.getByRole('combobox', { name: 'Pickup', exact: true }).fill('2030-11-07T10:00');
  await dialog.getByRole('button', { name: 'Choose a room', exact: true }).click();
  await expect(dialog.locator('.hc-time-available').first()).toBeVisible();
  await dialog.locator('.hc-time-available').first().click();
  await dialog.getByRole('button', { name: 'Review booking', exact: true }).click();
  await expect(dialog).toContainText('[TEST] Practice room');
  await dialog.getByRole('button', { name: 'Save booking', exact: true }).click();
  await expect(dialog).toHaveCount(0);
  await expect(page.locator('.hc-stay')).toHaveCount(1);
  await page.reload();
  await expect(page.locator('.hc-stay')).toHaveCount(1);
  await page.screenshot({ path: '/tmp/saved-calendar-desktop.png', fullPage: true });
  await page
    .getByRole('button', { name: 'View pet details: [TEST] Alice pet 0', exact: true })
    .hover();
  await expect(page.locator('.workspace-pet-popup')).toBeVisible();
  await expect(page.locator('.workspace-pet-popup .workspace-avatar')).toHaveAttribute(
    'data-photo-state',
    'ready',
  );
  await expect(page.locator('.workspace-pet-popup')).toContainText('12.5');
  await expect(page.locator('.workspace-pet-popup')).toContainText('5 days');
  expect((await page.locator('.workspace-pet-popup .workspace-avatar').boundingBox())?.width).toBe(
    112,
  );
  await page.keyboard.press('Escape');
  await expect(page.locator('.workspace-pet-popup')).toHaveCount(0);
  await page
    .getByRole('button', { name: 'View address: [TEST] Practice house', exact: true })
    .click();
  await expect(dialog).toContainText('[TEST] Isolated browser fixture address');
  await dialog.getByRole('button', { name: 'Close', exact: true }).click();

  await page.locator('.hc-stay').click();
  await page.getByRole('button', { name: 'Edit booking', exact: true }).click();
  await expect(dialog.getByRole('combobox', { name: 'Pet', exact: true })).toBeDisabled();
  await dialog.getByRole('combobox', { name: 'Pickup', exact: true }).fill('2030-11-08T10:00');
  await dialog.getByRole('button', { name: 'Choose a room', exact: true }).click();
  await dialog.locator('.hc-time-available').first().click();
  await dialog.getByRole('button', { name: 'Review booking', exact: true }).click();
  await dialog.getByRole('button', { name: 'Save booking', exact: true }).click();
  await expect(dialog).toHaveCount(0);
  await expect(page.locator('.hc-stay')).toHaveCount(1);
  await page.goto(`/app/customers/?lang=en&asCustomer=${fixture.cid}`);
  await page.getByRole('button', { name: 'Edit customer', exact: true }).click();
  await dialog.getByLabel('Phone (optional)').fill('555-0100');
  await dialog.getByRole('button', { name: 'Save changes', exact: true }).click();
  await expect(dialog).toHaveCount(0);
  await page.reload();
  await expect(page.locator('.workspace-customer-record')).toContainText('555-0100');
  await page.getByRole('button', { name: 'Edit pet: [TEST] Alice pet 0', exact: true }).click();
  await dialog.getByLabel('Weight (kg)').fill('13');
  await dialog.getByRole('button', { name: 'Save pet', exact: true }).click();
  await expect(dialog).toHaveCount(0);
  await page.reload();
  await expect(page.locator('.pets-section')).toContainText('13');
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`/app/calendar/?lang=zh&asCustomer=${fixture.cid}&date=2030-11-05`);
  await expect(page.locator('.hc-stay')).toHaveCount(1);
  await page.screenshot({ path: '/tmp/saved-calendar-phone.png', fullPage: true });
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
  ).toBeTruthy();
  await page.evaluate(async (jwt) => {
    // @ts-ignore Test-only Vite import.
    const { auth } = await import('/apps/web/src/auth-client.ts');
    // @ts-ignore Test-only Vite dependency import.
    const { GoogleAuthProvider, signInWithCredential, signOut } =
      await import('/node_modules/.vite/deps/firebase_auth.js');
    await signOut(auth);
    await signInWithCredential(auth, GoogleAuthProvider.credential(jwt));
  }, fixture.owner.jwt);
  await page.goto('/app/balances/?lang=en');
  await page.getByRole('button', { name: 'Menu', exact: true }).click();
  await expect(page.getByRole('link', { name: 'Pets', exact: true })).toBeVisible();
  await expect(page.locator('.workspace-table').first().locator('tbody tr')).toHaveCount(3);
  await expect(page.getByRole('button', { name: 'Add balance', exact: true })).toHaveCount(0);
  const forbidden = await page.evaluate(async (cid) => {
    // @ts-ignore Test-only Vite module import.
    const { auth } = await import('/apps/web/src/auth-client.ts');
    const token = await auth.currentUser.getIdToken();
    return (
      await fetch('/api/workspace/pets?customerId=' + cid, {
        headers: { Authorization: 'Bearer ' + token },
      })
    ).status;
  }, fixture.hid);
  expect(forbidden).toBe(403);
  expect(serverErrors).toEqual([]);
});
