import { test, expect } from '@playwright/test';
import { expectReadableText } from './readability';
import { themes } from '../../apps/web/src/theme-catalog';

for (const theme of themes) {
  test(`${theme.id} applies throughout calendar, controls, management dialogs and profile`, async ({
    page,
    request,
  }, testInfo) => {
    test.setTimeout(90000);
    page.on('dialog', (dialog) => dialog.accept());
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.addInitScript(
      (palette) =>
        localStorage.setItem('family-paws:appearance', JSON.stringify({ version: 2, palette })),
      theme.id,
    );
    const fixture = await (await request.get('/__test-fixture')).json();
    await page.goto('/app/calendar/?lang=en');
    await page.evaluate(async (jwt) => {
      // @ts-ignore Test-only Vite module.
      const { auth } = await import('/apps/web/src/auth-client.ts');
      // @ts-ignore Test-only Vite dependency.
      const { GoogleAuthProvider, signInWithCredential } =
        await import('/node_modules/.vite/deps/firebase_auth.js');
      await signInWithCredential(auth, GoogleAuthProvider.credential(jwt));
    }, fixture.administrator.jwt);
    await expect(page.locator('.saved-calendar-grid')).toBeVisible();
    const assertSurface = async (selector: string) => {
      const node = page.locator(selector).first();
      await expect(node).toBeVisible();
      const result = await node.evaluate((element) => {
        const probe = document.createElement('span');
        probe.style.background = 'var(--md-surface)';
        document.body.append(probe);
        const expected = getComputedStyle(probe).backgroundColor;
        probe.remove();
        return { actual: getComputedStyle(element).backgroundColor, expected };
      });
      expect(result.actual).toBe(result.expected);
    };
    await assertSurface('.saved-workspace');
    const current = page.locator('.app-header-nav a[aria-current="page"]');
    await expect(current).toBeVisible();
    const house = page.getByRole('combobox', { name: 'House', exact: true });
    await house.click();
    await assertSurface('.custom-select-options:visible');
    await expectReadableText(page, '.custom-select-options:visible');
    await page.getByRole('option', { selected: true }).first().hover();
    await expectReadableText(page, '.custom-select-options:visible');
    const option = page.getByRole('option').first();
    expect(await option.evaluate((node) => getComputedStyle(node).borderTopLeftRadius)).toBe(
      await page
        .locator('html')
        .evaluate((node) => getComputedStyle(node).getPropertyValue('--ui-option-radius').trim()),
    );
    await page.keyboard.press('Escape');
    const date = page.locator('.workspace-range-controls .custom-date-toggle').first();
    await date.click();
    await assertSurface('.custom-date-options:visible');
    await page.keyboard.press('Escape');
    const period = page.locator('.workspace-range-controls .custom-date-field > input').first();
    const currentPeriod = await period.getAttribute('data-value');
    await period.fill('2026-02-29');
    await expect(period).toHaveAttribute('aria-invalid', 'true');
    await expectReadableText(page);
    await period.fill(currentPeriod!);
    await expect(period).not.toHaveAttribute('aria-invalid', 'true');
    await expectReadableText(page);
    await expectReadableText(page, '.marketing-header');
    const family = theme.id === 'google' ? 'google' : theme.id === 'apple' ? 'apple' : 'microsoft';
    await expect(page.locator(`.workspace-primary-actions .icon-${family}`).first()).toHaveCSS(
      'display',
      'inline',
    );
    for (const row of ['.hc-house', '.hc-room']) {
      const settings = page
        .locator(`.saved-calendar-grid ${row} .workspace-row-actions button`)
        .first();
      await settings.click();
      await expect(page.locator('dialog:modal')).toHaveCount(1);
      await expect(page.locator('dialog:modal form')).toBeVisible();
      await expectReadableText(page, 'dialog:modal');
      await page.keyboard.press('Escape');
      await expect(page.locator('dialog:modal')).toHaveCount(0);
    }
    await page.screenshot({ path: testInfo.outputPath('calendar.png') });
    await page.goto(`/app/calendar/?lang=en&asCustomer=${fixture.cid}`);
    await page.getByRole('button', { name: 'Add booking', exact: true }).click();
    const booking = page.locator('dialog:modal');
    await booking.getByRole('combobox', { name: 'Pet', exact: true }).click();
    await page.getByRole('option').filter({ hasText: '[TEST] Alice pet 0' }).click();
    await booking.getByRole('combobox', { name: 'Arrival', exact: true }).fill('2030-11-02T10:00');
    await booking.getByRole('combobox', { name: 'Pickup', exact: true }).fill('2030-11-04T10:00');
    await booking.getByRole('button', { name: 'Choose a room', exact: true }).click();
    await expect(booking.locator('[data-step-state="current"] .hc-step-marker')).toHaveCSS(
      'background-color',
      (() => {
        const hex = theme.primary.slice(1);
        return `rgb(${[0, 2, 4].map((i) => parseInt(hex.slice(i, i + 2), 16)).join(', ')})`;
      })(),
    );
    const stateColors = await booking
      .locator('.hc-step-marker')
      .evaluateAll((nodes) => nodes.map((node) => getComputedStyle(node).backgroundColor));
    expect(new Set(stateColors).size).toBe(3);
    const connector = await booking
      .locator('[data-step-state="completed"]')
      .evaluate((node) => getComputedStyle(node, '::after').backgroundColor);
    const sourceHex = theme.primary.slice(1);
    expect(connector).toBe(
      `rgb(${[0, 2, 4].map((i) => parseInt(sourceHex.slice(i, i + 2), 16)).join(', ')})`,
    );
    await expect(booking.locator('[data-step-state="current"] .hc-step-label')).toHaveCSS(
      'background-color',
      'rgba(0, 0, 0, 0)',
    );
    await expectReadableText(page, 'dialog:modal');
    await page.screenshot({ path: testInfo.outputPath('booking-progress.png') });
    await page.keyboard.press('Escape');
    await expect(page.locator('dialog:modal')).toHaveCount(0);
    for (const [route, action, field] of [
      [
        '/app/balances/',
        'Add balance',
        '.workspace-form input:not([type="hidden"]):not([type="checkbox"])',
      ],
      ['/app/customers/', 'Add customer', '.customer-form input'],
      ['/app/pricing/', 'Add price', '.workspace-form input'],
      ['/app/settings/locations/', 'Add house', '.customer-form input'],
    ]) {
      await page.goto(route + '?lang=en');
      if (route.includes('customers'))
        await expect(page.locator('.customer-list > li').first()).toBeVisible();
      const trigger = page.getByRole('button', { name: action, exact: true });
      await trigger.click();
      await assertSurface('dialog.app-dialog');
      const input = page.locator(`dialog.app-dialog ${field}`).first();
      if (await input.count()) await assertSurface(`dialog.app-dialog ${field}`);
      const primary = page
        .locator('dialog.app-dialog .button, dialog.app-dialog .hc-apply')
        .first();
      await expect(primary).toBeVisible();
      const radius = await page
        .locator('html')
        .evaluate((node) => getComputedStyle(node).getPropertyValue('--ui-action-radius').trim());
      await expect(primary).toHaveCSS('border-top-left-radius', radius);
      await expectReadableText(page, 'dialog.app-dialog');
      await page.screenshot({
        path: testInfo.outputPath(route.split('/').filter(Boolean).at(-1)! + '.png'),
      });
      await page.keyboard.press('Escape');
      await expect(page.locator('dialog:modal')).toHaveCount(0);
    }
    await page.goto('/app/account/profile/?lang=en');
    await expect(page.locator('.profile-section')).toHaveAttribute('aria-busy', 'false');
    await assertSurface('.profile-section input:not([type="hidden"]):not([type="checkbox"])');
    await expectReadableText(page);
    await page.screenshot({ path: testInfo.outputPath('profile.png') });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
  });
}
