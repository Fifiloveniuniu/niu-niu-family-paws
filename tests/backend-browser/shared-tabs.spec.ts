import { test, expect } from '@playwright/test';
for (const palette of ['apple', 'vscode-light'] as const) {
  for (const [language, width] of [
    ['en', 1440],
    ['zh', 390],
  ] as const) {
    test(`shared tabs stay readable and keyboard accessible (${palette}, ${language}, ${width})`, async ({
      page,
      request,
    }) => {
      await page.setViewportSize({ width, height: 1000 });
      await page.addInitScript(
        (palette) =>
          localStorage.setItem('family-paws:appearance', JSON.stringify({ version: 2, palette })),
        palette,
      );
      const fixture = await (await request.get('/__test-fixture')).json();
      await page.goto(`/app/calendar/?lang=${language}`);
      await page.evaluate(async (jwt) => {
        // @ts-ignore Test-only local module.
        const { auth } = await import('/apps/web/src/auth-client.ts');
        // @ts-ignore Test-only Vite dependency.
        const { GoogleAuthProvider, signInWithCredential } =
          await import('/tests/helpers/browser-auth.ts');
        await signInWithCredential(auth, GoogleAuthProvider.credential(jwt));
      }, fixture.administrator.jwt);
      for (const route of ['calendar', 'pricing', 'balances']) {
        await page.goto(`/app/${route}/?lang=${language}`);
        if (route === 'calendar') {
          const clipped = await page
            .locator('.saved-calendar-grid .hc-settings .paws-icon')
            .evaluateAll(
              (icons) =>
                icons.filter((icon) => {
                  const frame = icon.getBoundingClientRect();
                  return [...icon.querySelectorAll('[data-icon-family]')].some((group) => {
                    if (getComputedStyle(group).display === 'none') return false;
                    const box = group.getBoundingClientRect();
                    return (
                      box.left < frame.left - 0.5 ||
                      box.top < frame.top - 0.5 ||
                      box.right > frame.right + 0.5 ||
                      box.bottom > frame.bottom + 0.5
                    );
                  });
                }).length,
            );
          expect(clipped).toBe(0);
        }
        const tabs = page.locator('.shared-tabs');
        await expect(tabs).toBeVisible();
        for (const inactive of await tabs.getByRole('tab', { selected: false }).all())
          await expect(inactive).toHaveCSS('font-weight', '600');
        const selected = tabs.getByRole('tab', { selected: true });
        await expect(selected).toHaveCSS(
          'background-color',
          palette === 'apple' ? 'rgb(233, 21, 45)' : 'rgb(0, 95, 184)',
        );
        await expect(selected).toHaveCSS('color', 'rgb(255, 255, 255)');
        await selected.focus();
        await page.keyboard.press('End');
        await expect(tabs.getByRole('tab').last()).toBeFocused();
        await expect(tabs.getByRole('tab').last()).toHaveAttribute('aria-selected', 'true');
        await page.keyboard.press('ArrowRight');
        await expect(tabs.getByRole('tab').first()).toBeFocused();
        await expect(tabs.getByRole('tab').first()).toHaveAttribute('aria-selected', 'true');
        await page.keyboard.press('ArrowLeft');
        await expect(tabs.getByRole('tab').last()).toBeFocused();
        await page.keyboard.press('Home');
        await expect(tabs.getByRole('tab').first()).toBeFocused();
        await expect(tabs.locator('[tabindex="0"]')).toHaveCount(1);
        await expect(tabs.getByRole('tab', { selected: true })).toHaveCSS(
          'background-color',
          palette === 'apple' ? 'rgb(233, 21, 45)' : 'rgb(0, 95, 184)',
        );
      }
      await page.goto(`/app/metrics/?lang=${language}`);
      const presets = page.locator('.business-period-presets.shared-tabs');
      for (const inactive of await presets.locator('[aria-pressed="false"]').all())
        await expect(inactive).toHaveCSS('font-weight', '600');
      const selectedPreset = presets.locator('[aria-pressed="true"]');
      await expect(selectedPreset).toHaveCSS(
        'background-color',
        palette === 'apple' ? 'rgb(233, 21, 45)' : 'rgb(0, 95, 184)',
      );
      await expect(selectedPreset).toHaveCSS('color', 'rgb(255, 255, 255)');
      await presets.getByRole('button').first().click();
      await expect(presets.getByRole('button').first()).toHaveAttribute('aria-pressed', 'true');
      await presets.getByRole('button').first().focus();
      await page.keyboard.press('End');
      await expect(presets.getByRole('button').last()).toBeFocused();
      await expect(presets.getByRole('button').last()).toHaveAttribute('aria-pressed', 'true');
      if (language === 'en')
        await expect(page.getByRole('heading', { level: 1 })).toHaveText('Metrics');
    });
  }
}

for (const language of ['en', 'zh']) {
  test(`marketing photos reuse the shared dialog and restore focus (${language})`, async ({
    page,
  }) => {
    await page.goto(`/spaces/?lang=${language}`);
    const opener = page.locator('.photo-open').first();
    await opener.click();
    const dialog = page.locator('dialog.app-dialog.photo-dialog');
    await expect(dialog).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(dialog).toHaveCount(0);
    await expect(opener).toBeFocused();
    await opener.click();
    await dialog
      .getByRole('button', { name: language === 'en' ? 'Close' : '关闭', exact: true })
      .click();
    await expect(dialog).toHaveCount(0);
    await expect(opener).toBeFocused();
  });
}
