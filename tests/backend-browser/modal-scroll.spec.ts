import { test, expect } from '@playwright/test';
for (const width of [390, 1280])
  test(`modal owns wheel scrolling and restores the background scrollbar (${width})`, async ({
    page,
    request,
  }) => {
    await page.setViewportSize({ width, height: 700 });
    const fixture = await (await request.get('/__test-fixture')).json();
    await page.goto('/app/balances/?lang=en');
    await page.evaluate(async (jwt) => {
      // @ts-ignore Test module.
      const { auth } = await import('/apps/web/src/auth-client.ts');
      // @ts-ignore Test module.
      const { GoogleAuthProvider, signInWithCredential } =
        await import('/tests/helpers/browser-auth.ts');
      await signInWithCredential(auth, GoogleAuthProvider.credential(jwt));
    }, fixture.administrator.jwt);
    await expect(page.locator('#balances-panel .workspace-table tbody tr')).toHaveCount(25);
    await page.getByRole('button', { name: 'Add balance', exact: true }).click();
    const dialog = page.getByRole('dialog', { name: 'Add balance', exact: true });
    await expect(dialog).toBeVisible();
    const original = await page.evaluate(() => ({
      background: window.scrollY,
      body: document.body.scrollTop,
    }));
    await expect(page.locator('html')).toHaveCSS('overflow-y', 'hidden');
    const box = await dialog.boundingBox();
    await page.mouse.move(box!.x + box!.width / 2, box!.y + box!.height / 2);
    await page.mouse.wheel(0, 350);
    await expect
      .poll(() => dialog.locator('.workflow-form-body').evaluate((element) => element.scrollTop))
      .toBeGreaterThan(0);
    await dialog.locator('.workflow-form-body').evaluate((element) => {
      element.scrollTop = element.scrollHeight;
    });
    await page.mouse.wheel(0, 900);
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(original.background);
    await page.mouse.move(2, 350);
    await page.mouse.wheel(0, 900);
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(original.background);
    await page.keyboard.press('Escape');
    await expect(dialog).toHaveCount(0);
    await expect(page.locator('html')).not.toHaveCSS('overflow-y', 'hidden');
    await page.mouse.move(width - 2, 350);
    await page.mouse.wheel(0, 450);
    await expect
      .poll(() => page.evaluate(() => window.scrollY))
      .toBeGreaterThan(original.background);
  });

test('photo viewer locks an already-scrolled public page and restores its position', async ({
  page,
}) => {
  await page.goto('/spaces/?lang=en#space-gallery');
  const photo = page.locator('.photo-open').first();
  await photo.scrollIntoViewIfNeeded();
  await photo.locator('img').evaluate((image: HTMLImageElement) => image.decode());
  await page.evaluate(() => document.fonts.ready);
  // Measure at the real click, after Playwright's actionability scrolling.
  await photo.evaluate((button) =>
    button.addEventListener(
      'click',
      () => {
        button.setAttribute('data-opening-scroll', String(window.scrollY));
      },
      { once: true, capture: true },
    ),
  );
  await photo.click();
  const before = Number(await photo.getAttribute('data-opening-scroll'));
  expect(before).toBeGreaterThan(0);
  const dialog = page.locator('dialog.photo-dialog[open]');
  await expect(dialog).toBeVisible();
  await expect(page.locator('html')).toHaveCSS('overflow-y', 'hidden');
  await page.mouse.move(2, 300);
  await page.mouse.wheel(0, 900);
  await page.evaluate(
    () => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))),
  );
  expect(await page.evaluate(() => window.scrollY)).toBe(before);
  await page.keyboard.press('Escape');
  await expect(dialog).toHaveCount(0);
  await expect(page.locator('html')).not.toHaveCSS('overflow-y', 'hidden');
  expect(await page.evaluate(() => window.scrollY)).toBe(before);
});

