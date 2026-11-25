import { test, expect } from '@playwright/test';
for (const [language, width] of [
  ['en', 1440],
  ['zh', 390],
] as const) {
  test(`retired calendar pages and buttons stay removed (${language}, ${width})`, async ({
    page,
    request,
  }) => {
    await page.setViewportSize({ width, height: 900 });
    const fixture = await (await request.get('/__test-fixture')).json();
    await page.goto(`/app/calendar/?lang=${language}`);
    await page.evaluate(async (jwt) => {
      // @ts-ignore Local test module.
      const { auth } = await import('/apps/web/src/auth-client.ts');
      // @ts-ignore Vite dependency.
      const { GoogleAuthProvider, signInWithCredential } =
        await import('/tests/helpers/browser-auth.ts');
      await signInWithCredential(auth, GoogleAuthProvider.credential(jwt));
    }, fixture.administrator.jwt);
    for (const route of [
      '/app/calendar/',
      '/app/operations/',
      '/app/settings/locations/',
      '/app/settings/locations/' + fixture.hid + '/',
      '/app/settings/',
    ]) {
      await page.goto(route + `?lang=${language}&zone=UTC`);
      await expect(page.locator('.saved-calendar-grid')).toBeVisible();
      await expect(page).toHaveURL(new RegExp('/app/calendar/\\?lang=' + language + '&zone=UTC'));
      await expect(
        page.locator('a[href*="/app/operations"], a[href*="/app/settings/locations"]'),
      ).toHaveCount(0);
      await expect(page.locator('.calendar-toolbar-actions > a')).toHaveCount(0);
      await expect(page.locator('.saved-calendar-grid .hc-room').first()).not.toContainText(
        /Capacity|容量/,
      );
      await expect(page.locator('.calendar-time-controls .custom-date-input')).toHaveCount(0);
      await expect(page.locator('.workspace-clock [role="combobox"]')).toHaveAccessibleName(
        language === 'en' ? 'Clock timezone' : '时钟时区',
      );
      await expect(page.locator('.workspace-clock')).not.toContainText(
        language === 'en' ? 'Timezone' : '时区',
      );
    }
    const houseEditor = page.locator('.hc-house .workspace-row-actions button').first();
    await houseEditor.click();
    await expect(page.locator('dialog:modal form')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(houseEditor).toBeFocused();
    await page.goto(`/app/balances/?lang=${language}`);
    await page
      .getByRole('link', {
        name: language === 'en' ? 'Cancellation policy' : '取消政策',
        exact: true,
      })
      .click();
    await expect(page.locator('.saved-cancellation-policy')).toBeVisible();
  });
}

test('employee accounts retain profile access after the operations page is removed', async ({
  page,
  request,
}) => {
  const fixture = await (await request.get('/__test-fixture')).json();
  await page.goto('/app/operations/?lang=en');
  await page.evaluate(async (jwt) => {
    // @ts-ignore Local test module.
    const { auth } = await import('/apps/web/src/auth-client.ts');
    // @ts-ignore Vite dependency.
    const { GoogleAuthProvider, signInWithCredential } =
      await import('/tests/helpers/browser-auth.ts');
    await signInWithCredential(auth, GoogleAuthProvider.credential(jwt));
  }, fixture.employee.jwt);
  await expect(page).toHaveURL(/\/app\/account\/profile\//);
  await expect(page.locator('.profile-section')).toBeVisible();
  await expect(page.locator('.operations-cards')).toHaveCount(0);
});
