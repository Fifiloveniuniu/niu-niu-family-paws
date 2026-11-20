import { test, expect } from '@playwright/test';
for (const [language, width] of [
  ['en', 1440],
  ['zh', 390],
] as const) {
  test(`booking day selection closes the shared picker and retains time (${language}, ${width})`, async ({
    page,
    request,
  }) => {
    await page.setViewportSize({ width, height: 900 });
    const fixture = await (await request.get('/__test-fixture')).json();
    await page.goto(`/app/calendar/?lang=${language}&asCustomer=${fixture.cid}`);
    await page.evaluate(async (jwt) => {
      // @ts-ignore Local Vite module.
      const { auth } = await import('/apps/web/src/auth-client.ts');
      // @ts-ignore Local Vite dependency.
      const { GoogleAuthProvider, signInWithCredential } =
        await import('/node_modules/.vite/deps/firebase_auth.js');
      await signInWithCredential(auth, GoogleAuthProvider.credential(jwt));
    }, fixture.administrator.jwt);
    await page
      .getByRole('button', { name: language === 'en' ? 'Add booking' : '添加预约', exact: true })
      .click();
    const modal = page.locator('dialog:modal');
    await modal
      .getByRole('combobox', { name: language === 'en' ? 'Pet' : '宠物', exact: true })
      .click();
    await page.getByRole('option').filter({ hasText: '[TEST] Alice pet 0' }).click();
    const arrival = modal.getByRole('combobox', {
      name: language === 'en' ? 'Arrival' : '到店时间',
      exact: true,
    });
    const picker = page.locator('.custom-date-options');
    await arrival.click();
    const day = picker.locator('[data-date]:not(.outside-month)').nth(10);
    const selected = await day.getAttribute('data-date');
    await day.click();
    await expect(picker).toHaveCount(0);
    await expect(arrival).toBeFocused();
    await expect(arrival).toHaveValue(new RegExp('^' + selected + ' \\d{2}:\\d{2}$'));
    await arrival.fill('2030-11-05T10:15');
    await arrival.click();
    await picker.locator('[data-date="2030-11-06"]').click();
    await expect(picker).toHaveCount(0);
    await expect(arrival).toHaveValue('2030-11-06 10:15');
    await arrival.press('ArrowDown');
    await expect(picker).toBeVisible();
    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('Enter');
    await expect(picker).toHaveCount(0);
    await expect(arrival).toHaveValue('2030-11-07 10:15');
    await expect(arrival).toBeFocused();
    await arrival.click();
    await expect(picker).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(modal).toBeVisible();
    await expect(arrival).toBeFocused();
  });
}
