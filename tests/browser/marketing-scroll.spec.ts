import { test, expect } from '@playwright/test';

test('scroll position scrubs the scene forward and back without timed animation', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 950 });
  await page.goto('/home/');
  const scene = page.locator('.scroll-hero');
  const geometry = await scene.evaluate((element) => ({
    top: element.getBoundingClientRect().top + scrollY,
    travel: element.clientHeight - innerHeight,
  }));
  async function pose(fraction: number) {
    await page.evaluate(
      ({ top, travel, fraction }) =>
        window.scrollTo({ top: top + travel * fraction, behavior: 'instant' }),
      { ...geometry, fraction },
    );
    await expect
      .poll(() => scene.evaluate((element) => Number(element.style.getPropertyValue('--scroll'))))
      .toBeCloseTo(fraction, 2);
    return page
      .locator('[data-scroll-object="hero-pet"]')
      .evaluate((element) => getComputedStyle(element).transform);
  }
  const start = await pose(0.2);
  const middle = await pose(0.5);
  const end = await pose(0.8);
  expect(start).not.toBe(middle);
  expect(middle).not.toBe(end);
  expect(await pose(0.5)).toBe(middle);
  expect(await pose(0.2)).toBe(start);
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          document.getAnimations().filter((animation) => animation.playState === 'running').length,
      ),
    )
    .toBe(0);
  await expect(page.locator('[data-scroll-object="hero-pet"]')).toHaveCSS('transform', start);

  const experience = page.locator('.experience-scene');
  const secondGeometry = await experience.evaluate((element) => ({
    top: element.offsetTop,
    travel: element.clientHeight - innerHeight,
  }));
  await page.evaluate(
    ({ top, travel }) => window.scrollTo({ top: top + travel * 0.25, behavior: 'instant' }),
    secondGeometry,
  );
  await expect
    .poll(() =>
      experience.evaluate((element) => Number(element.style.getPropertyValue('--scroll'))),
    )
    .toBeCloseTo(0.25, 2);
  const pet = page.locator('[data-scroll-object="pet-left"]');
  const firstPose = await pet.evaluate((element) => getComputedStyle(element).transform);
  await page.evaluate(
    ({ top, travel }) => window.scrollTo({ top: top + travel * 0.75, behavior: 'instant' }),
    secondGeometry,
  );
  await expect
    .poll(() => pet.evaluate((element) => getComputedStyle(element).transform))
    .not.toBe(firstPose);
  await page.evaluate(
    ({ top, travel }) => window.scrollTo({ top: top + travel * 0.25, behavior: 'instant' }),
    secondGeometry,
  );
  await expect(pet).toHaveCSS('transform', firstPose);
});

test('public pages own distinct content and home anchors link to detailed guides', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/home/');
  const homeParagraphs = await page.locator('main p').allTextContents();
  await expect(page.locator('.preparation-list, .pet-story, details')).toHaveCount(0);
  await page.locator('.service-path').first().click();
  await expect(page).toHaveURL(/\/services\/$/);
  await expect(page.locator('.preparation-list li')).toHaveCount(4);
  for (const path of ['/services/', '/about/', '/faqs/']) {
    await page.goto(path);
    const paragraphs = await page.locator('main p').allTextContents();
    expect(paragraphs.filter((text) => text.length > 60 && homeParagraphs.includes(text))).toEqual(
      [],
    );
    await expect(page.locator('h1')).toHaveCount(1);
  }
  await page.locator('nav a[href="/home/#services"]').click();
  await expect(page.locator('#services')).toBeInViewport();
  await page.locator('.service-path').nth(1).click();
  await expect(page).toHaveURL(/\/services\/#boarding$/);
  await expect(page.locator('#boarding')).toBeInViewport();
});

test('reduced motion and small bilingual layouts keep all content reachable', async ({ page }) => {
  await page.goto('/home/');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect(page.locator('.marketing-site')).not.toHaveAttribute('data-scroll-enabled');
  for (const width of [320, 390, 760, 1440]) {
    for (const language of ['en', 'zh']) {
      await page.setViewportSize({ width, height: 650 });
      await page.locator('select').selectOption(language);
      await expect(page.locator('html')).toHaveAttribute(
        'lang',
        language === 'zh' ? 'zh-Hans' : 'en',
      );
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
        true,
      );
      await page.locator('#contact').scrollIntoViewIfNeeded();
      await expect(page.locator('#contact h2')).toBeInViewport();
      await expect(page.locator('[data-scroll-object="hero-pet"]')).toHaveCSS('transform', 'none');
    }
  }
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await expect(page.locator('.marketing-site')).toHaveAttribute('data-scroll-enabled', '');
  for (const width of [320, 1440]) {
    await page.setViewportSize({ width, height: 844 });
    for (const fraction of [0, 0.5, 1]) {
      await page.evaluate(async (progress) => {
        window.scrollTo({
          top: (document.documentElement.scrollHeight - innerHeight) * progress,
          behavior: 'instant',
        });
        await new Promise<void>((resolve) =>
          requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
        );
      }, fraction);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
        true,
      );
    }
  }
});
