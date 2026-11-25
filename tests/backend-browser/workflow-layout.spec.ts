import { readFile } from 'node:fs/promises';
import { test, expect } from '@playwright/test';
for (const [language, width, palette] of [
  ['en', 1280, 'google'],
  ['zh', 390, 'apple'],
  ['es', 390, 'vscode-dark'],
  ['en', 1280, 'vscode-light'],
] as const) {
  test(`workflow layouts and normal calendar sticky axis (${language}, ${width}, ${palette})`, async ({
    page,
    request,
  }, testInfo) => {
    const catalog = JSON.parse(
      await readFile(
        new URL(`../../apps/web/src/locales/${language}.json`, import.meta.url),
        'utf8',
      ),
    );
    const t = (key: string) => catalog[key];
    const fixture = await (await request.get('/__test-fixture')).json();
    await page.setViewportSize({ width, height: 900 });
    await page.addInitScript(
      (palette) =>
        localStorage.setItem('family-paws:appearance', JSON.stringify({ version: 2, palette })),
      palette,
    );
    await page.goto('/app/calendar/?lang=' + language);
    await page.evaluate(async (jwt) => {
      // @ts-ignore Test module.
      const { auth } = await import('/apps/web/src/auth-client.ts');
      // @ts-ignore Test module.
      const { GoogleAuthProvider, signInWithCredential } =
        await import('/tests/helpers/browser-auth.ts');
      await signInWithCredential(auth, GoogleAuthProvider.credential(jwt));
    }, fixture.administrator.jwt);
    const viewport = page.locator('.calendar-timeline-viewport');
    await expect(page.locator('.saved-calendar-grid .hc-house').first()).toBeVisible();
    // Vertical scrolling belongs to the document, not the horizontal calendar viewport.
    await viewport.evaluate((node) => {
      node.scrollLeft = 100;
      const header = document.querySelector('.marketing-header')!;
      const boundary = header.getBoundingClientRect().bottom;
      window.scrollBy(0, node.getBoundingClientRect().top - boundary + 150);
    });
    await expect
      .poll(async () =>
        Math.abs(
          (await page.locator('.calendar-timeline-axis').boundingBox())!.y -
            (await page.locator('.marketing-header').boundingBox())!.y -
            (await page.locator('.marketing-header').boundingBox())!.height -
            1,
        ),
      )
      .toBeLessThan(2);
    expect(await page.evaluate(() => window.scrollY)).toBeGreaterThan(0);
    expect(await viewport.evaluate((node) => node.scrollTop)).toBe(0);
    await page.evaluate(() => window.scrollTo(0, 0));
    async function checkDialog() {
      const modal = page.locator('dialog:modal');
      await expect(modal).toBeVisible();
      expect(await modal.evaluate((node) => node.scrollWidth <= node.clientWidth + 1)).toBeTruthy();
      const box = (await modal.boundingBox())!;
      expect(box.width).toBeLessThanOrEqual(width - 20);
      const headingBox = (await modal.locator('.dialog-heading').boundingBox())!;
      expect(headingBox.y).toBeGreaterThanOrEqual(box.y + 10);
      await expect(modal.locator('.dialog-heading button')).toBeInViewport();
      const formGrid = modal.locator('.customer-form .workflow-form-body > fieldset');
      if (await formGrid.count()) {
        expect(
          await formGrid.evaluate((node) => {
            const boxes = [...node.children]
              .map((child) => child.getBoundingClientRect())
              .filter((box) => box.height > 0);
            return boxes.every(
              (box, index) => index === 0 || box.top >= boxes[index - 1].bottom - 1,
            );
          }),
        ).toBeTruthy();
      }
      const body = modal.locator('.workflow-form-body');
      if (await body.count()) {
        const bodyBox = (await body.boundingBox())!;
        const footerBox = (await modal.locator('.portal-actions').boundingBox())!;
        expect(bodyBox.y + bodyBox.height).toBeLessThanOrEqual(footerBox.y + 1);
        await body.evaluate((node) => {
          node.scrollTop = node.scrollHeight;
        });
      }
      await page.screenshot({
        path: testInfo.outputPath((await modal.getAttribute('class')) + '.png'),
      });
    }
    await page.goto('/app/pricing/?lang=' + language);
    await page.getByRole('button', { name: t('ui.pricingAdmin.holidays'), exact: true }).click();
    await checkDialog();
    const holiday = page
      .locator('.holiday-preset-list label')
      .filter({ hasText: t('ui.holidayPresets.thanksgiving') });
    await expect(holiday).toContainText('2026-11-26');
    await holiday.getByRole('checkbox').check();
    await expect(page.locator('.holiday-selected-list')).toContainText(
      t('ui.holidayPresets.thanksgiving'),
    );
    page.once('dialog', (d) => d.accept());
    await page.keyboard.press('Escape');
    await page.getByRole('button', { name: t('ui.pricingAdmin.add'), exact: true }).click();
    await checkDialog();
    await page.keyboard.press('Escape');
    await page.goto(`/app/balances/?lang=${language}&asCustomer=${fixture.cid}`);
    await page.getByRole('button', { name: t('ui.templates.title'), exact: true }).click();
    await checkDialog();
    await page.getByRole('button', { name: t('ui.templates.add'), exact: true }).click();
    await checkDialog();
    await page.keyboard.press('Escape');
    await page.keyboard.press('Escape');
    await page.getByRole('button', { name: t('ui.workspace.addBalance'), exact: true }).click();
    await checkDialog();
    await page.keyboard.press('Escape');
    await page.goto('/app/settings/cancellation/?lang=' + language);
    await expect(page.locator('.hc-policy-cards article')).toHaveCount(3);
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
    ).toBeTruthy();
    const cards = await page.locator('.hc-policy-cards article').evaluateAll((nodes) =>
      nodes.map((node) => ({
        x: node.getBoundingClientRect().x,
        y: node.getBoundingClientRect().y,
      })),
    );
    if (width < 640) expect(cards[1].y).toBeGreaterThan(cards[0].y);
    else expect(cards[1].y).toBe(cards[0].y);
    await page.screenshot({ path: testInfo.outputPath('cancellation.png'), fullPage: true });
  });
}
