import { test, expect } from '@playwright/test';

for (const [width, lang] of [
  [1440, 'en'],
  [390, 'zh'],
] as const) {
  test(`timezone updates calendar (${width}, ${lang})`, async ({ page, request }) => {
    await page.setViewportSize({ width, height: 900 });
    const clock = (zone: string) =>
      new Intl.DateTimeFormat(lang === 'zh' ? 'zh-CN' : 'en-US', {
        timeZone: zone,
        hour: '2-digit',
        minute: '2-digit',
      }).format(new Date('2026-11-19T06:30:00Z'));
    await page.clock.setFixedTime(new Date('2026-11-19T06:30:00Z'));
    const fixture = await (await request.get('/__test-fixture')).json();
    await page.goto(`/app/calendar/?lang=${lang}&view=day&zone=America%2FLos_Angeles`);
    await page.evaluate(async (jwt) => {
      // @ts-ignore Test-only Vite module.
      const { auth } = await import('/apps/web/src/auth-client.ts');
      // @ts-ignore Test-only Vite dependency.
      const { GoogleAuthProvider, signInWithCredential } =
        await import('/node_modules/.vite/deps/firebase_auth.js');
      await signInWithCredential(auth, GoogleAuthProvider.credential(jwt));
    }, fixture.administrator.jwt);
    const selectedDate = () => new URL(page.url()).searchParams.get('date');
    await expect(page.locator('.calendar-time-controls .custom-date-input')).toHaveCount(0);
    const now = page.locator('.workspace-now-marker time');
    const tick = page.locator('.calendar-timeline-tick').first();

    await expect(now).toHaveText(clock('America/Los_Angeles'));
    await expect(tick).toHaveAttribute('data-at', '2026-11-18T08:00:00.000Z');
    const timezone = page.locator('.workspace-clock [role="combobox"]');
    await timezone.click();
    await page.getByRole('option', { name: 'Asia/Tokyo', exact: true }).click();
    await expect.poll(selectedDate).toBe('2026-11-19');
    await expect(now).toHaveText(clock('Asia/Tokyo'));
    await expect(tick).toHaveAttribute('data-at', '2026-11-18T15:00:00.000Z');
    await page.reload();
    await expect(timezone).toHaveAttribute('data-value', 'Asia/Tokyo');
    await expect.poll(selectedDate).toBe('2026-11-19');
    await page
      .getByRole('button', { name: lang === 'zh' ? '上一时段' : 'Previous period', exact: true })
      .click();
    await expect.poll(selectedDate).toBe('2026-11-18');
    await timezone.click();
    await page.getByRole('option', { name: 'UTC', exact: true }).click();
    await expect.poll(selectedDate).toBe('2026-11-18');
    await page.getByRole('button', { name: lang === 'zh' ? '今天' : 'Today', exact: true }).click();
    await expect.poll(selectedDate).toBe('2026-11-19');
    await expect(now).toHaveText(clock('UTC'));
    await expect(tick).toHaveAttribute('data-at', '2026-11-19T00:00:00.000Z');
  });
}
