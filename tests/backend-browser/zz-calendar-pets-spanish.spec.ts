import { readFile } from 'node:fs/promises';
import { test, expect } from '@playwright/test';
test.use({ timezoneId: 'America/Los_Angeles' });
for (const [language, width] of [
  ['en', 1280],
  ['zh', 390],
  ['es', 390],
  ['es', 1280],
] as const) {
  test(`calendar booking, pet modal and Spanish support (${language}, ${width})`, async ({
    page,
    request,
  }, testInfo) => {
    test.setTimeout(90000);
    const messages = JSON.parse(
      await readFile(
        new URL(`../../apps/web/src/locales/${language}.json`, import.meta.url),
        'utf8',
      ),
    );
    const t = (key: string) => messages['ui.workspace.' + key];
    const fixture = await (await request.get('/__test-fixture')).json();
    await page.setViewportSize({ width, height: 900 });
    await page.goto(`/app/calendar/?lang=${language}&asCustomer=${fixture.cid}&date=2034-07-10`);
    await page.evaluate(async (jwt) => {
      // @ts-ignore Test-only Vite module.
      const { auth } = await import('/apps/web/src/auth-client.ts');
      // @ts-ignore Test-only dependency.
      const { GoogleAuthProvider, signInWithCredential } =
        await import('/tests/helpers/browser-auth.ts');
      await signInWithCredential(auth, GoogleAuthProvider.credential(jwt));
    }, fixture.administrator.jwt);
    await expect(page.locator('.saved-workspace')).toBeVisible();
    await expect(page.locator('html')).toHaveAttribute(
      'lang',
      language === 'zh' ? 'zh-Hans' : language,
    );
    // Mock only presentation availability to cover many rooms and unavailable choices without changing saved capacity.
    await page.route('**/api/availability', async (route) => {
      const response = await route.fetch(),
        data = await response.json();
      const room = data.rooms.find((r: any) => r.roomId === fixture.rid);
      if (room) {
        room.available = true;
        room.issue = null;
        data.rooms = [
          room,
          ...Array.from({ length: 12 }, (_, i) => ({
            ...room,
            roomId: 'unavailable-' + i,
            roomName: '[TEST] Unavailable ' + i,
            available: false,
            issue: 'capacity',
            blocked: [{ from: data.from, through: data.through, issue: 'capacity' }],
          })),
        ];
      }
      await route.fulfill({ response, json: data });
    });
    await page.route('**/api/public/pricing', async (route) => {
      const response = await route.fetch();
      const data = await response.json();
      data.holidays = ['2034-07-11'];
      await route.fulfill({ response, json: data });
    });
    await page.getByRole('button', { name: t('addBooking'), exact: true }).click();
    const dialog = page.locator('dialog.hc-booking-dialog');
    await dialog.getByRole('combobox', { name: t('pet'), exact: true }).click();
    await page.getByRole('option').filter({ hasText: '[TEST] Alice pet 0' }).click();
    await dialog
      .getByRole('combobox', { name: t('arrival'), exact: true })
      .fill('2034-07-10T10:00');
    await dialog.getByRole('combobox', { name: t('pickup'), exact: true }).fill('2034-07-12T10:00');
    await dialog.getByRole('button', { name: t('choose'), exact: true }).click();
    await expect(dialog.locator('.hc-range-room')).toHaveCount(13);
    await expect(dialog.locator('.booking-calendar-legend li')).toHaveCount(2);
    await expect(dialog.locator('.hc-time-available')).toHaveCount(0);
    await expect(
      dialog.locator('.hc-range-room:has-text("[TEST] Unavailable") .hc-time-request'),
    ).toHaveCount(0);
    await expect(
      dialog.locator('.hc-range-room:has-text("[TEST] Unavailable") .booking-room-choice'),
    ).toHaveCount(0);
    await expect(dialog.locator('.calendar-holiday').first()).toBeVisible();
    const viewport = dialog.locator('.calendar-timeline-viewport');
    await viewport.evaluate((node) => {
      node.scrollTop = 250;
      node.scrollLeft = 130;
    });
    const axis = await dialog.locator('.calendar-timeline-axis').boundingBox(),
      box = await viewport.boundingBox();
    expect(Math.abs(axis!.y - box!.y)).toBeLessThan(2);
    await viewport.evaluate((node) => {
      node.scrollTop = 0;
      node.scrollLeft = 0;
    });
    await dialog.getByRole('tab', { name: t('month'), exact: true }).click();
    await expect(dialog.locator('.calendar-timeline-tick')).toHaveCount(31);
    await dialog.getByRole('tab', { name: t('week'), exact: true }).click();
    await expect(dialog.locator('.calendar-timeline-tick')).toHaveCount(14);
    await dialog.locator('.booking-room-choice').first().click();
    await dialog.getByRole('button', { name: t('reviewBooking'), exact: true }).click();
    await expect(dialog.locator('.booking-cost')).toContainText(messages['ui.bookingCost.normal']);
    await expect(dialog.locator('.booking-cost')).toContainText(
      messages['ui.bookingCost.holidays'],
    );
    await expect(dialog.locator('.booking-cost')).toContainText('20%');
    await expect(dialog.locator('.booking-cost')).not.toContainText('NaN');
    await page.screenshot({ path: testInfo.outputPath('booking-review.png') });
    page.once('dialog', (d) => d.accept());
    await page.keyboard.press('Escape');
    await page.goto(`/app/customers/${fixture.cid}/?lang=${language}`);
    const card = page.locator('.pet-card').filter({ hasText: '[TEST] Alice pet 0' }).first();
    await expect(card.locator('.pet-type-icon')).toBeVisible();
    const adminSize = await card.locator('.pet-photo').boundingBox();
    const weight = (await card.locator('p').first().innerText()).match(/\d+(?:[.,]\d+)?/)![0];
    await card.getByRole('link', { name: '[TEST] Alice pet 0', exact: true }).click();
    const pet = page.locator('dialog.pet-details-dialog');
    await expect(pet).toBeVisible();
    await expect(pet).toContainText(weight);
    await pet.getByRole('tab', { name: t('bookings'), exact: true }).click();
    await expect(pet.getByRole('navigation')).toBeVisible();
    await pet.getByRole('tab', { name: t('balance'), exact: true }).click();
    await expect(pet.locator('.workspace-details')).toBeVisible();
    await pet.getByRole('tab', { name: t('activity'), exact: true }).click();
    await expect(pet.getByRole('navigation')).toBeVisible();
    await page.screenshot({ path: testInfo.outputPath('pet-activity.png') });
    await page.keyboard.press('Escape');
    await page.goto(`/app/customers/?lang=${language}&asCustomer=${fixture.cid}`);
    const customerCard = page
      .locator('.pet-card')
      .filter({ hasText: '[TEST] Alice pet 0' })
      .first();
    await expect(customerCard).toBeVisible();
    const customerSize = await customerCard.locator('.pet-photo').boundingBox();
    expect(customerSize!.width).toBe(adminSize!.width);
    expect(customerSize!.height).toBe(adminSize!.height);
    await page.goto(`/pricing/?lang=${language}`);
    await expect(page.locator('.public-source-prices table').first()).toBeVisible();
    if (language === 'es')
      await expect(page.locator('.public-source-prices')).toContainText('libras');
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
    ).toBeTruthy();
    await page.screenshot({ path: testInfo.outputPath('public-pricing.png'), fullPage: true });
  });
}
test('Now advances without navigation and customer Busy responses expose room spans only', async ({
  page,
  request,
}) => {
  const fixture = await (await request.get('/__test-fixture')).json();
  await page.clock.install({ time: new Date('2026-11-20T18:00:00.000Z') });
  await page.goto(`/app/calendar/?lang=en&asCustomer=${fixture.cid}&date=2026-11-20&view=day`);
  await page.evaluate(async (jwt) => {
    // @ts-ignore Test module.
    const { auth } = await import('/apps/web/src/auth-client.ts');
    // @ts-ignore Test module.
    const { GoogleAuthProvider, signInWithCredential } =
      await import('/tests/helpers/browser-auth.ts');
    await signInWithCredential(auth, GoogleAuthProvider.credential(jwt));
  }, fixture.administrator.jwt);
  const marker = page.locator('.workspace-now-marker time');
  await expect(marker).toBeVisible();
  const original = await marker.getAttribute('datetime');
  await page.clock.runFor(61000);
  await expect(marker).not.toHaveAttribute('datetime', original!);
  const result = await page.evaluate(async (f) => {
    // @ts-ignore Test module.
    const { auth } = await import('/apps/web/src/auth-client.ts');
    const token = await auth.currentUser.getIdToken();
    const headers = { Authorization: 'Bearer ' + token };
    const response = await fetch(
      `/api/workspace/busy?customerId=${f.cid}&from=2026-01-01T00:00:00.000Z&through=2027-01-01T00:00:00.000Z`,
      { headers },
    );
    return { status: response.status, body: await response.json() };
  }, fixture);
  expect(result.status).toBe(200);
  expect(JSON.stringify(result.body)).not.toMatch(/customerId|petId|name|actor|billing/);
});

