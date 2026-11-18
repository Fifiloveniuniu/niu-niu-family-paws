import { chapterReveal, sceneField } from './scene-field';
import { createSceneContrast } from './scene-contrast';
import { easeOutExpo } from './marketing-easing';
import { createShapeMorpher } from './shape-morphs';

const clamp = (value: number) => Math.max(0, Math.min(1, value));
const ease = (value: number) => value * value * (3 - 2 * value);
const interpolate = (a: number[], b: number[], mix: number) =>
  a.map((value, index) => value + (b[index] - value) * mix);
const scenePoses: Record<string, { color: number[]; flower: number[] }> = {
  main: { color: [250, 248, 242], flower: [0.58, 0.12, 110, -15] },
  experience: { color: [246, 248, 243], flower: [1.16, 0.3, 100, 35] },
  services: { color: [250, 248, 242], flower: [1.18, 0.03, 90, 95] },
  about: { color: [250, 248, 242], flower: [1.2, 0.5, 120, 155] },
  spaces: { color: [248, 247, 242], flower: [1.18, 0.16, 84, 200] },
  numbers: { color: [246, 248, 243], flower: [1.16, 0.6, 110, 245] },
  stories: { color: [250, 248, 242], flower: [1.18, 0.45, 180, 290] },
  faq: { color: [250, 248, 242], flower: [0.21, 0.35, 180, 335] },
  contact: { color: [43, 79, 61], flower: [0.5, 0.1, 100, 395] },
};
type ObjectPose = Map<Element, Map<string, string>>;
const poseNumber = /-?(?:\d*\.)?\d+(?:e[-+]?\d+)?/gi;
function blendPose(a: string, b: string, t: number) {
  if (t === 0) return a;
  if (t === 1) return b;
  if (a.replace(poseNumber, '#') !== b.replace(poseNumber, '#')) return null;
  const start = a.match(poseNumber)?.map(Number) ?? [];
  let index = 0;
  return b.replace(poseNumber, (value) =>
    String(start[index] + (Number(value) - start[index++]) * t),
  );
}

type Movement = { cancel: () => void };
const introTimes = new WeakMap<HTMLElement, number>();
const controllers = new WeakMap<
  HTMLElement,
  {
    move: (hash: string, done: () => void) => Movement | undefined;
    jump: (hash: string) => boolean;
  }
