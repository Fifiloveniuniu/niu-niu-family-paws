import { test, expect } from '@playwright/test';
test('assigned employee records handoffs, verifies weight and corrects times without financial access', async ({
  page,
  request,
}) => {
  test.setTimeout(60000);
  const fixture = await (await request.get('/__test-fixture')).json();
  await page.goto('/app/calendar/?lang=en');
  const login = async (jwt: string) =>
    page.evaluate(async (jwt) => {
      // @ts-ignore Test module.
      const { auth } = await import('/apps/web/src/auth-client.ts');
      // @ts-ignore Test module.
      const { GoogleAuthProvider, signInWithCredential } =
        await import('/node_modules/.vite/deps/firebase_auth.js');
      await signInWithCredential(auth, GoogleAuthProvider.credential(jwt));
    }, jwt);
  await login(fixture.administrator.jwt);
  await expect(page.locator('.hc-toolbar')).toBeVisible();
  const booking = await page.evaluate(async (fixture) => {
    // @ts-ignore Test module.
    const { auth } = await import('/apps/web/src/auth-client.ts');
    const headers = {
      Authorization: 'Bearer ' + (await auth.currentUser!.getIdToken()),
      'Content-Type': 'application/json',
    };
    const directory = await (await fetch('/api/workspace/pets?pageSize=100', { headers })).json();
    const guest = directory.items.find(
      (row: any) => row.customer.id !== fixture.cid && row.pet.species === 'dog',
    );
    const bytes = new Uint8Array(
      await (
        await fetch(`/api/customers/${fixture.cid}/pets/${fixture.pid}/photo`, { headers })
      ).arrayBuffer(),
    );
    const photoData = btoa(String.fromCharCode(...bytes));
    const update = await fetch(`/api/customers/${guest.customer.id}/pets/${guest.pet.id}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify({
        name: guest.pet.name,
        version: guest.pet.version,
        species: guest.pet.species,
        weightKg: guest.pet.weightKg,
        photoData,
      }),
    });
    if (!update.ok) throw Error('Cannot prepare operational photo');
    const id = crypto.randomUUID(),
      now = Date.now();
    const response = await fetch('/api/bookings/' + id, {
      method: 'PUT',
      headers,
      body: JSON.stringify({
        operationId: crypto.randomUUID(),
        version: 0,
        customerId: guest.customer.id,
        petId: guest.pet.id,
        houseId: fixture.hid,
        roomId: fixture.rid,
        arrival: new Date(now - 3600000).toISOString(),
        pickup: new Date(now + 3600000).toISOString(),
      }),
    });
    if (!response.ok) throw Error('Cannot seed operational booking ' + response.status);
    return await response.json();
  }, fixture);
  await login(fixture.employee.jwt);
  await page.goto('/app/operations/?lang=en');
  await expect(page.getByRole('heading', { name: 'House operations', exact: true })).toBeVisible();
  await expect(page.locator('.operations-cards article')).toHaveCount(1);
  await page.getByRole('button', { name: 'Record arrival', exact: true }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Save changes', exact: true }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await page.getByRole('button', { name: 'Verify weight', exact: true }).click();
  await page.getByRole('dialog').getByLabel('Weight (kg)', { exact: true }).fill('13.25');
  await page.getByRole('dialog').getByRole('button', { name: 'Save changes', exact: true }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.locator('.operations-cards')).toContainText('13.25 · Verified');
  const denies = await page.evaluate(async (fixture) => {
    // @ts-ignore Test module.
    const { auth } = await import('/apps/web/src/auth-client.ts');
    const headers = { Authorization: 'Bearer ' + (await auth.currentUser!.getIdToken()) };
    return Promise.all(
      [
        '/api/pricing',
        '/api/customers',
        '/api/operations?' +
          new URLSearchParams({
            houseId: crypto.randomUUID(),
            from: new Date(Date.now() - 86400000).toISOString(),
            through: new Date().toISOString(),
          }),
      ].map(async (url) => (await fetch(url, { headers })).status),
    );
  }, fixture);
  expect(denies).toEqual([403, 403, 403]);
  await page.getByRole('button', { name: 'Correct handoff times', exact: true }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Save changes', exact: true }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await page.getByRole('button', { name: 'Record pickup', exact: true }).click();
  // A pickup must occur strictly after the saved arrival, including minute precision.
  const past = await page.evaluate(async () => {
    // @ts-ignore Test module.
    const { zonedValue } = await import('/apps/web/src/wall-time.ts');
    return zonedValue(new Date(Date.now() - 120000).toISOString(), 'America/Los_Angeles');
  });
  // First correct the arrival to two minutes ago, then record pickup now.
  await page.getByRole('dialog').getByRole('button', { name: 'Cancel', exact: true }).click();
  await page.getByRole('button', { name: 'Correct handoff times', exact: true }).click();
  await page
    .getByRole('dialog')
    .getByRole('combobox', { name: 'Actual arrival', exact: true })
    .fill(past);
  await page.getByRole('dialog').getByRole('button', { name: 'Save changes', exact: true }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await page.getByRole('button', { name: 'Record pickup', exact: true }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Save changes', exact: true }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.locator('.operations-cards')).toContainText('Picked up');
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/app/operations/?lang=zh');
  await expect(page.getByRole('heading', { name: '房屋运营', exact: true })).toBeVisible();
  await expect(page.locator('.operations-cards article')).toHaveCSS('border-top-width', '1px');
  const cardBox = await page.locator('.operations-cards article').first().boundingBox();
  expect(cardBox!.x).toBeGreaterThanOrEqual(16);
  expect(cardBox!.x + cardBox!.width).toBeLessThanOrEqual(374);
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
  ).toBeTruthy();
  await page.screenshot({ path: 'test-results-backend/employee-phone-zh.png', fullPage: true });
});
