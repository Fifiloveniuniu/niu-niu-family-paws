import { test, expect } from '@playwright/test';

test('app bar omits Settings while Calendar and Balances retain administrator management', async ({
  page,
  request,
}) => {
  const fixture = await (await request.get('/__test-fixture')).json();
  await page.goto('/app/calendar/?lang=en');
  await page.evaluate(async (jwt) => {
    // @ts-ignore Local test-only module.
    const { auth } = await import('/apps/web/src/auth-client.ts');
    // @ts-ignore Local test-only dependency.
    const { GoogleAuthProvider, signInWithCredential } =
      await import('/node_modules/.vite/deps/firebase_auth.js');
    await signInWithCredential(auth, GoogleAuthProvider.credential(jwt));
  }, fixture.administrator.jwt);
  const header = page.getByRole('banner');
  await expect(page.locator('.hc-toolbar')).toBeVisible();
  await expect(header.getByRole('link', { name: 'Settings', exact: true })).toHaveCount(0);
  await page.getByRole('link', { name: 'House operations', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'House operations', exact: true })).toBeVisible();
  await expect(header.getByRole('link', { name: 'Pricing', exact: true })).toBeVisible();
  await header.getByRole('link', { name: 'Calendar', exact: true }).click();
  await page.getByRole('link', { name: 'Manage houses & rooms', exact: true }).click();
  await expect(page.locator('.workspace-settings')).toBeVisible();
  await header.getByRole('link', { name: 'Balances', exact: true }).click();
  await page.getByRole('link', { name: 'Cancellation policy', exact: true }).click();
  await expect(page.locator('.saved-cancellation-policy')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Edit policy', exact: true })).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/app/calendar/?lang=zh');
  await expect(page.locator('.hc-toolbar')).toBeVisible();
  await expect(header.locator('a[href*="/app/settings"]')).toHaveCount(0);
  await expect(page.getByRole('link', { name: '管理房屋与房间', exact: true })).toBeVisible();
});
