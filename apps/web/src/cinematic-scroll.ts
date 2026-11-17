const clamp = (value: number) => Math.max(0, Math.min(1, value));
const chapterColors = [
  [250, 248, 242],
  [231, 237, 224],
  [245, 242, 233],
  [250, 248, 242],
  [245, 242, 232],
  [43, 79, 61],
];

const landscapePoses = [
  [770, 700, 760, 95],
  [730, 790, 700, 85],
  [790, 710, 790, 70],
  [720, 790, 730, 55],
  [770, 700, 780, 35],
  [730, 770, 710, 22],
];

/** A single, reversible timeline. Every pose is derived from scroll geometry. */
export function installCinematicStory(story: HTMLElement) {
  const stage = story.querySelector<HTMLElement>('.cinematic-stage')!;
  const panels = Array.from(story.querySelectorAll<HTMLElement>('[data-cinematic-panel]'));
  const markers = Array.from(story.querySelectorAll<HTMLElement>('[data-cinema-anchor]'));
  const chapterLinks = Array.from(story.querySelectorAll<HTMLAnchorElement>('[data-chapter-link]'));
  const counter = story.querySelector<HTMLElement>('[data-cinema-count]');
  const next = story.querySelector<HTMLAnchorElement>('[data-cinema-next]');
  const landscape = story.querySelector('.story-landscape');
  const orb = landscape?.querySelector('[data-journey-orb]');
  const moon = landscape?.querySelector('[data-journey-moon]');
  const seed = landscape?.querySelector('[data-journey-seed]');
  const backHill = landscape?.querySelector('[data-journey-hill="back"]');
  const frontHill = landscape?.querySelector('[data-journey-hill="front"]');
  const thread = landscape?.querySelector('[data-journey-thread]');
  const panelIds = panels.map((panel) => panel.id);
  let frame = 0;
  story.setAttribute('data-cinema-enabled', '');
  panels.forEach((panel) => panel.removeAttribute('id'));
  markers.forEach((marker) => {
    marker.id = marker.dataset.cinemaAnchor!;
  });

  function update() {
    frame = 0;
    const bounds = story.getBoundingClientRect();
    const stageHeight = stage.clientHeight;
    const headerHeight =
      Number.parseFloat(
        getComputedStyle(document.documentElement).getPropertyValue('--marketing-header-height'),
      ) || 0;
    const progress = clamp((headerHeight - bounds.top) / Math.max(1, bounds.height - stageHeight));
    const chapter = progress * (panels.length - 1);
    const from = Math.min(panels.length - 1, Math.floor(chapter));
    const to = Math.min(panels.length - 1, from + 1);
    const mix = chapter - from;
    const color = chapterColors[from].map((channel, index) =>
      Math.round(channel + (chapterColors[to][index] - channel) * mix),
    );
    const active = Math.min(panels.length - 1, Math.round(chapter));
    story.style.setProperty('--cinema-progress', String(progress));
    story.style.setProperty('--cinema-color', `rgb(${color.join(',')})`);
    story.dataset.activeChapter = String(active);
    // One continuous landscape morphs underneath all six compositions.
    const blend = mix * mix * (3 - 2 * mix);
    const [leftHill, middleHill, rightHill, moonOffset] = landscapePoses[from].map(
      (value, index) => value + (landscapePoses[to][index] - value) * blend,
    );
    const spread = innerWidth <= 760 ? 0.24 : 1;
    // One skyward arc across the whole story, not repeated side-to-side chapter hops.
    const sunProgress = progress * progress * (3 - 2 * progress);
    const sunScale = innerWidth <= 760 ? 0.78 : 1;
    const flowerScale = innerWidth <= 760 ? 0.5 : 0.65;
    orb?.setAttribute(
      'transform',
      `translate(${720 + 520 * spread * (1 - 2 * sunProgress)} ${100 - Math.sin(sunProgress * Math.PI) * 20}) scale(${sunScale})`,
    );
    moon?.setAttribute('cx', String(moonOffset));
    seed?.setAttribute(
      'transform',
      `translate(${720 - 590 * spread} ${750 - progress * 15}) rotate(${chapter * 8}) scale(${flowerScale})`,
    );
    backHill?.setAttribute(
      'd',
      `M-100 ${leftHill}C300 ${middleHill - 140} 570 ${middleHill} 760 ${middleHill}S1150 ${rightHill - 90} 1540 ${rightHill}V1000H-100Z`,
    );
    frontHill?.setAttribute(
      'd',
      `M-100 ${rightHill + 80}C340 ${leftHill - 40} 650 ${middleHill + 130} 900 ${middleHill + 60}S1250 ${leftHill} 1540 ${leftHill + 40}V1000H-100Z`,
    );
    thread?.setAttribute(
      'd',
      `M-80 ${leftHill - 100}C280 ${middleHill - 230} 450 ${rightHill + 80} 780 ${middleHill - 70}S1170 ${leftHill - 150} 1520 ${rightHill - 80}`,
    );
    story.style.setProperty('--journey-turn', `${chapter * 6}deg`);

    const easedMix = mix * mix * mix * (mix * (mix * 6 - 15) + 10);
    const position = from + easedMix;
    panels.forEach((panel, index) => {
      const distance = chapter - index;
      // Full-height movement replaces dissolves. Adjacent scenes meet at their edges.
      panel.style.setProperty('--panel-shift', `${(index - position) * stageHeight}px`);
      // Quadratic ease-in builds speed with scroll distance, without trailing timers.
      const motionProgress = clamp(distance / 0.65);
      panel.style.setProperty('--scroll', String(motionProgress ** 2));
      panel.style.setProperty('--care-progress', String(clamp(distance + 0.5)));
      panel.style.setProperty('--arrival', String(clamp(distance + 1)));
      panel.style.setProperty('--sway', String(Math.sin(distance * Math.PI * 2)));
      panel.style.setProperty(
        '--blink',
        String(1 - 0.85 * Math.exp(-(((distance - 0.3) / 0.045) ** 2))),
      );

      panel.inert = index !== active;
      panel.setAttribute('aria-hidden', String(index !== active));
    });
    chapterLinks.forEach((link, index) => {
      if (index === active) link.setAttribute('aria-current', 'step');
      else link.removeAttribute('aria-current');
    });
    if (counter) counter.textContent = String(active + 1).padStart(2, '0');
    if (next) {
      const destination = chapterLinks[active + 1] ?? chapterLinks[0];
      next.href = destination.href;
      next.textContent =
        (active === panels.length - 1 ? next.dataset.restartLabel : next.dataset.nextLabel) +
        (active === panels.length - 1 ? ' ↑' : ' ↓');
    }
  }
  function schedule() {
    if (!frame) frame = requestAnimationFrame(update);
  }
  const resize = new ResizeObserver(schedule);
  resize.observe(story);
  window.addEventListener('scroll', schedule, { passive: true });
  window.addEventListener('resize', schedule);
  window.addEventListener('pageshow', schedule);
  update();
  return () => {
    cancelAnimationFrame(frame);
    resize.disconnect();
    window.removeEventListener('scroll', schedule);
    window.removeEventListener('resize', schedule);
    window.removeEventListener('pageshow', schedule);
    story.removeAttribute('data-cinema-enabled');
    story.removeAttribute('data-active-chapter');
    story.style.removeProperty('--cinema-progress');
    story.style.removeProperty('--cinema-color');
    story.style.removeProperty('--journey-turn');
    markers.forEach((marker) => marker.removeAttribute('id'));
    panels.forEach((panel, index) => {
      if (panelIds[index]) panel.id = panelIds[index];
      panel.inert = false;
      panel.removeAttribute('aria-hidden');
      for (const property of [
        '--panel-shift',
        '--scroll',
        '--arrival',
        '--sway',
        '--blink',
        '--care-progress',
      ])
        panel.style.removeProperty(property);
    });
    chapterLinks.forEach((link) => link.removeAttribute('aria-current'));
  };
}
