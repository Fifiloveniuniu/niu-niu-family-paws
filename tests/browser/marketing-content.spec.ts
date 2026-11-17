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