>();
/** Chapter buttons and native scrolling use this same shape timeline. */
export function animateCinematicTarget(story: HTMLElement, hash: string, done: () => void) {
  return controllers.get(story)?.move(hash, done);
}
export function jumpCinematicTarget(story: HTMLElement, hash: string) {
  return controllers.get(story)?.jump(hash) ?? false;
}
export function installCinematicStory(story: HTMLElement) {
  const stage = story.querySelector<HTMLElement>('.cinematic-stage')!;
  if (!introTimes.has(story)) introTimes.set(story, performance.now());
  const introStart = introTimes.get(story)!;
  let introActive = !location.hash && scrollY < 5 && performance.now() - introStart < 1100;
  const panels = Array.from(story.querySelectorAll<HTMLElement>('[data-cinematic-panel]'));
  const markers = Array.from(story.querySelectorAll<HTMLElement>('[data-cinema-anchor]'));
  const links = Array.from(story.querySelectorAll<HTMLAnchorElement>('[data-chapter-link]'));
  const ids = panels.map((panel) => panel.id);
  const shapeMorphers = panels.map(createShapeMorpher);
  const anchors = ['main', ...markers.map((marker) => marker.dataset.cinemaAnchor!)];
  const poses = anchors.map((anchor) => scenePoses[anchor] ?? scenePoses.main);
  // Stay beyond the right edge through the middle chapters, then make one broad return.
  // Offstage holds avoid repeated full-width left/right crossings.
  const flowerFor = (index: number) => {
    const pose = poses[index].flower;
    if (innerWidth > 760) return pose;
    if (anchors[index] === 'main')
      return [
        24 / Math.max(1, stage.clientWidth - 38.5),
        8 / Math.max(1, stage.clientHeight - 38.5),
        pose[2],
        pose[3],
      ];
    if (anchors[index] === 'contact') {
      const slot = panels[index].querySelector<HTMLElement>('.contact-bloom');
      const size = 46;
      const y = slot
        ? (slot.offsetTop + (slot.offsetHeight - size) / 2) / Math.max(1, stage.clientHeight - size)
        : 0.2;
      return [0.5, y, 140, pose[3]];
    }
    return [pose[0], 0.01, pose[2], pose[3]];
  };
  const next = story.querySelector<HTMLAnchorElement>('[data-cinema-next]');
  const previous = story.querySelector<HTMLAnchorElement>('[data-cinema-previous]');
  const count = story.querySelector('[data-cinema-count]');
  const rail = story.querySelector<HTMLElement>('.cinema-rail');
  const flower = story.querySelector<HTMLElement>('.shared-flower');
  const aperture = story.querySelector<HTMLElement>('.chapter-window');
  const sun = story.querySelector<SVGSVGElement>('.story-sun');
  const moon = sun?.querySelector('[data-journey-moon]');
  const landscape = story.querySelector('.story-landscape');
  const back = landscape?.querySelector('[data-journey-hill="back"]');
  const front = landscape?.querySelector('[data-journey-hill="front"]');
  const thread = landscape?.querySelector('[data-journey-thread]');
  const main = story.closest<HTMLElement>('.marketing-site')!;
  let frame = 0;
  let chapter = 0;
  let active = 0;
  let color = poses[0].color;
  let flowerPose = poses[0].flower;
  let shifts: number[] = [];
  let distances: number[] = [];
  let backgroundAmounts: number[] = [];
  type AnimationState = {
    start: number;
    scrollFrom: number;
    from: number;
    target: number;
    source: number;
    direction: number;
    shifts: number[];
    distances: number[];
    backgrounds: number[];
    flower: number[];
    objects: { start: ObjectPose; end: ObjectPose };
    done: () => void;
  };
  let animation: AnimationState | undefined;
  story.setAttribute('data-cinema-enabled', '');
  const contrast = createSceneContrast(stage);
  panels.forEach((panel) => panel.removeAttribute('id'));
  markers.forEach((marker) => {
    marker.id = marker.dataset.cinemaAnchor!;
  });
  const headerHeight = () =>
    Number.parseFloat(
      getComputedStyle(document.documentElement).getPropertyValue('--marketing-header-height'),
    ) || 0;
  const scrollRange = () => Math.max(1, story.clientHeight - stage.clientHeight);
  const startTop = () => story.getBoundingClientRect().top + scrollY - headerHeight();
  function scrollToChapter(value: number) {
    window.scrollTo({
      top: value === 0 ? 0 : startTop() + (scrollRange() * value) / (panels.length - 1),
      behavior: 'instant',
    });
  }
  const objectNodes = [
    story,
    stage,
    ...Array.from(stage.querySelectorAll<HTMLElement | SVGElement>('*')),
  ].filter(
    (node) =>
      !node.closest('defs') && !node.closest('.cinema-controls,.cinema-rail,.chapter-window'),
  );
  const captureObjects = (): ObjectPose =>
    new Map(
      objectNodes.map((node) => {
        const values = new Map<string, string>();
        for (const key of Array.from(node.style)) {
          if (key === '--panel-shift' || key.startsWith('--scene-') || key === 'background-image')
            continue;
          values.set(`style:${key}`, node.style.getPropertyValue(key));
        }
        if (node instanceof SVGElement)
          for (const key of ['d', 'cx', 'cy', 'rx', 'ry', 'r', 'x', 'y', 'transform', 'opacity']) {
            if (node.hasAttribute(key)) values.set(key, node.getAttribute(key)!);
          }
        return [node, values];
      }),
    );
  const applyObjects = (start: ObjectPose, end: ObjectPose, t: number) => {
    for (const [node, values] of end)
      for (const [key, last] of values) {
        const first = start.get(node)?.get(key);
        if (first === undefined) continue;
        const value = blendPose(first, last, t);
        if (value === null) continue;
        if (key.startsWith('style:')) (node as HTMLElement).style.setProperty(key.slice(6), value);
        else node.setAttribute(key, value);
      }
  };
  function render(value: number, travel?: { state: AnimationState; mix: number }) {
    chapter = value;
    if (value > 0.02) introActive = false;
    const intro = introActive ? easeOutExpo((performance.now() - introStart) / 1100) : 1;
    story.style.setProperty('--intro-progress', String(intro));
    const progress = clamp(value / (panels.length - 1));
    const from = Math.min(panels.length - 1, Math.floor(value));
    const to = Math.min(panels.length - 1, from + 1);
    const mix = ease(value - from);
    color = [250, 248, 242];
    flowerPose = travel
      ? interpolate(travel.state.flower, flowerFor(travel.state.target), travel.mix)
      : interpolate(flowerFor(from), flowerFor(to), mix);
    active = travel
      ? travel.mix < 0.5
        ? travel.state.source
        : travel.state.target
      : Math.min(panels.length - 1, Math.round(value));
    story.dataset.activeChapter = String(active);
    story.dataset.darkScene = String(active === panels.length - 1);
    story.style.setProperty('--cinema-progress', String(progress));
    story.style.setProperty('--cinema-color', `rgb(${color.map(Math.round).join(',')})`);
    story.style.setProperty('--journey-turn', `${value * 12}deg`);
    const dark = travel
      ? interpolate(
          [travel.state.source === panels.length - 1 ? 1 : 0],
          [travel.state.target === panels.length - 1 ? 1 : 0],
          travel.mix,
        )[0]
      : clamp(value - (panels.length - 2));
    const gold = interpolate([185, 162, 110], [245, 226, 172], dark);
    sun?.style.setProperty('color', `rgb(${gold.map(Math.round).join(',')})`);
    sun?.style.setProperty('--orb-strength', String(0.4 + dark * 0.6));
    const sunProgress = ease(progress);
    if (sun) {
      const inset = innerWidth <= 760 ? 18 : 28;
      sun.style.left = `${inset + Math.max(0, stage.clientWidth - sun.getBoundingClientRect().width - inset * 2) * (1 - sunProgress)}px`;
      sun.style.top = `${innerWidth <= 760 ? 6 + (1 - Math.sin(sunProgress * Math.PI)) * 4 : 18 + (1 - Math.sin(sunProgress * Math.PI)) * 18}px`;
    }
    const morph = ease(clamp((progress - 0.15) / 0.7));
    moon?.setAttribute('cx', String(115 - morph * 93));
    story.style.setProperty('--celestial-morph', String(morph));
    if (flower) {
      const size =
        innerWidth <= 760 ? Math.max(28, Math.min(46, flowerPose[2] * 0.35)) : flowerPose[2];
      flower.style.width = `${size}px`;
      flower.style.left = `${flowerPose[0] * (stage.clientWidth - size)}px`;
      flower.style.top = `${flowerPose[1] * (stage.clientHeight - size)}px`;
      flower.style.transform = `rotate(${flowerPose[3]}deg)`;
      flower.style.setProperty('--scroll', String(progress));
      flower.style.setProperty('--arrival', String(0.6 + progress * 0.4));
      flower.style.setProperty('--petal-spread', String(Math.sin(progress * Math.PI)));
    }
    if (rail && links.length) {
      const a = links[from];
      const b = links[to];
      const center =
        a.offsetTop +
        a.offsetHeight / 2 +
        (b.offsetTop + b.offsetHeight / 2 - a.offsetTop - a.offsetHeight / 2) * (value - from);
      rail.style.setProperty('--rail-offset', `${center - 11.5}px`);
    }
    const hill = 730 + Math.sin(value * 1.3) * 35;
    back?.setAttribute(
      'd',
      `M-100 ${hill}C300 ${hill - 100} 570 ${800 - hill * 0.1} 760 ${hill + 15}S1150 ${hill - 60} 1540 ${hill + 20}V1000H-100Z`,
    );
    front?.setAttribute(
      'd',
      `M-100 ${hill + 90}C340 ${hill - 25} 650 ${hill + 145} 900 ${hill + 70}S1250 ${hill} 1540 ${hill + 55}V1000H-100Z`,
    );
    thread?.setAttribute(
      'd',
      `M-80 ${hill - 100}C280 ${hill - 160} 450 ${hill + 80} 780 ${hill - 45}S1170 ${hill - 150} 1520 ${hill - 60}`,
    );
    panels.forEach((panel, index) => {
      let distance = value - index;
      let shift = (index - (from + ease(value - from))) * stage.clientHeight;
      if (travel) {
        const { state, mix: t } = travel;
        const targetShift =
          index === state.target ? 0 : -state.direction * stage.clientHeight * 1.15;
        const sourceShift = state.shifts[index];
        shift = sourceShift + (targetShift - sourceShift) * t;
        if (
          index !== state.source &&
          index !== state.target &&
          Math.abs(sourceShift) >= stage.clientHeight
        )
          shift = stage.clientHeight * 3;
        const targetDistance = index === state.target ? 0 : state.direction * 0.7;
        distance = state.distances[index] + (targetDistance - state.distances[index]) * t;
      }
      shifts[index] = shift;
      distances[index] = distance;
      panel.style.setProperty('--panel-shift', `${shift}px`);
      panel.style.setProperty('--scroll', String(clamp(distance / 0.65) ** 2));
      panel.style.setProperty('--arrival', String(clamp(distance + 1)));
      panel.style.setProperty('--pet-entry', String(ease(clamp(-distance / 0.65))));
      panel.style.setProperty('--pet-gather', String(ease(clamp(distance / 0.65))));
      panel.style.setProperty('--expression', String(clamp((distance + 0.25) / 0.75)));
      const enter = clamp(1 + distance / 0.65);
      const care = distance < 0 ? 0.72 * enter : 0.72 + 0.28 * clamp(distance / 0.65);
      panel.style.setProperty('--enter-progress', String(enter));
      panel.style.setProperty('--care-progress', String(care * (index === 0 ? intro : 1)));
      shapeMorphers[index].update(care * (index === 0 ? intro : 1));
      shapeMorphers[index].lookAt(flowerPose[0], flowerPose[1]);
      panel.style.setProperty('--sway', String(Math.sin(distance * Math.PI * 2)));
      panel.style.setProperty(
        '--foliage-visibility',
        String(1 - ease(clamp((Math.abs(distance) - 0.35) / 0.5))),
      );
      panel.style.setProperty('--side-entry', String(clamp(-distance / 0.65)));
      panel.style.setProperty('--side-exit', String(clamp(distance / 0.65)));
      panel.style.setProperty(
        '--blink',
        String(1 - 0.85 * Math.exp(-(((distance - 0.3) / 0.045) ** 2))),
      );
      panel.inert = index !== active;
      panel.setAttribute('aria-hidden', String(index !== active));
    });
    // Dock the original travelling head onto the FAQ stem in stage coordinates.
    const faqIndex = anchors.indexOf('faq');
    const faqStyle = panels[faqIndex]?.style;
    const stemPhase =
      Number(faqStyle?.getPropertyValue('--side-entry') || 0) +
      Number(faqStyle?.getPropertyValue('--side-exit') || 0);
    // Keep the assembled flower intact through the central reading interval.
    const dockWeight = 1 - ease(clamp((stemPhase - 0.54) / 0.46));
    const dock = story.querySelector<SVGSVGElement>('.question-flower-dock');
    const matrix = dock?.getScreenCTM();
    if (flower && matrix && dock) {
      const center = new DOMPoint(80, 80).matrixTransform(matrix);
      const bounds = stage.getBoundingClientRect();
      const dockSize = 160 * Math.hypot(matrix.a, matrix.b);
      const baseSize = parseFloat(flower.style.width);
      const size = baseSize + (dockSize - baseSize) * dockWeight;
      const x = parseFloat(flower.style.left) + baseSize / 2;
      const y = parseFloat(flower.style.top) + baseSize / 2;
      flower.style.width = `${size}px`;
      flower.style.left = `${x + (center.x - bounds.left - x) * dockWeight - size / 2}px`;
      // Release from the moving panel gradually rather than riding it offscreen
      // and then reversing direction to reach the next chapter.
      const dockY = center.y - bounds.top - shifts[faqIndex] * (1 - dockWeight);
      flower.style.top = `${y + (dockY - y) * dockWeight - size / 2}px`;
    }
    // Straight segments connect the offstage hold, attached flower and final pose.
    // The attachment interval itself follows only the box's vertical panel slide.
    if (!travel && value >= faqIndex - 1 && flower && dock && matrix) {
      const bounds = stage.getBoundingClientRect();
      const center = new DOMPoint(80, 80).matrixTransform(matrix);
      const cx = center.x - bounds.left;
      const cy = center.y - bounds.top - shifts[faqIndex];
      const dockSize = 160 * Math.hypot(matrix.a, matrix.b);
      const sizeFor = (pose: number[]) =>
        innerWidth <= 760 ? Math.max(28, Math.min(46, pose[2] * 0.35)) : pose[2];
      const pixelPose = (index: number) => {
        const pose = flowerFor(index),
          size = sizeFor(pose);
        return [
          pose[0] * (stage.clientWidth - size) + size / 2,
          pose[1] * (stage.clientHeight - size) + size / 2,
          size,
        ];
      };
      const hold = 0.35;
      const offset = ease(hold) * stage.clientHeight;
      let point: number[];
      if (value < faqIndex - hold) {
        point = interpolate(
          pixelPose(faqIndex - 1),
          [cx, cy + offset, dockSize],
          ease(clamp((value - faqIndex + 1) / (1 - hold))),
        );
      } else if (value <= faqIndex + hold) {
        point = [cx, cy + shifts[faqIndex], dockSize];
      } else {
        point = interpolate(
          [cx, cy - offset, dockSize],
          pixelPose(faqIndex + 1),
          ease(clamp((value - faqIndex - hold) / (1 - hold))),
        );
      }
      flower.style.width = `${point[2]}px`;
      flower.style.left = `${point[0] - point[2] / 2}px`;
      flower.style.top = `${point[1] - point[2] / 2}px`;
    }
    // Snapshot the displayed pose, including docking, when a click retargets motion.
    if (flower) {
      const size = parseFloat(flower.style.width);
      flowerPose = [
        parseFloat(flower.style.left) / Math.max(1, stage.clientWidth - size),
        parseFloat(flower.style.top) / Math.max(1, stage.clientHeight - size),
        innerWidth <= 760 ? size / 0.35 : size,
        flowerPose[3],
      ];
    }
    links.forEach((link, index) => {
      if (index === active) link.setAttribute('aria-current', 'step');
      else link.removeAttribute('aria-current');
    });
    const revealingPanel = travel ? travel.state.target : to;
    const stageOffset = Math.min(0, stage.getBoundingClientRect().top - headerHeight());
    const layers = panels.map((_, index) => {
      const phase = (shifts[index] + stageOffset) / stage.clientHeight;
      // Enter: wait until half the chapter is visible. Leave: hold until half has left.
      let amount = chapterReveal(phase, 1);
      if (travel) {
        const initial = travel.state.backgrounds[index] ?? 0;
        const startPhase = Math.abs(travel.state.shifts[index] / stage.clientHeight);
        const currentPhase = Math.abs(phase);
        if (index === travel.state.target) {
          const startGate = clamp(1 - startPhase * 2);
          const gate = clamp(1 - currentPhase * 2);
          amount =
            initial + (1 - initial) * clamp((gate - startGate) / Math.max(0.001, 1 - startGate));
        } else {
          const startGate = clamp((startPhase - 0.5) * 2);
          const gate = clamp((currentPhase - 0.5) * 2);
          amount = initial * (1 - clamp((gate - startGate) / Math.max(0.001, 1 - startGate)));
        }
      }
      // The last chapter keeps its green field while the stage scrolls toward the footer.
      // Backward chapter transitions still use the reversible reveal above.
      if (!travel && index === panels.length - 1 && phase < 0) amount = 1;
      backgroundAmounts[index] = amount;
      return sceneField(stage.clientWidth, stage.clientHeight, amount, {
        center: { x: stage.clientWidth / 2, y: stage.clientHeight / 2 + shifts[index] },
        hard: poses[index].color[0] < 100,
      });
    });
    const green = panels.length - 1;
    if (flower) {
      const size = parseFloat(flower.style.width);
      const x = parseFloat(flower.style.left) + size / 2;
      const y = parseFloat(flower.style.top) + size / 2;
      const greenField = layers[green];
      const distance = Math.hypot(x - greenField.cx, y - greenField.cy);
      const coverage = ease(clamp((greenField.outer - distance) / Math.max(40, size)));
      const amount = coverage * greenField.strength;
      flower.style.setProperty('--flower-green', String(amount));
      flower.style.color = `rgb(${interpolate([201, 139, 104], [255, 255, 255], amount).join(',')})`;
    }
    const paintedPanel = layers[green].outer > 0 ? green : revealingPanel;
    const field = layers[paintedPanel];
    const revealProgress =
      field.strength === 0
        ? 0
        : field.outer /
          sceneField(stage.clientWidth, stage.clientHeight, 1, {
            center: { x: field.cx, y: field.cy },
            hard: poses[paintedPanel].color[0] < 100,
          }).outer;

    const windowColor = poses[paintedPanel].color;
    stage.style.backgroundImage = layers
      .map((layer, index) => {
        if (index === paintedPanel || layer.outer === 0)
          return 'linear-gradient(transparent,transparent)';
        return `radial-gradient(circle at ${layer.cx}px ${layer.cy}px,rgba(${poses[index].color.join(',')},${layer.strength}) ${layer.inner}px,transparent ${layer.outer}px)`;
      })
      .reverse()
      .join(',');
    if (aperture) {
      aperture.style.backgroundColor = `rgb(${windowColor.map(Math.round).join(',')})`;
      aperture.style.setProperty('--scene-progress', String(revealProgress));
      aperture.style.setProperty('--scene-center-x', String(field.cx));
      aperture.style.setProperty('--scene-center-y', String(field.cy));
      aperture.style.setProperty('--scene-hard-edge', String(field.inner === field.outer ? 1 : 0));
      aperture.style.maskImage = `radial-gradient(circle at ${field.cx}px ${field.cy}px,rgba(0,0,0,${field.strength}) ${field.inner}px,transparent ${field.outer}px)`;
    }
    contrast.update(color, windowColor, field);
    if (travel) applyObjects(travel.state.objects.start, travel.state.objects.end, travel.mix);
    if (count) count.textContent = String(active + 1).padStart(2, '0');
    if (previous) {
      previous.hidden = active === 0;
      previous.href = links[Math.max(0, active - 1)].href;
    }
    if (next) {
      next.hidden = active === panels.length - 1;
      next.href = links[Math.min(active + 1, panels.length - 1)].href;
    }
  }
  function update(now = performance.now()) {
    frame = 0;
    if (animation) {
      const state = animation;
      const t = easeOutExpo((now - state.start) / 1000);
      // Keep the document's real position on the same timeline, including starts in the footer.
      const scrollTarget =
        state.target === 0 ? 0 : startTop() + (scrollRange() * state.target) / (panels.length - 1);
      window.scrollTo({
        top: state.scrollFrom + (scrollTarget - state.scrollFrom) * t,
        behavior: 'instant',
      });
      render(state.from + (state.target - state.from) * t, { state, mix: t });
      if (t < 1) frame = requestAnimationFrame(update);
      else {
        animation = undefined;
        scrollToChapter(state.target);
        render(state.target);
        main.removeAttribute('data-marketing-transition');
        state.done();
      }
    } else
      render(
        clamp((headerHeight() - story.getBoundingClientRect().top) / scrollRange()) *
          (panels.length - 1),
      );
    if (!animation && introActive) {
      if (now - introStart < 1100) frame = requestAnimationFrame(update);
      else introActive = false;
    }
  }
  function schedule() {
    if (!frame) frame = requestAnimationFrame(update);
  }
  function cancel() {
    if (!animation) return;
    const done = animation.done;
    animation = undefined;
    cancelAnimationFrame(frame);
    frame = 0;
    // Interrupted long jumps settle on the visible scene, never a skipped chapter.
    scrollToChapter(active);
    render(active);
    main.removeAttribute('data-marketing-transition');
    done();
  }
  const interrupt = (event: Event) => {
    if (
      event.type !== 'keydown' ||
      ['ArrowDown', 'ArrowUp', 'PageDown', 'PageUp', 'Home', 'End', ' '].includes(
        (event as KeyboardEvent).key,
      )
    )
      cancel();
  };
  controllers.set(story, {
    jump(hash) {
      const target = anchors.indexOf(hash.slice(1));
      if (target < 0) return false;
      scrollToChapter(target);
      render(target);
      return true;
    },
    move(hash, done) {
      const target = anchors.indexOf(hash.slice(1));
      if (target < 0) return;
      cancelAnimationFrame(frame);
      frame = 0;
      const sourceObjects = captureObjects();
      const saved = {
        chapter,
        active,
        flowerPose: [...flowerPose],
        shifts: [...shifts],
        distances: [...distances],
        backgroundAmounts: [...backgroundAmounts],
      };
      const attributes = [story, ...story.querySelectorAll('*')].map((node) => ({
        node,
        attrs: Array.from(node.attributes).map(({ name, value }) => [name, value] as const),
      }));
      const countText = count?.textContent;
      render(target);
      const targetObjects = captureObjects();
      for (const { node, attrs } of attributes) {
        for (const attr of Array.from(node.attributes)) node.removeAttribute(attr.name);
        for (const [name, value] of attrs) node.setAttribute(name, value);
      }
      if (count) count.textContent = countText ?? '';
      chapter = saved.chapter;
      active = saved.active;
      flowerPose = saved.flowerPose;
      shifts = saved.shifts;
      distances = saved.distances;
      backgroundAmounts = saved.backgroundAmounts;
      const direction = target >= chapter ? 1 : -1;
      const starts = [...shifts];
      const startDistances = [...distances];
      if (Math.abs(starts[target]) >= stage.clientHeight) {
        starts[target] = direction * stage.clientHeight;
        startDistances[target] = -direction * 0.65;
      }
      animation = {
        start: performance.now(),
        scrollFrom: window.scrollY,
        from: chapter,
        target,
        source: active,
        direction,
        shifts: starts,
        distances: startDistances,
        backgrounds: [...backgroundAmounts],
        flower: [...flowerPose],
        objects: { start: sourceObjects, end: targetObjects },
        done,
      };
      main.setAttribute('data-marketing-transition', '');
      frame = requestAnimationFrame(update);
      return { cancel };
    },
  });
  const preference = matchMedia('(prefers-reduced-motion: reduce)');
  const reduce = () => {
    if (preference.matches && animation) {
      const target = animation.target;
      const done = animation.done;
      animation = undefined;
      cancelAnimationFrame(frame);
      frame = 0;
      scrollToChapter(target);
      render(target);
      main.removeAttribute('data-marketing-transition');
      done();
    }
  };
  preference.addEventListener('change', reduce);
  const resize = new ResizeObserver(schedule);
  resize.observe(story);
  resize.observe(stage);
  window.addEventListener('scroll', schedule, { passive: true });
  stage.addEventListener('scroll', schedule, { capture: true, passive: true });
  window.addEventListener('resize', schedule);
  window.addEventListener('pageshow', schedule);
  window.addEventListener('wheel', interrupt, { passive: true });
  window.addEventListener('touchstart', interrupt, { passive: true });
  window.addEventListener('keydown', interrupt);
  update();
  return () => {
    animation = undefined;
    cancelAnimationFrame(frame);
    resize.disconnect();
    controllers.delete(story);
    preference.removeEventListener('change', reduce);
    main.removeAttribute('data-marketing-transition');
    window.removeEventListener('scroll', schedule);
    stage.removeEventListener('scroll', schedule, true);
    window.removeEventListener('resize', schedule);
    window.removeEventListener('pageshow', schedule);
    window.removeEventListener('wheel', interrupt);
    window.removeEventListener('touchstart', interrupt);
    window.removeEventListener('keydown', interrupt);
    story.removeAttribute('data-cinema-enabled');
    story.removeAttribute('data-active-chapter');
    story.removeAttribute('data-dark-scene');
    for (const key of [
      '--cinema-progress',
      '--cinema-color',
      '--journey-turn',
      '--celestial-morph',
      '--intro-progress',
    ])
      story.style.removeProperty(key);
    rail?.style.removeProperty('--rail-offset');
    aperture?.removeAttribute('style');
    stage.style.removeProperty('background-image');
    contrast.dispose();
    shapeMorphers.forEach((morpher) => morpher.dispose());
    markers.forEach((marker) => marker.removeAttribute('id'));
    panels.forEach((panel, index) => {
      if (ids[index]) panel.id = ids[index];
      panel.inert = false;
      panel.removeAttribute('aria-hidden');
      for (const key of [
        '--panel-shift',
        '--scroll',
        '--arrival',
        '--pet-entry',
        '--pet-gather',
        '--expression',
        '--care-progress',
        '--sway',
        '--blink',
        '--foliage-visibility',
        '--side-entry',
        '--enter-progress',
        '--side-exit',
      ])
        panel.style.removeProperty(key);
    });
  };
}
