import { readFile } from 'node:fs/promises';
import { test, expect, type Page } from '@playwright/test';
import { expectReadableText } from './readability';
import { themes } from '../../apps/web/src/theme-catalog';

async function openAppearance(page: Page, label: string, menu: string) {
  const trigger = page.locator('.appearance-trigger').first();
  await expect(trigger).toBeAttached();
  const menuButton = page.getByRole('button', { name: new RegExp('^' + menu) });
  if ((await menuButton.isVisible()) && !(await trigger.isVisible())) await menuButton.click();
  await trigger.click();
  await expect(page.getByRole('dialog', { name: label, exact: true })).toBeVisible();
  return trigger;
}
for (const [width, language] of [
  [320, 'zh'],
  [1280, 'en'],
] as const) {
  test(`named app themes use source palettes and bundled styles and persists in the app without changing marketing pages (${width}, ${language})`, async ({
    page,
    request,
  }, testInfo) => {
    test.setTimeout(120000);
    const catalog = JSON.parse(
      await readFile(
        new URL(`../../apps/web/src/locales/${language}.json`, import.meta.url),
        'utf8',
      ),
    );
    const t = (key: string) => catalog['ui.appearance.' + key];
    await page.setViewportSize({ width, height: 844 });
    const fixture = await (await request.get('/__test-fixture')).json();
    await page.goto(`/app/calendar/?lang=${language}`);
    await page.evaluate(async (jwt) => {
      // @ts-ignore Test-only Vite module.
      const { auth } = await import('/apps/web/src/auth-client.ts');
      // @ts-ignore Test-only Vite dependency.
      const { GoogleAuthProvider, signInWithCredential } =
        await import('/tests/helpers/browser-auth.ts');
      await signInWithCredential(auth, GoogleAuthProvider.credential(jwt));
    }, fixture.administrator.jwt);
    await expect(page.locator('.saved-calendar-grid')).toBeVisible();
    const trigger = await openAppearance(page, t('title'), catalog['ui.marketingShell.menu']);
    const dialog = page.getByRole('dialog', { name: t('title'), exact: true });
    for (const preset of themes) {
      const palette = preset.id;
      await dialog.getByRole('radio', { name: t(palette), exact: true }).check();
      await expect(page.locator('html')).toHaveAttribute('data-color-theme', palette);
      await expect(page.locator('html')).toHaveAttribute('data-ui-style', palette);
      await expect(dialog).toHaveCSS('border-top-left-radius', '8px');
      expect(await dialog.evaluate((node) => node.scrollWidth <= node.clientWidth + 1)).toBe(true);
      await expect(page.locator('html')).toHaveCSS('overflow-y', 'hidden');
      const hex = preset.primary.slice(1);
      await expect(dialog.locator('.appearance-actions .button')).toHaveCSS(
        'background-color',
        `rgb(${[0, 2, 4].map((i) => parseInt(hex.slice(i, i + 2), 16)).join(', ')})`,
      );
      const contrast = await dialog.locator('.appearance-actions .button').evaluate((node) => {
        const lum = (value: string) => {
          const c = value
            .match(/[\d.]+/g)!
            .slice(0, 3)
            .map(Number)
            .map((v) => {
              const x = v / 255;
              return x <= 0.04045 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4;
            });
          return c[0] * 0.2126 + c[1] * 0.7152 + c[2] * 0.0722;
        };
        const css = getComputedStyle(node),
          a = lum(css.color),
          b = lum(css.backgroundColor);
        return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
      });
      expect(contrast).toBeGreaterThanOrEqual(4.5);
      await expect(page.locator('.saved-workspace')).toHaveCSS(
        'background-color',
        (() => {
          const hex = preset.surface.slice(1);
          return `rgb(${[0, 2, 4].map((i) => parseInt(hex.slice(i, i + 2), 16)).join(', ')})`;
        })(),
      );
      await expect(dialog.getByRole('link', { name: t('source'), exact: true })).toHaveAttribute(
        'href',
        preset.source,
      );
      await expect(dialog.getByRole('radio')).toHaveCount(themes.length);
      await expectReadableText(page, 'dialog.app-dialog');
      const preview = dialog.locator(`.appearance-palette-preview[data-palette="${palette}"]`);
      await expect(preview).toBeVisible();
      const roles = await preview.evaluate((node) => ({
        house: getComputedStyle(node.querySelector('.appearance-preview-house')!).backgroundColor,
        room: getComputedStyle(node.querySelector('.appearance-preview-room')!).backgroundColor,
        requested: getComputedStyle(node.querySelector('.appearance-preview-room b')!)
          .backgroundColor,
        available: getComputedStyle(
          node.querySelector('.appearance-preview-room + .appearance-preview-room b')!,
        ).backgroundColor,
      }));
      expect(roles.house).not.toBe(roles.room);
      expect(roles.requested).not.toBe(roles.available);
      await page.screenshot({ path: testInfo.outputPath(`${palette}.png`) });
    }
    await page.screenshot({ path: testInfo.outputPath('appearance-vscode-dark.png') });
    await page.keyboard.press('Escape');
    await expect(dialog).toHaveCount(0);
    await expect(trigger).toBeFocused();
    await page.reload();
    await expect(page.locator('html')).toHaveAttribute('data-color-theme', 'vscode-dark');
    await expect(page.locator('html')).toHaveAttribute('data-ui-style', 'vscode-dark');
    await expect(page.locator('.hc-apply').first()).toHaveCSS('border-top-left-radius', '8px');
    await expect(
      page.locator('.saved-calendar-grid .hc-house .location-label-house'),
    ).toBeVisible();
    await expect(page.locator('.saved-calendar-grid .hc-room .location-label-room')).toBeVisible();
    await page.goto(`/app/calendar/?lang=${language}&asCustomer=${fixture.cid}`);
    const w = (key: string) => catalog['ui.workspace.' + key];
    await page.getByRole('button', { name: w('addBooking'), exact: true }).click();
    const booking = page.getByRole('dialog');
    await expect(booking).toHaveCSS('border-top-left-radius', '8px');
    await booking.getByRole('combobox', { name: w('pet'), exact: true }).click();
    await page.getByRole('option').filter({ hasText: '[TEST] Alice pet 0' }).click();
    await booking
      .getByRole('combobox', { name: w('arrival'), exact: true })
      .fill('2030-11-02T10:00');
    await booking
      .getByRole('combobox', { name: w('pickup'), exact: true })
      .fill('2030-11-04T10:00');
    await booking.getByRole('button', { name: w('choose'), exact: true }).click();
    await expect(booking.locator('.hc-range-house .location-label-house')).toBeVisible();
    await expect(booking.locator('.hc-range-room .location-label-room').first()).toBeVisible();
    expect(await booking.evaluate((node) => node.scrollWidth <= node.clientWidth + 1)).toBe(true);
    await page.screenshot({ path: testInfo.outputPath('booking-vscode-dark.png') });
    await page.goto(`/pricing/?lang=${language}`);
    await expect(page.locator('html')).not.toHaveAttribute('data-color-theme');
    await expect(page.locator('html')).not.toHaveAttribute('data-ui-style');
    await expect(page.locator('.appearance-trigger:visible')).toHaveCount(0);
    await expect(page.locator('.marketing-header')).toHaveCSS(
      'background-color',
      'rgb(250, 248, 242)',
    );
    await expect(page.locator('.marketing-header')).toHaveCSS('color', 'rgb(41, 63, 53)');
    await expect(page.locator('meta[name="theme-color"]')).toHaveAttribute('content', '#31594c');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    // Follow real client navigation back into the app; stored preferences return.
    await page.evaluate(() => {
      const link = document.createElement('a');
      link.href = '/app/calendar/' + location.search;
      link.textContent = 'Return to app';
      document.body.append(link);
    });
    await page.getByRole('link', { name: 'Return to app', exact: true }).click();
    await expect(page.locator('.saved-calendar-grid')).toBeVisible();
    await expect(page.locator('html')).toHaveAttribute('data-color-theme', 'vscode-dark');
    await expect(page.locator('html')).toHaveAttribute('data-ui-style', 'vscode-dark');
    await openAppearance(page, t('title'), catalog['ui.marketingShell.menu']);
    await dialog.getByRole('button', { name: t('reset'), exact: true }).click();
    await expect(dialog.getByRole('radio', { name: t('google'), exact: true })).toBeChecked();
    await expect(page.locator('html')).toHaveAttribute('data-ui-style', 'google');
    await dialog.getByRole('button', { name: t('done'), exact: true }).click();
    await page.reload();
    await expect(page.locator('html')).toHaveAttribute('data-color-theme', 'google');
    // Real header navigation removes app styling without a document reload.
    await page.locator('.marketing-header a[href*="/home/"]').first().click();
    await expect(page.locator('.marketing-site')).toBeVisible();
    await expect(page.locator('html')).not.toHaveAttribute('data-ui-style');
    await expect(page.locator('.appearance-trigger:visible')).toHaveCount(0);
    await page.goBack();
    await expect(page.locator('.saved-calendar-grid')).toBeVisible();
    await expect(page.locator('html')).toHaveAttribute('data-color-theme', 'google');
  });
}

