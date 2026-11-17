import { test, expect } from '@playwright/test';

test('chapter clicks animate the sun, reused flower, marker and internal SVG parts together', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 950 });
  await page.goto('/home/');
  await expect(page.locator('[data-cinema-enabled]')).toHaveCount(1);
  const sample = () =>
    page.evaluate(() => ({
      sun: (document.querySelector('.story-sun') as SVGSVGElement).style.left,
      flower: (document.querySelector('.shared-flower') as HTMLElement).style.cssText,
      marker: getComputedStyle(document.querySelector('.cinema-rail')!, '::before').transform,
      moon: document.querySelector('[data-journey-moon]')!.getAttribute('cx'),
      petals: getComputedStyle(document.querySelector('.shared-flower .garden-petal')!).transform,
      active: document.querySelector('[data-cinema-enabled]')!.getAttribute('data-active-chapter'),
    }));
  const first = await sample();
  await page.locator('.cinema-rail a[href="#contact"]').click();
  await page.waitForTimeout(200);
  const middle = await sample();
  expect(middle.sun).not.toBe(first.sun);
  expect(middle.flower).not.toBe(first.flower);
  expect(middle.marker).not.toBe(first.marker);
  expect(middle.petals).not.toBe(first.petals);
  // Only the outgoing/destination panels may enter; skipped chapters remain outside.
  const skipped = await page
    .locator('.home-services')
    .evaluate(
      (e) => Math.abs(new DOMMatrixReadOnly(getComputedStyle(e).transform).m42) > innerHeight,
    );
  expect(skipped).toBe(true);
  await expect(page.locator('.marketing-site')).not.toHaveAttribute('data-marketing-transition');
  const end = await sample();
  expect(end.moon).toBe('22');
  expect(end.sun).not.toBe(middle.sun);
  await expect(page.locator('[data-cinema-previous]')).toBeVisible();
  await expect(page.locator('[data-cinema-next]')).toHaveText('Restart story ↑');
  await expect(page.locator('.home-contact h2')).toHaveCSS('color', 'rgb(255, 250, 240)');
  await expect(page.locator('.cinema-controls')).toHaveCSS('color', 'rgb(255, 250, 240)');
  await expect(page.locator('.pet-forehead,.pet-hairline')).toHaveCount(0);
  await expect(page.locator('.shared-flower')).toHaveCount(1);
  await page.locator('[data-cinema-previous]').click();
  await page.waitForTimeout(180);
  const back = await sample();
  expect(back.marker).not.toBe(end.marker);
  // Redirect an in-flight transition from its current pose.
  await page.locator('.cinema-rail a[href="#experience"]').click();
  await expect(page.locator('.marketing-site')).not.toHaveAttribute('data-marketing-transition');
  await expect(page.locator('.experience-scene')).toHaveAttribute('aria-hidden', 'false');
  const face = page.locator('.experience-portraits .pet-mouth').first();
  const before = await face.evaluate((e) => getComputedStyle(e).transform);
  await page.locator('.cinema-rail a[href="#services"]').click();
  await page.waitForTimeout(200);
  expect(await face.evaluate((e) => getComputedStyle(e).transform)).not.toBe(before);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect(page.locator('[data-cinema-enabled]')).toHaveCount(0);
  await expect(page.locator('.home-services')).toBeInViewport();
  await expect(face).toHaveCSS('transform', 'none');
});

test('manual scroll is reversible and previous/next controls work in both languages', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 950 });
  await page.goto('/home/');
  const pose = async (value: number) => {
    await page.evaluate(async (value) => {
      const s = document.querySelector<HTMLElement>('[data-cinema-enabled]')!;
      const stage = s.querySelector<HTMLElement>('.cinematic-stage')!;
      const h = document.querySelector('.marketing-header')!.getBoundingClientRect().height;
      scrollTo({
        top:
          s.getBoundingClientRect().top +
          scrollY -
          h +
          (s.clientHeight - stage.clientHeight) * value,
        behavior: 'instant',
      });
      await new Promise<void>((r) => requestAnimationFrame(() => requestAnimationFrame(() => r())));
    }, value);
    return page.locator('.shared-flower').evaluate((e) => (e as HTMLElement).style.cssText);
  };
  const a = await pose(0.2);
  const b = await pose(0.6);
  expect(a).not.toBe(b);
  expect(await pose(0.2)).toBe(a);
  for (const width of [390, 1440]) {
    await page.setViewportSize({ width, height: 950 });
    if (width === 390) await page.locator('.marketing-menu-toggle').click();
    await page.locator('select').selectOption('zh');
    if (width === 390) await page.locator('.marketing-menu-toggle').click();
    await pose(0.2);
    await expect(page.locator('[data-cinema-previous]')).toHaveText('上一章 ↑');
    await expect(page.locator('[data-cinema-next]')).toHaveText('下一章 ↓');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
  }
});

test('direct chapter links restore exact poses and manual input interrupts click travel', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 950 });
  await page.goto('/home/#about');
  await expect(page.locator('[data-cinema-enabled]')).toHaveAttribute('data-active-chapter', '3');
  await expect
    .poll(() =>
      page
        .locator('[data-cinema-enabled]')
        .evaluate((e) => Number((e as HTMLElement).style.getPropertyValue('--cinema-progress'))),
    )
    .toBeCloseTo(3 / 8, 3);
  await page.reload();
  await expect(page.locator('[data-cinema-enabled]')).toHaveAttribute('data-active-chapter', '3');
  await page.locator('.cinema-rail a[href="#contact"]').click();
  await page.waitForTimeout(150);
  await page.mouse.wheel(0, -100);
  await expect(page.locator('.marketing-site')).not.toHaveAttribute('data-marketing-transition');
  await page.locator('.cinema-rail a[href="#main"]').click();
  await expect(page.locator('.marketing-site')).not.toHaveAttribute('data-marketing-transition');
  expect(await page.evaluate(() => scrollY)).toBe(0);
});

