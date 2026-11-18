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
