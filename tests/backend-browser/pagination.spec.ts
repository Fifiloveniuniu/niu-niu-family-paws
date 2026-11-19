import { test, expect } from '@playwright/test';
test('balances and history page on the server, preserve filters and export the whole filtered statement', async ({
  page,
  request,
}) => {
  test.setTimeout(90000);
  const fixture = await (await request.get('/__test-fixture')).json();
  const directoryResponses: { url: string; count: number }[] = [];
  page.on('response', async (response) => {
    if (response.url().includes('/api/workspace/pets') && response.ok()) {
      const body = await response.json();
      directoryResponses.push({ url: response.url(), count: body.items.length });
    }
  });
  await page.goto('/app/balances/?lang=en');
  await page.evaluate(async (jwt) => {
    // @ts-ignore Test module.
    const { auth } = await import('/apps/web/src/auth-client.ts');
    // @ts-ignore Test module.
    const { GoogleAuthProvider, signInWithCredential } =
      await import('/node_modules/.vite/deps/firebase_auth.js');
    await signInWithCredential(auth, GoogleAuthProvider.credential(jwt));
  }, fixture.administrator.jwt);
  const accounts = page.locator('.saved-balances > .workspace-table-scroll tbody tr');
  const paging = page.getByRole('navigation', { name: 'Balance pages', exact: true });
  await expect(accounts).toHaveCount(25);
  const first = await accounts.allTextContents();
  await expect(paging.getByRole('button', { name: 'Previous page', exact: true })).toBeDisabled();
  expect(directoryResponses.length).toBeGreaterThan(0);
  expect(
    directoryResponses.every(
      (item) => item.count <= 25 && !new URL(item.url).searchParams.has('cursor'),
    ),
  ).toBeTruthy();
  await paging.getByRole('button', { name: 'Next page', exact: true }).click();
  await expect(paging).toContainText('Page 2');
  await expect(accounts).toHaveCount(25);
  expect(await accounts.allTextContents()).not.toEqual(first);
  await paging.getByRole('button', { name: 'Previous page', exact: true }).click();
  await expect(accounts).toHaveText(first);
  await paging.getByRole('combobox', { name: 'Rows per page', exact: true }).click();
  await page.getByRole('option', { name: '50', exact: true }).click();
  await expect(accounts).toHaveCount(50);
  const target = await page.evaluate(async (cid) => {
    // @ts-ignore Test module.
    const { auth } = await import('/apps/web/src/auth-client.ts');
    const headers = {
      Authorization: 'Bearer ' + (await auth.currentUser!.getIdToken()),
      'Content-Type': 'application/json',
    };
    const rows = await (await fetch('/api/workspace/pets?pageSize=25', { headers })).json();
    const row = rows.items.find((row: any) => row.customer.id !== cid);
    let version = row.account?.version ?? 0;
    for (let i = 0; i < 55; i++) {
      const response = await fetch(`/api/customers/${row.customer.id}/pets/${row.pet.id}/balance`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({
          version,
          operationId: crypto.randomUUID(),
          delta: 1,
          validFrom: '2026-01-01',
          validThrough: '2031-12-31',
          reason: '[TEST] pagination ' + i,
        }),
      });
      if (!response.ok) throw Error('Fixture credit failed: ' + response.status);
      version = (await response.json()).version;
    }
    return { customerId: row.customer.id, petId: row.pet.id };
  }, fixture.cid);
  await page.goto(
    `/app/balances/?lang=en&asCustomer=${target.customerId}&pet=${encodeURIComponent(target.customerId + '/' + target.petId)}`,
  );
  await expect(accounts).toHaveCount(1);
  const history = page.getByRole('navigation', { name: 'History pages', exact: true });
  const entries = page.locator('.workspace-statement tbody tr');
  await expect(entries).toHaveCount(25);
  await history.getByRole('button', { name: 'Next page', exact: true }).click();
  await expect(history).toContainText('Page 2');
  await expect(entries).toHaveCount(25);
  await history.getByRole('button', { name: 'Next page', exact: true }).click();
  await expect(entries).toHaveCount(5);
  await expect(history.getByRole('button', { name: 'Next page', exact: true })).toBeDisabled();
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export CSV', exact: true }).click();
  const file = await download;
  const stream = await file.createReadStream();
  let csv = '';
  for await (const chunk of stream!) csv += chunk.toString();
  expect(csv.trim().split('\n')).toHaveLength(56);
  await page.getByRole('combobox', { name: 'Activity', exact: true }).click();
  await page.getByRole('option', { name: 'Correction', exact: true }).click();
  await expect(history).toContainText('Page 1');
  await expect(entries).toHaveCount(0);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/app/balances/?lang=zh');
  await expect(page.getByRole('navigation', { name: '余额分页', exact: true })).toBeVisible();
  await expect(accounts).toHaveCount(25);
  await expect
    .poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth))
    .toBeTruthy();
  await page.screenshot({
    path: 'test-results-backend/balance-pagination-phone-zh.png',
    fullPage: true,
  });
});

test('a searched customer remains readable after reopening the balance picker', async ({
  page,
  request,
}) => {
  const fixture = await (await request.get('/__test-fixture')).json();
  await page.goto('/app/balances/?lang=en');
  await page.evaluate(async (jwt) => {
    // @ts-ignore Test module.
    const { auth } = await import('/apps/web/src/auth-client.ts');
    // @ts-ignore Test module.
    const { GoogleAuthProvider, signInWithCredential } =
      await import('/node_modules/.vite/deps/firebase_auth.js');
    await signInWithCredential(auth, GoogleAuthProvider.credential(jwt));
  }, fixture.administrator.jwt);
  await expect(page.locator('.saved-balances > .workspace-table-scroll tbody tr')).toHaveCount(25);
  await page.getByRole('button', { name: 'Add balance', exact: true }).click();
  const dialog = page.getByRole('dialog');
  const picker = dialog.getByRole('combobox', { name: 'Customer', exact: true });
  await picker.fill('[TEST] Customer 099');
  await page.getByRole('option', { name: '[TEST] Customer 099', exact: true }).click();
  await expect(picker).toHaveValue('[TEST] Customer 099');
  await picker.click();
  await expect(
    page.getByRole('option', { name: '[TEST] Customer 099', exact: true }),
  ).toBeVisible();
  await picker.press('Escape');
  await expect(picker).toHaveValue('[TEST] Customer 099');
});
