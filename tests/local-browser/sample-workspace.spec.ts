import { test, expect } from '@playwright/test';
test('populated local app has white content, clear controls and available practice space', async ({
  page,
}) => {
  test.setTimeout(60000);
  await page.goto('/app/calendar/?lang=en');
  await page.evaluate(async () => {
    // @ts-ignore Local Vite module.
    const { auth } = await import('/apps/web/src/auth-client.ts');
    if (
      auth.app.options.projectId !== 'demo-niu-niu' ||
      auth.emulatorConfig?.host !== '127.0.0.1' ||
      auth.emulatorConfig?.port !== 9099
    )
      throw Error('Demo emulator required');
    // @ts-ignore Local Vite dependency.
    const { GoogleAuthProvider, signInWithCredential } =
      await import('/node_modules/.vite/deps/firebase_auth.js');
    const jwt =
      [
        { alg: 'none', typ: 'JWT' },
        {
          iss: 'https://accounts.google.com',
          aud: 'demo-test',
          sub: 'local-admin@example.test',
          email: 'local-admin@example.test',
          email_verified: true,
          name: '[TEST] Local admin',
        },
      ]
        .map((value) =>
          btoa(JSON.stringify(value)).replaceAll('+', '-').replaceAll('/', '_').replaceAll('=', ''),
        )
        .join('.') + '.';
    await signInWithCredential(auth, GoogleAuthProvider.credential(jwt));
  });
  await expect(page.locator('.saved-workspace')).toBeVisible();
  await expect(page.locator('.hc-body')).toHaveCSS('background-color', 'rgb(255, 255, 255)');
  await expect(page.locator('.hc-content')).toHaveCSS('background-color', 'rgb(255, 255, 255)');
  await expect(
    page.locator('.hc-house').filter({ hasText: '[TEST / 测试] Garden house' }).first(),
  ).toBeVisible();
  await expect(page.locator('.hc-stay').first()).toBeVisible();
  await page.screenshot({ path: '/tmp/local-calendar-clean-desktop.png', fullPage: true });
  await page.getByRole('button', { name: 'Add booking', exact: true }).click();
  const booking = page.getByRole('dialog', { name: 'Add booking', exact: true });
  await booking.getByRole('button', { name: 'Toggle Customer choices', exact: true }).click();
  await page.getByRole('option', { name: '[TEST / 测试] Family 007', exact: true }).click();
  await booking.getByRole('combobox', { name: 'Pet type', exact: true }).click();
  await page.getByRole('option', { name: 'Dog', exact: true }).click();
  await booking.getByRole('button', { name: 'Toggle Pet choices', exact: true }).click();
  await expect(page.getByRole('option')).toHaveCount(1);
  await page.getByRole('option').click();
  await expect(booking.locator('.custom-autocomplete-adornment .workspace-avatar')).toHaveAttribute(
    'data-photo-state',
    'ready',
  );
  const arrival = booking.getByRole('combobox', { name: 'Arrival', exact: true });
  await arrival.click();
  const picker = page.locator('.custom-date-options');
  const day = picker.locator('[data-date]:not(.outside-month)').nth(20),
    date = (await day.getAttribute('data-date'))!;
  await day.click();
  await expect(arrival).toHaveValue(new RegExp('^' + date + ' \\d{2}:\\d{2}$'));
  await picker.getByRole('textbox', { name: 'Hour (24h)', exact: true }).fill('10');
  await picker.getByRole('textbox', { name: 'Minute', exact: true }).fill('00');
  await picker.getByRole('button', { name: 'Apply date and time', exact: true }).click();
  const from = new Date();
  from.setUTCDate(from.getUTCDate() + 4);
  const through = new Date(from);
  through.setUTCDate(through.getUTCDate() + 2);
  await arrival.fill(from.toISOString().slice(0, 10) + 'T10:00');
  await booking
    .getByRole('combobox', { name: 'Pickup', exact: true })
    .fill(through.toISOString().slice(0, 10) + 'T10:00');
  await page.screenshot({ path: '/tmp/local-booking-clean-desktop.png', fullPage: true });
  await booking.getByRole('button', { name: 'Choose a room', exact: true }).click();
  await expect(
    booking
      .getByRole('button', { name: /Available space:.*Practice house.*Practice room/ })
      .first(),
  ).toBeVisible();
  page.once('dialog', (dialog) => dialog.accept());
  await booking.getByRole('button', { name: 'Cancel', exact: true }).click();
  await page.getByRole('link', { name: 'Balances', exact: true }).click();
  await expect(page.locator('.workspace-table').first().locator('tbody tr')).toHaveCount(25);
  await page.getByRole('tab', { name: 'Activity', exact: true }).click();
  await expect(page.locator('.workspace-statement tbody tr').first()).toBeVisible();
  await page.screenshot({ path: '/tmp/local-balances-clean-desktop.png', fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/app/calendar/?lang=zh');
  await expect(page.locator('.hc-stay').first()).toBeVisible();
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
  ).toBeTruthy();
  await page.screenshot({ path: '/tmp/local-calendar-clean-phone.png', fullPage: true });
});
