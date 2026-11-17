const clamp = (value: number) => Math.max(0, Math.min(1, value));
const chapterColors = [
  [247, 246, 235],
  [223, 232, 215],
  [255, 250, 240],
  [236, 209, 188],
  [248, 243, 230],
  [43, 79, 61],
];

/** A single, reversible timeline. Every pose is derived from scroll geometry. */
export function installCinematicStory(story: HTMLElement) {
  const stage = story.querySelector<HTMLElement>('.cinematic-stage')!;
  const panels = Array.from(story.querySelectorAll<HTMLElement>('[data-cinematic-panel]'));
  const markers = Array.from(story.querySelectorAll<HTMLElement>('[data-cinema-anchor]'));
  const chapterLinks = Array.from(story.querySelectorAll<HTMLAnchorElement>('[data-chapter-link]'));
  const counter = story.querySelector<HTMLElement>('[data-cinema-count]');
  const next = story.querySelector<HTMLAnchorElement>('[data-cinema-next]');
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
    const progress = clamp(-bounds.top / Math.max(1, bounds.height - stage.clientHeight));
    const chapter = progress * (panels.length - 1);
    const from = Math.min(panels.length - 1, Math.floor(chapter));
    const to = Math.min(panels.length - 1, from + 1);
    const mix = chapter - from;
    const color = chapterColors[from].map((channel, index) =>
      Math.round(channel + (chapterColors[to][index] - channel) * mix),
    );
    const active = Math.min(panels.length - 1, Math.floor(chapter + 0.175));
    story.style.setProperty('--cinema-progress', String(progress));
    story.style.setProperty('--cinema-color', `rgb(${color.join(',')})`);
    story.dataset.activeChapter = String(active);
    panels.forEach((panel, index) => {
      const distance = chapter - index;
      const opacity = Math.min(clamp((distance + 0.35) / 0.35), clamp((1 - distance) / 0.35));
      const copyOpacity =
        distance < 0 ? clamp((distance + 0.2) / 0.2) : clamp((0.76 - distance) / 0.16);
      panel.style.setProperty('--panel-opacity', String(opacity));
      panel.style.setProperty('--copy-opacity', String(copyOpacity));
      panel.style.setProperty('--panel-shift', `${-distance * 8}vw`);
      panel.style.setProperty('--panel-scale', String(1 - distance * 0.035));
      panel.style.setProperty('--scroll', String(clamp(distance / 0.65)));
      panel.inert = index !== active || copyOpacity < 0.15;
      panel.setAttribute('aria-hidden', String(index !== active || copyOpacity < 0.15));
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
    markers.forEach((marker) => marker.removeAttribute('id'));
    panels.forEach((panel, index) => {
      if (panelIds[index]) panel.id = panelIds[index];
      panel.inert = false;
      panel.removeAttribute('aria-hidden');
      for (const property of [
        '--panel-opacity',
        '--copy-opacity',
        '--panel-shift',
        '--panel-scale',
        '--scroll',
      ])
        panel.style.removeProperty(property);
    });
    chapterLinks.forEach((link) => link.removeAttribute('aria-current'));
  };
}
