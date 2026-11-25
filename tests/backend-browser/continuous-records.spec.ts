import { test, expect, type Page } from '@playwright/test';
async function signIn(page: Page, jwt: string, path: string) {
  await page.goto(path);
  await page.evaluate(async (jwt) => {
    // @ts-ignore Local test module.
    const { auth } = await import('/apps/web/src/auth-client.ts');
    // @ts-ignore Local test dependency.
    const { GoogleAuthProvider, signInWithCredential } =
      await import('/tests/helpers/browser-auth.ts');
    await signInWithCredential(auth, GoogleAuthProvider.credential(jwt));
  }, jwt);
}
test('balance continuation retries preserve rows and scroll; dialogs and tabs retain loaded records', async ({
  page,
  request,
}) => {
  await page.addInitScript(() => {
    delete (window as any).IntersectionObserver;
  });
  const fixture = await (await request.get('/__test-fixture')).json();
  await signIn(page, fixture.administrator.jwt, '/app/balances/?lang=en');
  const list = page.locator('#balances-panel .record-list-scroll');
  const rows = list.locator('tbody tr');
  await expect(rows).toHaveCount(25);
  const first = await rows.allTextContents();
  await page.route(
    (url) => url.pathname === '/api/workspace/pets' && url.searchParams.has('cursor'),
    (route) => route.fulfill({ status: 503, json: { code: 'unavailable' } }),
    { times: 1 },
  );
  await list.getByRole('button', { name: 'Load more', exact: true }).click();
  await expect(list.getByRole('alert')).toBeVisible();
  await expect(rows).toHaveText(first);
  const retry = list.getByRole('button', { name: 'Try again', exact: true });
  await retry.click();
  await expect(rows).toHaveCount(50);
  expect((await rows.allTextContents()).slice(0, 25)).toEqual(first);
  const scroll = await list.evaluate((e) => e.scrollTop);
  await rows.first().getByRole('button').first().click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  await dialog.getByRole('button', { name: 'Close', exact: true }).click();
  await expect(rows).toHaveCount(50);
  // The browser may scroll the first row into view for the explicit click; closing keeps that position.
  expect(await list.evaluate((e) => e.scrollTop)).toBeLessThanOrEqual(scroll);
  await page.getByRole('tab', { name: 'Activity', exact: true }).click();
  await page.getByRole('tab', { name: 'Current balances', exact: true }).click();
  await expect(rows).toHaveCount(50);
});
for (const [width, height] of [
  [1440, 900],
  [390, 900],
  [1280, 600],
]) {
  test(`automatic loading waits for scrolling and appends within the intended scroll surface (${width} × ${height})`, async ({
    page,
    request,
  }) => {
    await page.setViewportSize({ width, height });
    const fixture = await (await request.get('/__test-fixture')).json();
    await signIn(page, fixture.administrator.jwt, '/app/balances/?lang=en');
    const list = page.locator('#balances-panel .record-list-scroll');
    const rows = list.locator('tbody tr');
    await expect(rows).toHaveCount(25);
    const first = await rows.first().textContent();
    if (width === 1440) {
      expect(await list.evaluate((e) => e.scrollHeight > e.clientHeight)).toBe(true);
      expect(
        await page.evaluate(() => document.documentElement.scrollHeight <= innerHeight + 16),
      ).toBe(true);
      await list.evaluate((e) => (e.scrollTop = e.scrollHeight));
    } else {
      expect(await list.evaluate((e) => e.scrollHeight <= e.clientHeight + 1)).toBe(true);
      await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
    }
    await expect.poll(() => rows.count()).toBeGreaterThan(25);
    expect(await rows.first().textContent()).toBe(first);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
  });
}
test('Access preserves each loaded section when switching tabs', async ({ page, request }) => {
  await page.addInitScript(() => {
    delete (window as any).IntersectionObserver;
  });
  const fixture = await (await request.get('/__test-fixture')).json();
  await signIn(page, fixture.administrator.jwt, '/app/access/?lang=en');
  const accounts = page.locator('.iam-account');
  await expect(accounts).toHaveCount(25);
  await page.getByRole('button', { name: 'Load more', exact: true }).click();
  await expect(accounts).toHaveCount(50);
  const accountList = page.locator('.record-list-scroll');
  await accountList.evaluate((element) => (element.scrollTop = 600));
  const position = await accountList.evaluate((element) => element.scrollTop);
  await page.getByRole('tab', { name: 'Invitations', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Invitations', exact: true })).toBeVisible();
  await page.getByRole('tab', { name: 'Accounts', exact: true }).click();
  await expect(accounts).toHaveCount(50);
  expect(await page.locator('.record-list-scroll').evaluate((element) => element.scrollTop)).toBe(
    position,
  );
  await expect(page.getByRole('combobox', { name: 'Rows per page', exact: true })).toHaveCount(0);
});
test('Payments appends charges, retains the card and retries failed continuations', async ({
  page,
  request,
}) => {
  await page.addInitScript(() => {
    delete (window as any).IntersectionObserver;
  });
  const fixture = await (await request.get('/__test-fixture')).json();
  await page.route('**/api/payment-capabilities', (route) =>
    route.fulfill({ json: { testMode: true } }),
  );
  let fail = true;
  await page.route('**/api/customers/*/test-payments*', (route) => {
    const cursor = new URL(route.request().url()).searchParams.get('cursor');
    if (cursor && fail) {
      fail = false;
      return route.fulfill({ status: 503, json: { code: 'unavailable' } });
    }
    return route.fulfill({
      json: {
        card: { scenario: 'approved', last4: '4242', version: 1 },
        charges: Array.from({ length: 25 }, (_, i) => ({
          id: 'charge-' + (i + (cursor ? 25 : 0)),
          bookingId: 'test-booking',
          amountCents: 100,
          last4: '4242',
          at: '2026-11-24T12:00:00Z',
        })),
        nextCursor: cursor ? null : 'next',
      },
    });
  });
  await signIn(page, fixture.administrator.jwt, `/app/payments/?lang=en&customer=${fixture.cid}`);
  const rows = page.locator('.payments-table tbody tr');
  await expect(rows).toHaveCount(25);
  await page.getByRole('button', { name: 'Load more', exact: true }).click();
  await expect(page.locator('.record-list-scroll [role=alert]')).toBeVisible();
  await expect(rows).toHaveCount(25);
  await expect(page.locator('.payments-card')).toContainText('4242');
  await page
    .locator('.record-list-scroll')
    .getByRole('button', { name: 'Try again', exact: true })
    .click();
  await expect(rows).toHaveCount(50);
  await expect(page.getByRole('button', { name: 'Load more', exact: true })).toHaveCount(0);
});

test('live Access filters discard delayed results and traverse empty windows without false empty messages', async ({
  page,
  request,
}) => {
  await page.addInitScript(() => {
    delete (window as any).IntersectionObserver;
  });
  const fixture = await (await request.get('/__test-fixture')).json();
  await signIn(page, fixture.administrator.jwt, '/app/access/?lang=en');
  await expect(page.locator('.iam-account')).toHaveCount(25);
  const example = await page.evaluate(async () => {
    // @ts-ignore Test-only module.
    const { apiJson } = await import('/apps/web/src/api-client.ts');
    return (await apiJson('/access/accounts?pageSize=25')).items[0];
  });
  let release!: () => void, started!: () => void;
  const gate = new Promise<void>((resolve) => (release = resolve));
  const pending = new Promise<void>((resolve) => (started = resolve));
  await page.route(
    (url) => url.pathname === '/api/access/accounts' && url.searchParams.has('search'),
    async (route) => {
      const url = new URL(route.request().url()),
        search = url.searchParams.get('search');
      if (search === 'Slow') {
        started();
        await gate;
        await route
          .fulfill({
            json: {
              items: [{ ...example, uid: 'slow-id', name: 'Slow account' }],
              nextCursor: null,
            },
          })
          .catch(() => {});
        return;
      }
      if (search === 'Empty' && !url.searchParams.has('cursor'))
        return route.fulfill({ json: { items: [], nextCursor: 'window-2' } });
      const account = { ...example, uid: 'fast-id', name: 'Fast account' };
      return route.fulfill({ json: { items: [account, account], nextCursor: null } });
    },
  );
  const search = page.getByRole('searchbox');
  await search.fill('Slow');
  await pending;
  await search.fill('Fast');
  await expect(page.locator('.iam-account')).toHaveCount(1);
  await expect(page.locator('.iam-account')).toContainText('Fast account');
  release();
  await search.fill('Empty');
  await expect(page.locator('.iam-account')).toHaveCount(0);
  await expect(page.locator('.iam-empty')).toHaveCount(0);
  await page.getByRole('button', { name: 'Load more', exact: true }).click();
  await expect(page.locator('.iam-account')).toHaveCount(1);
  await expect(page.locator('.iam-account')).toContainText('Fast account');
  await expect(page.getByRole('button', { name: 'Load more', exact: true })).toHaveCount(0);
});
