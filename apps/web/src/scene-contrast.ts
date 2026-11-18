import { sceneField, fieldGradient, mixInk } from './scene-field';
const isDark = (color: number[]) => color[0] * 0.2126 + color[1] * 0.7152 + color[2] * 0.0722 < 140;
let gradientId = 0;

/** Text and vector paint share the stage's diagonal field, including transformed SVG parts. */
export function createSceneContrast(stage: HTMLElement) {
  const selector =
    'h1 > span,h1:not(:has(span)),h2,h3,p,a,blockquote,figcaption,.cinema-count,.quote-mark,.chapter-number,.live-number,.path-arrow,.text-link > span';
  const inks: { element: HTMLElement; ink: string }[] = [];
  const known = new WeakSet<HTMLElement>();
  const register = (root: Element) => {
    const candidates = [
      ...(root.matches(selector) ? [root] : []),
      ...root.querySelectorAll<HTMLElement>(selector),
    ] as HTMLElement[];
    for (const element of candidates) {
      if (known.has(element) || element.closest('.button,.world-note,.service-path,svg')) continue;
      if (
        element.parentElement?.closest('[data-scene-ink]') &&
        !element.matches('.path-arrow,.text-link > span')
      )
        continue;
      let ink = getComputedStyle(element).color;
      if (element.closest('.home-contact,.cinema-controls,.cinema-rail')) ink = 'rgb(43, 79, 61)';
      element.setAttribute('data-scene-ink', '');
      known.add(element);
      inks.push({ element, ink });
    }
  };
  register(stage);
  const observer = new MutationObserver((records) => {
    for (const record of records)
      for (const node of record.addedNodes) if (node instanceof HTMLElement) register(node);
  });
  observer.observe(stage, { childList: true, subtree: true });
  const svgNS = 'http://www.w3.org/2000/svg';
  const make = (tag: string, attrs: Record<string, string>) => {
    const element = document.createElementNS(svgNS, tag);
    for (const [key, value] of Object.entries(attrs)) element.setAttribute(key, value);
    return element;
  };
  const definitions: Element[] = [];
  const paints: {
    shape: SVGGraphicsElement;
    gradient: Element;
    first: Element;
    last: Element;
    middle: Element;
    properties: { name: string; value: string }[];
  }[] = [];
  const inheritsCurrent = (shape: Element, property: string, svg: Element) => {
    let node: Element | null = shape;
    while (node) {
      const value = node.getAttribute(property);
      if (value !== null) return value === 'currentColor';
      if (node === svg) break;
      node = node.parentElement;
    }
    return false;
  };
  for (const svg of stage.querySelectorAll<SVGSVGElement>('svg.care-symbol,svg.story-sun')) {
    if (svg.closest('.service-path')) continue;
    const defs = make('defs', { 'data-scene-paints': '' });
    const shapes = Array.from(
      svg.querySelectorAll<SVGGraphicsElement>('path,circle,ellipse,line,polygon,polyline,rect'),
    ).filter((shape) => !shape.closest('defs'));
    for (const shape of shapes) {
      const properties = ['fill', 'stroke']
        .filter((name) => inheritsCurrent(shape, name, svg))
        .map((name) => ({ name, value: shape.style.getPropertyValue(name) }));
      if (!properties.length) continue;
      const id = `scene-paint-${++gradientId}`;
      const gradient = make('radialGradient', {
        id,
        gradientUnits: 'userSpaceOnUse',
        cx: '0',
        cy: '0',
      });
      const first = make('stop', { offset: '0' }),
        middle = make('stop', { offset: '0' }),
        last = make('stop', { offset: '1' });
      gradient.append(first, middle, last);
      defs.append(gradient);
      for (const { name } of properties) shape.style.setProperty(name, `url(#${id})`);
      paints.push({ shape, gradient, first, middle, last, properties });
    }
    svg.prepend(defs);
    definitions.push(defs);
  }
  const fills = Array.from(stage.querySelectorAll<HTMLElement>('.cinema-progress > span'));
  const rail = stage.querySelector<HTMLElement>('.cinema-rail');
  return {
    update(base: number[], next: number[], field: ReturnType<typeof sceneField>) {
      const rect = stage.getBoundingClientRect();
      const baseDark = isDark(base),
        nextDark = isDark(next);
      // Ink follows the actual blended background brightness, not its nominal palette.
      const blended = base.map((value, index) => value + (next[index] - value) * field.strength);
      const inkField = { ...field, strength: isDark(blended) === nextDark ? 1 : 0 };
      const measurements = inks
        .filter((item) => item.element.isConnected)
        .map((item) => ({ ...item, bounds: item.element.getBoundingClientRect() }));
      const vectors = paints.map((item) => ({
        ...item,
        matrix: item.shape.getScreenCTM(),
        ink: getComputedStyle(item.shape).color,
      }));
      const fillBounds = fills.map((element) => ({
        bounds: element.getBoundingClientRect(),
        width: element.clientWidth,
      }));
      const control = stage.querySelector('.cinema-controls')?.getBoundingClientRect();
      const safeTop = rect.top + 2,
        safeBottom = (control?.top ?? rect.bottom) - 8;
      for (const { element, ink, bounds } of measurements) {
        if (!bounds.width || bounds.bottom < 0 || bounds.top > innerHeight) continue;
        element.style.setProperty(
          '--scene-ink',
          fieldGradient(
            inkField,
            bounds.left - rect.left,
            bounds.top - rect.top,
            bounds.height,
            baseDark ? '#fffaf0' : ink,
            nextDark ? '#fffaf0' : ink,
          ),
        );
        if (!element.closest('.cinema-controls,.cinema-rail'))
          element.style.setProperty(
            '--scene-copy-mask',
            `linear-gradient(180deg,transparent ${safeTop - bounds.top}px,#000 ${safeTop + 8 - bounds.top}px,#000 ${safeBottom - 8 - bounds.top}px,transparent ${safeBottom - bounds.top}px)`,
          );
      }
      for (const { gradient, first, middle, last, matrix, ink } of vectors) {
        if (!matrix || Math.abs(matrix.a * matrix.d - matrix.b * matrix.c) < 1e-8) continue;
        const local = matrix.inverse().translate(rect.left + field.cx, rect.top + field.cy);
        gradient.setAttribute(
          'gradientTransform',
          `matrix(${local.a} ${local.b} ${local.c} ${local.d} ${local.e} ${local.f})`,
        );
        gradient.setAttribute('r', String(Math.max(0.001, field.outer)));
        const a = baseDark ? '#fffaf0' : ink,
          b = nextDark ? '#fffaf0' : ink;
        const center = mixInk(a, b, inkField.strength);
        first.setAttribute('stop-color', center);
        middle.setAttribute('stop-color', center);
        middle.setAttribute('offset', String(field.outer ? field.inner / field.outer : 0));
        last.setAttribute('stop-color', a);
      }
      fills.forEach((element, index) => {
        const { bounds, width } = fillBounds[index],
          scale = bounds.width / width || 1;
        const a = baseDark ? '#fffaf0' : '#2b4f3d',
          b = nextDark ? '#fffaf0' : '#2b4f3d';
        const x = (rect.left + field.cx - bounds.left) / scale,
          y = rect.top + field.cy - bounds.top;
        const r = Math.max(0.001, field.outer);
        element.style.backgroundImage = `radial-gradient(ellipse ${r / scale}px ${r}px at ${x}px ${y}px,${mixInk(a, b, inkField.strength)} ${field.outer ? (field.inner / field.outer) * 100 : 0}%,${a} 100%)`;
      });
      if (rail) {
        const box = rail.getBoundingClientRect();
        rail.style.setProperty(
          '--scene-rail-ink',
          fieldGradient(
            inkField,
            box.left + 18.5 - rect.left,
            box.top + (parseFloat(rail.style.getPropertyValue('--rail-offset')) || 0) - rect.top,
            23,
            baseDark ? '#fffaf0' : '#2b4f3d',
            nextDark ? '#fffaf0' : '#2b4f3d',
          ),
        );
      }
    },
    dispose() {
      observer.disconnect();
      for (const { element } of inks) {
        element.removeAttribute('data-scene-ink');
        element.style.removeProperty('--scene-ink');
        element.style.removeProperty('--scene-copy-mask');
      }
      for (const { shape, properties } of paints)
        for (const { name, value } of properties) {
          if (value) shape.style.setProperty(name, value);
          else shape.style.removeProperty(name);
        }
      definitions.forEach((element) => element.remove());
      fills.forEach((element) => element.style.removeProperty('background-image'));
      rail?.style.removeProperty('--scene-rail-ink');
    },
  };
}
