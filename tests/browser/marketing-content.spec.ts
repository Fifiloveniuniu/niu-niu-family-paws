import { test, expect } from '@playwright/test';

test('new Home chapters, honest empty states and sample photo dialogs work', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 950 });
  await page.goto('/home/');
  await expect(page.locator('[data-cinematic-panel]')).toHaveCount(9);
  await expect(page.locator('.service-path')).toHaveCount(4);
  await page.locator('.cinema-rail a[href="#numbers"]').click();
  await expect(page.locator('.marketing-site')).not.toHaveAttribute('data-marketing-transition');
  await expect(page.locator('.home-numbers')).toHaveAttribute('aria-hidden', 'false');
  await expect(page.locator('.live-number')).toHaveText(['—', '—', '—']);
  await expect(page.locator('.home-numbers')).toContainText('Verified totals coming soon');
  await page.locator('.cinema-rail a[href="#stories"]').click();
  await expect(page.locator('.marketing-site')).not.toHaveAttribute('data-marketing-transition');
  await expect(page.locator('.home-stories blockquote')).toHaveCount(0);
  for (const path of ['/spaces/', '/academy/']) {
    await page.goto(path);
    await expect(page.locator('.photo-grid figure')).toHaveCount(3);
    await expect(page.locator('.sample-explanation')).toContainText('sample photos');
    const open = page.locator('.photo-open').first();
    await open.click();
    await expect(page.locator('.photo-dialog')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.locator('.photo-dialog')).not.toBeVisible();
    await expect(open).toBeFocused();
    expect(
      await page
        .locator('.photo-grid img')
        .evaluateAll((images) =>
          images.every((image) => (image as HTMLImageElement).naturalWidth > 0),
        ),
    ).toBe(true);
  }
});

test('only approved public totals and stories appear, and refresh without exposing customer records', async ({
  page,
}) => {
  let total = 42;
  await page.route('**/marketing-content.json', (route) =>
    route.fulfill({
      json: {
        version: 1,
        stats: {
          petsCaredFor: { value: total, verified: true, asOf: '2026-01-01T00:00:00Z' },
          groomingAppointments: { value: 999, verified: false, asOf: '2026-01-01T00:00:00Z' },
        },
        testimonials: [
          {
            approved: true,
            quote: {
              en: 'Browser fixture: approved family story.',
              zh: '浏览器测试：已获批准的家长故事。',
            },
            attribution: { en: 'Test family', zh: '测试家庭' },
          },
          {
            approved: false,
            quote: { en: 'Unapproved fixture', zh: '未批准的测试内容' },
            attribution: { en: 'Private', zh: '私密' },
          },
        ],
      },
    }),
  );
  await page.setViewportSize({ width: 1440, height: 950 });
  await page.goto('/home/#numbers');
  await expect(page.locator('.live-number').first()).toContainText('42');
  await expect(page.locator('.live-number').nth(1)).toHaveText('—');
  total = 43;
  await page.evaluate(() => document.dispatchEvent(new Event('visibilitychange')));
  await expect(page.locator('.live-number').first()).toContainText('43');
  await page.goto('/about/#family-stories');
  await expect(page.locator('#family-stories blockquote')).toHaveText(
    'Browser fixture: approved family story.',
  );
  await expect(page.locator('body')).not.toContainText('Unapproved fixture');
});

test('each number item has its own illustrated icon and independently moving shapes', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 950 });
  await page.goto('/home/#numbers');
  const icons = page.locator('.number-grid .metric-art');
  await expect(icons).toHaveCount(3);
  await expect(page.locator('.number-grid .metric-paw')).toHaveCount(1);
  await expect(page.locator('.number-grid .grooming-blade')).toHaveCount(2);
  await expect(page.locator('.number-grid .academy-book')).toHaveCount(1);
  const sample = () =>
    icons.evaluateAll((elements) =>
      elements.map((element) => getComputedStyle(element.querySelector('svg')!).transform),
    );
  const first = await sample();
  await page.mouse.wheel(0, 250);
  await expect.poll(async () => JSON.stringify(await sample())).not.toBe(JSON.stringify(first));
  for (const width of [320, 390, 1440]) {
    await page.setViewportSize({ width, height: 844 });
    await page.goto('/home/#numbers');
    for (const icon of await icons.all()) await expect(icon).toBeInViewport();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
  }
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect(page.locator('[data-scroll-enabled]')).toHaveCount(0);
  for (const value of await sample()) expect(value).toBe('none');
});