test('appearance handles invalid stored preferences and unavailable browser storage', async ({
  page,
}) => {
  await page.addInitScript(() => localStorage.setItem('family-paws:appearance', '{broken'));
  await page.goto('/app/sign-in/?lang=en');
  await expect(page.locator('html')).toHaveAttribute('data-color-theme', 'google');
  await page.evaluate(() => {
    const get = Storage.prototype.getItem,
      set = Storage.prototype.setItem;
    Storage.prototype.getItem = function (key) {
      if (key === 'family-paws:appearance') throw new Error('blocked');
      return get.call(this, key);
    };
    Storage.prototype.setItem = function (key, value) {
      if (key === 'family-paws:appearance') throw new Error('blocked');
      return set.call(this, key, value);
    };
  });
  await openAppearance(page, 'Appearance', 'Menu');
  const dialog = page.getByRole('dialog', { name: 'Appearance', exact: true });
  await dialog.getByRole('radio', { name: 'Microsoft Light', exact: true }).check();
  await expect(page.locator('html')).toHaveAttribute('data-color-theme', 'vscode-light');
  await expect(dialog).toContainText(
    'Changes apply for this session. Browser storage is unavailable.',
  );
  await dialog.getByRole('button', { name: 'Reset to Google' }).click();
  await expect(page.locator('html')).toHaveAttribute('data-color-theme', 'google');
});

