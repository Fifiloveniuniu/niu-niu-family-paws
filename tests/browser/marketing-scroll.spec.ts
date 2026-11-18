import { test, expect, type Page } from '@playwright/test';

async function language(page: Page, value: string) {
  const menu = page.locator('.marketing-menu-toggle');
  if ((await menu.isVisible()) && !(await page.locator('.language-menu-trigger').isVisible()))
    await menu.click();
  await page.locator('.language-menu-trigger').click();
  await page.getByRole('menuitemradio', { name: value === 'zh' ? '简体中文' : 'English' }).click();
  if ((await menu.isVisible()) && (await page.locator('.language-menu-trigger').isVisible()))
    await menu.click();
}
async function pose(page: Page, value: number) {
  await page.evaluate(async (value) => {
    const story = document.querySelector<HTMLElement>('[data-cinema-enabled]')!;
    const stage = story.querySelector<HTMLElement>('.cinematic-stage')!;
    const header = document.querySelector('.marketing-header')!.getBoundingClientRect().height;
    const count = story.querySelectorAll('[data-cinematic-panel]').length;
    scrollTo({
      top:
        story.getBoundingClientRect().top +
        scrollY -
        header +
        ((story.clientHeight - stage.clientHeight) * value) / (count - 1),
      behavior: 'instant',
    });
    await new Promise<void>((r) => requestAnimationFrame(() => requestAnimationFrame(() => r())));
  }, value);
}

test('native scrolling holds exact reversible poses and independently transforms facial and SVG parts', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 950 });
  await page.goto('/home/');
  const selectors = [
    '.pet-eye',
    '.pet-eyebrows',
    '.pet-nose',
    '.pet-mouth',
    '.pet-lips',
    '.pet-cheeks',
    '.pet-jawline',
    '.pet-chin',
    '.pet-ears',
  ];
  const sample = () =>
    page.evaluate(
      (parts) => ({
        hill: document.querySelector('[data-journey-hill="back"]')!.getAttribute('d'),
        sun: (document.querySelector('.story-sun') as SVGSVGElement).style.cssText,
        flower: (document.querySelector('.shared-flower') as HTMLElement).style.cssText,
        petals: getComputedStyle(document.querySelector('.shared-flower .garden-petal')!).transform,
        faces: [...document.querySelectorAll('.experience-portraits .pet-face')].map((face) =>
          parts.map((part) => getComputedStyle(face.querySelector(part)!).transform),
        ),
      }),
      selectors,
    );
  await pose(page, 1.1);
  const first = await sample();
  await pose(page, 1.35);
  const second = await sample();
  expect(first.sun).not.toBe(second.sun);
  expect(first.flower).not.toBe(second.flower);
  expect(first.hill).not.toBe(second.hill);
  expect(first.petals).not.toBe(second.petals);
  for (let pet = 0; pet < 3; pet++)
    for (let part = 0; part < selectors.length; part++)
      expect(first.faces[pet][part], selectors[part]).not.toBe(second.faces[pet][part]);
  await pose(page, 1.1);
  expect(await sample()).toEqual(first);
  await page.waitForTimeout(150);
  expect(await sample()).toEqual(first);
  await expect(page.locator('.pet-forehead,.pet-hairline')).toHaveCount(0);
  for (const panel of await page.locator('[data-cinematic-panel]').all())
    await expect(panel).toHaveCSS('opacity', '1');
});

