import { test, expect } from '@playwright/test';
import { createHash } from 'node:crypto';
const uuid = (label: string) => {
  const h = createHash('sha256').update(label).digest('hex');
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-4${h.slice(13, 16)}-a${h.slice(17, 20)}-${h.slice(20, 32)}`;
};
test('calendar uses authenticated profile photos consistently and clears them on access loss', async ({
  page,
  request,
}) => {
  const email = `calendar-photos-${Date.now()}@example.test`;
  const created = await request.post(
    'http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/accounts:signUp?key=demo-key',
    { data: { email, password: 'emulator-only-password', returnSecureToken: true } },
  );
  const { localId } = await created.json();
  const claims = async (admin: boolean) =>
    request.post(
      'http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/projects/demo-niu-niu/accounts:update',
      {
        headers: { Authorization: 'Bearer owner' },
        data: {
          localId,
          emailVerified: true,
          customAttributes: JSON.stringify(admin ? { admin: true } : {}),
        },
      },
    );
  await claims(true);
  let photoReads = 0;
  let profileReads = 0;
  let anonymous = 0;
  let failPhoto = true;
  await page.route('**/api/customers/*/pets', async (route) => {
    profileReads++;
    if (!route.request().headers().authorization) anonymous++;
    const customerId = route.request().url().split('/').at(-2);
    const family = Array.from({ length: 6 }, (_, i) => i).find(
      (i) => uuid('local-photo-customer-' + i) === customerId,
    );
    if (family === undefined) return route.fulfill({ status: 404 });
    return route.fulfill({
      json: {
        items: ['dog', 'cat', 'rabbit'].map((species) => ({
          id: uuid(`local-photo-${species}-${family}`),
          customerId,
          name: `[TEST] ${species} ${family}`,
          photo: family === 1 && species === 'dog' ? null : 'a'.repeat(64),
          version: 1,
          createdAt: '2026-11-15',
          updatedAt: '2026-11-15',
          photoCredit: {
            creator: '[TEST] Creator',
            sourcePage: 'https://example.test/source',
            license: 'Test image',
            licenseUrl: 'https://example.test/license',
          },
        })),
        nextCursor: null,
      },
    });
  });
  await page.route('**/api/customers/*/pets/*/photo', (route) => {
    photoReads++;
    if (!route.request().headers().authorization) anonymous++;
    if (failPhoto && route.request().url().includes(uuid('local-photo-cat-1')))
      return route.fulfill({ status: 503 });
    return route.fulfill({
      contentType: 'image/png',
      body: Buffer.from(
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jVioAAAAASUVORK5CYII=',
        'base64',
      ),
    });
  });
  await page.goto('/app/calendar/');
  await expect(page.locator('.hc-avatar')).toHaveCount(9);
  expect(photoReads).toBe(0);
  expect(profileReads).toBe(0);
  await expect(
    page.getByRole('button', { name: 'Sign in for pet photos', exact: true }),
  ).toBeVisible();
  await page.getByRole('button', { name: /^Mochi: Checked in/ }).click();
  await page.getByRole('button', { name: 'View pet balance', exact: true }).click();
  await page.getByLabel('Balance customer', { exact: true }).selectOption('all');
  await page.getByRole('button', { name: 'Add balance', exact: true }).click();
  await page.getByLabel('Days', { exact: true }).fill('7');
  await page.getByLabel('Reason', { exact: true }).fill('[TEST] retained photo access draft');
  await expect(
    page.getByRole('dialog').getByRole('button', { name: 'Sign in for pet photos', exact: true }),
  ).toBeVisible();
  await page.evaluate(
    async ({ email }) => {
      const { auth } = await import('/apps/web/src/auth-client.ts');
      const { signInWithEmailAndPassword } =
        await import('/node_modules/.vite/deps/firebase_auth.js');
      await signInWithEmailAndPassword(auth, email, 'emulator-only-password');
    },
    { email },
  );
  await expect(
    page.getByRole('dialog').getByAltText('Mochi profile photo', { exact: true }),
  ).toBeVisible();
  await expect(page.getByLabel('Days', { exact: true })).toHaveValue('7');
  await expect(page.getByLabel('Reason', { exact: true })).toHaveValue(
    '[TEST] retained photo access draft',
  );
  page.once('dialog', async (d) => {
    await d.accept();
  });
  await page.getByRole('button', { name: 'Cancel', exact: true }).click();
  await page.getByRole('button', { name: 'Close', exact: true }).click();
  const main = page
    .locator('.hc-pet')
    .filter({ has: page.getByRole('button', { name: 'Remove placement: Mochi', exact: true }) })
    .getByAltText('Mochi profile photo', { exact: true });
  await expect(main).toBeVisible();
  await expect(main).toHaveJSProperty('naturalWidth', 1);
  const source = await main.getAttribute('src');
  await expect(
    page
      .locator('.hc-pet')
      .filter({ has: page.getByRole('button', { name: 'Remove placement: Biscuit', exact: true }) })
      .locator('.hc-profile-photo'),
  ).toHaveAttribute('data-photo-state', 'missing');
  await expect(
    page
      .locator('.hc-pet')
      .filter({ has: page.getByRole('button', { name: 'Remove placement: Coco', exact: true }) })
      .locator('.hc-profile-photo'),
  ).toHaveAttribute('data-photo-state', 'failed');
  await page.getByText('Sample profile photos & credits', { exact: true }).click();
  await expect(page.locator('.hc-photo-credits a').first()).toHaveAttribute(
    'href',
    'https://example.test/source',
  );
  await page.getByRole('button', { name: /^Mochi: Checked in/ }).click();
  await page.getByRole('button', { name: 'View pet balance', exact: true }).click();
  await page.getByLabel('Balance customer', { exact: true }).selectOption('all');
  const balancePhoto = page
    .getByRole('dialog')
    .getByAltText('Mochi profile photo', { exact: true });
  await expect(balancePhoto).toBeVisible();
  await expect(balancePhoto).toHaveAttribute('src', source!);
  expect(anonymous).toBe(0);
  expect(profileReads).toBe(6);
  expect(photoReads).toBe(11);
  await page.getByRole('button', { name: 'Close', exact: true }).click();
  failPhoto = false;
  await page.getByRole('button', { name: 'Retry profile photos', exact: true }).click();
  await expect(page.getByAltText('Coco profile photo', { exact: true })).toBeVisible();
  const canonicalCustomer = uuid('local-photo-customer-0');
  const canonicalPet = uuid('local-photo-dog-0');
  await page.route('**/api/pet-search?*', (r) =>
    r.fulfill({
      json: {
        items: [
          {
            customer: { id: canonicalCustomer, name: '[TEST] Canonical family', loginEmail: email },
            pet: {
              id: canonicalPet,
              customerId: canonicalCustomer,
              name: '[TEST] dog 0',
              photo: null,
              version: 1,
            },
          },
        ],
        nextCursor: null,
      },
    }),
  );
  await page.route('**/api/customers?*', (r) =>
    r.fulfill({
      json: {
        items: [
          {
            id: canonicalCustomer,
            name: '[TEST] Canonical family',
            loginEmail: email,
            email: '',
            phone: '',
            language: 'en',
            version: 1,
          },
        ],
        nextCursor: null,
      },
    }),
  );
  await page.getByRole('button', { name: /^Mochi: Checked in/ }).click();
  await page
    .getByRole('dialog')
    .getByRole('link', { name: 'View pet profile', exact: true })
    .click();
  await expect(
    page
      .getByRole('region', { name: 'Selected customer pets', exact: true })
      .getByRole('heading', { name: '[TEST] Canonical family', exact: true }),
  ).toBeVisible();
  await expect(page.locator('.pet-card-selected')).toContainText('[TEST] dog 0');
  await page
    .locator('.pet-card-selected')
    .getByRole('link', { name: 'View balance preview', exact: true })
    .click();
  await expect(page.getByLabel('Statement pet', { exact: true })).toHaveValue('Mochi');
  await page
    .getByRole('navigation', { name: 'Workspace' })
    .getByRole('link', { name: 'Calendar', exact: true })
    .click();
  await claims(false);
  await page.evaluate(() => document.dispatchEvent(new Event('visibilitychange')));
  await expect(page.locator('.hc-profile-photo img')).toHaveCount(0);
  await expect(page.locator('.hc-photo-credits')).toHaveCount(0);
  await expect(page).toHaveURL(/\/app\/account\/profile\/$/);
  await expect(page.locator('.customer-directory-panel')).toHaveCount(0);
});
