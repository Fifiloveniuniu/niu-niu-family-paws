import { test, expect } from '@playwright/test';

test('one cinematic timeline scrubs across chapters and restores exact earlier poses', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 950 });
  await page.goto('/home/');
  const story = page.locator('[data-cinematic-story]');
  await expect(story).toHaveAttribute('data-cinema-enabled', '');
  async function pose(chapter: number) {
    await page.evaluate((value) => {
      const element = document.querySelector<HTMLElement>('[data-cinematic-story]')!;
      const top = element.getBoundingClientRect().top + scrollY;
      window.scrollTo({
        top: top + ((element.clientHeight - innerHeight) * value) / 5,
        behavior: 'instant',
      });
    }, chapter);
    await expect
      .poll(() =>
        story.evaluate((element) => Number(element.style.getPropertyValue('--cinema-progress'))),
      )
      .toBeCloseTo(chapter / 5, 2);
    return page
      .locator('[data-scroll-object="hero-pet"]')
      .evaluate((element) => getComputedStyle(element).transform);
  }
  const first = await pose(0.2);
  const middle = await pose(0.5);
  for (const panel of await page.locator('[data-cinematic-panel]').all()) {
    const movement = await panel.evaluate((element) => {
      const matrix = new DOMMatrixReadOnly(getComputedStyle(element).transform);
      return { horizontal: matrix.m41, vertical: matrix.m42 };
    });
    expect(movement.horizontal).toBe(0);
    expect(Math.abs(movement.vertical)).toBeLessThanOrEqual(24);
  }
  expect(first).not.toBe(middle);
  await pose(1.25);
  await expect(story).toHaveAttribute('data-active-chapter', '1');
  await page.locator('select').selectOption('zh');
  await expect(story).toHaveAttribute('data-active-chapter', '1');
  await page.locator('select').selectOption('en');
  await expect(
    page.getByRole('heading', { name: 'Every little personality. A thoughtful beginning.' }),
  ).toBeVisible();
  expect(
    await page.locator('.scroll-hero').evaluate((element) => (element as HTMLElement).inert),
  ).toBe(true);
  expect(await pose(0.5)).toBe(middle);
  expect(await pose(0.2)).toBe(first);
  expect(
    await page.evaluate(
      () =>
        document.getAnimations().filter((animation) => animation.playState === 'running').length,
    ),
  ).toBe(0);
  await expect(page.locator('[data-scroll-object="hero-pet"]')).toHaveCSS('transform', first);
  await page
    .getByRole('navigation', { name: 'Story chapters' })
    .getByRole('link', { name: 'Services', exact: true })
    .click();
  await expect(story).toHaveAttribute('data-active-chapter', '3');
  await expect
    .poll(() =>
      story.evaluate((element) => Number(element.style.getPropertyValue('--cinema-progress'))),
    )
    .toBeCloseTo(0.6, 3);
  await expect(page.locator('.cinema-count')).toHaveText('04 / 06');
  await expect(
    page.getByRole('heading', { name: 'For a day. For a little longer.' }),
  ).toBeVisible();
  await page.reload();
  await expect(story).toHaveAttribute('data-active-chapter', '3');
  await expect
    .poll(() =>
      story.evaluate((element) => Number(element.style.getPropertyValue('--cinema-progress'))),
    )
    .toBeCloseTo(0.6, 3);
  await page.locator('[data-cinema-next]').click();
  await expect(story).toHaveAttribute('data-active-chapter', '4');
  await page.goBack();
  await expect(story).toHaveAttribute('data-active-chapter', '3');
});

test('public pages own distinct content and chapter links open detailed guides', async ({
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

test('bilingual chapters fit mobile and desktop; reduced motion restores static sections', async ({
  page,
}) => {
  await page.goto('/home/');
  for (const width of [320, 390, 760, 1440]) {
    await page.setViewportSize({ width, height: 844 });
    for (const language of ['en', 'zh']) {
      await page.locator('select').selectOption(language);
      const headerHeight = await page
        .locator('.marketing-header')
        .evaluate((element) => element.getBoundingClientRect().height);
      expect(headerHeight).toBeLessThanOrEqual(width <= 760 ? 115 : 85);
      for (const chapter of [0, 1, 2, 3, 4, 5]) {
        await page.evaluate((value) => {
          const story = document.querySelector<HTMLElement>('[data-cinematic-story]')!;
          window.scrollTo({
            top:
              story.getBoundingClientRect().top +
              scrollY +
              ((story.clientHeight - innerHeight) * value) / 5,
            behavior: 'instant',
          });
        }, chapter);
        await expect(page.locator('[data-cinematic-story]')).toHaveAttribute(
          'data-active-chapter',
          String(chapter),
        );
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
          true,
        );
        const panel = page.locator('[data-cinematic-panel]').nth(chapter);
        const links = panel.locator('a');
        for (const link of await links.all()) await expect(link).toBeInViewport();
      }
    }
  }
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect(page.locator('[data-cinematic-story]')).not.toHaveAttribute('data-cinema-enabled');
  await expect(page.locator('[data-cinematic-panel][inert]')).toHaveCount(0);
  await expect(page.locator('[data-cinema-anchor][id]')).toHaveCount(0);
  await expect(page.locator('#services')).toHaveClass('home-services');
  await page.locator('#contact').scrollIntoViewIfNeeded();
  await expect(page.locator('#contact h2')).toBeInViewport();
  await expect(page.locator('[data-scroll-object="hero-pet"]')).toHaveCSS('transform', 'none');
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.setViewportSize({ width: 390, height: 650 });
  await expect(page.locator('[data-cinematic-story]')).not.toHaveAttribute('data-cinema-enabled');
  await page.locator('#services').scrollIntoViewIfNeeded();
  await expect(page.locator('.service-path').first()).toBeInViewport();
});
