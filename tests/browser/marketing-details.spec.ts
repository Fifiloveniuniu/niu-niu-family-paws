import { test, expect } from '@playwright/test';

async function pose(page: import('@playwright/test').Page, chapter: number) {
  await page.evaluate(async (chapter) => {
    const s = document.querySelector<HTMLElement>('[data-cinema-enabled]')!;
    const stage = s.querySelector<HTMLElement>('.cinematic-stage')!;
    scrollTo({
      top:
        s.getBoundingClientRect().top +
        scrollY -
        document.querySelector('.marketing-header')!.getBoundingClientRect().height +
        ((s.clientHeight - stage.clientHeight) * chapter) / 8,
      behavior: 'instant',
    });
    await new Promise<void>((r) => requestAnimationFrame(() => requestAnimationFrame(() => r())));
  }, chapter);
}

test('editorial accents, photo captions and footer are centered and unwanted marks are absent', async ({
  page,
}) => {
  for (const width of [390, 1440]) {
    await page.setViewportSize({ width, height: 950 });
    await page.goto('/home/?preview=sample#main');
    await page.evaluate(() => document.fonts.ready);
    for (const [chapter, selector] of [
      [6, '.home-stories .eyebrow'],
      [5, '.home-numbers > .cute-note'],
    ] as const) {
      await pose(page, chapter);
      const error = await page.locator(selector).evaluate((e) => {
        const r = document.createRange();
        r.selectNodeContents(e);
        const b = r.getBoundingClientRect();
        return Math.abs(b.x + b.width / 2 - innerWidth / 2);
      });
      expect(error).toBeLessThan(0.5);
    }
    const last = page.locator('.number-grid article').last();
    for (const edge of ['top', 'bottom', 'left', 'right'])
      await expect(last).toHaveCSS(`border-${edge}-width`, '0px');
    await pose(page, 4);
    const errors = await page.locator('.home-photo-pair figure').evaluateAll((es) =>
      es.map((e) => {
        const image = e.querySelector('img')!.getBoundingClientRect(),
          caption = e.querySelector('figcaption')!;
        const r = document.createRange();
        r.selectNodeContents(caption);
        const c = r.getBoundingClientRect();
        return Math.abs(image.x + image.width / 2 - c.x - c.width / 2);
      }),
    );
    for (const error of errors) expect(error).toBeLessThan(0.5);
    await page.goto('/services/');
    await expect(page.locator('.preparation-check')).toHaveCount(0);
    await expect(page.locator('.preparation-list li')).toHaveCount(4);
    await page.locator('.marketing-footer').scrollIntoViewIfNeeded();
    const footerErrors = await page.locator('.marketing-footer').evaluate((e) => {
      const brand = e.querySelector('.brand')!,
        a = brand.firstElementChild!.getBoundingClientRect(),
        b = brand.lastElementChild!.getBoundingClientRect();
      const errors = [Math.abs((a.left + b.right) / 2 - innerWidth / 2)];
      for (const copy of e.querySelectorAll('.footer-brand > p,.footer-bottom > span')) {
        const r = document.createRange();
        r.selectNodeContents(copy);
        const b = r.getBoundingClientRect();
        errors.push(Math.abs(b.x + b.width / 2 - innerWidth / 2));
      }
      return errors;
    });
    for (const error of footerErrors) expect(error).toBeLessThan(0.5);
  }
});

test('text links share continuous inline underline flow and compact arrows on every marketing page', async ({
  page,
}) => {
  for (const width of [390, 1440]) {
    await page.setViewportSize({ width, height: 950 });
    for (const lang of ['en', 'zh']) {
      await page.addInitScript((lang) => localStorage.setItem('language', lang), lang);
      for (const route of [
        'home',
        'services',
        'spaces',
        'about',
        'pricing',
        'faqs',
        'contact',
        'academy',
      ]) {
        await page.goto(`/${route}/`);
        await page.evaluate(() => document.fonts.ready);
        const audit = await page.locator('.marketing-site .text-link').evaluateAll((es) =>
          es.map((e) => {
            const s = getComputedStyle(e),
              arrow = [...e.children].find((c) => c.textContent?.trim() === '↗');
            const text = [...e.childNodes].find(
              (n) => n.nodeType === Node.TEXT_NODE && n.textContent?.trim(),
            );
            let gap: number | null = null;
            if (arrow && text) {
              const r = document.createRange();
              r.selectNodeContents(text);
              const b = r.getBoundingClientRect();
              gap = arrow.getBoundingClientRect().left - b.right;
            }
            return { display: s.display, underline: s.textDecorationLine, gap };
          }),
        );
        for (const link of audit) {
          expect(['inline-block', 'block']).toContain(link.display);
          expect(link.underline).toBe('underline');
          if (link.gap !== null) {
            expect(link.gap).toBeGreaterThanOrEqual(-0.1);
            expect(link.gap).toBeLessThan(7);
          }
        }
        expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBe(
          0,
        );
      }
    }
  }
});

test('Contact us hover uses white background with green text', async ({ page }) => {
  for (const width of [390, 1440]) {
    await page.setViewportSize({ width, height: 950 });
    await page.goto('/home/#contact');
    await expect(page.locator('.home-contact')).toHaveAttribute('aria-hidden', 'false');
    const button = page.locator('.home-contact .contact-status');
    await button.hover();
    await expect(button).toHaveCSS('background-color', 'rgb(255, 255, 255)');
    await expect(button).toHaveCSS('color', 'rgb(43, 79, 61)');
    await expect(button).toHaveCSS('-webkit-text-fill-color', 'rgb(43, 79, 61)');
  }
});
