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
      const stageHeight = element.querySelector<HTMLElement>('.cinematic-stage')!.clientHeight;
      const headerHeight = document
        .querySelector('.marketing-header')!
        .getBoundingClientRect().height;
      const top = element.getBoundingClientRect().top + scrollY - headerHeight;
      window.scrollTo({
        top: top + ((element.clientHeight - stageHeight) * value) / 5,
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
  // Equal scroll distances should move the artwork progressively farther.
  const artworkOffsets: number[] = [];
  for (const chapter of [0, 0.15, 0.3, 0.45]) {
    await pose(chapter);
    artworkOffsets.push(
      await page
        .locator('[data-scroll-object="hero-pet"]')
        .evaluate((element) => new DOMMatrixReadOnly(getComputedStyle(element).transform).m42),
    );
  }
  const distances = artworkOffsets
    .slice(1)
    .map((offset, index) => Math.abs(offset - artworkOffsets[index]));
  expect(distances[1]).toBeGreaterThan(distances[0] * 1.5);
  expect(distances[2]).toBeGreaterThan(distances[1] * 1.2);
  const first = await pose(0.2);
  const middle = await pose(0.5);
  for (const panel of await page.locator('[data-cinematic-panel]').all()) {
    const movement = await panel.evaluate((element) => {
      const matrix = new DOMMatrixReadOnly(getComputedStyle(element).transform);
      return { horizontal: matrix.m41, vertical: matrix.m42 };
    });
    expect(movement.horizontal).toBe(0);
    await expect(panel).toHaveCSS('opacity', '1');
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
  await expect(story).toHaveAttribute('data-active-chapter', '2');
  await expect
    .poll(() =>
      story.evaluate((element) => Number(element.style.getPropertyValue('--cinema-progress'))),
    )
    .toBeCloseTo(0.4, 3);
  await expect(page.locator('.cinema-count')).toHaveText('03 / 06');
  await expect(
    page.getByRole('heading', { name: 'For a day. For a little longer.' }),
  ).toBeVisible();
  await page.reload();
  await expect(story).toHaveAttribute('data-active-chapter', '2');
  await expect
    .poll(() =>
      story.evaluate((element) => Number(element.style.getPropertyValue('--cinema-progress'))),
    )
    .toBeCloseTo(0.4, 3);
  await page.locator('[data-cinema-next]').click();
  await expect(story).toHaveAttribute('data-active-chapter', '3');
  await page.goBack();
  await expect(story).toHaveAttribute('data-active-chapter', '2');
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
  await page.locator('.marketing-header nav a[href="/home/"]').click();
  await page.locator('.service-path').nth(1).click();
  await expect(page).toHaveURL(/\/services\/#boarding$/);
  await expect(page.locator('#boarding')).toBeInViewport();
});

test('bilingual chapters fit mobile and desktop; reduced motion restores static sections', async ({
  page,
}) => {
  await page.goto('/home/');
  for (const [width, height] of [
    [320, 810],
    [320, 844],
    [390, 844],
    [760, 844],
    [1440, 844],
  ]) {
    await page.setViewportSize({ width, height });
    for (const language of ['en', 'zh']) {
      await page.locator('select').selectOption(language);
      const headerHeight = await page
        .locator('.marketing-header')
        .evaluate((element) => element.getBoundingClientRect().height);
      expect(headerHeight).toBeLessThanOrEqual(width <= 760 ? 115 : 85);
      for (const chapter of [0, 1, 2, 3, 4, 5]) {
        await page.evaluate((value) => {
          const story = document.querySelector<HTMLElement>('[data-cinematic-story]')!;
          const headerHeight = document
            .querySelector('.marketing-header')!
            .getBoundingClientRect().height;
          const stageHeight = story.querySelector<HTMLElement>('.cinematic-stage')!.clientHeight;
          window.scrollTo({
            top:
              story.getBoundingClientRect().top +
              scrollY -
              headerHeight +
              ((story.clientHeight - stageHeight) * value) / 5,
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
        await expect(page.locator('.marketing-header')).toBeInViewport({ ratio: 1 });
        const sceneBounds = await page.locator('.cinematic-stage').evaluate((element) => {
          const stage = element.getBoundingClientRect();
          const header = document.querySelector('.marketing-header')!.getBoundingClientRect();
          return {
            top: stage.top,
            headerBottom: header.bottom,
            bottom: stage.bottom,
            viewport: innerHeight,
          };
        });
        expect(Math.abs(sceneBounds.top - sceneBounds.headerBottom)).toBeLessThan(2);
        expect(Math.abs(sceneBounds.bottom - sceneBounds.viewport)).toBeLessThan(2);
        const clippedCopy = await panel.evaluate((element) => {
          const top = document.querySelector('.marketing-header')!.getBoundingClientRect().bottom;
          const bottom = document.querySelector('.cinema-controls')!.getBoundingClientRect().top;
          return [...element.querySelectorAll('h1,h2,h3,p,a')]
            .filter((node) => {
              const bounds = node.getBoundingClientRect();
              return bounds.height > 0 && (bounds.top < top - 1 || bounds.bottom > bottom + 1);
            })
            .map((node) => node.textContent);
        });
        expect(clippedCopy).toEqual([]);
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

test('Home chapter controls animate without replaying intervening chapters and Home restores the header', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 950 });
  await page.goto('/home/');
  for (const language of ['en', 'zh']) {
    await page.locator('select').selectOption(language);
    for (const anchor of ['services', 'about', 'faq', 'main', 'main']) {
      await page.locator(`.cinema-rail a[href="#${anchor}"]`).click();
      await expect(page.locator('.marketing-site')).toHaveAttribute(
        'data-marketing-transition',
        '',
      );
      await expect(page.locator('.marketing-site')).not.toHaveAttribute(
        'data-marketing-transition',
        { timeout: 900 },
      );
      if (anchor === 'main') {
        expect(await page.evaluate(() => scrollY)).toBe(0);
        await expect(page.locator('.marketing-header')).toBeInViewport({ ratio: 1 });
      } else {
        const chapter = { services: '2', about: '3', faq: '4' }[anchor];
        await expect(page.locator('[data-cinematic-story]')).toHaveAttribute(
          'data-active-chapter',
          chapter!,
        );
        const targetTop = await page
          .locator(`#${anchor}`)
          .evaluate((element) => element.getBoundingClientRect().top);
        const headerHeight = await page
          .locator('.marketing-header')
          .evaluate((element) => element.getBoundingClientRect().height);
        expect(Math.abs(targetTop - headerHeight - 16)).toBeLessThan(2);
      }
    }
  }
  await page.goto('/about/');
  await page.locator('.marketing-header nav a[href="/home/"]').click();
  await expect(page.locator('.marketing-header')).toBeInViewport({ ratio: 1 });
  expect(await page.evaluate(() => scrollY)).toBe(0);
  await page.goto('/home/#main');
  await expect(page.locator('.marketing-header')).toBeInViewport({ ratio: 1 });
});

test('Home scrolling leaves navbar selection and position unchanged; navbar opens separate pages', async ({
  page,
}) => {
  for (const width of [390, 1440]) {
    await page.setViewportSize({ width, height: 950 });
    await page.goto('/home/');
    for (const language of ['en', 'zh']) {
      await page.locator('select').selectOption(language);
      const header = page.locator('.marketing-header');
      const initialBox = await header.boundingBox();
      for (const chapter of [0, 2, 3, 4, 5]) {
        await page.evaluate((value) => {
          const story = document.querySelector<HTMLElement>('[data-cinematic-story]')!;
          const height = document
            .querySelector('.marketing-header')!
            .getBoundingClientRect().height;
          const stage = story.querySelector<HTMLElement>('.cinematic-stage')!;
          scrollTo({
            top:
              story.getBoundingClientRect().top +
              scrollY -
              height +
              ((story.clientHeight - stage.clientHeight) * value) / 5,
            behavior: 'instant',
          });
        }, chapter);
        await expect(page.locator('[data-cinematic-story]')).toHaveAttribute(
          'data-active-chapter',
          String(chapter),
        );
        await expect(header.locator('nav a[aria-current="page"]')).toHaveAttribute(
          'href',
          '/home/',
        );
        expect(await header.boundingBox()).toEqual(initialBox);
      }
      for (const path of ['/services/', '/about/', '/faqs/', '/home/']) {
        await header.locator(`nav a[href="${path}"]`).click();
        await expect(page).toHaveURL(new RegExp(path + '$'));
        await expect(page.locator('.marketing-site')).toHaveAttribute(
          'data-marketing-transition',
          '',
        );
        await expect(page.locator('.marketing-site')).not.toHaveAttribute(
          'data-marketing-transition',
        );
        await expect(header.locator('nav a[aria-current="page"]')).toHaveAttribute('href', path);
        await expect(page.locator('main h1')).toHaveCount(1);
        expect(await page.evaluate(() => scrollY)).toBe(0);
        if (path !== '/home/') await expect(page.locator('[data-cinematic-story]')).toHaveCount(0);
      }
    }
  }
});

test('page navigation handles rapid clicks, history, repeated Home and reduced motion', async ({
  page,
}) => {
  await page.goto('/home/');
  await page.locator('.marketing-header nav a[href="/services/"]').click();
  await page.locator('.marketing-header nav a[href="/about/"]').click();
  await expect(page).toHaveURL(/\/about\/$/);
  await expect(page.locator('.marketing-site')).not.toHaveAttribute('data-marketing-transition');
  await page.goBack();
  await expect(page).toHaveURL(/\/services\/$/);
  await expect(page.locator('.marketing-header nav [aria-current="page"]')).toHaveAttribute(
    'href',
    '/services/',
  );
  await page.goForward();
  await expect(page).toHaveURL(/\/about\/$/);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.locator('.marketing-header nav a[href="/home/"]').click();
  await page.locator('#contact').scrollIntoViewIfNeeded();
  await page.locator('.marketing-header nav a[href="/home/"]').click();
  expect(await page.evaluate(() => scrollY)).toBe(0);
  await expect(page.locator('.marketing-site')).not.toHaveAttribute('data-marketing-transition');
});

test('one persistent landscape and internal SVG shapes morph continuously and reverse exactly', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 950 });
  await page.goto('/home/');
  async function scenePose(chapter: number) {
    await page.evaluate((value) => {
      const story = document.querySelector<HTMLElement>('[data-cinematic-story]')!;
      const stage = story.querySelector<HTMLElement>('.cinematic-stage')!;
      const header = document.querySelector('.marketing-header')!.getBoundingClientRect().height;
      scrollTo({
        top:
          story.getBoundingClientRect().top +
          scrollY -
          header +
          ((story.clientHeight - stage.clientHeight) * value) / 5,
        behavior: 'instant',
      });
    }, chapter);
    await expect
      .poll(() =>
        page
          .locator('[data-cinematic-story]')
          .evaluate((element) =>
            Number((element as HTMLElement).style.getPropertyValue('--cinema-progress')),
          ),
      )
      .toBeCloseTo(chapter / 5, 2);
    return page.evaluate(() => ({
      hill: document.querySelector('[data-journey-hill="back"]')!.getAttribute('d'),
      orb: document.querySelector('[data-journey-orb]')!.getAttribute('transform'),
      moon: document.querySelector('[data-journey-moon]')!.getAttribute('cx'),
      petal: getComputedStyle(document.querySelector('.garden-petal')!).transform,
      tail: getComputedStyle(document.querySelector('.pet-tail')!).transform,
      rays: getComputedStyle(document.querySelector('.symbol-rays')!).transform,
    }));
  }
  await expect(page.locator('.story-landscape')).toHaveCount(1);
  const first = await scenePose(0.15);
  const later = await scenePose(0.4);
  expect(later.hill).not.toBe(first.hill);
  expect(later.orb).not.toBe(first.orb);
  expect(later.petal).not.toBe(first.petal);
  expect(later.tail).not.toBe(first.tail);
  const beforeBoundary = await scenePose(0.999);
  const afterBoundary = await scenePose(1.001);
  expect(Math.abs(Number(beforeBoundary.moon) - Number(afterBoundary.moon))).toBeLessThan(0.1);
  expect(await scenePose(0.15)).toEqual(first);
  const service = await scenePose(2.15);
  expect((await scenePose(2.4)).rays).not.toBe(service.rays);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect(page.locator('.story-landscape')).toBeHidden();
  await expect(page.locator('.garden-petal').first()).toHaveCSS('transform', 'none');
  await expect(page.locator('.pet-tail')).toHaveCSS('transform', 'none');
});

test('chapter buttons move the visible destination without fading or animating a hidden panel', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 950 });
  await page.goto('/home/');
  await page.locator('.cinema-rail a[href="#services"]').click();
  await expect
    .poll(
      () =>
        page.locator('.home-services').evaluate((element) => {
          const entrance = element
            .getAnimations()
            .find((animation) => animation.playState === 'running');
          const transform = new DOMMatrixReadOnly(getComputedStyle(element).transform);
          return (
            element.getAttribute('aria-hidden') === 'false' &&
            !!entrance &&
            transform.m42 > 1 &&
            Number(getComputedStyle(element).opacity) === 1
          );
        }),
      { intervals: [20], timeout: 900 },
    )
    .toBe(true);
  await expect(page.locator('.marketing-site')).not.toHaveAttribute('data-marketing-transition');
  await expect(page.locator('.home-services')).toHaveAttribute('aria-hidden', 'false');
  expect(
    await page.evaluate(
      () =>
        document.getAnimations().filter((animation) => animation.playState === 'running').length,
    ),
  ).toBe(0);
  await page.locator('.cinema-rail a[href="#about"]').click();
  await expect
    .poll(
      () =>
        page
          .locator('.home-trust')
          .evaluate(
            (element) =>
              element.getAttribute('aria-hidden') === 'false' &&
              element.getAnimations().some((animation) => animation.playState === 'running'),
          ),
      { intervals: [20], timeout: 900 },
    )
    .toBe(true);
  await expect(page.locator('.marketing-site')).not.toHaveAttribute('data-marketing-transition');
});

test('scenes move without fading; sun follows one arc and resizing serves the composition', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 950 });
  await page.goto('/home/');
  const samples: Array<{
    orbX: number;
    orbY: number;
    seedX: number;
    seedY: number;
    orbScale: number;
    seedScale: number;
    archScale: number;
  }> = [];
  for (const chapter of [0, 0.25, 0.5, 0.75, 1, 2, 3, 4, 5]) {
    await page.evaluate((value) => {
      const story = document.querySelector<HTMLElement>('[data-cinematic-story]')!;
      const stage = story.querySelector<HTMLElement>('.cinematic-stage')!;
      const header = document.querySelector('.marketing-header')!.getBoundingClientRect().height;
      scrollTo({
        top:
          story.getBoundingClientRect().top +
          scrollY -
          header +
          ((story.clientHeight - stage.clientHeight) * value) / 5,
        behavior: 'instant',
      });
    }, chapter);
    await expect
      .poll(() =>
        page
          .locator('[data-cinematic-story]')
          .evaluate((element) =>
            Number((element as HTMLElement).style.getPropertyValue('--cinema-progress')),
          ),
      )
      .toBeCloseTo(chapter / 5, 2);
    const sample = await page.evaluate(() => {
      const panels = [...document.querySelectorAll<HTMLElement>('[data-cinematic-panel]')];
      const positions = panels.map((element) => element.getBoundingClientRect());
      const orb = (
        document.querySelector('[data-journey-orb]') as SVGGraphicsElement
      ).transform.baseVal.consolidate()!.matrix;
      const seed = (
        document.querySelector('[data-journey-seed]') as SVGGraphicsElement
      ).transform.baseVal.consolidate()!.matrix;
      return {
        opacity: panels.map((element) => getComputedStyle(element).opacity),
        gaps: positions.slice(1).map((position, index) => position.top - positions[index].bottom),
        orbX: orb.e,
        orbY: orb.f,
        seedX: seed.e,
        seedY: seed.f,
        orbScale: Math.hypot(orb.a, orb.b),
        seedScale: Math.hypot(seed.a, seed.b),
        archScale: new DOMMatrixReadOnly(
          getComputedStyle(document.querySelector('.garden-arch')!).transform,
        ).a,
      };
    });
    expect(sample.opacity.every((opacity) => opacity === '1')).toBe(true);
    expect(sample.gaps.every((gap) => Math.abs(gap) < 2)).toBe(true);
    samples.push(sample);
  }
  expect(samples[0].orbX - samples.at(-1)!.orbX).toBeGreaterThan(1000);
  expect(
    samples.every((sample, index) => index === 0 || sample.orbX < samples[index - 1].orbX),
  ).toBe(true);
  expect(new Set(samples.map((sample) => sample.seedX)).size).toBe(1);
  expect(new Set(samples.map((sample) => sample.orbScale)).size).toBe(1);
  for (const sample of samples) expect(sample.seedScale).toBeCloseTo(samples[0].seedScale, 5);
  expect(samples[3].archScale).toBeLessThan(samples[0].archScale);
  expect(samples.every((sample) => sample.orbY >= 80 && sample.orbY <= 100)).toBe(true);
  expect(
    samples.every((sample, index) => index === 0 || sample.seedY <= samples[index - 1].seedY),
  ).toBe(true);
  await page.locator('.cinema-rail a[href="#services"]').click();
  const keyframes = await page.evaluate(() =>
    document
      .getAnimations()
      .flatMap((animation) => (animation.effect as KeyframeEffect).getKeyframes()),
  );
  expect(keyframes.length).toBeGreaterThan(0);
  expect(keyframes.every((keyframe) => !('opacity' in keyframe))).toBe(true);
  await expect(page.locator('.marketing-site')).not.toHaveAttribute('data-marketing-transition');
});

test('sun and flower size adapts to phone composition instead of growing through the story', async ({
  page,
}) => {
  const sizes: Array<{ sun: number; flower: number }> = [];
  for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: 950 });
    await page.goto('/home/');
    sizes.push(
      await page.evaluate(() => {
        const scale = (selector: string) => {
          const matrix = (
            document.querySelector(selector) as SVGGraphicsElement
          ).transform.baseVal.consolidate()!.matrix;
          return Math.hypot(matrix.a, matrix.b);
        };
        return { sun: scale('[data-journey-orb]'), flower: scale('[data-journey-seed]') };
      }),
    );
  }
  expect(sizes[1].sun).toBeLessThan(sizes[0].sun);
  expect(sizes[1].flower).toBeLessThan(sizes[0].flower);
});
