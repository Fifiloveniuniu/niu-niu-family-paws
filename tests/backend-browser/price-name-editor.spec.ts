import { readFile } from 'node:fs/promises';
import { test, expect } from '@playwright/test';
import { expectReadableText } from './readability';
for (const [language, width, palette] of [
  ['en', 1280, 'google'],
  ['zh', 390, 'apple'],
  ['es', 390, 'vscode-light'],
  ['es', 1280, 'vscode-dark'],
] as const) {
  test(`price category names use one language field with persistent drafts (${language}, ${width}, ${palette})`, async ({
    page,
    request,
  }, testInfo) => {
    test.setTimeout(60000);
    const catalog = JSON.parse(
      await readFile(
        new URL(`../../apps/web/src/locales/${language}.json`, import.meta.url),
        'utf8',
      ),
    );
    const t = (key: string) => catalog['ui.priceNameEditor.' + key];
    const fixture = await (await request.get('/__test-fixture')).json();
    await page.setViewportSize({ width, height: 900 });
    await page.addInitScript(
      (palette) =>
        localStorage.setItem('family-paws:appearance', JSON.stringify({ version: 2, palette })),
      palette,
    );
    await page.goto('/app/pricing/?lang=' + language);
    await page.evaluate(async (jwt) => {
      // @ts-ignore Test module.
      const { auth } = await import('/apps/web/src/auth-client.ts');
      // @ts-ignore Test module.
      const { GoogleAuthProvider, signInWithCredential } =
        await import('/tests/helpers/browser-auth.ts');
      await signInWithCredential(auth, GoogleAuthProvider.credential(jwt));
    }, fixture.administrator.jwt);
    await page.getByRole('tab', { name: catalog['ui.pricingAdmin.service'], exact: true }).click();
    await page.getByRole('button', { name: catalog['ui.pricingAdmin.add'], exact: true }).click();
    const modal = page.locator('dialog:modal'),
      editor = modal.locator('.price-name-editor');
    await expect(editor.getByRole('textbox')).toHaveCount(1);
    await expect(editor.getByRole('textbox')).toHaveAttribute(
      'lang',
      language === 'zh' ? 'zh-Hans' : language,
    );
    await modal.getByLabel(catalog['ui.pricingAdmin.price'], { exact: true }).fill('50.00');
    const save = modal.getByRole('button', { name: catalog['ui.workspace.save'], exact: true });
    await expect(save).toBeDisabled();
    await expect(editor.getByRole('status')).toContainText('English');
    await expect(editor.getByRole('status')).toContainText('简体中文');
    const drafts = {
      en: '[TEST] Family care',
      zh: '[TEST] 家庭照护',
      es: '[TEST] Cuidado familiar',
    };
    const names = { en: 'English', zh: '简体中文', es: 'Español' };
    async function choose(code: 'en' | 'zh' | 'es') {
      await editor.getByRole('combobox', { name: t('language'), exact: true }).click();
      await page.getByRole('option', { name: names[code], exact: true }).click();
    }
    for (const code of ['es', 'en', 'zh'] as const) {
      await choose(code);
      await editor.getByLabel(names[code], { exact: true }).fill(drafts[code]);
      await editor.getByLabel(names[code], { exact: true }).press('Enter');
      await expect(editor.locator('.price-name-list')).toContainText(drafts[code]);
      await expect(editor.getByLabel(names[code], { exact: true })).toHaveValue('');
      await expect(editor.locator('.price-name-preview strong')).toHaveText(drafts[code]);
      if (code === 'zh') await expect(save).toBeEnabled();
      else await expect(save).toBeDisabled();
    }
    await expect(editor.getByRole('status')).toContainText(t('ready'));
    for (const code of ['en', 'zh', 'es'] as const) {
      await choose(code);
      await expect(editor.getByLabel(names[code], { exact: true })).toHaveValue('');
    }
    await editor
      .getByRole('button', { name: t('delete').replace('{{language}}', 'Español'), exact: true })
      .click();
    await expect(save).toBeEnabled();
    await expect(editor.locator('.price-name-preview strong')).toHaveText(drafts.en);
    await editor.getByLabel('Español', { exact: true }).fill('  ');
    await editor.getByLabel('Español', { exact: true }).press('Enter');
    await expect(editor.locator('.price-name-list li')).toHaveCount(2);
    const fieldBox = (await editor.getByRole('textbox').boundingBox())!;
    expect(fieldBox.width).toBeGreaterThan(width < 640 ? 200 : 250);
    if (width > 640) {
      const choiceBox = (await editor
        .getByRole('combobox', { name: t('language'), exact: true })
        .boundingBox())!;
      expect(Math.abs(choiceBox.y - fieldBox.y)).toBeLessThan(2);
    }

    expect(await modal.evaluate((node) => node.scrollWidth <= node.clientWidth + 1)).toBeTruthy();
    await expectReadableText(page, 'dialog:modal');
    await page.screenshot({ path: testInfo.outputPath('category-name-language.png') });
    page.once('dialog', (dialog) => dialog.accept());
    await page.keyboard.press('Escape');
    await expect(modal).toHaveCount(0);
  });
}
