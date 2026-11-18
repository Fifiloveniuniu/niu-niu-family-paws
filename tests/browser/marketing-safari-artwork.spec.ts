import { test, expect, webkit } from '@playwright/test';

test('iPhone WebKit keeps opening artwork clear and the travelling sun inside the stage', async () => {
  const browser = await webkit.launch({ channel: undefined });
  try {
    for (const language of ['en', 'zh']) {
      const page = await browser.newPage({ viewport: { width: 430, height: 739 }, isMobile: true });
      await page.addInitScript((lang) => localStorage.setItem('language', lang), language);
      await page.goto('http://localhost:4174/home/');
      await page.evaluate(() => document.fonts.ready);
      await page.waitForTimeout(1200);
      await expect(page.locator('[data-cinema-enabled]')).toHaveCount(1);
      const opening = await page.evaluate(() => {
        const box = (s: string) => document.querySelector(s)!.getBoundingClientRect();
        return {
          flowerBottom: box('.shared-flower').bottom,
          sunBottom: box('.story-sun').bottom,
          textTop: box('.hero-message').top,
          noteBottom: box('.hero-world .world-note').bottom,
          controlsTop: box('.cinema-controls').top,
        };
      });
      expect(opening.flowerBottom).toBeLessThan(opening.textTop);
      expect(opening.sunBottom).toBeLessThan(opening.textTop);
      expect(opening.noteBottom).toBeLessThan(opening.controlsTop);
      for (const chapter of [0, 3, 7, 8, 0]) {
        await page.evaluate((chapter) => {
          const story = document.querySelector<HTMLElement>('[data-cinema-enabled]')!;
          const stage = story.querySelector<HTMLElement>('.cinematic-stage')!;
          const header = document
            .querySelector('.marketing-header')!
            .getBoundingClientRect().height;
          scrollTo(
            0,
            story.getBoundingClientRect().top +
              scrollY -
              header +
              ((story.clientHeight - stage.clientHeight) * chapter) / 8,
          );
        }, chapter);
        await page.waitForTimeout(120);
        const sun = await page.evaluate(() => {
          const sun = document.querySelector('.story-sun')!;
          const a = sun.getBoundingClientRect();
          const b = document.querySelector('.cinematic-stage')!.getBoundingClientRect();
          return {
            inside:
              a.left >= b.left && a.right <= b.right && a.top >= b.top && a.bottom <= b.bottom,
            paint: (sun.querySelector('[data-celestial-body]') as SVGElement).style.fill,
          };
        });
        expect(sun.inside).toBe(true);
        if (chapter === 0) expect(sun.paint).not.toContain('url(');
      }
      if (language === 'en') {
        await page.evaluate(() => scrollTo(0, 0));
        await page.waitForTimeout(200);
        await page.screenshot({ path: 'docs/screenshots/iphone-story-artwork.png' });
      }
      await page.setViewportSize({ width: 390, height: 664 });
      await expect(page.locator('[data-cinema-enabled]')).toHaveCount(0);
      await expect(page.locator('.hero-flower')).toBeVisible();
      await page.setViewportSize({ width: 390, height: 844 });
      await expect(page.locator('[data-cinema-enabled]')).toHaveCount(1);
      await page.close();
    }
  } finally {
    await browser.close();
  }
});
