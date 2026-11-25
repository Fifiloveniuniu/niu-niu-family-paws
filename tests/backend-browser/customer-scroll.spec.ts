import { test, expect } from '@playwright/test';
test('explicit loading ignores a late batch after search and does not duplicate in-flight requests', async ({
  page,
  request,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
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
  await expect(rows).toHaveCount(25);
  let release!: () => void;
  const held = new Promise<void>((resolve) => {
    release = resolve;
  });
  let entered!: () => void;
  const started = new Promise<void>((resolve) => {
    entered = resolve;
  });
  let batches = 0;
  await page.route(
    (url) => url.pathname === '/api/customers' && url.searchParams.has('cursor'),
    async (route) => {
      batches++;
      entered();
      await held;
      await route.continue();
    },
  );
  const scroller = page.locator('.customer-list-scroll');
  await scroller.evaluate((node) => {
    node.scrollTop = node.scrollHeight;
  });
  const more = page.getByRole('button', { name: 'Load more customers', exact: true });
  await more.click();
  await started;
  await expect(more).toHaveAttribute('aria-disabled', 'true');
  await more.dispatchEvent('click');
  await scroller.evaluate((node) => {
    node.dispatchEvent(new Event('scroll'));
    node.dispatchEvent(new Event('scroll'));
  });
  await expect(rows).toHaveCount(25);
  const search = page.locator('#customer-search');
  await search.fill('[TEST] Customer 09');
  await expect(rows).toHaveCount(10);
  const completed = page.waitForResponse(
    (response) =>
      new URL(response.url()).searchParams.has('cursor') &&
      new URL(response.url()).pathname === '/api/customers',
  );
  release();
  await completed;
  await page.evaluate(
    () => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))),
  );
  await expect(rows).toHaveCount(10);
  expect(
    (await rows.locator('.customer-name').allTextContents()).every((name) =>
      name.startsWith('[TEST] Customer 09'),
    ),
  ).toBe(true);
  expect(batches).toBe(1);
  const bounds = await page.locator('.customer-directory-panel').boundingBox();
  expect(Math.abs(bounds!.y + bounds!.height - 884)).toBeLessThan(2);
});
