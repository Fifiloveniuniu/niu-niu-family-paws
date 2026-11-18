import { test, expect } from '@playwright/test';

test('floating menus preserve page and sign-in position, and sign-in opens a dialog', async ({
  page,
}) => {
  for (const width of [320, 390, 1440]) {
    await page.setViewportSize({ width, height: 844 });
    await page.goto('/services/');
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(150);
    await page.evaluate(() => scrollTo(0, 200));
    if (width < 1181) await page.locator('.marketing-menu-toggle').click();
    const before = await page.evaluate(() => ({
      y: scrollY,
      sign: document.querySelector('.sign-in-link')!.getBoundingClientRect().y,
    }));
    const trigger = (await page.locator('.language-menu-trigger').boundingBox())!;
    await page.mouse.click(trigger.x + trigger.width / 2, trigger.y + trigger.height / 2);
    await expect(page.getByRole('menu')).toBeVisible();
    expect(
      await page.evaluate(() => ({
        y: scrollY,
        sign: document.querySelector('.sign-in-link')!.getBoundingClientRect().y,
      })),
    ).toEqual(before);
    await page.keyboard.press('Escape');
    if (width < 1181) {
      await page.locator('[aria-controls=service-menu].nav-submenu-toggle').click();
      await expect(page.locator('#service-menu')).toBeVisible();
      expect(await page.evaluate(() => scrollY)).toBe(before.y);
      await page.locator('[aria-controls=service-menu].nav-submenu-toggle').click();
    }
    await page.locator('.sign-in-link').click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await expect(page).toHaveURL(/\/services\/$/);
    await expect(page.getByRole('button', { name: 'Continue with Google' })).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog')).toHaveCount(0);
  }
});

test('standard mobile heights keep all story chapters readable with supplied photos', async ({
  page,
}) => {
  for (const [width, height, lang] of [
    [320, 740, 'en'],
    [320, 740, 'zh'],
    [390, 844, 'en'],
    [390, 844, 'zh'],
  ] as const) {
    await page.setViewportSize({ width, height });
    await page.addInitScript((lang) => localStorage.setItem('language', lang), lang);
    await page.goto('/home/?preview=sample#main');
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(150);
    await expect(page.locator('[data-cinema-enabled]')).toHaveCount(1);
    for (let chapter = 0; chapter < 9; chapter++) {
      const clipped = await page.evaluate(async (chapter) => {
        const story = document.querySelector<HTMLElement>('[data-cinema-enabled]')!;
        const stage = story.querySelector<HTMLElement>('.cinematic-stage')!;
        const header = document.querySelector('.marketing-header')!.getBoundingClientRect().bottom;
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
        if (chapter === 4 && innerWidth <= 760) return []; // Full-size photos use a scrollable chapter, checked separately below.
        return [
          ...story
            .querySelectorAll('[data-cinematic-panel]')
            [chapter].querySelectorAll('h1,h2,h3,p,a,blockquote,figcaption,img'),
        ]
          .filter((e) => {
            const b = e.getBoundingClientRect();
            return b.height > 0 && (b.top < header - 1 || b.bottom > bottom + 1);
          })
          .map((e) => e.textContent || e.tagName);
      }, chapter);
      expect.soft(clipped, `${width}x${height} chapter ${chapter}`).toEqual([]);
    }
    await expect(page.locator('.home-photo-pair img').first()).toHaveAttribute(
      'src',
      /grooming.png$/,
    );
    await expect(page.locator('.home-photo-pair img').last()).toHaveAttribute(
      'src',
      /washing.png$/,
    );
  }
});

test('marketing Google sign-in opens its provider popup and cancellation returns to the dialog', async ({
  page,
}) => {
  await page.goto('/services/');
  await page.locator('.sign-in-link').click();
  const popup = page.waitForEvent('popup');
  await page.getByRole('button', { name: 'Continue with Google' }).click();
  const provider = await popup;
  await provider.waitForURL(/\/emulator\/auth\/handler/);
  await provider.close();
  await expect(page.getByRole('button', { name: 'Continue with Google' })).toBeEnabled({
    timeout: 10000,
  });
  await expect(page.getByRole('dialog')).toBeVisible();
  await expect(page).toHaveURL(/\/services\/$/);
});

