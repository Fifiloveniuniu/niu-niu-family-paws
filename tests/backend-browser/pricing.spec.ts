import { test, expect } from '@playwright/test';
test('administrator edits source pricing, packages and holidays with persisted bilingual dialogs', async ({
  page,
  request,
}) => {
  test.setTimeout(60000);
  const fixture = await (await request.get('/__test-fixture')).json();
  await page.goto('/app/pricing/?lang=en');
  await page.evaluate(async (jwt) => {
    // @ts-ignore Test-only module.
    const { auth } = await import('/apps/web/src/auth-client.ts');
    // @ts-ignore Test-only module.
    const { GoogleAuthProvider, signInWithCredential } =
      await import('/node_modules/.vite/deps/firebase_auth.js');
    await signInWithCredential(auth, GoogleAuthProvider.credential(jwt));
  }, fixture.administrator.jwt);
  await expect(page.getByRole('link', { name: 'Pricing', exact: true })).toHaveAttribute(
    'aria-current',
    'page',
  );
  await expect(page.locator('.admin-pricing tbody tr')).toHaveCount(6);
  await expect(page.locator('.admin-pricing')).toContainText('$52.00');
  await page.getByRole('tab', { name: 'Boarding-day packages', exact: true }).click();
  await page.getByRole('button', { name: 'Add price', exact: true }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('English', { exact: true }).fill('[TEST] Thirty days');
  await dialog.getByRole('combobox', { name: 'Name language', exact: true }).click();
  await page.getByRole('option', { name: '简体中文', exact: true }).click();
  await dialog.getByLabel('简体中文', { exact: true }).fill('[测试] 三十天');
  await dialog.getByRole('combobox', { name: 'Name language', exact: true }).click();
  await page.getByRole('option', { name: 'Español', exact: true }).click();
  await dialog.getByLabel('Español', { exact: true }).fill('[TEST] Treinta días');
  await dialog.getByLabel('Price (USD)', { exact: true }).fill('1500.00');
  await dialog
    .getByRole('combobox', { name: 'Regular boarding band (optional)', exact: true })
    .click();
  await page.getByRole('option', { name: '8-15 pounds', exact: true }).click();
  await dialog.getByLabel('Comparison weight (lb)', { exact: true }).fill('11.5');
  await dialog.getByRole('button', { name: 'Save changes', exact: true }).click();
  await expect(dialog).toHaveCount(0);
  await expect(page.locator('.admin-pricing')).toContainText('$150.00 (9.09%)');
  await page.reload();
  await page.getByRole('tab', { name: 'Boarding-day packages', exact: true }).click();
  await expect(page.locator('.admin-pricing')).toContainText('[TEST] Thirty days');
  await page.getByRole('button', { name: 'Holiday dates & surcharge', exact: true }).click();
  await dialog.getByRole('combobox', { name: 'Holiday date', exact: true }).fill('2026-12-25');
  await dialog.getByRole('button', { name: 'Add date', exact: true }).click();
  await dialog.getByRole('button', { name: 'Save changes', exact: true }).click();
  await expect(dialog).toHaveCount(0);
  await expect(page.locator('.admin-pricing')).toContainText('Configured holiday dates: 1');
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/app/pricing/?lang=zh');
  await expect(page.getByRole('heading', { name: '价格管理', exact: true })).toBeVisible();
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
  ).toBeTruthy();
  await page.screenshot({ path: 'test-results-backend/pricing-phone-zh.png', fullPage: true });
  await page.goto('/app/pricing/?lang=es');
  await page.getByRole('tab', { name: 'Paquetes de días de alojamiento', exact: true }).click();
  await expect(page.locator('.admin-pricing')).toContainText('[TEST] Treinta días');
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto(`/app/calendar/?lang=en&asCustomer=${fixture.cid}`);
  await expect(page.getByRole('link', { name: 'Pets', exact: true })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Pricing', exact: true })).toHaveCount(0);
});
