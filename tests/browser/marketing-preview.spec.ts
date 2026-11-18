import { test, expect } from '@playwright/test';

test('local sample preview fills stories, totals and prices without changing approved public content', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 950 });
  await page.goto('/home/?preview=sample#stories');
  await expect(page.locator('.marketing-preview-notice')).toHaveCount(0);
  await expect(page.locator('.home-stories')).toContainText('Poppy');
  await expect(page.locator('.home-stories blockquote')).toHaveText(/^“.*”$/);
  await page
    .getByRole('navigation', { name: 'Main navigation' })
    .getByRole('link', { name: 'Pricing', exact: true })
    .click();
  await expect(page.locator('main')).toContainText('From $45');
  await page.goto('/home/?preview=sample#numbers');
  await expect(page.locator('.home-numbers')).toContainText('1,280');
  for (const width of [320, 390, 1440]) {
    await page.setViewportSize({ width, height: 950 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
  }
  await page.goto('/home/');
  await expect(page.locator('.marketing-preview-notice')).toHaveCount(0);
  await expect(page.locator('.home-stories')).not.toContainText('Poppy');
});

test('sample chapter copy fits English and Chinese on phones and desktop', async ({ page }) => {
  for (const width of [320, 390, 1440]) {
    await page.setViewportSize({ width, height: 844 });
    for (const lang of ['en', 'zh']) {
      await page.goto('/home/?preview=sample');
      if (width < 1000) await page.locator('.marketing-menu-toggle').click();
      await page.locator('.language-menu-trigger').click();
      await page
        .getByRole('menuitemradio', { name: lang === 'zh' ? '简体中文' : 'English' })
        .click();
      if (width < 1000) await page.locator('.marketing-menu-toggle').click();
      for (let chapter = 0; chapter < 9; chapter++) {
        const clipped = await page.evaluate(async (chapter) => {
          const story = document.querySelector<HTMLElement>('[data-cinema-enabled]')!;
          const stage = story.querySelector<HTMLElement>('.cinematic-stage')!;
          const header = document
            .querySelector('.marketing-header')!
            .getBoundingClientRect().bottom;
          scrollTo({
            top:
              story.getBoundingClientRect().top +
              scrollY -
              header +
              ((story.clientHeight - stage.clientHeight) * chapter) / 8,
            behavior: 'instant',
          });
          await new Promise<void>((r) =>
            requestAnimationFrame(() => requestAnimationFrame(() => r())),
          );
          const bottom = document.querySelector('.cinema-controls')!.getBoundingClientRect().top;
          return [
            ...story
              .querySelectorAll('[data-cinematic-panel]')
              [chapter].querySelectorAll('h1,h2,h3,p,a,blockquote'),
          ]
            .filter((e) => {
              const b = e.getBoundingClientRect();
              return b.height > 0 && (b.top < header - 1 || b.bottom > bottom + 1);
            })
            .map((e) => e.textContent);
        }, chapter);
        expect(clipped, `${width} ${lang} chapter ${chapter}`).toEqual([]);
      }
    }
  }
});

test('numbers animate once across chapter and native scroll reentry and show totals immediately for reduced motion', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 950 });
  await page.goto('/home/?preview=sample#numbers');
  const number = page.locator('.live-number').first();
  await expect(number).toHaveText('1,280');
  await page.locator('[data-cinema-next]').click();
  await expect(page.locator('.marketing-site')).not.toHaveAttribute('data-marketing-transition');
  await expect(number).toHaveText('1,280');
  await page.locator('[data-cinema-previous]').click();
  await page.waitForTimeout(160);
  const middle = Number((await number.innerText()).replaceAll(',', ''));
  expect(middle).toBeGreaterThan(0);
  expect(middle).toBe(1280);
  await expect(number).toHaveText('1,280');
  const pose = async (chapter: number) =>
    page.evaluate(async (chapter) => {
      const s = document.querySelector<HTMLElement>('[data-cinema-enabled]')!,
        stage = s.querySelector<HTMLElement>('.cinematic-stage')!;
      const header = document.querySelector('.marketing-header')!.getBoundingClientRect().height;
      scrollTo({
        top:
          s.getBoundingClientRect().top +
          scrollY -
          header +
          ((s.clientHeight - stage.clientHeight) * chapter) / 8,
        behavior: 'instant',
      });
      await new Promise<void>((r) => requestAnimationFrame(() => requestAnimationFrame(() => r())));
    }, chapter);
  await pose(4);
  await expect(number).toHaveText('1,280');
  await pose(5);
  await page.waitForTimeout(140);
  expect(Number((await number.innerText()).replaceAll(',', ''))).toBe(1280);
  await expect(number).toHaveText('1,280');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect(number).toHaveText('1,280');
  await number.scrollIntoViewIfNeeded();
  await expect(number).toHaveText('1,280');
  await expect(number).toHaveAttribute('aria-label', '1,280');
});
