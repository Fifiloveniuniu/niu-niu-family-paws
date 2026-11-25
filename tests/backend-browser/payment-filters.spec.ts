import { test, expect } from '@playwright/test';
import { readFile, mkdir } from 'node:fs/promises';

for (const [lang, width, palette] of [
  ['en', 1440, 'google'],
  ['zh', 390, 'apple'],
  ['es', 390, 'vscode-dark'],
] as const) {
  test(`payment filters preserve the sample card and localized layout (${lang}, ${width})`, async ({
    page,
    request,
  }) => {
    const messages = JSON.parse(
      await readFile(new URL(`../../apps/web/src/locales/${lang}.json`, import.meta.url), 'utf8'),
    );
    await page.setViewportSize({ width, height: 900 });
    await page.addInitScript(
      (palette) =>
        localStorage.setItem('family-paws:appearance', JSON.stringify({ version: 2, palette })),
      palette,
    );
    const fixture = await (await request.get('/__test-fixture')).json();
    await page.route('**/api/payment-capabilities', (route) =>
      route.fulfill({ json: { testMode: true } }),
    );
    const all = ['2026-11-24', '2026-11-10', '2026-11-15'].map((date, index) => ({
      id: 'payment-' + index,
      bookingId: 'sample-booking-' + index,
      amountCents: 5000 + index * 500,
      last4: index ? '0002' : '4242',
      at: date + 'T18:00:00Z',
    }));
    const queries: URLSearchParams[] = [];
    await page.route('**/api/customers/*/test-payments*', (route) => {
      const query = new URL(route.request().url()).searchParams;
      queries.push(query);
      const charges = all.filter(
        (charge) =>
          (!query.get('search') ||
            (charge.bookingId + charge.last4).includes(query.get('search')!)) &&
          (!query.get('from') || charge.at >= query.get('from')!) &&
          (!query.get('through') || charge.at < query.get('through')!),
      );
      return route.fulfill({
        json: {
          card: { scenario: 'approved', last4: '4242', version: 1 },
          charges,
          nextCursor: null,
        },
      });
    });
    await page.goto(
      `/app/payments/?lang=${lang}&customer=${fixture.cid}&zone=America%2FLos_Angeles`,
    );
    await page.evaluate(async (jwt) => {
      // @ts-ignore Test module.
      const { auth } = await import('/apps/web/src/auth-client.ts');
      // @ts-ignore Test module.
      const { GoogleAuthProvider, signInWithCredential } =
        await import('/tests/helpers/browser-auth.ts');
      await signInWithCredential(auth, GoogleAuthProvider.credential(jwt));
    }, fixture.administrator.jwt);
    const rows = page.locator('.payments-table tbody tr');
    await expect(rows).toHaveCount(3);
    const card = page.locator('.payments-card');
    await expect(card).toContainText('4242');
    const box = (await card.boundingBox())!;
    expect(box.width / box.height).toBeGreaterThan(1.4);
    expect(box.width / box.height).toBeLessThan(1.7);
    await page
      .getByRole('searchbox', { name: messages['ui.payments.searchPayments'] })
      .fill('0002');
    await expect(rows).toHaveCount(2);
    await expect(card).toContainText('4242');
    const dates = page.locator('.payments-filters .custom-date-input input');
    await dates.nth(0).fill('2026-11-01');
    await dates.nth(1).fill('2026-11-12');
    await expect(rows).toHaveCount(1);
    expect(queries.at(-1)!.get('from')).toBe('2026-11-01T07:00:00.000Z');
    expect(queries.at(-1)!.get('through')).toBe('2026-11-13T08:00:00.000Z');
    await dates.nth(0).fill('2026-11-30');
    await expect(page.getByRole('alert')).toContainText(messages['ui.workspace.invalidDates']);
    await expect(card).toContainText('4242');
    await dates.nth(0).fill('2026-11-01');
    await expect(rows).toHaveCount(1);
    await page
      .getByRole('button', { name: messages['ui.payments.manageCard'], exact: true })
      .click();
    const dialog = page.getByRole('dialog');
    await expect(dialog.locator('.payments-card')).toBeVisible();
    await dialog.getByRole('combobox').click();
    await page.getByRole('option', { name: messages['ui.payments.declined'], exact: true }).click();
    await expect(dialog.locator('.payments-card')).toContainText('0002');
    await dialog.getByRole('combobox').click();
    await page.getByRole('option', { name: messages['ui.payments.remove'], exact: true }).click();
    await expect(dialog.locator('.payments-card')).toContainText(messages['ui.payments.noCard']);

    await dialog
      .getByRole('button', { name: messages['ui.workspace.cancel'], exact: true })
      .click();
    await expect(dialog).toHaveCount(0);
    const finalBox = (await card.boundingBox())!;
    expect(finalBox.width / finalBox.height).toBeGreaterThan(1.4);
    expect(finalBox.width / finalBox.height).toBeLessThan(1.7);
    const heights = await page
      .locator('.payments-filters input')
      .evaluateAll((elements) => elements.map((element) => element.getBoundingClientRect().height));
    expect(Math.max(...heights) - Math.min(...heights)).toBeLessThan(2);

    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    await mkdir('docs/review/payment-view-2026-11-25', { recursive: true });
    await page.screenshot({
      path: `docs/review/payment-view-2026-11-25/${lang}-${width}.png`,
      fullPage: true,
    });
  });
}