test('the shared flower exits both sides and returns while icon rotation is stronger and reversible', async ({
  page,
}) => {
  const pose = async (chapter: number) => {
    await page.evaluate(async (value) => {
      const story = document.querySelector<HTMLElement>('[data-cinema-enabled]')!;
      const stage = story.querySelector<HTMLElement>('.cinematic-stage')!;
      const h = document.querySelector('.marketing-header')!.getBoundingClientRect().height;
      const count = story.querySelectorAll('[data-cinematic-panel]').length;
      scrollTo({
        top:
          story.getBoundingClientRect().top +
          scrollY -
          h +
          ((story.clientHeight - stage.clientHeight) * value) / (count - 1),
        behavior: 'instant',
      });
      await new Promise<void>((r) => requestAnimationFrame(() => requestAnimationFrame(() => r())));
    }, chapter);
    return page.evaluate(() => {
      const flower = document.querySelector('.shared-flower')!.getBoundingClientRect();
      const stage = document.querySelector('.cinematic-stage')!.getBoundingClientRect();
      return {
        left: flower.left,
        right: flower.right,
        stageLeft: stage.left,
        stageRight: stage.right,
        rotation: getComputedStyle(document.querySelector('.service-path .care-symbol')!).transform,
        rays: getComputedStyle(document.querySelector('.service-path .symbol-rays')!).transform,
      };
    });
  };
  for (const width of [390, 1440]) {
    await page.setViewportSize({ width, height: 950 });
    await page.goto('/home/');
    const left = await pose(1);
    expect(left.right).toBeLessThan(left.stageLeft);
    const visible = await pose(2);
    expect(visible.right).toBeGreaterThan(visible.stageLeft);
    expect(visible.left).toBeLessThan(visible.stageRight);
    const right = await pose(3);
    expect(right.left).toBeGreaterThan(right.stageRight);
    await pose(4);
    expect(await pose(1)).toEqual(left);
    const first = await pose(2.1);
    const later = await pose(2.4);
    expect(later.rotation).not.toBe(first.rotation);
    // Matrices are parsed in the browser, where DOMMatrix is available.
    const delta = await page.evaluate(
      ({ a, b }) => {
        const x = new DOMMatrixReadOnly(a),
          y = new DOMMatrixReadOnly(b);
        return (Math.abs(Math.atan2(y.b, y.a) - Math.atan2(x.b, x.a)) * 180) / Math.PI;
      },
      { a: first.rays, b: later.rays },
    );
    expect(delta).toBeGreaterThan(60);
    expect(await pose(2.1)).toEqual(first);
  }
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect(page.locator('[data-scroll-enabled]')).toHaveCount(0);
  await expect(page.locator('.service-path .care-symbol').first()).toHaveCSS('transform', 'none');
});

test('each animal has independent readable ear, nose and opening-mouth motion while visible', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 950 });
  await page.goto('/home/');
  async function pose(chapter: number) {
    await page.evaluate(async (value) => {
      const s = document.querySelector<HTMLElement>('[data-cinema-enabled]')!,
        stage = s.querySelector<HTMLElement>('.cinematic-stage')!,
        header = document.querySelector('.marketing-header')!.getBoundingClientRect().height;
      const count = s.querySelectorAll('[data-cinematic-panel]').length;
      scrollTo({
        top:
          s.getBoundingClientRect().top +
          scrollY -
          header +
          ((s.clientHeight - stage.clientHeight) * value) / (count - 1),
        behavior: 'instant',
      });
      await new Promise<void>((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
      );
    }, chapter);
  }
  const sample = () =>
    page.locator('.experience-portraits .pet-face').evaluateAll((faces) =>
      faces.map((face) => {
        const matrix = (part: string) =>
          new DOMMatrixReadOnly(getComputedStyle(face.querySelector(part)!).transform);
        const left = matrix('.pet-ear-left'),
          right = matrix('.pet-ear-right'),
          nose = matrix('.pet-nose'),
          mouth = matrix('.pet-mouth-opening');
        return {
          left: (Math.atan2(left.b, left.a) * 180) / Math.PI,
          right: (Math.atan2(right.b, right.a) * 180) / Math.PI,
          nose: nose.e,
          mouth: mouth.d,
        };
      }),
    );
  await pose(1);
  const first = await sample();
  await pose(1.35);
  const later = await sample();
  for (let i = 0; i < 3; i++) {
    expect(later[i].left - first[i].left).toBeGreaterThan(15);
    expect(first[i].right - later[i].right).toBeGreaterThan(12);
    expect(later[i].nose - first[i].nose).toBeGreaterThan(1.5);
    expect(later[i].mouth - first[i].mouth).toBeGreaterThan(0.4);
  }
  await pose(1);
  expect(await sample()).toEqual(first);
  await page.locator('.cinema-rail a[href="#services"]').click();
  await page.waitForTimeout(200);
  expect(await sample()).not.toEqual(first);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect(page.locator('[data-scroll-enabled]')).toHaveCount(0);
  await expect(page.locator('.pet-ear-left').first()).toHaveCSS('transform', 'none');
  await expect(page.locator('.pet-mouth-opening').first()).toHaveCSS('transform', 'none');
});
