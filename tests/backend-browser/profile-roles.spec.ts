import { test, expect } from '@playwright/test';

for (const language of ['en', 'zh']) {
  test(`profile shows actual account roles in ${language} during customer context`, async ({
    page,
    request,
  }) => {
    const fixture = await (await request.get('/__test-fixture')).json();
    await page.goto(`/app/account/profile/?lang=${language}&asCustomer=${fixture.cid}`);
    await page.evaluate(async (jwt) => {
      // @ts-ignore Local test-only module.
      const { auth } = await import('/apps/web/src/auth-client.ts');
      // @ts-ignore Local test-only dependency.
      const { GoogleAuthProvider, signInWithCredential } =
        await import('/node_modules/.vite/deps/firebase_auth.js');
      await signInWithCredential(auth, GoogleAuthProvider.credential(jwt));
    }, fixture.administrator.jwt);
    const roles = page.getByLabel(
      language === 'en' ? 'Signed-in account roles' : '当前登录账号的角色',
      { exact: true },
    );
    await expect(roles).toBeVisible();
    await expect(roles.getByRole('listitem')).toHaveText(
      language === 'en' ? ['Admin', 'Employee', 'Customer'] : ['管理员', '员工', '客户'],
    );
    await expect(roles.getByRole('combobox')).toHaveCount(0);
    await page.setViewportSize({ width: 390, height: 844 });
    await expect(roles).toBeInViewport();
    expect(
      await roles.evaluate((element) => element.scrollWidth <= element.clientWidth),
    ).toBeTruthy();
    await page.screenshot({
      path: `test-results-backend/profile-roles-${language}.png`,
      fullPage: true,
    });
  });
}

test('customer roles never expose administrator permissions and verification failure never guesses roles', async ({
  page,
  request,
}) => {
  const fixture = await (await request.get('/__test-fixture')).json();
  await page.goto('/app/account/profile/?lang=en');
  await page.evaluate(async (jwt) => {
    // @ts-ignore Local test-only module.
    const { auth } = await import('/apps/web/src/auth-client.ts');
    // @ts-ignore Local test-only dependency.
    const { GoogleAuthProvider, signInWithCredential } =
      await import('/node_modules/.vite/deps/firebase_auth.js');
    await signInWithCredential(auth, GoogleAuthProvider.credential(jwt));
  }, fixture.owner.jwt);
  await expect(
    page.getByLabel('Signed-in account roles', { exact: true }).getByRole('listitem'),
  ).toHaveText(['Customer']);
  const denied = await page.evaluate(async () => {
    // @ts-ignore Local test-only module.
    const { auth } = await import('/apps/web/src/auth-client.ts');
    return (
      await fetch('/api/customers', {
        headers: { Authorization: 'Bearer ' + (await auth.currentUser!.getIdToken()) },
      })
    ).status;
  });
  expect(denied).toBe(403);
  await page.route('**/api/identity', (route) =>
    route.fulfill({ status: 503, json: { code: 'unavailable' } }),
  );
  await page.reload();
  await expect(
    page.getByText('Account roles could not be verified. Reload the page to try again.', {
      exact: true,
    }),
  ).toBeVisible();
  await expect(page.getByLabel('Signed-in account roles', { exact: true })).toHaveCount(0);
  await expect(page.getByRole('textbox', { name: 'Your name', exact: true })).toBeEnabled();
});