test('appearance synchronizes across isolated tabs and handles clearing preferences', async ({
  page,
  context,
}) => {
  await page.goto('/app/sign-in/?lang=en');
  const other = await context.newPage();
  await other.goto('/pricing/?lang=en');
  const before = await other.locator('.marketing-header').evaluate((node) => ({
    background: getComputedStyle(node).backgroundColor,
    color: getComputedStyle(node).color,
    radius: getComputedStyle(node.querySelector('.button') || node).borderRadius,
  }));
  await openAppearance(page, 'Appearance', 'Menu');
  await page
    .getByRole('dialog')
    .getByRole('radio', { name: 'Microsoft Dark', exact: true })
    .check();
  await expect(page.locator('html')).toHaveAttribute('data-color-theme', 'vscode-dark');
  await expect
    .poll(() =>
      other.evaluate(() => JSON.parse(localStorage.getItem('family-paws:appearance')!).palette),
    )
    .toBe('vscode-dark');
  await expect(other.locator('html')).not.toHaveAttribute('data-color-theme');
  await expect(other.locator('.appearance-trigger')).toHaveCount(0);
  expect(
    await other.locator('.marketing-header').evaluate((node) => ({
      background: getComputedStyle(node).backgroundColor,
      color: getComputedStyle(node).color,
      radius: getComputedStyle(node.querySelector('.button') || node).borderRadius,
    })),
  ).toEqual(before);
  await other.evaluate(() => localStorage.removeItem('family-paws:appearance'));
  await expect(page.locator('html')).toHaveAttribute('data-color-theme', 'google');
  await other.close();
});

