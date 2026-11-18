import { chooseOption } from './dropdown-helpers';
import { test, expect } from '@playwright/test';
test('public pages have direct paths, distinct content and working history', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  for (const [path, title] of [
    ['/home/', 'Little paws. A whole lot of love.'],
    ['/services/', 'Services'],
    ['/about/', 'About us'],
    ['/faqs/', 'FAQs'],
    ['/cancellation-policy/', 'Cancellation policy'],
  ]) {
    await page.goto(path);
    await expect(page.getByRole('heading', { name: title, level: 1, exact: true })).toBeVisible();
    await expect(page).toHaveTitle(new RegExp(path === '/home/' ? 'Home' : title));
    await page.reload();
    await expect(page).toHaveURL(new RegExp(path + '$'));
  }
  await page
    .getByRole('navigation', { name: 'Main navigation' })
    .getByRole('link', { name: 'Services', exact: true })
    .click();
  await expect(page).toHaveURL(/\/services\/$/);
  await page.goBack();
  await expect(page.getByRole('heading', { name: 'Cancellation policy', level: 1 })).toBeVisible();
  await page.goForward();
  await expect(page.locator('#services')).toBeInViewport();
  await page.goto('/#faq');
  await expect(page).toHaveURL(/\/home\/#faq$/);
  await expect(page.locator('#faq')).toBeInViewport();
  await page.goto('/#/house-calendar');
  await expect(page).toHaveURL(/\/app\/calendar\/$/);
  await expect(page.getByRole('heading', { name: 'House calendar', level: 1 })).toBeVisible();
  await page.getByRole('button', { name: /^Mochi: Checked in/ }).click();
  await expect(page).toHaveURL(/\/app\/calendar\/bookings\/sample-0\/$/);
  await expect(page.getByRole('dialog', { name: 'Mochi', exact: true })).toBeVisible();
  await page.goBack();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await page.goForward();
  await expect(page.getByRole('dialog', { name: 'Mochi', exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByRole('dialog', { name: 'Mochi', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Close', exact: true }).click();
  await expect(page).toHaveURL(/\/app\/calendar\/$/);
  await page.goto('/app/calendar/bookings/missing/');
  await expect(page.getByRole('alert')).toHaveText('Booking not found.');
  await page.goto('/app/unknown/');
  await expect(page.getByRole('heading', { name: 'Page not found', level: 1 })).toBeVisible();
  expect(errors).toEqual([]);
});
test('balance and calendar filters can be refreshed and shared', async ({ page }) => {
  await page.goto('/app/balances/?customer=2&pet=Coco&from=2026-01-01&activity=added');
  await expect(page.getByLabel('Statement pet', { exact: true })).toHaveAttribute(
    'data-value',
    'Coco',
  );
  await expect(page.getByLabel('Statement customer', { exact: true })).toHaveAttribute(
    'data-value',
    '2',
  );
  await expect(page.getByLabel('Statement activity', { exact: true })).toHaveAttribute(
    'data-value',
    'added',
  );
  await chooseOption(page.getByLabel('Statement pet', { exact: true }), 'Pip');
  await expect(page).toHaveURL(/pet=Pip/);
  await page.reload();
  await expect(page.getByLabel('Statement pet', { exact: true })).toHaveAttribute(
    'data-value',
    'Pip',
  );
  await page.goto('/app/calendar/?date=2026-11-16&view=day&house=1');
  await expect(page.getByRole('tab', { name: 'Day', exact: true })).toHaveAttribute(
    'aria-selected',
    'true',
  );
  await expect(page.getByLabel('House', { exact: true })).toHaveAttribute('data-value', '1');
  await page.getByRole('tab', { name: 'Month', exact: true }).click();
  await expect(page).toHaveURL(/view=month/);
  await page.reload();
  await expect(page.getByRole('tab', { name: 'Month', exact: true })).toHaveAttribute(
    'aria-selected',
    'true',
  );
});
test('sign-in returns to canonical records and locations support direct refresh', async ({
  page,
  request,
}) => {
  const email = `routes-${Date.now()}@example.test`;
  const customerId = '10000000-0000-4000-8000-000000000061';
  const petId = '10000000-0000-4000-8000-000000000062';
  const houseId = '10000000-0000-4000-8000-000000000063';
  const created = await request.post(
    'http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/accounts:signUp?key=demo-key',
    { data: { email, password: 'emulator-only-password', returnSecureToken: true } },
  );
  const { localId } = await created.json();
  await request.post(
    'http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/projects/demo-niu-niu/accounts:update',
    {
      headers: { Authorization: 'Bearer owner' },
      data: { localId, emailVerified: true, customAttributes: JSON.stringify({ admin: true }) },
    },
  );
  await page.route('**/api/profile', (r) => r.fulfill({ status: 204 }));
  await page.route('**/api/customers?*', (r) =>
    r.fulfill({
      json: {
        items: [
          {
            id: customerId,
            name: '[TEST] Route owner',
            language: 'en',
            email: '',
            phone: '',
            version: 1,
          },
        ],
        nextCursor: null,
      },
    }),
  );
  await page.route('**/api/customers/*/pets', (r) =>
    r.fulfill({
      json: {
        items: [{ id: petId, customerId, name: '[TEST] Route pet', photo: null, version: 1 }],
        nextCursor: null,
      },
    }),
  );
  await page.route('**/api/houses', (r) =>
    r.fulfill({
      json: {
        items: [
          {
            id: houseId,
            name: '[TEST] Route house',
            address: '',
            timezone: 'America/Los_Angeles',
            version: 1,
          },
        ],
      },
    }),
  );
  const destination = '/app/customers/' + customerId + '/pets/' + petId + '/';
  await page.goto('/app/sign-in/?returnTo=' + encodeURIComponent(destination));
  await expect(page.getByRole('button', { name: 'Continue with Google' })).toBeVisible();
  await page.evaluate(
    async ({ email }) => {
      const { auth } = await import('/apps/web/src/auth-client.ts');
      const { signInWithEmailAndPassword } =
        await import('/node_modules/.vite/deps/firebase_auth.js');
      await signInWithEmailAndPassword(auth, email, 'emulator-only-password');
    },
    { email },
  );
  await expect(page).toHaveURL(new RegExp(destination + '$'));
  await expect(page.locator('.pet-card-selected')).toContainText('[TEST] Route pet');
  await page.reload();
  await expect(page.locator('.pet-card-selected')).toContainText('[TEST] Route pet');
  await page.goto('/app/customers/' + customerId + '/pets/missing/');
  await expect(page.getByRole('alert')).toHaveText('Pet not found.');
  await page.goto('/app/settings/locations/' + houseId + '/');
  await expect(page.getByRole('combobox', { name: 'Show house', exact: true })).toHaveAttribute(
    'data-value',
    houseId,
  );
  await page.reload();
  await expect(
    page.getByRole('heading', { name: '[TEST] Route house', exact: true }),
  ).toBeVisible();
  await page.goto('/app/settings/locations/missing/');
  await expect(page.getByRole('alert')).toHaveText('Location not found.');
});
