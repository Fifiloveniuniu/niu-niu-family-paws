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