test('customer view shows Busy without personal details, and saved/cancelled bookings appear newest first', async ({
  page,
  request,
}, testInfo) => {
  test.setTimeout(60000);
  const fixture = await (await request.get('/__test-fixture')).json();
  await page.goto(`/app/calendar/?lang=en&asCustomer=${fixture.cid}&date=2038-01-02`);
  const seeded = await page.evaluate(async (f) => {
    // @ts-ignore Test module.
    const { auth } = await import('/apps/web/src/auth-client.ts');
    // @ts-ignore Test module.
    const { GoogleAuthProvider, signInWithCredential } =
      await import('/tests/helpers/browser-auth.ts');
    await signInWithCredential(auth, GoogleAuthProvider.credential(f.administrator.jwt));
    const headers = {
      Authorization: 'Bearer ' + (await auth.currentUser.getIdToken()),
      'Content-Type': 'application/json',
    };
    const put = async (path: string, body: any) => {
      const response = await fetch('/api' + path, {
        method: 'PUT',
        headers,
        body: JSON.stringify(body),
      });
      if (!response.ok) throw Error(path + ': ' + response.status + ' ' + (await response.text()));
      return response.json();
    };
    const customerId = crypto.randomUUID(),
      petId = crypto.randomUUID(),
      houseId = crypto.randomUUID(),
      roomId = crypto.randomUUID();
    await put('/customers/' + customerId, {
      name: '[TEST] Private busy customer',
      email: '',
      phone: '',
      language: 'es',
      version: 0,
    });
    await put(`/customers/${customerId}/pets/${petId}`, {
      name: '[TEST] Private busy pet',
      species: 'dog',
      weightKg: 2,
      version: 0,
    });
    await put('/houses/' + houseId, {
      name: '[TEST] Busy house',
      address: '[TEST] Fictional regression address',
      timezone: 'America/Los_Angeles',
      version: 0,
    });
    await put(`/houses/${houseId}/rooms/${roomId}`, {
      name: '[TEST] Busy room',
      capacity: 2,
      costs: { dog: 1 },
      version: 0,
    });
    const times = { arrival: '2038-01-02T18:00:00.000Z', pickup: '2038-01-03T18:00:00.000Z' };
    await put('/bookings/' + crypto.randomUUID(), {
      customerId,
      petId,
      houseId,
      roomId,
      ...times,
      operationId: crypto.randomUUID(),
      version: 0,
    });
    const own = await put('/bookings/' + crypto.randomUUID(), {
      customerId: f.cid,
      petId: f.pid,
      houseId,
      roomId,
      ...times,
      operationId: crypto.randomUUID(),
      version: 0,
    });
    return { houseId, roomId, bookingId: own.id };
  }, fixture);
  await page.reload();
  const busy = page.locator('.saved-busy-room').filter({ hasText: 'Busy' });
  await expect(busy).toBeVisible();
  await expect(busy.locator('.hc-stay')).toHaveText('Busy');
  await expect(page.locator('.saved-calendar-grid')).not.toContainText('Private busy customer');
  await expect(page.locator('.saved-calendar-grid')).not.toContainText('Private busy pet');
  await page.screenshot({ path: testInfo.outputPath('customer-busy.png'), fullPage: true });
  await page.getByRole('button', { name: /^\[TEST\] Alice pet 0 ·/ }).click();
  await page
    .getByRole('dialog')
    .getByRole('button', { name: 'Cancel booking', exact: true })
    .click();
  await page.getByRole('dialog').getByRole('button', { name: 'Save changes', exact: true }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await page.goto(
    `/app/balances/?lang=en&asCustomer=${fixture.cid}&panel=activity&pet=${encodeURIComponent(fixture.cid + '/' + fixture.pid)}`,
  );
  const rows = page.locator('#activity-panel tbody tr');
  await expect(rows.first()).toContainText('Cancelled');
  await expect(rows.nth(1)).toContainText('Booking');
  await expect(rows.first().locator('.activity-running-balance')).toHaveCount(0);
  await expect(rows.first()).not.toContainText('Staff plan');
  await page.screenshot({
    path: testInfo.outputPath('booking-cancel-activity.png'),
    fullPage: true,
  });
});
