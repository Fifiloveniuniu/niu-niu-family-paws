/** Cached internal SVG geometry, shared by normal pages and the cinematic timeline. */
export function createShapeMorpher(root: Element) {
  const originals = new Map<Element, Map<string, string | null>>();
  const translations = new Map<SVGElement, string>();
  const write = (element: Element, key: string, value: string | number) => {
    let attributes = originals.get(element);
    if (!attributes) {
      attributes = new Map();
      originals.set(element, attributes);
    }
    if (!attributes.has(key)) attributes.set(key, element.getAttribute(key));
    element.setAttribute(key, String(value));
  };
  const select = (selector: string) =>
    Array.from(root.querySelectorAll<SVGElement>(selector)).filter((element) => {
      const localScene = element.closest('[data-icon-scene]');
      return !localScene || localScene === root;
    });
  // Only free-floating accents travel; structural parts remain attached to their pivots.
  const pieces = select('.symbol-star,.symbol-satellite').map((element, index) => {
    translations.set(element, element.style.translate);
    return { element, index };
  });
  const faces = select('.pet-face').map((face, index, all) => ({
    face,
    x: face.closest('.world-dog')
      ? 0.72
      : face.closest('.hero-friend-cat')
        ? 0.56
        : face.closest('.hero-friend-rabbit')
          ? 0.92
          : all.length > 1
            ? 0.22 + index * 0.28
            : 0.72,
    y: 0.48,
    rotate: face.style.rotate,
    eyes: Array.from(face.querySelectorAll<SVGEllipseElement>('.pet-eye')).map((element) => ({
      element,
      x: Number(element.getAttribute('cx')),
      y: Number(element.getAttribute('cy')),
      radius: Number(element.getAttribute('rx')),
    })),
  }));
  const lookAt = (x: number, y: number) => {
    for (const face of faces) {
      const dx = Math.tanh((x - face.x) * 2.5),
        dy = Math.tanh((y - face.y) * 2);
      for (const eye of face.eyes) {
        write(eye.element, 'cx', eye.x + dx * eye.radius * 0.65);
        write(eye.element, 'cy', eye.y + dy * eye.radius * 0.45);
      }
    }
  };
  const discs = select('.care-symbol-day .symbol-disc');
  const satellites = select('.symbol-satellite');
  const turningPages = select('.academy-turning-page');
  const tufts = select('.grooming-tuft > path').map((element, index) => ({
    element,
    index: index % 3,
  }));
  const hearts = select('.symbol-heart');
  const crescents = select('.symbol-crescent');
  const rays = select('.symbol-ray').map((element, index) => ({ element, index: index % 12 }));
  const checks = select('.symbol-check');
  const pads = select('.metric-paw-pad');
  const rings = select('.symbol-ring');
  const stars = select('.symbol-star').map((element) => {
    const box = (element as SVGGraphicsElement).getBBox();
    return {
      element,
      x: box.x + box.width / 2,
      y: box.y + box.height / 2,
      r: Math.max(box.width, box.height) / 2,
    };
  });
  const orbits = select('.symbol-orbit').map((element) => ({
    element,
    rx: Number(element.getAttribute('rx')),
    ry: Number(element.getAttribute('ry')),
  }));
  const toes = select('.metric-paw-toes > ellipse').map((element) => ({
    element,
    x: Number(element.getAttribute('cx')),
    rx: Number(element.getAttribute('rx')),
    y: Number(element.getAttribute('cy')),
  }));
  const leftPages = select('.academy-page-left > path:first-child');
  const rightPages = select('.academy-page-right > path:first-child');
  const blades = select('.grooming-blade > path').map((element) => ({
    element,
    right: element.parentElement!.classList.contains('reverse'),
  }));
  return {
    lookAt,
    update(progress: number) {
      const t = Math.max(0, Math.min(1, progress));
      lookAt(1 - t, 0.12 + Math.sin(t * Math.PI) * 0.12);
      const smooth = (value: number) => {
        const x = Math.max(0, Math.min(1, value));
        return x * x * (3 - 2 * x);
      };
      // Paper-cut pieces enter on alternating curved paths, then settle into their symbol.
      // Independent translate composes with existing hinge/shape transforms.
      for (const { element, index } of pieces) {
        const lag = (index % 4) * 0.035;
        const gather = 1 - smooth((t - lag) / 0.48);
        const depart = smooth((t - 0.88 - lag * 0.4) / 0.2);
        const side = index % 2 ? 1 : -1;
        const x = side * (gather * 5 + depart * 3);
        const y = -Math.sin(gather * Math.PI) * 4 + depart * 2;
        const distance = element.closest('.care-symbol-grooming') ? 0.1 : 1;
        element.style.translate = `${x * distance}px ${y * distance}px`;
      }
      // A small sequence, not a looping timer: gather, act, then settle.
      const unfold = smooth((t - 0.12) / 0.65);
      const snip = Math.sin(smooth((t - 0.18) / 0.62) * Math.PI) ** 2;
      const release = smooth((t - 0.53) / 0.32);
      const turn = smooth((t - 0.18) / 0.65);
      for (const element of discs) {
        const rx = 13 + 10 * unfold,
          ry = 10 + 13 * unfold;
        write(
          element,
          'd',
          `M${50 - rx} 50C${50 - rx} ${50 - ry * 0.5523} ${50 - rx * 0.5523} ${50 - ry} 50 ${50 - ry}S${50 + rx} ${50 - ry * 0.5523} ${50 + rx} 50S${50 + rx * 0.5523} ${50 + ry} 50 ${50 + ry}S${50 - rx} ${50 + ry * 0.5523} ${50 - rx} 50Z`,
        );
      }
      for (const element of satellites) {
        const angle = -1.3 + unfold * 2.5;
        write(element, 'cx', 54 + Math.cos(angle) * 34);
        write(element, 'cy', 48 + Math.sin(angle) * 30);
        write(element, 'r', 1.5 + 2 * Math.sin(t * Math.PI));
      }
      for (const element of turningPages) {
        const edge = 34 * Math.cos(turn * Math.PI);
        const lift = 15 * Math.sin(turn * Math.PI);
        write(
          element,
          'd',
          `M50 30Q${50 + edge * 0.45} ${17 - lift} ${50 + edge} ${22 - lift * 0.35}V${74 - lift * 0.35}Q${50 + edge * 0.45} ${70 - lift} 50 82Z`,
        );
      }
      for (const { element, index } of tufts) {
        const x = 44 + index * 6;
        const drift = (index - 1) * 2 * release;
        const fall = 3 * release;
        write(
          element,
          'd',
          `M${x + drift} ${13 + (index % 2) * 2 + fall}Q${x - 2 + drift} ${21 + fall} ${x + drift} ${29 + fall}`,
        );
      }
      const beat = Math.sin(t * Math.PI * 2) * Math.sin(t * Math.PI);
      for (const element of rings) {
        write(element, 'stroke-dasharray', '1');
        write(element, 'stroke-dashoffset', 1 - smooth((t - 0.08) / 0.75));
      }
      for (const element of hearts)
        write(
          element,
          'd',
          `M50 ${82 - 6 * t}C${-4 + 6 * t + 8 * beat} ${44 - 6 * t} ${26 - 4 * t} ${2 + 8 * t - 8 * beat} 50 ${34 - 8 * t}C${74 + 4 * t} ${2 + 8 * t - 8 * beat} ${104 - 6 * t - 8 * beat} ${44 - 6 * t} 50 ${82 - 6 * t}Z`,
        );
      for (const element of crescents)
        write(
          element,
          'd',
          `M65 14C21 12 9 71 52 85Q69 91 82 77C${37 + 27 * unfold} ${88 - 14 * unfold} ${24 + 22 * unfold} ${28 + 24 * unfold} 65 14Z`,
        );
      for (const { element, index } of rays) {
        const spread = smooth((t - index * 0.018) / 0.7);
        write(
          element,
          'd',
          `M${50 - 10 * (1 - spread)} ${26 - 18 * spread}Q${42 + 8 * spread} ${20 - 4 * spread} 50 ${30 - 8 * spread}`,
        );
      }
      for (const element of checks)
        write(element, 'd', `M30 ${44 + 6 * t}L45 ${60 + 8 * t}L79 ${30 - 10 * t}`);
      for (const { element, x, y, r } of stars) {
        const sparkle = element.closest('.care-symbol-grooming')
          ? 0.55 + 0.06 * Math.sin(t * Math.PI)
          : Math.sin(t * Math.PI);
        const rx = r * (0.35 + 0.85 * sparkle),
          ry = r * (1.4 - 0.65 * sparkle),
          inner = r * (0.13 + 0.23 * sparkle);
        write(
          element,
          'd',
          `M${x} ${y - ry}L${x + inner} ${y - inner}L${x + rx} ${y}L${x + inner} ${y + inner}L${x} ${y + ry}L${x - inner} ${y + inner}L${x - rx} ${y}L${x - inner} ${y - inner}Z`,
        );
      }
      for (const { element, rx, ry } of orbits) {
        write(element, 'rx', rx * (0.8 + 0.4 * t));
        write(element, 'ry', ry * (1.15 - 0.3 * t));
      }
      for (const element of leftPages)
        write(
          element,
          'd',
          `M50 30C${42 - 8 * t} ${19 - 4 * t} ${27 - 10 * t} ${16 + 4 * t} 16 ${22 + 5 * t}V74C${30 - 10 * t} ${70 - 4 * t} ${42 - 6 * t} ${73 + 5 * t} 50 82Z`,
        );
      for (const element of rightPages)
        write(
          element,
          'd',
          `M50 30C${58 + 8 * t} ${15 + 4 * t} ${73 + 10 * t} ${20 - 4 * t} 84 ${27 - 5 * t}V74C${70 + 10 * t} ${66 + 4 * t} ${58 + 6 * t} ${78 - 5 * t} 50 82Z`,
        );
      for (const { element, right } of blades)
        write(
          element,
          'd',
          right
            ? `M64 64L50 48Q45 34 ${20 + 27 * snip} ${14 + 5 * snip}`
            : `M36 64L50 48Q55 34 ${80 - 27 * snip} ${14 + 5 * snip}`,
        );
      for (const element of pads)
        write(
          element,
          'd',
          `M${28 - 3 * t} 60Q${36 - 3 * t} ${34 + 6 * t} 50 40Q${64 + 3 * t} ${34 + 6 * t} ${72 + 3 * t} 60Q${82 + 2 * t} 84 64 ${82 - 3 * t}Q50 ${73 + 4 * t} 36 ${82 - 3 * t}Q${18 - 2 * t} 84 ${28 - 3 * t} 60Z`,
        );
      for (const [index, { element, x, y, rx }] of toes.entries()) {
        const step = Math.sin((t * 1.5 - index * 0.12) * Math.PI);
        write(element, 'cx', 50 + (x - 50) * (0.85 + 0.3 * t));
        write(element, 'rx', rx * (0.85 + 0.3 * t));
        write(element, 'ry', 9 + 4 * t);
        write(element, 'cy', y - step * 2);
      }
    },
    dispose() {
      for (const [element, attributes] of originals)
        for (const [key, value] of attributes) {
          if (value === null) element.removeAttribute(key);
          else element.setAttribute(key, value);
        }
      originals.clear();
      for (const { face, rotate } of faces) {
        if (rotate) face.style.rotate = rotate;
        else face.style.removeProperty('rotate');
      }
      for (const [element, translate] of translations) {
        if (translate) element.style.translate = translate;
        else element.style.removeProperty('translate');
      }
    },
  };
}
