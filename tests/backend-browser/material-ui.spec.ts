import { readFile } from 'node:fs/promises';
import { test, expect, type Locator } from '@playwright/test';

for (const width of [390, 1440])
  for (const language of ['en', 'zh']) {
    test(`Material pages and dialogs remain readable and usable (${width}, ${language})`, async ({
      page,
      request,
    }, testInfo) => {
      test.setTimeout(60000);
      // A fresh fixture identity has an unsaved, prefilled profile. Leave it without saving.
      page.on('dialog', async (dialog) => {
        expect(dialog.type()).toBe('beforeunload');
        await dialog.accept();
      });
      await page.setViewportSize({ width, height: 844 });
      const messages = JSON.parse(
        await readFile(
          new URL(`../../apps/web/src/locales/${language}.json`, import.meta.url),
          'utf8',
        ),
      );
      const t = (key: string) => messages[key];
      const fixture = await (await request.get('/__test-fixture')).json();
      await page.goto(`/app/calendar/?lang=${language}`);
      await page.evaluate(async (jwt) => {
        // @ts-ignore Test-only Vite module.
        const { auth } = await import('/apps/web/src/auth-client.ts');
        // @ts-ignore Test-only Vite dependency.
        const { GoogleAuthProvider, signInWithCredential } =
          await import('/node_modules/.vite/deps/firebase_auth.js');
        await signInWithCredential(auth, GoogleAuthProvider.credential(jwt));
      }, fixture.administrator.jwt);
      await expect(page.locator('.hc-toolbar')).toBeVisible();
      const capture = async (name: string) => {
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
          true,
        );
        await page.screenshot({ path: testInfo.outputPath(`${name}.png`) });
      };
      const inspectDialog = async (opener: Locator, name: string) => {
        await opener.click();
        const dialog = page.locator('dialog.app-dialog[open]').last();
        await expect(dialog).toBeVisible();
        // Keep the pointer off newly positioned actions before checking resting colors.
        await page.mouse.move(0, 0);
        const bounds = (await dialog.boundingBox())!;
        expect(bounds.x).toBeGreaterThanOrEqual(8);
        expect(bounds.y).toBeGreaterThanOrEqual(8);
        expect(bounds.x + bounds.width).toBeLessThanOrEqual(width - 8);
        expect(bounds.y + bounds.height).toBeLessThanOrEqual(836);
        expect(await dialog.evaluate((node) => node.scrollWidth <= node.clientWidth + 1)).toBe(
          true,
        );
        expect(
          await dialog
            .locator('label')
            .evaluateAll((nodes) =>
              nodes
                .filter((node) => node.getClientRects().length > 0)
                .every((node) => parseFloat(getComputedStyle(node).fontSize) >= 14),
            ),
        ).toBe(true);
        const primary = dialog.locator('.button:visible, .hc-apply:visible').first();
        if (await primary.count()) {
          const colors = await primary.evaluate((node) => {
            const probe = document.createElement('span');
            document.body.append(probe);
            const resolve = (token: string) => {
              probe.style.color = `var(${token})`;
              return getComputedStyle(probe).color;
            };
            const disabled = node.matches(':disabled');
            const expectedBackground = resolve(
              disabled ? '--md-disabled-container' : '--md-primary',
            );
            const expectedText = resolve(disabled ? '--md-on-disabled' : '--md-on-primary');
            const style = getComputedStyle(node);
            const result = {
              background: style.backgroundColor,
              text: style.color,
              expectedBackground,
              expectedText,
              opacity: style.opacity,
            };
            probe.remove();
            return result;
          });
          await expect(primary).toHaveCSS('background-color', colors.expectedBackground);
          await expect(primary).toHaveCSS('color', colors.expectedText);
          expect(colors.opacity).toBe('1');
          // Check actual text contrast rather than a particular palette hex value.
          const contrast = await primary.evaluate((node) => {
            const rgb = (value: string) =>
              value
                .match(/[\d.]+/g)!
                .slice(0, 3)
                .map(Number)
                .map((v) => {
                  const c = v / 255;
                  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
                });
            const luminance = (value: string) => {
              const c = rgb(value);
              return c[0] * 0.2126 + c[1] * 0.7152 + c[2] * 0.0722;
            };
            const style = getComputedStyle(node),
              a = luminance(style.color),
              b = luminance(style.backgroundColor);
            return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
          });
          expect(contrast).toBeGreaterThanOrEqual(4.5);
        }
        await capture(name);
        if (await primary.count()) {
          await primary.scrollIntoViewIfNeeded();
          await expect(primary).toBeVisible();
          if (await dialog.evaluate((node) => node.scrollHeight > node.clientHeight + 1))
            await capture(`${name}-actions`);
        }
        const close = dialog.getByRole('button', { name: t('ui.modal.close'), exact: true });
        const closeBounds = (await close.boundingBox())!;
        expect(closeBounds.width).toBeGreaterThanOrEqual(44);
        expect(closeBounds.height).toBeGreaterThanOrEqual(44);
        await close.focus();
        await expect(close).toBeFocused();
        await page.keyboard.press('Escape');
        await expect(dialog).toHaveCount(0);
        await expect(opener).toBeFocused();
      };
      await expect(page.locator('.calendar-toolbar-actions > a')).toHaveCount(0);
      await expect(page.locator('.calendar-time-controls .custom-date-input')).toHaveCount(0);
      await capture('calendar');
      await inspectDialog(
        page.getByRole('button', { name: t('ui.workspace.addBooking'), exact: true }),
        'booking',
      );
      await page.goto(`/app/balances/?lang=${language}`);
      await inspectDialog(
        page.getByRole('button', { name: t('ui.workspace.addBalance'), exact: true }),
        'balance',
      );
      await inspectDialog(
        page.getByRole('button', { name: t('ui.templates.title'), exact: true }),
        'validity-templates',
      );
      await capture('balances');
      await page.goto(`/app/customers/?lang=${language}`);
      await expect(page.locator('.customer-list > li').first()).toBeVisible();
      await inspectDialog(
        page.getByRole('button', { name: t('ui.customers.labels').add, exact: true }),
        'customer',
      );
      await capture('customers');
      await page.goto(`/app/customers/${fixture.cid}/?lang=${language}`);
      await inspectDialog(
        page.getByRole('button', { name: t('ui.pets.labels').add, exact: true }),
        'pet',
      );
      await page.goto(`/app/pricing/?lang=${language}`);
      await inspectDialog(
        page.getByRole('button', { name: t('ui.pricingAdmin.add'), exact: true }),
        'price',
      );
      await inspectDialog(
        page.getByRole('button', { name: t('ui.pricingAdmin.holidays'), exact: true }),
        'holidays',
      );
      await capture('pricing');
      await page.goto(`/app/calendar/?lang=${language}`);
      await inspectDialog(page.locator('.hc-house .workspace-row-actions button').first(), 'house');
      await inspectDialog(page.locator('.hc-room .workspace-row-actions button').first(), 'room');
      await capture('location-dialogs');
      for (const route of [
        '/app/account/profile/',
        '/app/settings/cancellation/',
        '/',
        '/services/',
        '/pricing/',
        '/spaces/',
        '/academy/',
        '/contact/',
        '/about/',
        '/faqs/',
      ]) {
        await page.goto(`${route}?lang=${language}`);
        await expect(page.locator('main:visible').first()).toBeVisible();
        if (route.startsWith('/app/')) {
          if (!route.includes('profile')) await expect(page.locator('.hc-content')).toBeVisible();
          if (route.includes('profile'))
            await expect(page.locator('.profile-section')).toHaveAttribute('aria-busy', 'false');
          if (route.includes('cancellation')) {
            await expect(page.locator('.saved-cancellation-policy')).toBeVisible();
            await inspectDialog(
              page.getByRole('button', {
                name: t('ui.cancellationPolicy.editPolicy'),
                exact: true,
              }),
              'cancellation-policy',
            );
          }
        }
        await capture(route.replaceAll('/', '-') || 'home');
      }
    });
  }
