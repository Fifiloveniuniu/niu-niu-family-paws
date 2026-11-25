import { readFile } from 'node:fs/promises';
import { test, expect } from '@playwright/test';
test.use({ timezoneId: 'America/Los_Angeles' });

for (const [width, language] of [
  [320, 'en'],
  [320, 'zh'],
  [390, 'en'],
  [390, 'zh'],
  [768, 'zh'],
  [1280, 'en'],
  [1280, 'zh'],
] as const) {
  test(`booking keeps aligned sticky date and step headers while scrolling (${width}, ${language})`, async ({
    page,
    request,
  }) => {
    const messages = JSON.parse(
      await readFile(
        new URL(`../../apps/web/src/locales/${language}.json`, import.meta.url),
        'utf8',
      ),
    );
    const t = (key: string) => messages[`ui.workspace.${key}`];
    await page.setViewportSize({ width, height: 700 });
    const fixture = await (await request.get('/__test-fixture')).json();
    // Extend only the layout response to exercise a calendar taller than the viewport.
    await page.route('**/api/availability', async (route) => {
      const response = await route.fetch();
      const data = await response.json();
      const room = data.rooms[0];
      room.houseName =
        language === 'zh'
          ? '[TEST] 供多只宠物共同住宿的安静家庭房屋名称与完整时区信息'
          : '[TEST] A quiet family house with a deliberately long name and timezone information';
      room.roomName =
        language === 'zh'
          ? '[TEST] 适合多只宠物共同住宿的宽敞家庭房间（完整房间名称）'
          : '[TEST] A spacious family room with a deliberately long descriptive room name';
      data.rooms.push(
        ...Array.from({ length: 14 }, (_, index) => ({
          ...room,
          roomId: `layout-${index}`,
          roomName: `[TEST] Layout room ${index}`,
          ...(index === 0
            ? {
                blocked: [
                  {
                    from: new Date(Date.parse(data.from) - 7 * 86400000).toISOString(),
                    through: new Date(Date.parse(data.from) + 86400000).toISOString(),
                    issue: 'capacity',
                  },
                  {
                    from: new Date(Date.parse(data.through) - 86400000).toISOString(),
                    through: new Date(Date.parse(data.through) + 7 * 86400000).toISOString(),
                    issue: 'capacity',
                  },
                ],
              }
            : {}),
        })),
      );
      await route.fulfill({ response, json: data });
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
    await page.getByRole('button', { name: t('addBooking'), exact: true }).click();
    const dialog = page.getByRole('dialog');
    const header = dialog.locator('.dialog-fixed-header');
    const initialTop = (await header.boundingBox())!.y;
    await dialog.getByRole('combobox', { name: t('pet'), exact: true }).click();
    await page.getByRole('option').filter({ hasText: '[TEST] Alice pet 0' }).click();
    await dialog
      .getByRole('combobox', { name: t('arrival'), exact: true })
      .fill('2030-11-02T10:00');
    await dialog
      .getByRole('combobox', { name: t('pickup'), exact: true })
      .fill(width === 320 ? '2030-11-02T10:05' : '2030-11-04T10:00');
    await dialog.getByRole('button', { name: t('choose'), exact: true }).click();
    await expect(dialog.locator('.hc-range-room')).toHaveCount(15);
    await page.screenshot({ path: `test-results-backend/booking-grid-${width}-${language}.png` });
    await expect(dialog.locator('.calendar-timeline-tick')).toHaveCount(14);
    await expect(dialog.locator('.hc-range-house')).toHaveCount(1);
    await expect(dialog.locator('.hc-range-house .location-label-kind')).toHaveText(t('house'));
    await expect(dialog.locator('.hc-range-room-name .location-label-kind').first()).toHaveText(
      t('room'),
    );
    const identityStyles = await dialog.evaluate((node) => {
      const house = node.querySelector('.hc-range-house')!,
        room = node.querySelector('.hc-range-room-name')!;
      return {
        houseFill: getComputedStyle(house).backgroundColor,
        roomFill: getComputedStyle(room).backgroundColor,
        houseSize: parseFloat(
          getComputedStyle(house.querySelector('.location-label-name')!).fontSize,
        ),
        roomSize: parseFloat(
          getComputedStyle(room.querySelector('.location-label-name')!).fontSize,
        ),
      };
    });
    expect(identityStyles.houseFill).toBe('rgb(255, 255, 255)');
    expect(identityStyles.houseSize).toBeGreaterThan(identityStyles.roomSize);

    const alignment = await dialog.evaluate((node) => {
      const axis = node.querySelector('.calendar-timeline-axis-track')!.getBoundingClientRect();
      const track = node.querySelector('.hc-time-track')!.getBoundingClientRect();
      return [Math.abs(axis.x - track.x), Math.abs(axis.width - track.width)];
    });
    expect(alignment.every((value) => value < 1)).toBe(true);
    const clipped = await dialog.locator('.hc-time-unavailable').evaluateAll((nodes) =>
      nodes.every((node) => {
        const span = node.getBoundingClientRect(),
          track = node.parentElement!.getBoundingClientRect();
        return span.left >= track.left - 1 && span.right <= track.right + 1;
      }),
    );
    expect(clipped).toBe(true);
    const textFits = await dialog.locator('.hc-range-room-name').evaluateAll((nodes) =>
      nodes.every((node) => {
        const bounds = node.getBoundingClientRect();
        return (
          node.scrollWidth <= node.clientWidth + 1 &&
          node.scrollHeight <= node.clientHeight + 1 &&
          [...node.children].every((child) => {
            const box = child.getBoundingClientRect();
            return (
              box.left >= bounds.left - 1 &&
              box.right <= bounds.right + 1 &&
              box.top >= bounds.top - 1 &&
              box.bottom <= bounds.bottom + 1
            );
          })
        );
      }),
    );
    expect(textFits).toBe(true);
    const separateLanes = await dialog.locator('.hc-range-room').evaluateAll((rows) =>
      rows.every((row) => {
        const request = row.querySelector('.hc-time-request')?.getBoundingClientRect();
        return (
          !request ||
          [...row.querySelectorAll('.hc-time-available, .hc-time-unavailable')].every(
            (node) => node.getBoundingClientRect().bottom + 8 <= request.top,
          )
        );
      }),
    );
    expect(separateLanes).toBe(true);
    const houseLabel = dialog.locator('.hc-range-house > span').first();
    const titleLayer = await houseLabel.evaluate((node) => ({
      foreground: Number(getComputedStyle(node).zIndex),
      grid: Number(
        getComputedStyle(
          node.closest('.calendar-timeline')!.querySelector('.calendar-timeline-continuous-grid')!,
        ).zIndex,
      ),
      mask: getComputedStyle(node.querySelector('.location-label-name')!).backgroundColor,
      surface: getComputedStyle(node.closest('dialog')!).backgroundColor,
    }));
    expect(titleLayer.foreground).toBeGreaterThan(titleLayer.grid);
    expect(titleLayer.mask).toBe(titleLayer.surface);

    expect(await houseLabel.evaluate((node) => node.scrollWidth <= node.clientWidth + 1)).toBe(
      true,
    );
    await expect(dialog.locator('.booking-calendar-legend li')).toHaveCount(2);
    const semanticColors = await dialog.evaluate((node) => {
      const probe = document.createElement('span');
      document.body.append(probe);
      const resolve = (token: string) => {
        probe.style.color = `var(${token})`;
        return getComputedStyle(probe).color;
      };
      const result = {
        unavailable: getComputedStyle(node.querySelector('.booking-calendar-swatch.unavailable')!)
          .backgroundColor,
        requested: getComputedStyle(node.querySelector('.booking-calendar-swatch.requested')!)
          .backgroundColor,
        secondary: resolve('--md-secondary-container'),
        selection: resolve('--md-primary-container'),
      };
      probe.remove();
      return result;
    });
    expect(semanticColors.unavailable).toBe(semanticColors.secondary);
    expect(semanticColors.requested).toBe(semanticColors.selection);
    expect(semanticColors.unavailable).not.toBe(semanticColors.requested);

    const steps = dialog.locator('.hc-wizard-progress li');
    await expect(steps.nth(0)).toHaveAttribute('data-step-state', 'completed');
    await expect(steps.nth(1)).toHaveAttribute('aria-current', 'step');
    await expect(steps.nth(2)).toHaveAttribute('data-step-state', 'upcoming');
    const markers = await dialog.locator('.hc-step-marker').evaluateAll((nodes) =>
      nodes.map((node) => ({
        top: node.getBoundingClientRect().top,
        color: getComputedStyle(node).backgroundColor,
      })),
    );
    expect(new Set(markers.map((marker) => marker.top)).size).toBe(1);
    expect(new Set(markers.map((marker) => marker.color)).size).toBe(3);
    await expect(steps.first()).toHaveCSS('position', 'relative');
    expect(await steps.first().evaluate((node) => getComputedStyle(node, '::after').position)).toBe(
      'absolute',
    );
    const calendar = dialog.locator('.hc-schedule-scroll');
    expect(
      await calendar.evaluate((node) => node.scrollHeight - node.clientHeight),
    ).toBeLessThanOrEqual(1);
    await dialog.evaluate((node) => {
      const axis = node.querySelector('.calendar-timeline-axis')!,
        header = node.querySelector('.dialog-fixed-header')!;
      node.scrollTop +=
        axis.getBoundingClientRect().top - header.getBoundingClientRect().bottom + 180;
    });
    await expect
      .poll(async () => {
        const axis = (await dialog.locator('.calendar-timeline-axis').boundingBox())!,
          headerBox = (await header.boundingBox())!;
        return Math.abs(axis.y - headerBox.y - headerBox.height - 1);
      })
      .toBeLessThan(2);
    expect(await dialog.evaluate((node) => node.scrollTop)).toBeGreaterThan(0);
    expect(await calendar.evaluate((node) => node.scrollTop)).toBe(0);
    await dialog.evaluate((node) => {
      node.scrollTop = 0;
    });
    await dialog.locator('.hc-range-room-name').first().scrollIntoViewIfNeeded();
    await calendar.evaluate((node) => {
      node.scrollLeft = 260;
    });
    expect(
      await dialog
        .locator('.hc-range-room-name')
        .first()
        .evaluate((node) => {
          const box = node.getBoundingClientRect();
          return !!document
            .elementFromPoint(box.left + 80, box.top + 68)
            ?.closest('.hc-range-room-name');
        }),
    ).toBe(true);
    await page.screenshot({ path: `test-results-backend/booking-pan-${width}-${language}.png` });
    expect(
      await houseLabel.evaluate((node) => node.getBoundingClientRect().left),
    ).toBeGreaterThanOrEqual((await calendar.boundingBox())!.x);
    await calendar.evaluate((node) => {
      node.scrollLeft = 0;
    });
    await dialog.locator('.hc-range-room-name button').first().click();
    await dialog.evaluate((node) => {
      node.scrollTop = 200;
    });
    // Wheel events on the sticky header still scroll the owning dialog.
    const headerBox = (await header.boundingBox())!;
    await page.mouse.move(headerBox.x + 20, headerBox.y + 20);
    const calendarBefore = await calendar.evaluate((node) => node.scrollTop);
    const before = await dialog.evaluate((node) => node.scrollTop);
    expect(before).toBeGreaterThan(0);
    await page.mouse.wheel(0, -350);
    await expect.poll(() => dialog.evaluate((node) => node.scrollTop)).toBeLessThan(before);
    expect((await header.boundingBox())!.y).toBeCloseTo(initialTop, 0);
    expect(await calendar.evaluate((node) => node.scrollTop)).toBe(calendarBefore);
    await expect(page.locator('html')).toHaveCSS('overflow-y', 'hidden');
    await page.screenshot({ path: `test-results-backend/booking-layout-${width}-${language}.png` });
    await dialog.getByRole('button', { name: t('reviewBooking'), exact: true }).click();
    await expect(steps.nth(1)).toHaveAttribute('data-step-state', 'completed');
    await expect(steps.nth(2)).toHaveAttribute('aria-current', 'step');
    expect(await dialog.evaluate((node) => node.scrollTop)).toBe(0);
    await expect(dialog.getByRole('button', { name: t('confirmPlan'), exact: true })).toBeVisible();
  });
}

test('shared calendar keeps all views aligned and distinguishes repeated DST hours', async ({
  page,
  request,
}, testInfo) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const fixture = await (await request.get('/__test-fixture')).json();
  await page.goto('/app/calendar/?lang=en&date=2030-11-03&view=day');
  await page.evaluate(async (jwt) => {
    // @ts-ignore Test-only Vite module.
    const { auth } = await import('/apps/web/src/auth-client.ts');
    // @ts-ignore Test-only Vite dependency.
    const { GoogleAuthProvider, signInWithCredential } =
      await import('/tests/helpers/browser-auth.ts');
    await signInWithCredential(auth, GoogleAuthProvider.credential(jwt));
  }, fixture.administrator.jwt);
  for (const [view, count] of [
    ['day', 25],
    ['week', 14],
    ['month', 30],
    ['year', 12],
  ] as const) {
    if (view !== 'day') await page.goto(`/app/calendar/?lang=en&date=2030-11-03&view=${view}`);
    const ticks = page.locator('.saved-calendar-grid .calendar-timeline-tick');
    await expect(ticks).toHaveCount(count);
    const houseIdentity = page.locator('.saved-calendar-grid .hc-house .location-label-house');
    const roomIdentity = page.locator('.saved-calendar-grid .hc-room .location-label-room');
    await expect(houseIdentity).toHaveCount(1);
    await expect(roomIdentity).toHaveCount(1);
    await expect(houseIdentity.locator('.location-label-kind')).toHaveText('House');
    await expect(roomIdentity.locator('.location-label-kind')).toHaveText('Room');
    expect((await roomIdentity.boundingBox())!.x).toBeGreaterThan(
      (await houseIdentity.boundingBox())!.x,
    );

    expect(
      await ticks.evaluateAll((nodes) =>
        nodes.every(
          (node) =>
            node.querySelector('span')!.getBoundingClientRect().width + 12 <=
            node.getBoundingClientRect().width + 1,
        ),
      ),
    ).toBe(true);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    if (view === 'day') {
      const repeated = ticks.filter({ has: page.locator('span').filter({ hasText: /^01:00$/ }) });
      await expect(repeated).toHaveCount(2);
      await expect(repeated.locator('small')).toHaveText(['GMT-7', 'GMT-8']);
    }
    await page.screenshot({ path: testInfo.outputPath(`${view}.png`) });
  }
});
