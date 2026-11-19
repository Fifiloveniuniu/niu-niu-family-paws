import { expect, type Page } from '@playwright/test';

/** Check rendered text against its composited ancestor backgrounds, including CSS color-mix. */
export async function expectReadableText(page: Page, scope = 'main') {
  const failures = await page
    .locator(scope)
    .first()
    .evaluate((root) => {
      const canvas = document.createElement('canvas');
      canvas.width = canvas.height = 1;
      const context = canvas.getContext('2d', { willReadFrequently: true })!;
      const pixel = (color: string) => {
        context.clearRect(0, 0, 1, 1);
        context.fillStyle = color;
        context.fillRect(0, 0, 1, 1);
        return [...context.getImageData(0, 0, 1, 1).data];
      };
      const luminance = (rgb: number[]) =>
        rgb
          .slice(0, 3)
          .map((v) => v / 255)
          .map((v) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4))
          .reduce((sum, v, i) => sum + v * [0.2126, 0.7152, 0.0722][i], 0);
      const failures: { text: string; ratio: number; selector: string }[] = [];
      for (const element of [root, ...root.querySelectorAll<HTMLElement>('*')]) {
        if (
          !(element instanceof HTMLElement) ||
          !element.checkVisibility({ checkOpacity: true, checkVisibilityCSS: true }) ||
          element.closest('svg,[aria-hidden="true"],canvas')
        )
          continue;
        if (getComputedStyle(element).clipPath === 'inset(50%)') continue;
        let text = [...element.childNodes]
          .filter((n) => n.nodeType === Node.TEXT_NODE)
          .map((n) => n.textContent)
          .join(' ')
          .trim();
        let css = getComputedStyle(element);
        if (
          element instanceof HTMLInputElement &&
          !['checkbox', 'radio', 'file', 'hidden'].includes(element.type)
        ) {
          text = element.value || element.placeholder;
          if (!element.value && element.placeholder)
            css = getComputedStyle(element, '::placeholder');
        }
        if (!text) continue;
        const ancestors: HTMLElement[] = [];
        let parent: HTMLElement | null = element;
        while (parent) {
          ancestors.unshift(parent);
          parent = parent.parentElement;
        }
        context.globalAlpha = 1;
        context.fillStyle = '#fff';
        context.fillRect(0, 0, 1, 1);
        for (const node of ancestors) {
          context.fillStyle = getComputedStyle(node).backgroundColor;
          context.fillRect(0, 0, 1, 1);
        }
        const background = [...context.getImageData(0, 0, 1, 1).data];
        const foreground = pixel(css.color);
        const alpha =
          (foreground[3] / 255) *
          ancestors.reduce((v, node) => v * Number(getComputedStyle(node).opacity), 1);
        const rendered = foreground
          .slice(0, 3)
          .map((v, i) => v * alpha + background[i] * (1 - alpha));
        const a = luminance(rendered),
          b = luminance(background);
        const ratio = (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
        if (ratio < 4.5 - 0.02)
          failures.push({
            text: text.slice(0, 65),
            ratio: Math.round(ratio * 100) / 100,
            selector: element.tagName.toLowerCase() + '.' + element.className,
          });
      }
      return failures.slice(0, 20);
    });
  expect(
    failures,
    'Normal, secondary, selected and disabled text should retain 4.5:1 contrast',
  ).toEqual([]);
}
