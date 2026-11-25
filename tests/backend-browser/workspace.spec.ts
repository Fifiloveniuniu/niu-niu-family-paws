import { readFile } from 'node:fs/promises';
import { test, expect } from '@playwright/test';
test('real saved workspace scopes all three tabs and persists manual credits', async ({
  page,
  request,
}) => {
  test.setTimeout(60000);
  const serverErrors: string[] = [];
  page.on('response', (response) => {
    if (response.url().includes('/api/') && response.status() >= 500)
      serverErrors.push(response.url());
  });
  const fixture = await (await request.get('/__test-fixture')).json();
  await page.goto('/app/calendar/?lang=en');
  await page.evaluate(async (jwt) => {
    // @ts-ignore Test-only Vite module import.
    const { auth } = await import('/apps/web/src/auth-client.ts');
    await auth.authStateReady();
    // @ts-ignore Test-only Vite dependency import.
    const { GoogleAuthProvider, signInWithCredential } =
      await import('/tests/helpers/browser-auth.ts');
    await signInWithCredential(auth, GoogleAuthProvider.credential(jwt));
  }, fixture.administrator.jwt);
  await expect(
    page
      .getByRole('navigation')
      .filter({ has: page.getByRole('link', { name: 'Balances', exact: true }) }),
  ).toBeVisible();
  await expect(page.getByText('[TEST] Practice room', { exact: true })).toBeVisible();
  await expect(page.locator('.hc-body')).toHaveCSS('background-color', 'rgb(255, 255, 255)');
  await expect(page.locator('.hc-content')).toHaveCSS('background-color', 'rgb(255, 255, 255)');
  await page.getByRole('combobox', { name: 'Pet type', exact: true }).click();
  await expect(
    page.getByRole('option', { name: 'Dog', exact: true }).locator('.pet-type-icon'),
  ).toBeVisible();
  await page.getByRole('option', { name: 'Dog', exact: true }).click();
  await expect(
    page
      .getByRole('combobox', { name: 'Pet type', exact: true })
      .locator('..')
      .locator('.pet-type-icon'),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Clear filters', exact: true }).click();
  await page.getByRole('button', { name: 'Add booking', exact: true }).click();
  await expect(
    page.getByRole('dialog').getByRole('combobox', { name: 'Pet type', exact: true }),
  ).toBeEnabled();
  await page.getByRole('dialog').getByRole('combobox', { name: 'Pet type', exact: true }).click();
  await page.getByRole('option', { name: 'Dog', exact: true }).click();
  await page
    .getByRole('dialog')
    .getByRole('button', { name: 'Toggle Customer choices', exact: true })
    .click();
  await expect(page.getByRole('listbox')).toHaveCount(1);
  await page
    .getByRole('dialog')
    .getByRole('button', { name: 'Toggle Customer choices', exact: true })
    .click();
  await expect(page.getByRole('listbox')).toHaveCount(0);
  await page.getByRole('dialog').getByRole('combobox', { name: 'Customer', exact: true }).click();
  expect(fixture.customerCount).toBeGreaterThanOrEqual(100);
  await expect(page.getByRole('option')).toHaveCount(fixture.customerCount);
  await page.getByRole('option', { name: '[TEST] Alice', exact: true }).click();
  await page.getByRole('dialog').getByRole('combobox', { name: 'Pet type', exact: true }).click();
  await page.getByRole('option', { name: 'Dog', exact: true }).click();

  await page.getByRole('dialog').getByRole('combobox', { name: 'Pet', exact: true }).click();
  await expect(page.getByRole('option')).toHaveCount(1);
  await expect(page.getByRole('option').locator('.pet-type-icon, small')).toHaveCount(0);
  await expect(page.locator('[role=listbox]:visible')).toHaveCount(1);
  await page.getByRole('option').filter({ hasText: '[TEST] Alice pet 0' }).click();
  await expect(
    page.getByRole('dialog').locator('.custom-autocomplete.has-adornment .workspace-avatar'),
  ).toHaveAttribute('data-photo-state', 'ready');
  const spacing = await page
    .getByRole('dialog')
    .locator('.custom-autocomplete.has-adornment')
    .evaluateAll((nodes) =>
      nodes.map((root) => {
        const input = root.querySelector('input')!,
          adornment = root.querySelector('.custom-autocomplete-adornment')!;
        return (
          input.getBoundingClientRect().left +
          parseFloat(getComputedStyle(input).paddingLeft) -
          adornment.getBoundingClientRect().right
        );
      }),
    );
  expect(spacing.every((value) => value >= 6)).toBeTruthy();
  const box = await page.getByRole('dialog').boundingBox();
  expect(box?.x).toBe(24);
  expect(box?.y).toBe(24);
  page.once('dialog', (dialog) => dialog.accept());
  await page.getByRole('button', { name: 'Cancel', exact: true }).click();
  await page.goto(`/app/balances/?lang=en&asCustomer=${fixture.cid}`);
  await expect(page.getByText(/Viewing as.*Alice/)).toBeVisible();
  await expect(page.getByRole('link', { name: 'Pets', exact: true })).toBeVisible();
  await expect(page.locator('.workspace-table tbody tr')).toHaveCount(3);
  await page.getByRole('button', { name: 'Validity templates', exact: true }).click();
  await page.getByRole('button', { name: 'Add validity template', exact: true }).click();
  await page.getByRole('dialog').getByLabel('Template name').fill('[TEST] Saved coverage');
  await page
    .getByRole('dialog')
    .getByRole('combobox', { name: 'Valid from', exact: true })
    .fill('2026-01-01');
  await page
    .getByRole('dialog')
    .getByRole('combobox', { name: 'Valid through', exact: true })
    .fill('2031-12-31');
  await page.getByRole('dialog').getByRole('button', { name: 'Save changes', exact: true }).click();
  await expect(page.getByRole('dialog')).toContainText('[TEST] Saved coverage');
  await page.getByRole('dialog').getByRole('button', { name: 'Close', exact: true }).click();
  await page.getByRole('button', { name: 'Add balance', exact: true }).click();
  await page.getByRole('combobox', { name: 'Pet', exact: true }).click();
  await page.getByRole('option').filter({ hasText: '[TEST] Alice pet 0' }).click();
  await page.getByLabel('Days to add or remove').fill('5');
  await page
    .getByRole('combobox', { name: 'Use a validity template (optional)', exact: true })
    .click();
  await page.getByRole('option').filter({ hasText: '[TEST] Saved coverage' }).click();
  await expect(
    page.getByRole('dialog').getByRole('combobox', { name: 'Valid from', exact: true }),
  ).toHaveValue('2026-01-01');
  await expect(
    page.getByRole('dialog').getByRole('combobox', { name: 'Valid through', exact: true }),
  ).toHaveValue('2031-12-31');

  await page.getByRole('combobox', { name: 'Valid from', exact: true }).fill('2026-01-01');
  await page.getByRole('combobox', { name: 'Valid through', exact: true }).fill('2031-12-31');
  await page.getByRole('button', { name: 'Save changes', exact: true }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await page.reload();
  await expect(page.locator('.workspace-table').first()).toContainText('5');
  await page.getByRole('tab', { name: 'Activity', exact: true }).click();
  await expect(page.locator('.workspace-statement')).toContainText('5');
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export CSV', exact: true }).click();
  const csv = await readFile((await (await downloadPromise).path())!, 'utf8');
  expect(csv).toContain('[TEST] Alice pet 0');
  expect(csv).not.toContain('[TEST] Customer 001');

  await page.goto(`/app/calendar/?lang=en&asCustomer=${fixture.cid}`);
  await page.getByRole('button', { name: 'Add booking', exact: true }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByRole('combobox', { name: 'Pet', exact: true }).click();
  await expect(page.getByRole('option')).toHaveCount(3);
  await page.getByRole('option').filter({ hasText: '[TEST] Alice pet 0' }).click();
  const arrival = dialog.getByRole('combobox', { name: 'Arrival', exact: true });
  await arrival.click();
  const picker = page.locator('.custom-date-options');
  const picked = picker.locator('[data-date]:not(.outside-month)').nth(12);
  const pickedDate = (await picked.getAttribute('data-date'))!;
  await picked.click();
  await expect(arrival).toHaveValue(new RegExp('^' + pickedDate + ' \\d{2}:\\d{2}$'));
  await expect(arrival).toHaveAttribute(
    'data-value',
    new RegExp('^' + pickedDate + 'T\\d{2}:\\d{2}$'),
  );
  await expect(picker).toHaveCount(0);
  await expect(arrival).toBeFocused();
  await arrival.click();
  await picker.getByRole('textbox', { name: 'Hour (24h)', exact: true }).fill('10');
  await picker.getByRole('textbox', { name: 'Minute', exact: true }).fill('00');
  await picker.getByRole('button', { name: 'Apply date and time', exact: true }).click();
  await expect(arrival).toHaveValue(pickedDate + ' 10:00');
  await dialog.getByRole('combobox', { name: 'Arrival', exact: true }).fill('2030-11-05T10:00');
  await dialog.getByRole('combobox', { name: 'Pickup', exact: true }).fill('2030-11-07T10:00');
  await dialog.getByRole('button', { name: 'Choose', exact: true }).click();
  await expect(
    dialog
      .locator('.hc-range-room')
      .filter({ has: page.getByText('[TEST] Practice room', { exact: true }) })
      .locator('.hc-time-request'),
  ).toBeVisible();
  await dialog
    .locator('.hc-range-room')
    .filter({ has: page.getByText('[TEST] Practice room', { exact: true }) })
    .locator('.hc-time-request')
    .click();
  await dialog.getByRole('button', { name: 'Review booking', exact: true }).click();
  await expect(dialog).toContainText('[TEST] Practice room');
  await dialog.getByRole('button', { name: 'Save booking', exact: true }).click();
  await expect(dialog).toHaveCount(0);
  await expect(page.locator('.hc-stay')).toHaveCount(1);
  await page.reload();
  await expect(page.locator('.hc-stay')).toHaveCount(1);
  await page.screenshot({ path: '/tmp/saved-calendar-desktop.png', fullPage: true });
  await page
    .getByRole('button', { name: 'View pet details: [TEST] Alice pet 0', exact: true })
    .hover();
  await expect(page.locator('.workspace-pet-popup')).toBeVisible();
  await expect(page.locator('.workspace-pet-popup .workspace-avatar')).toHaveAttribute(
    'data-photo-state',
    'ready',
  );
  await expect(page.locator('.workspace-pet-popup')).toContainText('12.5');
  await expect(page.locator('.workspace-pet-popup')).toContainText('5 days');
  expect((await page.locator('.workspace-pet-popup .workspace-avatar').boundingBox())?.width).toBe(
    112,
  );
  await page.keyboard.press('Escape');
  await expect(page.locator('.workspace-pet-popup')).toHaveCount(0);
  await page
    .getByRole('button', { name: 'View address: [TEST] Practice house', exact: true })
    .click();
  await expect(dialog).toContainText('[TEST] Isolated browser fixture address');
  await dialog.getByRole('button', { name: 'Close', exact: true }).click();

  await page.locator('.hc-stay').click();
  await page.getByRole('button', { name: 'Edit booking', exact: true }).click();
  await expect(dialog.getByRole('combobox', { name: 'Pet', exact: true })).toBeDisabled();
  await dialog.getByRole('combobox', { name: 'Pickup', exact: true }).fill('2030-11-08T10:00');
  await dialog.getByRole('button', { name: 'Choose', exact: true }).click();
  await dialog
    .locator('.hc-range-room')
    .filter({ has: page.getByText('[TEST] Practice room', { exact: true }) })
    .locator('.hc-time-request')
    .click();
  await dialog.getByRole('button', { name: 'Review booking', exact: true }).click();
  await dialog.getByRole('button', { name: 'Save booking', exact: true }).click();
  await expect(dialog).toHaveCount(0);
  await expect(page.locator('.hc-stay')).toHaveCount(1);
  await page.getByRole('button', { name: 'Edit room: [TEST] Practice room', exact: true }).click();
  const roomEditor = page.getByRole('dialog', { name: 'Edit room', exact: true });
  await expect(roomEditor).toBeVisible();
  await roomEditor.getByLabel('Room name').fill('[TEST] Practice room updated');
  await roomEditor.getByRole('button', { name: 'Save room', exact: true }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await page.reload();
  await expect(page.getByText('[TEST] Practice room updated', { exact: true })).toBeVisible();
  await page.goto(`/app/customers/?lang=en&asCustomer=${fixture.cid}`);
  await page.getByRole('button', { name: 'Edit customer', exact: true }).click();
  await dialog.getByLabel('Phone (optional)').fill('555-0100');
  await dialog.getByRole('button', { name: 'Save changes', exact: true }).click();
  await expect(dialog).toHaveCount(0);
  await page.reload();
  await expect(page.locator('.workspace-customer-record')).toContainText('555-0100');
  await page.getByRole('button', { name: 'Edit pet: [TEST] Alice pet 0', exact: true }).click();
  await dialog.getByLabel('Weight (kg)').fill('13');
  await dialog.getByRole('button', { name: 'Save pet', exact: true }).click();
  await expect(dialog).toHaveCount(0);
  await page.reload();
  await expect(page.locator('.pets-section')).toContainText('13');
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`/app/calendar/?lang=zh&asCustomer=${fixture.cid}&date=2030-11-05`);
  await expect(page.locator('.hc-stay')).toHaveCount(1);
  await page.screenshot({ path: '/tmp/saved-calendar-phone.png', fullPage: true });
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
  ).toBeTruthy();
  await page.evaluate(async (jwt) => {
    // @ts-ignore Test-only Vite import.
    const { auth } = await import('/apps/web/src/auth-client.ts');
    await auth.authStateReady();
    // @ts-ignore Test-only Vite dependency import.
    const { GoogleAuthProvider, signInWithCredential, signOut } =
      await import('/tests/helpers/browser-auth.ts');
    await signOut(auth);
    await signInWithCredential(auth, GoogleAuthProvider.credential(jwt));
  }, fixture.owner.jwt);
  await page.goto('/app/balances/?lang=en');
  await expect(page.locator('.workspace-table').first().locator('tbody tr')).toHaveCount(3);
  await page.getByRole('button', { name: 'Menu', exact: true }).click();
  await expect(page.getByRole('link', { name: 'Pets', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Add balance', exact: true })).toHaveCount(0);
  const forbidden = await page.evaluate(async (cid) => {
    // @ts-ignore Test-only Vite module import.
    const { auth } = await import('/apps/web/src/auth-client.ts');
    await auth.authStateReady();
    const token = await auth.currentUser.getIdToken();
    return (
      await fetch('/api/workspace/pets?customerId=' + cid, {
        headers: { Authorization: 'Bearer ' + token },
      })
    ).status;
  }, fixture.hid);
  expect(forbidden).toBe(403);
  expect(serverErrors).toEqual([]);
});

test('actual handoffs and cancellation persist without changing manual credits', async ({
  page,
  request,
}) => {
  test.setTimeout(60000);
  const fixture = await (await request.get('/__test-fixture')).json();
  await page.goto('/app/calendar/?lang=en');
  await page.evaluate(async (jwt) => {
    // @ts-ignore Test-only Vite import.
    const { auth } = await import('/apps/web/src/auth-client.ts');
    await auth.authStateReady();
    // @ts-ignore Test-only Vite dependency.
    const { GoogleAuthProvider, signInWithCredential } =
      await import('/tests/helpers/browser-auth.ts');
    await signInWithCredential(auth, GoogleAuthProvider.credential(jwt));
  }, fixture.administrator.jwt);
  const cat = await page.evaluate(async (fixture) => {
    // @ts-ignore Test-only Vite import.
    const { auth } = await import('/apps/web/src/auth-client.ts');
    await auth.authStateReady();
    const headers = {
      Authorization: 'Bearer ' + (await auth.currentUser.getIdToken()),
      'Content-Type': 'application/json',
    };
    const directory = await (
      await fetch('/api/workspace/pets?customerId=' + fixture.cid, { headers })
    ).json();
    const pet = directory.items.find((row: any) => row.pet.species === 'cat').pet;
    const balanceUrl = `/api/customers/${fixture.cid}/pets/${fixture.pid}/balance`;
    const account = await (await fetch(balanceUrl, { headers })).json();
    if (!account.account) {
      const credit = await fetch(balanceUrl, {
        method: 'PUT',
        headers,
        body: JSON.stringify({
          operationId: crypto.randomUUID(),
          version: 0,
          delta: 5,
          validFrom: '2020-01-01',
          validThrough: '2040-12-31',
          reason: '[TEST] Handoff credit check',
        }),
      });
      if (!credit.ok) throw Error('Cannot prepare manual credits');
    }

    const id = crypto.randomUUID(),
      now = Date.now();
    const response = await fetch('/api/bookings/' + id, {
      method: 'PUT',
      headers,
      body: JSON.stringify({
        operationId: crypto.randomUUID(),
        version: 0,
        customerId: fixture.cid,
        petId: pet.id,
        houseId: fixture.hid,
        roomId: fixture.rid,
        arrival: new Date(now - 2 * 86400000).toISOString(),
        pickup: new Date(now + 2 * 86400000).toISOString(),
      }),
    });
    if (!response.ok) throw Error('Cannot prepare handoff fixture ' + response.status);
    return { id, name: pet.name };
  }, fixture);
  await page.goto(`/app/calendar/bookings/${cat.id}/?lang=en&asCustomer=${fixture.cid}`);
  await page.getByRole('button', { name: 'Record arrival', exact: true }).click();
  const arrival = page.getByRole('dialog', { name: 'Record arrival', exact: true });
  const past = await page.evaluate(async () => {
    // @ts-ignore Test-only Vite import.
    const { zonedValue } = await import('/apps/web/src/wall-time.ts');
    return zonedValue(new Date(Date.now() - 2 * 3600000).toISOString(), 'America/Los_Angeles');
  });
  await arrival.getByRole('combobox', { name: 'Recorded time', exact: true }).fill(past);
  await arrival.getByRole('button', { name: 'Save changes', exact: true }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await page.goto(`/app/calendar/bookings/${cat.id}/?lang=en&asCustomer=${fixture.cid}`);
  await page.getByRole('button', { name: 'Record pickup', exact: true }).click();
  await page
    .getByRole('dialog', { name: 'Record pickup', exact: true })
    .getByRole('button', { name: 'Save changes', exact: true })
    .click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await page.reload();
  const result = await page.evaluate(
    async (fixture) => {
      // @ts-ignore Test-only Vite import.
      const { auth } = await import('/apps/web/src/auth-client.ts');
      await auth.authStateReady();
      const headers = { Authorization: 'Bearer ' + (await auth.currentUser.getIdToken()) };
      return {
        booking: await (await fetch('/api/bookings/' + fixture.id, { headers })).json(),
        account: await (
          await fetch(`/api/customers/${fixture.cid}/pets/${fixture.pid}/balance`, { headers })
        ).json(),
      };
    },
    { ...fixture, id: cat.id },
  );
  expect(result.booking.status).toBe('completed');
  expect(result.booking.actualArrival).toBeTruthy();
  expect(result.booking.actualPickup).toBeTruthy();
  expect(result.account.account.days).toBe(5);
  const planId = await page.evaluate(async (fixture) => {
    // @ts-ignore Test-only Vite import.
    const { auth } = await import('/apps/web/src/auth-client.ts');
    await auth.authStateReady();
    const headers = {
      Authorization: 'Bearer ' + (await auth.currentUser.getIdToken()),
      'Content-Type': 'application/json',
    };
    const rows = await (
      await fetch('/api/workspace/pets?customerId=' + fixture.cid, { headers })
    ).json();
    const pet = rows.items.find((row: any) => row.pet.species === 'rabbit').pet,
      id = crypto.randomUUID(),
      now = Date.now();
    const response = await fetch('/api/bookings/' + id, {
      method: 'PUT',
      headers,
      body: JSON.stringify({
        operationId: crypto.randomUUID(),
        version: 0,
        customerId: fixture.cid,
        petId: pet.id,
        houseId: fixture.hid,
        roomId: fixture.rid,
        arrival: new Date(now + 3 * 86400000).toISOString(),
        pickup: new Date(now + 5 * 86400000).toISOString(),
      }),
    });
    if (!response.ok) throw Error('Cannot prepare cancellation fixture ' + response.status);
    return id;
  }, fixture);
  await page.goto(`/app/calendar/bookings/${planId}/?lang=en&asCustomer=${fixture.cid}`);
  await page.getByRole('button', { name: 'Cancel booking', exact: true }).click();
  await page
    .getByRole('dialog', { name: 'Cancel booking', exact: true })
    .getByRole('button', { name: 'Save changes', exact: true })
    .click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await page.reload();
  const cancelled = await page.evaluate(async (id) => {
    // @ts-ignore Test-only Vite import.
    const { auth } = await import('/apps/web/src/auth-client.ts');
    await auth.authStateReady();
    return (
      await fetch('/api/bookings/' + id, {
        headers: { Authorization: 'Bearer ' + (await auth.currentUser.getIdToken()) },
      })
    ).json();
  }, planId);
  expect(cancelled.status).toBe('cancelled');
});