test('closing a nested native dialog keeps the underlying modal and page locked', async ({
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
      await import('/tests/helpers/browser-auth.ts');
    await signInWithCredential(auth, GoogleAuthProvider.credential(jwt));
  }, fixture.administrator.jwt);
  await page.getByRole('button', { name: 'Add balance', exact: true }).click();
  const lower = page.locator('dialog.app-dialog[open]:not(#test-nested-modal)');
  await lower.evaluate((element) => {
    element.scrollTop = 40;
    const upper = document.createElement('dialog');
    upper.id = 'test-nested-modal';
    upper.className = 'app-dialog';
    const content = document.createElement('div');
    content.style.height = '1500px';
    content.textContent = '[TEST] Nested scroll layer';
    upper.append(content);
    element.append(upper);
    upper.showModal();
  });
  const before = await lower.evaluate((element) => element.scrollTop),
    upper = page.locator('#test-nested-modal');
  await upper.evaluate((element) => {
    element.scrollTop = element.scrollHeight;
  });
  const box = await upper.boundingBox();
  await page.mouse.move(box!.x + 40, box!.y + 40);
  await page.mouse.wheel(0, 900);
  await page.evaluate(
    () => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))),
  );
  expect(await lower.evaluate((element) => element.scrollTop)).toBe(before);
  await upper.evaluate((element) => {
    (element as HTMLDialogElement).close();
    element.remove();
  });
  await expect(page.locator('html')).toHaveCSS('overflow-y', 'hidden');
  await page.keyboard.press('Escape');
  await expect(lower).toHaveCount(0);
  await expect(page.locator('html')).not.toHaveCSS('overflow-y', 'hidden');
});

test('phone touch swipes scroll the modal without moving the background', async ({
  browser,
  request,
}) => {
  const context = await browser.newContext({
    viewport: { width: 390, height: 700 },
    isMobile: true,
    hasTouch: true,
  });
  try {
    const page = await context.newPage(),
      fixture = await (await request.get('/__test-fixture')).json();
    await page.goto('http://localhost:4184/app/balances/?lang=en');
    await page.evaluate(async (jwt) => {
      // @ts-ignore Test module.
      const { auth } = await import('/apps/web/src/auth-client.ts');
      // @ts-ignore Test module.
      const { GoogleAuthProvider, signInWithCredential } =
        await import('/tests/helpers/browser-auth.ts');
      await signInWithCredential(auth, GoogleAuthProvider.credential(jwt));
    }, fixture.administrator.jwt);
    await page.getByRole('button', { name: 'Add balance', exact: true }).click();
    const dialog = page.getByRole('dialog', { name: 'Add balance', exact: true });
    await expect(dialog).toBeVisible();
    const background = await page.evaluate(() => window.scrollY),
      session = await context.newCDPSession(page);
    async function swipe(x: number, from: number, to: number) {
      await session.send('Input.dispatchTouchEvent', {
        type: 'touchStart',
        touchPoints: [{ x, y: from, id: 1 }],
      });
      for (let step = 1; step <= 8; step++)
        await session.send('Input.dispatchTouchEvent', {
          type: 'touchMove',
          touchPoints: [{ x, y: from + ((to - from) * step) / 8, id: 1 }],
        });
      await session.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
      await page.evaluate(
        () => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))),
      );
    }
    const bodyBox = (await dialog.locator('.workflow-form-body').boundingBox())!;
    await swipe(195, bodyBox.y + bodyBox.height - 20, bodyBox.y + 20);
    await expect
      .poll(() => dialog.locator('.workflow-form-body').evaluate((element) => element.scrollTop))
      .toBeGreaterThan(0);
    await dialog.locator('.workflow-form-body').evaluate((element) => {
      element.scrollTop = element.scrollHeight;
    });
    await swipe(195, bodyBox.y + bodyBox.height - 20, bodyBox.y + 20);
    await swipe(2, 560, 250);
    expect(await page.evaluate(() => window.scrollY)).toBe(background);
    await page.keyboard.press('Escape');
    await expect(dialog).toHaveCount(0);
    await swipe(195, 560, 250);
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(background);
  } finally {
    await context.close();
  }
});
