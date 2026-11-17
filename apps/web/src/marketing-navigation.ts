let transition: { hash: string; cancel: () => void } | undefined;

export function cancelMarketingTransition() {
  transition?.cancel();
}

/** Briefly transition between destinations without replaying intervening chapters. */
export function scrollMarketingTarget(hash: string, animated = false) {
  if (transition?.hash === hash) return;
  transition?.cancel();
  const jump = () => {
    if (!hash || hash === '#main') window.scrollTo({ top: 0, behavior: 'instant' });
    else document.getElementById(hash.slice(1))?.scrollIntoView({ behavior: 'instant' });
  };
  const preference = matchMedia('(prefers-reduced-motion: reduce)');
  const main = document.querySelector<HTMLElement>('.marketing-site');
  const stage = main?.querySelector<HTMLElement>('.cinematic-stage') ?? main;
  if (!animated || !main || !stage || preference.matches) {
    jump();
    return;
  }
  let cancelled = false;
  const animations: Animation[] = [];
  const cancel = () => {
    cancelled = true;
    animations.forEach((animation) => animation.cancel());
    main.removeAttribute('data-marketing-transition');
    window.removeEventListener('wheel', cancel);
    window.removeEventListener('touchstart', cancel);
    window.removeEventListener('keydown', handleKey);
    preference.removeEventListener('change', handlePreference);
    transition = undefined;
  };
  const handleKey = (event: KeyboardEvent) => {
    if (['ArrowDown', 'ArrowUp', 'PageDown', 'PageUp', 'Home', 'End', ' '].includes(event.key))
      cancel();
  };
  const handlePreference = () => {
    if (preference.matches) {
      cancel();
      jump();
    }
  };
  transition = { hash, cancel };
  preference.addEventListener('change', handlePreference);
  main.setAttribute('data-marketing-transition', '');
  window.addEventListener('wheel', cancel, { passive: true });
  window.addEventListener('touchstart', cancel, { passive: true });
  window.addEventListener('keydown', handleKey);
  void (async () => {
    const story = stage.closest<HTMLElement>('[data-cinematic-story]');
    const panels = Array.from(stage.querySelectorAll<HTMLElement>('[data-cinematic-panel]'));
    const anchors = [
      'main',
      ...Array.from(story?.querySelectorAll<HTMLElement>('[data-cinema-anchor]') ?? []).map(
        (marker) => marker.dataset.cinemaAnchor,
      ),
    ];
    const destinationIndex = anchors.indexOf(hash.slice(1));
    const headerBottom =
      document.querySelector('.marketing-header')?.getBoundingClientRect().bottom ?? 0;
    const outgoing =
      stage.querySelector<HTMLElement>('[data-cinematic-panel][aria-hidden="false"]') ??
      panels.find((panel) => {
        const bounds = panel.getBoundingClientRect();
        return bounds.bottom > headerBottom + 20 && bounds.top < innerHeight;
      }) ??
      stage;
    const currentIndex = Math.max(0, panels.indexOf(outgoing));
    const direction = destinationIndex >= 0 && destinationIndex < currentIndex ? -1 : 1;
    const exit = outgoing.animate(
      [{ transform: 'translateY(0)' }, { transform: `translateY(${-direction * 110}%)` }],
      { duration: 240, easing: 'cubic-bezier(.55,.05,.9,.5)', fill: 'forwards' },
    );
    animations.push(exit);
    await exit.finished.catch(() => {});
    if (cancelled) return;
    // Select the requested chapter, not the still-active chapter from before the jump.
    const incoming = panels[destinationIndex] ?? stage;
    const entrance = incoming.animate(
      [{ transform: `translateY(${direction * 110}%)` }, { transform: 'translateY(0)' }],
      { duration: 420, easing: 'cubic-bezier(.22,1,.36,1)', fill: 'both' },
    );
    animations.push(entrance);
    // Hold the destination outside the viewport until its scroll pose is ready.
    entrance.pause();
    entrance.currentTime = 0;
    jump();
    await new Promise<void>((resolve) =>
      requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
    );
    if (cancelled) return;
    exit.cancel();
    entrance.play();
    await entrance.finished.catch(() => {});
    if (!cancelled) cancel();
  })();
}
