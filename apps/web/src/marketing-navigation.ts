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
  let animation: Animation | undefined;
  const cancel = () => {
    cancelled = true;
    animation?.cancel();
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
    const outgoing =
      stage.querySelector<HTMLElement>('[data-cinematic-panel][aria-hidden="false"]') ?? stage;
    animation = outgoing.animate(
      [
        { opacity: 1, transform: 'translateY(0)' },
        { opacity: 0, transform: 'translateY(-24px)' },
      ],
      { duration: 140, easing: 'cubic-bezier(.55,.05,.9,.5)', fill: 'forwards' },
    );
    await animation.finished.catch(() => {});
    if (cancelled) return;
    jump();
    await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
    if (cancelled) return;
    animation.cancel();
    const incoming =
      stage.querySelector<HTMLElement>('[data-cinematic-panel][aria-hidden="false"]') ?? stage;
    animation = incoming.animate(
      [
        { opacity: 0, transform: 'translateY(28px)' },
        { opacity: 1, transform: 'translateY(0)' },
      ],
      { duration: 220, easing: 'cubic-bezier(.16,1,.3,1)', fill: 'forwards' },
    );
    await animation.finished.catch(() => {});
    if (!cancelled) cancel();
  })();
}
