import { test, expect } from '@playwright/test';

test('new Home chapters, honest empty states and sample photo dialogs work', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 950 });
  await page.goto('/home/');
  await expect(page.locator('[data-cinematic-panel]')).toHaveCount(9);
  await expect(page.locator('.service-path')).toHaveCount(4);
  await page.locator('.cinema-rail a[href="#numbers"]').click();
  await expect(page.locator('.marketing-site')).not.toHaveAttribute('data-marketing-transition');
  await expect(page.locator('.home-numbers')).toHaveAttribute('aria-hidden', 'false');
  await expect(page.locator('.live-number')).toHaveCount(0);
  await expect(page.locator('.number-grid')).not.toContainText('—');
  await expect(page.locator('.home-numbers')).toContainText('Verified totals coming soon');
  await page.locator('.cinema-rail a[href="#stories"]').click();
  await expect(page.locator('.marketing-site')).not.toHaveAttribute('data-marketing-transition');
  await expect(page.locator('.home-stories blockquote,.home-stories .quote-mark')).toHaveCount(0);
  await expect(page.locator('.home-stories')).toContainText('Family stories coming soon.');
  await expect(page.locator('.home-stories a[href="/about/#family-stories"]')).toHaveCount(0);
  for (const path of ['/spaces/', '/academy/']) {
    await page.goto(path);
    await expect(page.locator('.photo-grid figure')).toHaveCount(2);
    if (path === '/academy/')
      await expect(page.locator('.sample-explanation')).toContainText('Student work');
    else await expect(page.locator('.sample-explanation')).toHaveCount(0);
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

test('only approved public totals and stories appear from one reusable page snapshot', async ({
  page,
}) => {
  let total = 42;
  let requests = 0;
  await page.route('**/marketing-content.json', (route) => {
    requests++;
    return route.fulfill({
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
    });
  });
  await page.setViewportSize({ width: 1440, height: 950 });
  await page.goto('/home/#numbers');
  await expect(page.locator('.live-number').first()).toContainText('42');
  await expect(page.locator('.live-number')).toHaveCount(1);
  await expect(page.locator('.number-grid article').nth(1)).toContainText(
    'Verified totals coming soon',
  );
  total = 43;
  await page.evaluate(() => document.dispatchEvent(new Event('visibilitychange')));
  await page.waitForTimeout(100);
  await expect(page.locator('.live-number').first()).toContainText('42');
  expect(requests).toBe(1);
  await page.reload();
  await expect(page.locator('.live-number').first()).toContainText('43');
  expect(requests).toBe(2);
  await expect(page.locator('.home-stories a[href="/about/#family-stories"]')).toHaveCount(1);
  await page.goto('/about/#family-stories');
  await expect(page.locator('#family-stories blockquote')).toHaveText(
    '“Browser fixture: approved family story.”',
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
