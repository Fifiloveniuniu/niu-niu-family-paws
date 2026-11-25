import { test, expect } from '@playwright/test';
import { expectReadableText } from './readability';

for (const [width, language, palette] of [
  [390, 'zh', 'google'],
  [1280, 'en', 'google'],
  [390, 'en', 'vscode-dark'],
  [1280, 'zh', 'vscode-dark'],
] as const) {
  test(`room pets are indented and Now uses a clear divider lane (${width}, ${language}, ${palette})`, async ({
    page,
    request,
  }, testInfo) => {
    await page.setViewportSize({ width, height: 900 });
    await page.addInitScript(
      (palette) =>
        localStorage.setItem('family-paws:appearance', JSON.stringify({ version: 2, palette })),
      palette,
    );
    const fixture = await (await request.get('/__test-fixture')).json();
    // Add a visual fixture only to the read response; no business data is changed.
    await page.route('**/api/bookings?**', async (route) => {
      if (route.request().method() !== 'GET') return route.continue();
      const now = Date.now(),
        from = new Date(now - 86400000).toISOString(),
        through = new Date(now + 86400000).toISOString();
      await route.fulfill({
        json: {
          items: [
            {
              id: 'layout-stay',
              customerId: fixture.cid,
              petId: fixture.pid,
              houseId: fixture.hid,
              roomId: fixture.rid,
              status: 'planned',
              arrival: from,
              pickup: through,
              occupancyFrom: from,
              occupancyThrough: through,
              timezone: 'America/Los_Angeles',
              version: 1,
            },
          ],
          nextCursor: null,
        },
      });
    });
    await page.goto(`/app/calendar/?lang=${language}&asCustomer=${fixture.cid}`);
    await page.evaluate(async (jwt) => {
      // @ts-ignore Test-only Vite module.
      const { auth } = await import('/apps/web/src/auth-client.ts');
      // @ts-ignore Test-only Vite dependency.
      const { GoogleAuthProvider, signInWithCredential } =
        await import('/tests/helpers/browser-auth.ts');
      await signInWithCredential(auth, GoogleAuthProvider.credential(jwt));
    }, fixture.administrator.jwt);
    const grid = page.locator('.saved-calendar-grid');
    const room = grid.locator(`.hc-room[data-room-id="${fixture.rid}"]`);
    const pet = grid.locator(`.hc-pet[data-room-id="${fixture.rid}"]`);
    await expect(pet).toHaveCount(1);
    const roomName = await room.locator('.location-label-name').boundingBox();
    const avatar = await pet.locator('.workspace-avatar-button').boundingBox();
    const petName = await pet.locator('.hc-label strong').first().boundingBox();
    expect(avatar!.x).toBeGreaterThan(roomName!.x + 12);
    expect(petName!.x).toBeGreaterThan(avatar!.x + avatar!.width);
    const marker = grid.locator('.workspace-now-marker > span');
    await expect(marker.locator('time')).toBeVisible();
    const markerBox = (await marker.boundingBox())!;
    const dateBottom = await grid
      .locator('.calendar-timeline-tick')
      .first()
      .evaluate((node) =>
        Math.max(...[...node.children].map((child) => child.getBoundingClientRect().bottom)),
      );
    expect(markerBox.y).toBeGreaterThanOrEqual(dateBottom + 4);
    await expect(pet).toHaveCSS('border-top-width', '0px');
    await expect(room).toHaveCSS('border-bottom-width', '0px');
    await expect(page.locator('.workspace-filters')).toHaveCSS('border-bottom-width', '0px');
    await expect(grid.locator('.hc-house')).toHaveCSS(
      'background-color',
      palette === 'vscode-dark' ? 'rgb(31, 31, 31)' : 'rgb(255, 255, 255)',
    );
    await expect(pet).toHaveCSS('border-top-width', '0px');
    expect((await pet.boundingBox())!.height).toBeGreaterThanOrEqual(64);
    const panelRight =
      (await grid.boundingBox())!.x +
      parseFloat(await grid.evaluate((node) => getComputedStyle(node).getPropertyValue('--label')));
    for (const heading of [room, grid.locator('.hc-house')]) {
      const actions = (await heading.locator('.workspace-row-actions').boundingBox())!;
      expect(actions.x + actions.width).toBeLessThanOrEqual(panelRight);
      expect(actions.x).toBeGreaterThan(
        (await heading.locator('.location-label').boundingBox())!.x,
      );
    }
    await expect(grid.locator(':scope > .calendar-timeline-continuous-grid')).toHaveCount(1);
    await expect(room).toHaveCSS('border-top-width', '0px');
    await expectReadableText(page);
    await expect(
      page.locator('.saved-calendar-grid .hc-pet .pet-type-choice .pet-type-icon').first(),
    ).toBeVisible();
    await page.screenshot({ path: testInfo.outputPath('hierarchy-now.png') });
    const scroll = page.locator('.saved-calendar .hc-scroll');
    await scroll.evaluate((node) => {
      node.scrollLeft = 100;
    });
    await expect(pet.locator('.hc-label')).toBeVisible();
    const labelBox = (await pet.locator('.hc-label').boundingBox())!;
    expect((await pet.locator('.hc-label strong').first().boundingBox())!.x).toBeGreaterThanOrEqual(
      labelBox.x + 64,
    );
  });
}
