import { test, expect } from '@playwright/test';

test('hair gathers with closing scissor tips and spreads with opening tips, reversibly', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/services/');
  const result = await page.evaluate(async () => {
    const { createShapeMorpher } = await import('/apps/web/src/shape-morphs.ts');
    const art = document.querySelector<HTMLElement>('[data-icon-scene]:has(.grooming-tuft)')!;
    const morph = createShapeMorpher(art);
    const point = (e: SVGGeometryElement, end: boolean) => {
      const p = e.getPointAtLength(end ? e.getTotalLength() : 0);
      return new DOMPoint(p.x, p.y).matrixTransform(e.getScreenCTM()!);
    };
    const sample = (t: number) => {
      morph.update(t);
      const blades = [...art.querySelectorAll<SVGPathElement>('.grooming-blade > path')].map((e) =>
        point(e, true),
      );
      const hair = [...art.querySelectorAll<SVGPathElement>('.grooming-tuft > path')].map((e) =>
        point(e, false),
      );
      return {
        t,
        opening: Math.abs(blades[0].x - blades[1].x),
        spread: Math.abs(hair[2].x - hair[0].x),
      };
    };
    const forward = [0, 0.2, 0.3, 0.4, 0.49, 0.6, 0.7, 0.8, 1].map(sample);
    const backward = [...forward]
      .reverse()
      .map((x) => sample(x.t))
      .reverse();
    morph.dispose();
    return {
      forward,
      backward,
      restored: art.querySelector('.grooming-blade')!.getAttribute('transform'),
    };
  });
  const ordered = [...result.forward].sort((a, b) => a.opening - b.opening);
  expect(ordered[0].spread).toBeLessThan(ordered.at(-1)!.spread / 2);
  for (let i = 1; i < ordered.length; i++)
    expect(ordered[i].spread).toBeGreaterThanOrEqual(ordered[i - 1].spread - 0.001);
  expect(result.backward).toEqual(result.forward);
  expect(result.restored).toBeNull();
});

test('framed icons stay centered across Home scroll poses and public illustration frames', async ({
  page,
}) => {
  for (const width of [390, 1440]) {
    await page.setViewportSize({ width, height: 950 });
    await page.goto('/home/#main');
    await page.evaluate(() => document.fonts.ready);
    const errors = await page.evaluate(async () => {
      const story = document.querySelector<HTMLElement>('[data-cinema-enabled]')!,
        stage = story.querySelector<HTMLElement>('.cinematic-stage')!;
      const header = document.querySelector('.marketing-header')!.getBoundingClientRect().height;
      const errors: { chapter: number; kind: string; dx: number; dy: number }[] = [];
      for (const chapter of [1.7, 2, 2.3, 2.7, 3, 3.3, 4.7, 5, 5.3]) {
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
        const panel = story.querySelectorAll('[data-cinematic-panel]')[Math.round(chapter)];
        for (const frame of panel.querySelectorAll(
          '.service-path-icon,.trust-symbol,.metric-art',
        )) {
          const icon = frame.querySelector('svg')!;
          const a = frame.getBoundingClientRect(),
            b = icon.getBoundingClientRect();
          const dx = Math.abs(a.x + a.width / 2 - b.x - b.width / 2),
            dy = Math.abs(a.y + a.height / 2 - b.y - b.height / 2);
          if (dx > 0.25 || dy > 0.25) errors.push({ chapter, kind: frame.className, dx, dy });
        }
      }
      return errors;
    });
    expect(errors).toEqual([]);
    for (const route of ['/spaces/', '/academy/']) {
      await page.goto(route);
      const offsets = await page.locator('.space-illustration,.academy-symbol').evaluateAll((es) =>
        es.map((e) => {
          const a = e.getBoundingClientRect(),
            b = e.querySelector('svg')!.getBoundingClientRect();
          return {
            x: Math.abs(a.x + a.width / 2 - b.x - b.width / 2),
            y: Math.abs(a.y + a.height / 2 - b.y - b.height / 2),
          };
        }),
      );
      for (const offset of offsets) {
        expect(offset.x).toBeLessThan(0.25);
        expect(offset.y).toBeLessThan(0.25);
      }
    }
  }
});