for (const preset of themes.filter((theme) => theme.mode === 'dark')) {
  test(`${preset.id} colors booking forms, selectors and shared calendar surfaces`, async ({
    page,
    request,
  }, testInfo) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.addInitScript(
      (id) =>
        localStorage.setItem('family-paws:appearance', JSON.stringify({ version: 2, palette: id })),
      preset.id,
    );
    const fixture = await (await request.get('/__test-fixture')).json();
    await page.goto(`/app/calendar/?lang=en&asCustomer=${fixture.cid}`);
    await page.evaluate(async (jwt) => {
      // @ts-ignore Test-only Vite module.
      const { auth } = await import('/apps/web/src/auth-client.ts');
      // @ts-ignore Test-only Vite dependency.
      const { GoogleAuthProvider, signInWithCredential } =
        await import('/tests/helpers/browser-auth.ts');
      await signInWithCredential(auth, GoogleAuthProvider.credential(jwt));
    }, fixture.administrator.jwt);
    await page.getByRole('button', { name: 'Add booking', exact: true }).click();
    const dialog = page.getByRole('dialog');
    const rgb = (hex: string) =>
      `rgb(${[0, 2, 4].map((i) => parseInt(hex.slice(1 + i, 3 + i), 16)).join(', ')})`;
    await expect(dialog).toHaveCSS('background-color', rgb(preset.surface));
    const pet = dialog.getByRole('combobox', { name: 'Pet', exact: true });
    await pet.click();
    await expect(
      page.locator('.custom-select-options:visible, .custom-autocomplete-options:visible').first(),
    ).toHaveCSS('background-color', rgb(preset.surface));
    await page.getByRole('option').filter({ hasText: '[TEST] Alice pet 0' }).click();
    const arrival = dialog.getByRole('combobox', { name: 'Arrival', exact: true });
    await arrival.fill('2030-11-02T10:00');
    await expect(arrival).toHaveCSS('background-color', rgb(preset.surface));
    await dialog.getByRole('combobox', { name: 'Pickup', exact: true }).fill('2030-11-04T10:00');
    await dialog.getByRole('button', { name: 'Choose', exact: true }).click();
    await expect(dialog.locator('.calendar-timeline-axis')).toHaveCSS(
      'background-color',
      rgb(preset.surface),
    );
    await expect(dialog.locator('.hc-range-room-name').first()).toHaveCSS(
      'background-color',
      rgb(preset.surface),
    );
    const heading = dialog.locator('.hc-range-house').first();
    expect(await heading.evaluate((node) => getComputedStyle(node).backgroundColor)).toBe(
      rgb(preset.surface),
    );
    await page.screenshot({ path: testInfo.outputPath(`${preset.id}-booking.png`) });
  });
}

test('previous custom palette preferences migrate to named app presets', async ({ page }) => {
  await page.goto('/app/sign-in/?lang=en');
  for (const [legacy, expected] of [
    ['warm', 'google'],
    ['blue', 'vscode-light'],
    ['forest', 'google'],
    ['iris', 'vscode-dark'],
  ]) {
    await page.evaluate(
      (palette) =>
        localStorage.setItem(
          'family-paws:appearance',
          JSON.stringify({ version: 1, palette, style: 'clean' }),
        ),
      legacy,
    );
    await page.reload();
    await expect(page.locator('html')).toHaveAttribute('data-color-theme', expected);
    await expect(page.locator('html')).toHaveAttribute('data-ui-style', expected);
  }
});
