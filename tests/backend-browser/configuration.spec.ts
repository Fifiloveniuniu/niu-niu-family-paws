import { test, expect } from '@playwright/test';
test('saved validity templates fill reviewed dates and cancellation stays an editable draft', async ({
  page,
  request,
}) => {
  const fixture = await (await request.get('/__test-fixture')).json();
  await page.goto(`/app/balances/?lang=en&asCustomer=${fixture.cid}`);
  await page.evaluate(async (jwt) => {
    // @ts-ignore Test module.
    const { auth } = await import('/apps/web/src/auth-client.ts');
    // @ts-ignore Test module.
    const { GoogleAuthProvider, signInWithCredential } =
      await import('/tests/helpers/browser-auth.ts');
    await signInWithCredential(auth, GoogleAuthProvider.credential(jwt));
  }, fixture.administrator.jwt);
  await expect(page.getByRole('link', { name: 'Settings', exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: 'Validity templates', exact: true }).click();
  await page.getByRole('button', { name: 'Add validity template', exact: true }).click();
  await page.getByRole('dialog').getByLabel('Template name').fill('[TEST] Configuration coverage');
  await page
    .getByRole('dialog')
    .getByRole('combobox', { name: 'Valid from', exact: true })
    .fill('2026-01-01');
  await page
    .getByRole('dialog')
    .getByRole('combobox', { name: 'Valid through', exact: true })
    .fill('2031-12-31');
  await page.getByRole('dialog').getByRole('button', { name: 'Save changes', exact: true }).click();
  await expect(page.getByRole('dialog')).toContainText('[TEST] Configuration coverage');
  await page.getByRole('dialog').getByRole('button', { name: 'Close', exact: true }).click();
  await page.getByRole('button', { name: 'Add balance', exact: true }).click();
  await page.getByRole('combobox', { name: 'Pet', exact: true }).click();
  await page.getByRole('option').filter({ hasText: '[TEST] Alice pet 0' }).click();
  await page.getByLabel('Days to add or remove').fill('5');
  await page
    .getByRole('combobox', { name: 'Use a validity template (optional)', exact: true })
    .click();
  await page.getByRole('option').filter({ hasText: '[TEST] Configuration coverage' }).click();
  await expect(
    page.getByRole('dialog').getByRole('combobox', { name: 'Valid from', exact: true }),
  ).toHaveValue('2026-01-01');
  await expect(
    page.getByRole('dialog').getByRole('combobox', { name: 'Valid through', exact: true }),
  ).toHaveValue('2031-12-31');

  page.once('dialog', (dialog) => dialog.accept());
  await page.getByRole('dialog').getByRole('button', { name: 'Close', exact: true }).click();
  await page.goto('/app/settings/cancellation/?lang=en');
  await page.getByRole('button', { name: 'Edit policy', exact: true }).click();
  await page.getByRole('dialog').getByLabel('Policy name (optional)').fill('[TEST] Reviewed draft');
  await page
    .getByRole('dialog')
    .getByRole('button', { name: 'Save policy draft', exact: true })
    .click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await page.reload();
  await expect(page.locator('.saved-cancellation-policy')).toContainText('[TEST] Reviewed draft');
  await expect(page.locator('.saved-cancellation-policy')).toContainText('Draft');
});
