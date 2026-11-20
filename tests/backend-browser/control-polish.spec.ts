import { readFile } from 'node:fs/promises';
import { test, expect } from '@playwright/test';
for (const [palette, language, width] of [
  ['google', 'en', 1440],
  ['apple', 'zh', 390],
  ['vscode-light', 'en', 1440],
  ['vscode-dark', 'zh', 390],
] as const) {
  test(`shared dialogs, icons, hover and language menu follow the theme (${palette})`, async ({
    page,
    request,
  }) => {
    test.setTimeout(60000);
    await page.setViewportSize({ width, height: 1000 });
    await page.addInitScript(
      (palette) =>
        localStorage.setItem('family-paws:appearance', JSON.stringify({ version: 2, palette })),
      palette,
    );
    const messages = JSON.parse(
      await readFile(
        new URL(`../../apps/web/src/locales/${language}.json`, import.meta.url),
        'utf8',
      ),
    );
    const t = (key: string) => messages[key];
    const fixture = await (await request.get('/__test-fixture')).json();
    await page.goto(`/app/calendar/?lang=${language}`);
    await page.evaluate(async (jwt) => {
      // @ts-ignore Local Vite module.
      const { auth } = await import('/apps/web/src/auth-client.ts');
      // @ts-ignore Local dependency.
      const { GoogleAuthProvider, signInWithCredential } =
        await import('/node_modules/.vite/deps/firebase_auth.js');
      await signInWithCredential(auth, GoogleAuthProvider.credential(jwt));
    }, fixture.administrator.jwt);
    await expect(page.locator('.saved-workspace')).toBeVisible();
    const trigger = page.locator('.language-menu-trigger');
    if (!(await trigger.isVisible()))
      await page
        .getByRole('button', { name: language === 'en' ? 'Menu' : '菜单', exact: true })
        .click();
    await trigger.click();
    const selected = page.locator('.language-menu-options [aria-checked="true"]');
    const colors = await selected.evaluate((node) => {
      const probe = document.createElement('span');
      node.append(probe);
      probe.style.color = 'var(--md-primary)';
      const background = getComputedStyle(probe).color;
      probe.style.color = 'var(--md-on-primary)';
      const color = getComputedStyle(probe).color;
      probe.remove();
      return { background, color };
    });
    await expect(selected).toHaveCSS('background-color', colors.background);
    await expect(selected).toHaveCSS('color', colors.color);
    await selected.hover();
    await expect(selected).toHaveCSS('background-color', colors.background);
    await page.keyboard.press('Escape');
    async function checkDialog() {
      const dialog = page.locator('dialog:modal');
      const form = dialog.locator('form').first();
      await expect(form).toHaveCSS('border-top-width', '0px');
      await expect(form).toHaveCSS('box-shadow', 'none');
      const save = dialog.locator('button[type="submit"]').first();
      await expect(save.locator('.paws-icon')).toHaveCount(1);
      await page.keyboard.press('Escape');
      await expect(dialog).toHaveCount(0);
    }
    await page.goto(`/app/balances/?lang=${language}`);
    const add = page.getByRole('button', { name: t('ui.workspace.addBalance'), exact: true });
    await page.mouse.move(0, 0);
    const before = await add.evaluate((node) => getComputedStyle(node).boxShadow);
    await add.hover();
    expect(await add.evaluate((node) => getComputedStyle(node).boxShadow)).not.toBe(before);
    await add.click();
    await checkDialog();
    await page.goto(`/app/customers/?lang=${language}`);
    await page.getByRole('button', { name: t('ui.customers.labels').add, exact: true }).click();
    await checkDialog();
    await page
      .getByRole('button', { name: new RegExp('^' + t('ui.customers.labels').edit + ':') })
      .first()
      .click();
    await checkDialog();
    await page.goto(`/app/pricing/?lang=${language}`);
    await page.getByRole('button', { name: t('ui.pricingAdmin.add'), exact: true }).click();
    await checkDialog();
  });
}