test('every chapter keeps bilingual copy accessible on mobile and desktop with static fallbacks', async ({
  page,
}) => {
  for (const width of [320, 390, 760, 1440]) {
    await page.setViewportSize({ width, height: 844 });
    await page.goto('/home/');
    for (const lang of ['en', 'zh']) {
      await language(page, lang);
      const panels = page.locator('[data-cinematic-panel]');
      for (let index = 0; index < (await panels.count()); index++) {
        await pose(page, index);
        await expect(panels.nth(index)).toHaveAttribute('aria-hidden', 'false');
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
          true,
        );
        const clipped = await panels.nth(index).evaluate((panel) => {
          const top = document.querySelector('.marketing-header')!.getBoundingClientRect().bottom;
          const bottom = document.querySelector('.cinema-controls')!.getBoundingClientRect().top;
          return [...panel.querySelectorAll('h1,h2,h3,p,a')]
            .filter((e) => {
              const b = e.getBoundingClientRect();
              return b.height > 0 && (b.top < top - 1 || b.bottom > bottom + 1);
            })
            .map((e) => e.textContent);
        });
        expect(clipped).toEqual([]);
        const covered = await panels.nth(index).evaluate((panel) => {
          const flower = document.querySelector('.shared-flower')!.getBoundingClientRect();
          return [...panel.querySelectorAll('h1,h2,h3,p,a')]
            .filter((element) => {
              const copy = element.getBoundingClientRect();
              return (
                copy.width > 0 &&
                copy.height > 0 &&
                copy.left < flower.right - 3 &&
                copy.right > flower.left + 3 &&
                copy.top < flower.bottom - 3 &&
                copy.bottom > flower.top + 3
              );
            })
            .map((element) => element.textContent);
        });
        expect(covered, `${width} ${lang} chapter ${index}`).toEqual([]);
      }
    }
  }
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect(page.locator('[data-cinema-enabled]')).toHaveCount(0);
  await expect(page.locator('[data-cinematic-panel][inert]')).toHaveCount(0);
  await page.locator('#contact').scrollIntoViewIfNeeded();
  await expect(page.locator('#contact h2')).toBeInViewport();
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.setViewportSize({ width: 390, height: 650 });
  await expect(page.locator('[data-cinema-enabled]')).toHaveCount(0);
  await page.locator('#services').scrollIntoViewIfNeeded();
  await expect(page.locator('.service-path').first()).toBeInViewport();
});

test('Home introductions open distinct detailed guides', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/home/');
  await page.locator('.service-path').first().click();
  await expect(page).toHaveURL(/\/services\/$/);
  await expect(page.locator('.preparation-list li')).toHaveCount(4);
  for (const path of ['/services/', '/about/', '/faqs/']) {
    await page.goto(path);
    await expect(page.locator('main h1')).toHaveCount(1);
  }
  await page.goto('/home/');
  await page.locator('.service-path[href="/services/#boarding"]').click();
  await expect(page).toHaveURL(/\/services\/#boarding$/);
  await expect(page.locator('#boarding')).toBeInViewport();
});

test('page navigation preserves history, repeated Home and a steady page-owned navbar', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 950 });
  await page.goto('/home/');
  const header = page.locator('.marketing-header');
  const initial = await header.boundingBox();
  for (const chapter of [1, 2, 3]) {
    await pose(page, chapter);
    expect(await header.boundingBox()).toEqual(initial);
    await expect(header.locator('nav a[aria-current="page"]')).toHaveAttribute('href', '/home/');
  }
  await header.locator('a[href="/services/"]').click();
  await header.locator('a[href="/about/"]').click();
  await expect(page).toHaveURL(/\/about\/$/);
  await page.goBack();
  await expect(page).toHaveURL(/\/services\/$/);
  await page.goForward();
  await expect(page).toHaveURL(/\/about\/$/);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await header.locator('nav a[href="/home/"]').click();
  await page.locator('#contact').scrollIntoViewIfNeeded();
  await header.locator('nav a[href="/home/"]').click();
  expect(await page.evaluate(() => scrollY)).toBe(0);
  await expect(header).toBeInViewport({ ratio: 1 });
});

test('boarding moon and stars transform independently and stop for reduced motion', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 950 });
  await page.goto('/home/');
  const sample = () =>
    page
      .locator('.service-path .care-symbol-night')
      .evaluate((e) =>
        [...e.querySelectorAll('.symbol-crescent,.symbol-star,.symbol-satellite')].map(
          (p) => getComputedStyle(p).transform,
        ),
      );
  await pose(page, 2.1);
  const first = await sample();
  await pose(page, 2.35);
  const second = await sample();
  for (let i = 0; i < 3; i++) expect(first[i]).not.toBe(second[i]);
  await pose(page, 2.1);
  expect(await sample()).toEqual(first);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect(page.locator('[data-scroll-enabled]')).toHaveCount(0);
  for (const value of await sample()) expect(value).toBe('none');
});
