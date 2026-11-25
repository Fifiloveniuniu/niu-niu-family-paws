import { test, expect } from '@playwright/test';
test('customer lists append batches, retry without losing rows and reset on search', async ({
  page,
  request,
}) => {
  await page.addInitScript(() => {
    delete (window as any).IntersectionObserver;
  });
  const fixture = await (await request.get('/__test-fixture')).json();
  await page.goto('/app/customers/?lang=en');
  await page.evaluate(async (jwt) => {
    // @ts-ignore Test-only Vite module.
    const { auth } = await import('/apps/web/src/auth-client.ts');
    // @ts-ignore Test-only Vite dependency.
    const { GoogleAuthProvider, signInWithCredential } =
      await import('/tests/helpers/browser-auth.ts');
    await signInWithCredential(auth, GoogleAuthProvider.credential(jwt));
  }, fixture.administrator.jwt);
  const rows = page.locator('.customer-directory-panel .customer-list > li');
  const footer = page.locator('.customer-list-scroll .list-load-more');
  await expect(rows).toHaveCount(25);
  const first = await rows.allTextContents();
  await footer.getByRole('button', { name: 'Load more customers', exact: true }).click();
  await expect(rows).toHaveCount(50);
  expect((await rows.allTextContents()).slice(0, 25)).toEqual(first);
  await page.route(
    (url) => url.pathname === '/api/customers' && url.searchParams.has('cursor'),
    (route) => route.fulfill({ status: 503, json: { code: 'unavailable' } }),
    { times: 1 },
  );
  await footer.getByRole('button', { name: 'Load more customers', exact: true }).click();
  await expect(footer.getByRole('button', { name: 'Try again', exact: true })).toBeVisible();
  await expect(rows).toHaveCount(50);
  await footer.getByRole('button', { name: 'Try again', exact: true }).click();
  await expect(rows).toHaveCount(75);
  expect((await rows.allTextContents()).slice(0, 25)).toEqual(first);
  const search = page.locator('#customer-search');
  await search.fill('[TEST] Customer 09');
  await expect(rows).toHaveCount(10);
  await expect(footer).toHaveCount(0);
  await expect(page.getByRole('combobox', { name: 'Rows per page', exact: true })).toHaveCount(0);
  const names = await rows.locator('.customer-name').allTextContents();
  expect(names.every((name) => name.startsWith('[TEST] Customer 09'))).toBe(true);
  await search.fill('');
  await expect(rows).toHaveCount(25);
  await expect(
    footer.getByRole('button', { name: 'Load more customers', exact: true }),
  ).toBeVisible();
});

test('pet batches retain earlier rows, discover saved deep links and preserve private photos', async ({
  page,
  request,
}) => {
  test.setTimeout(60000);
  const fixture = await (await request.get('/__test-fixture')).json();
  await page.goto('/app/customers/?lang=en');
  const customerId = await page.evaluate(async (fixture) => {
    // @ts-ignore Test module.
    const { auth } = await import('/apps/web/src/auth-client.ts');
    // @ts-ignore Test module.
    const { GoogleAuthProvider, signInWithCredential } =
      await import('/tests/helpers/browser-auth.ts');
    await signInWithCredential(auth, GoogleAuthProvider.credential(fixture.administrator.jwt));
    const headers = {
      Authorization: 'Bearer ' + (await auth.currentUser!.getIdToken()),
      'Content-Type': 'application/json',
    };
    const directory = await (await fetch('/api/workspace/pets?pageSize=25', { headers })).json();
    const cid = directory.items.find((row: any) => row.customer.id !== fixture.cid).customer.id;
    const bytes = new Uint8Array(
      await (
        await fetch(`/api/customers/${fixture.cid}/pets/${fixture.pid}/photo`, { headers })
      ).arrayBuffer(),
    );
    const photoData = btoa(String.fromCharCode(...bytes));
    for (let i = 0; i < 27; i++) {
      const response = await fetch(`/api/customers/${cid}/pets/${crypto.randomUUID()}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({
          name: '[TEST] Page pet ' + i,
          version: 0,
          species: 'dog',
          weightKg: 10,
          photoData,
        }),
      });
      if (!response.ok) throw Error('Cannot seed paginated pet ' + response.status);
    }
    return cid;
  }, fixture);
  await page.goto(`/app/customers/${customerId}/?lang=en`);
  const cards = page.locator('.pet-grid > .pet-card');
  await expect(cards).toHaveCount(25);
  const first = await cards.locator('.pet-name-button').allTextContents();
  await page.getByRole('button', { name: 'Load more pets', exact: true }).click();
  await expect(cards).toHaveCount(30);
  expect((await cards.locator('.pet-name-button').allTextContents()).slice(0, 25)).toEqual(first);
  const deep = await cards
    .filter({ hasText: '[TEST] Page pet ' })
    .last()
    .getByRole('link')
    .getAttribute('href');
  await page.goto(deep! + '?lang=en');
  await expect(page.locator('.pet-card-selected')).toBeVisible();
  await expect(cards).toHaveCount(30);
  await expect(page.getByRole('button', { name: 'Load more pets', exact: true })).toHaveCount(0);
  const photo = page.locator('.pet-card-selected .pet-photo img');
  await expect(photo).toBeVisible();
});