test('sun rays fade into the moon and chapters use responsive rows and columns', async ({
  page,
}) => {
  for (const width of [320, 390, 1440]) {
    await page.setViewportSize({ width, height: 844 });
    await page.goto('/home/?preview=sample#main');
    await page.evaluate(() => document.fonts.ready);
    const pose = async (chapter: number) =>
      page.evaluate(async (chapter) => {
        const story = document.querySelector<HTMLElement>('[data-cinema-enabled]')!;
        const stage = story.querySelector<HTMLElement>('.cinematic-stage')!;
        const header = document.querySelector('.marketing-header')!.getBoundingClientRect().height;
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
        return parseFloat(getComputedStyle(story.querySelector('.journey-rays')!).opacity);
      }, chapter);
    const sun = await pose(0),
      middle = await pose(3),
      moon = await pose(8);
    expect(sun).toBeGreaterThan(middle);
    expect(middle).toBeGreaterThan(moon);
    expect(moon).toBe(0);
    expect(await pose(0)).toBeCloseTo(sun, 4);
    for (const [chapter, selector] of [
      [2, '.service-path'],
      [5, '.number-grid article'],
    ] as const) {
      await pose(chapter);
      const rows = await page.locator(selector).evaluateAll((es) =>
        es.map((e) => {
          const b = e.getBoundingClientRect();
          return { x: b.x, width: b.width, top: b.top, bottom: b.bottom };
        }),
      );
      if (width <= 760) {
        for (let i = 1; i < rows.length; i++) {
          expect(rows[i].top).toBeGreaterThanOrEqual(rows[i - 1].bottom - 1);
          expect(rows[i].x).toBeCloseTo(rows[0].x, 0);
          expect(rows[i].width).toBeCloseTo(rows[0].width, 0);
        }
        const available = await page
          .locator(chapter === 2 ? '.home-services' : '.number-grid')
          .evaluate(
            (e) =>
              e.clientWidth -
              parseFloat(getComputedStyle(e).paddingLeft) -
              parseFloat(getComputedStyle(e).paddingRight),
          );
        expect(rows[0].width).toBeCloseTo(available, 0);
      } else {
        const columns = chapter === 2 ? 2 : 3;
        for (let i = 1; i < columns; i++) {
          expect(rows[i].top).toBeCloseTo(rows[0].top, 0);
          expect(rows[i].x).toBeGreaterThan(rows[i - 1].x + rows[i - 1].width - 1);
        }
        if (chapter === 2) expect(rows[2].top).toBeGreaterThanOrEqual(rows[0].bottom);
      }
    }
  }
});

test('mobile Home photos fill their column, captions follow photos and the chapter scrolls', async ({
  page,
}) => {
  for (const width of [320, 390, 760]) {
    await page.setViewportSize({ width, height: 844 });
    await page.goto('/home/#spaces');
    const panel = page.locator('.home-spaces');
    await expect(panel).toHaveAttribute('aria-hidden', 'false');
    await expect(panel).toHaveCSS('overflow-y', 'auto');
    await page.evaluate(() => document.fonts.ready);
    const geometry = await panel.evaluate((e) => {
      const available =
        e.clientWidth -
        parseFloat(getComputedStyle(e).paddingLeft) -
        parseFloat(getComputedStyle(e).paddingRight);
      return [...e.querySelectorAll('figure')].map((f) => {
        const image = f.querySelector('img')!,
          caption = f.querySelector('figcaption')!,
          i = image.getBoundingClientRect(),
          c = caption.getBoundingClientRect(),
          s = getComputedStyle(image);
        return {
          available,
          width: i.width,
          gap: c.top - i.bottom,
          left: c.left - i.left,
          radii: [
            s.borderTopLeftRadius,
            s.borderTopRightRadius,
            s.borderBottomLeftRadius,
            s.borderBottomRightRadius,
          ],
          ratio: i.width / i.height,
          source: image.naturalWidth / image.naturalHeight,
        };
      });
    });
    for (const item of geometry) {
      expect(item.width).toBeCloseTo(item.available, 0);
      expect(item.gap).toBeGreaterThanOrEqual(11.9);
      expect(item.left).toBeCloseTo(0, 0);
      expect(new Set(item.radii).size).toBe(1);
      expect(item.radii[0]).toBe('24px');
      expect(item.ratio).toBeCloseTo(item.source, 2);
    }
    await panel.hover();
    const before = await page.evaluate(() => scrollY);
    await page.mouse.wheel(0, 500);
    await expect.poll(() => panel.evaluate((e) => e.scrollTop)).toBeGreaterThan(100);
    await page.waitForTimeout(250); // Let Chrome finish the wheel gesture before repositioning a caption.
    expect(await page.evaluate(() => scrollY)).toBe(before);
    for (const caption of await panel.locator('figcaption').all()) {
      await caption.evaluate((e) => {
        const panel = e.closest('.home-spaces')!;
        panel.scrollTop +=
          e.getBoundingClientRect().top -
          panel.getBoundingClientRect().top -
          panel.clientHeight / 2;
      });
      await expect(caption).toBeInViewport();
      const b = (await caption.boundingBox())!;
      const controls = (await page.locator('.cinema-controls').boundingBox())!;
      expect(b.y + b.height).toBeLessThan(controls.y);
    }
  }
});

test('planning eyebrow has breathing room below it', async ({ page }) => {
  for (const width of [390, 1440]) {
    await page.setViewportSize({ width, height: 950 });
    await page.goto('/services/');
    const gap = await page
      .locator('.stay-planning')
      .evaluate(
        (e) =>
          e.querySelector('h2')!.getBoundingClientRect().top -
          e.querySelector('.eyebrow')!.getBoundingClientRect().bottom,
      );
    expect(gap).toBeGreaterThanOrEqual(24);
  }
});

test('chapter seven quote has distinct editorial type and attribution', async ({ page }) => {
  for (const width of [390, 1440]) {
    await page.setViewportSize({ width, height: 844 });
    await page.goto('/home/?preview=sample#stories');
    const quote = page.locator('.home-stories blockquote');
    await expect(quote).toHaveCSS('font-style', 'italic');
    await expect(quote).toHaveCSS('font-synthesis', 'style');
    const sizes = await quote.evaluate((e) => ({
      quote: parseFloat(getComputedStyle(e).fontSize),
      body: parseFloat(
        getComputedStyle(
          document.querySelector('.home-stories .home-section-intro > p:last-child')!,
        ).fontSize,
      ),
      attribution: parseFloat(
        getComputedStyle(document.querySelector('.home-stories figcaption')!).fontSize,
      ),
    }));
    expect(sizes.quote).toBeGreaterThan(sizes.body);
    expect(sizes.quote).toBeGreaterThan(sizes.attribution);
  }
});
