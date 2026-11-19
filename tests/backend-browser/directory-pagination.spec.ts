import { test, expect } from '@playwright/test';
test('customer pages apply search before paging and retain page size', async ({
  page,
  request,
}) => {
  const fixture = await (await request.get('/__test-fixture')).json();
  await page.goto('/app/customers/?lang=en');
  await page.evaluate(async (jwt) => {
    // @ts-ignore Test module.
    const { auth } = await import('/apps/web/src/auth-client.ts');
    // @ts-ignore Test module.
    const { GoogleAuthProvider, signInWithCredential } =
      await import('/node_modules/.vite/deps/firebase_auth.js');
    await signInWithCredential(auth, GoogleAuthProvider.credential(jwt));
  }, fixture.administrator.jwt);
  const rows = page.locator('.customer-list > li');
  const paging = page.getByRole('navigation', { name: 'Customer pages', exact: true });
  await expect(rows).toHaveCount(25);
  const first = await rows.allTextContents();
  await paging.getByRole('button', { name: 'Next page', exact: true }).click();
  await expect(paging).toContainText('Page 2');
  await expect(rows).toHaveCount(25);
  expect(await rows.allTextContents()).not.toEqual(first);
  await paging.getByRole('button', { name: 'Previous page', exact: true }).click();
  await expect(rows).toHaveText(first);
  await paging.getByRole('combobox', { name: 'Rows per page', exact: true }).click();
  await page.getByRole('option', { name: '50', exact: true }).click();
  await expect(rows).toHaveCount(50);
  const search = page.locator('input[type="search"]').first();
  await search.fill('[TEST] Customer 09');
  await search.press('Enter');
  await expect(rows).toHaveCount(10);
  await expect(paging).toContainText('Page 1');
  await expect(
    paging.getByRole('combobox', { name: 'Rows per page', exact: true }),
  ).toHaveAttribute('data-value', '50');
  await expect(paging.getByRole('button', { name: 'Next page', exact: true })).toBeDisabled();
});

test('pet pages discover saved deep links and preserve private photos across pages', async ({
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
      await import('/node_modules/.vite/deps/firebase_auth.js');
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
  const paging = page.getByRole('navigation', { name: 'Pet pages', exact: true }),
    cards = page.locator('.pet-grid > .pet-card');
  await expect(cards).toHaveCount(25);
  await paging.getByRole('button', { name: 'Next page', exact: true }).click();
  await expect(cards).toHaveCount(5);
  await expect(paging).toContainText('Page 2');
  const deep = await cards.last().getByRole('link').getAttribute('href');
  await paging.getByRole('button', { name: 'Previous page', exact: true }).click();
  await expect(cards).toHaveCount(25);
  await page.goto(deep! + '?lang=en');
  await expect(page.locator('.pet-card-selected')).toBeVisible();
  await expect(paging).toContainText('Page 2');
  await paging.getByRole('combobox', { name: 'Rows per page', exact: true }).click();
  await page.getByRole('option', { name: '50', exact: true }).click();
  await expect(cards).toHaveCount(30);
});
