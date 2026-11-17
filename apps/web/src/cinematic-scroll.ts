const clamp = (value: number) => Math.max(0, Math.min(1, value));
const ease = (value: number) => value * value * (3 - 2 * value);
const interpolate = (a: number[], b: number[], mix: number) =>
  a.map((value, index) => value + (b[index] - value) * mix);
const scenePoses: Record<string, { color: number[]; flower: number[] }> = {
  main: { color: [250, 248, 242], flower: [0.58, 0.12, 110, -15] },
  experience: { color: [231, 237, 224], flower: [-0.22, 0.3, 100, 35] },
  services: { color: [245, 242, 233], flower: [0.08, 0.03, 90, 95] },
  about: { color: [250, 248, 242], flower: [1.2, 0.5, 120, 155] },
  spaces: { color: [238, 232, 218], flower: [0.85, 0.16, 84, 200] },
  numbers: { color: [231, 237, 224], flower: [-0.22, 0.6, 110, 245] },
  stories: { color: [250, 248, 242], flower: [0.84, 0.45, 180, 290] },
  faq: { color: [245, 242, 232], flower: [0.21, 0.35, 180, 335] },
  contact: { color: [43, 79, 61], flower: [0.5, 0.18, 100, 395] },
};
type Movement = { cancel: () => void };
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
  const panels = Array.from(story.querySelectorAll<HTMLElement>('[data-cinematic-panel]'));
  const markers = Array.from(story.querySelectorAll<HTMLElement>('[data-cinema-anchor]'));
  const links = Array.from(story.querySelectorAll<HTMLAnchorElement>('[data-chapter-link]'));
  const ids = panels.map((panel) => panel.id);
  const anchors = ['main', ...markers.map((marker) => marker.dataset.cinemaAnchor!)];
  const poses = anchors.map((anchor) => scenePoses[anchor] ?? scenePoses.main);
  // Offstage poses are intentional: one flower exits and returns in later compositions.
  const flowerFor = (index: number) => {
    const pose = poses[index].flower;
    if (innerWidth > 760 || anchors[index] === 'contact') return pose;
    return [
      anchors[index] === 'main' ? 0.1 : anchors[index] === 'faq' ? 0.85 : pose[0],
      0.01,
      pose[2],
      pose[3],
    ];
  };
  const next = story.querySelector<HTMLAnchorElement>('[data-cinema-next]');
  const previous = story.querySelector<HTMLAnchorElement>('[data-cinema-previous]');
  const count = story.querySelector('[data-cinema-count]');
  const rail = story.querySelector<HTMLElement>('.cinema-rail');
  const flower = story.querySelector<HTMLElement>('.shared-flower');
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
  type AnimationState = {
    start: number;
    from: number;
    target: number;
    source: number;
    direction: number;
    shifts: number[];
    distances: number[];
    color: number[];
    flower: number[];
    done: () => void;
  };
  let animation: AnimationState | undefined;
  story.setAttribute('data-cinema-enabled', '');
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
  function render(value: number, travel?: { state: AnimationState; mix: number }) {
    chapter = value;
    const progress = clamp(value / (panels.length - 1));
    const from = Math.min(panels.length - 1, Math.floor(value));
    const to = Math.min(panels.length - 1, from + 1);
    const mix = ease(value - from);
    color = travel
      ? interpolate(travel.state.color, poses[travel.state.target].color, travel.mix)
      : interpolate(poses[from].color, poses[to].color, mix);
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
      sun.style.left = `${inset + Math.max(0, stage.clientWidth - sun.clientWidth - inset * 2) * (1 - sunProgress)}px`;
      sun.style.top = `${18 + (1 - Math.sin(sunProgress * Math.PI)) * 18}px`;
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
      panel.style.setProperty('--expression', String(clamp((distance + 0.25) / 0.75)));
      panel.style.setProperty('--care-progress', String(clamp(distance + 0.5)));
      panel.style.setProperty('--sway', String(Math.sin(distance * Math.PI * 2)));
      panel.style.setProperty('--side-entry', String(clamp(-distance / 0.65)));
      panel.style.setProperty('--side-exit', String(clamp(distance / 0.65)));
      panel.style.setProperty(
        '--blink',
        String(1 - 0.85 * Math.exp(-(((distance - 0.3) / 0.045) ** 2))),
      );
      panel.inert = index !== active;
      panel.setAttribute('aria-hidden', String(index !== active));
    });
    links.forEach((link, index) => {
      if (index === active) link.setAttribute('aria-current', 'step');
      else link.removeAttribute('aria-current');
    });
    if (count) count.textContent = String(active + 1).padStart(2, '0');
    if (previous) {
      previous.hidden = active === 0;
      previous.href = links[Math.max(0, active - 1)].href;
    }
    if (next) {
      next.href = (links[active + 1] ?? links[0]).href;
      next.textContent =
        (active === panels.length - 1 ? next.dataset.restartLabel : next.dataset.nextLabel) +
        (active === panels.length - 1 ? ' ↑' : ' ↓');
    }
  }
  function update(now = performance.now()) {
    frame = 0;
    if (animation) {
      const state = animation;
      const t = ease(clamp((now - state.start) / 850));
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
    scrollToChapter(chapter);
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
      const direction = target >= chapter ? 1 : -1;
      const starts = [...shifts];
      const startDistances = [...distances];
      if (Math.abs(starts[target]) >= stage.clientHeight) {
        starts[target] = direction * stage.clientHeight;
        startDistances[target] = -direction * 0.65;
      }
      animation = {
        start: performance.now(),
        from: chapter,
        target,
        source: active,
        direction,
        shifts: starts,
        distances: startDistances,
        color: [...color],
        flower: [...flowerPose],
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
  window.addEventListener('scroll', schedule, { passive: true });
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
    ])
      story.style.removeProperty(key);
    rail?.style.removeProperty('--rail-offset');
    markers.forEach((marker) => marker.removeAttribute('id'));
    panels.forEach((panel, index) => {
      if (ids[index]) panel.id = ids[index];
      panel.inert = false;
      panel.removeAttribute('aria-hidden');
      for (const key of [
        '--panel-shift',
        '--scroll',
        '--arrival',
        '--expression',
        '--care-progress',
        '--sway',
        '--blink',
        '--side-entry',
        '--side-exit',
      ])
        panel.style.removeProperty(key);
    });
  };
}
