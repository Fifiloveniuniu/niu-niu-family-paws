import { test, expect } from '@playwright/test';
test('administrator reviews an existing employee and saves or removes house access without granting roles', async ({
  page,
  request,
  browser,
}) => {
  const fixture = await (await request.get('/__test-fixture')).json();
  await page.goto('/app/settings/locations/?lang=en');
  await page.evaluate(async (jwt) => {
    // @ts-ignore Test module.
    const { auth } = await import('/apps/web/src/auth-client.ts');
    // @ts-ignore Test module.
    const { GoogleAuthProvider, signInWithCredential } =
      await import('/node_modules/.vite/deps/firebase_auth.js');
    await signInWithCredential(auth, GoogleAuthProvider.credential(jwt));
  }, fixture.administrator.jwt);
  await page.getByRole('button', { name: 'Employee house access', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Employee house access', exact: true });
  await dialog
    .getByLabel('Employee Google sign-in email', { exact: true })
    .fill(fixture.employee.email);
  await dialog.getByRole('button', { name: 'Find employee', exact: true }).click();
  await expect(
    dialog.getByRole('checkbox', { name: '[TEST] Practice house', exact: true }),
  ).toBeChecked();
  await dialog.getByRole('checkbox', { name: '[TEST] Practice house', exact: true }).uncheck();
  await dialog.getByRole('button', { name: 'Save changes', exact: true }).click();
  await expect(dialog.getByRole('status')).toHaveText('House assignments saved.');
  const context = await browser.newContext();
  const employeePage = await context.newPage();
  await employeePage.goto('http://localhost:4184/app/operations/?lang=en');
  await employeePage.evaluate(async (jwt) => {
    // @ts-ignore Test module.
    const { auth } = await import('/apps/web/src/auth-client.ts');
    // @ts-ignore Test module.
    const { GoogleAuthProvider, signInWithCredential } =
      await import('/node_modules/.vite/deps/firebase_auth.js');
    await signInWithCredential(auth, GoogleAuthProvider.credential(jwt));
  }, fixture.employee.jwt);
  await expect(
    employeePage.getByText(
      'No houses are assigned to this employee account. Ask an administrator to review access.',
      { exact: true },
    ),
  ).toBeVisible();
  await dialog.getByRole('checkbox', { name: '[TEST] Practice house', exact: true }).check();
  await dialog.getByRole('button', { name: 'Save changes', exact: true }).click();
  await expect(dialog.getByRole('status')).toHaveText('House assignments saved.');
  await employeePage.reload();
  await expect(
    employeePage.getByRole('combobox', { name: 'Assigned house', exact: true }),
  ).toContainText('[TEST] Practice house');
  await context.close();
  await dialog
    .getByLabel('Employee Google sign-in email', { exact: true })
    .fill(fixture.owner.email);
  await dialog.getByRole('button', { name: 'Find employee', exact: true }).click();
  await expect(dialog.getByRole('alert')).toHaveText(
    'No active, verified Google employee account was found.',
  );
  await expect(dialog.getByRole('button', { name: 'Save changes', exact: true })).toHaveCount(0);
  await dialog.getByRole('button', { name: 'Close', exact: true }).click();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/app/settings/locations/?lang=zh');
  await page.getByRole('button', { name: '员工房屋权限', exact: true }).click();
  const chinese = page.getByRole('dialog', { name: '员工房屋权限', exact: true });
  await chinese.getByLabel('员工 Google 登录邮箱', { exact: true }).fill(fixture.employee.email);
  await chinese.getByRole('button', { name: '查找员工', exact: true }).click();
  await expect(
    chinese.getByRole('checkbox', { name: '[TEST] Practice house', exact: true }),
  ).toBeChecked();
  const box = await chinese.boundingBox();
  expect(box!.x).toBeGreaterThanOrEqual(8);
  expect(box!.x + box!.width).toBeLessThanOrEqual(382);
  expect(
    await chinese.evaluate((element) => element.scrollWidth <= element.clientWidth),
  ).toBeTruthy();
  await page.screenshot({
    path: 'test-results-backend/employee-assignments-phone-zh.png',
    fullPage: true,
  });
});
