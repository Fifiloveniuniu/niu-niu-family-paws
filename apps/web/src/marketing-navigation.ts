import { easeOutExpo } from './marketing-easing';
import { animateCinematicTarget, jumpCinematicTarget } from './cinematic-scroll';

let transition: { hash: string; cancel: () => void } | undefined;

export function cancelMarketingTransition() {
  transition?.cancel();
}

/** Briefly transition between destinations without replaying intervening chapters. */
export function scrollMarketingTarget(hash: string, animated = false) {
  if (transition?.hash === hash) return;
  transition?.cancel();
  const jump = () => {
    const story = document.querySelector<HTMLElement>('[data-cinema-enabled]');
    if (story && jumpCinematicTarget(story, hash)) return;
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
  const story = main.querySelector<HTMLElement>('[data-cinema-enabled]');
  if (story) {
    const movement = animateCinematicTarget(story, hash, () => {
      transition = undefined;
    });
    if (movement) {
      transition = { hash, cancel: movement.cancel };
      return;
    }
  }
  const destination = hash && hash !== '#main' ? document.getElementById(hash.slice(1)) : undefined;
  if (hash && hash !== '#main' && !destination) {
    jump();
    return;
  }
  const from = window.scrollY;
  const header = document.querySelector('.marketing-header')?.getBoundingClientRect().height ?? 0;
  const target = destination
    ? Math.max(
        0,
        Math.min(
          document.documentElement.scrollHeight - innerHeight,
          from + destination.getBoundingClientRect().top - header - 16,
        ),
      )
    : 0;
  let frame = 0;
  const cancel = () => {
    cancelAnimationFrame(frame);
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
  main.setAttribute('data-marketing-transition', '');
  window.addEventListener('wheel', cancel, { passive: true });
  window.addEventListener('touchstart', cancel, { passive: true });
  window.addEventListener('keydown', handleKey);
  preference.addEventListener('change', handlePreference);
  const start = performance.now();
  const update = (now: number) => {
    const progress = Math.min(1, (now - start) / 850);
    window.scrollTo({ top: from + (target - from) * easeOutExpo(progress), behavior: 'instant' });
    if (progress < 1) frame = requestAnimationFrame(update);
    else cancel();
  };
  frame = requestAnimationFrame(update);
}

/** Page changes animate the content alone; the navbar stays fixed and route-selected. */
export function animateMarketingPageEntry() {
  transition?.cancel();
  window.scrollTo({ top: 0, behavior: 'instant' });
  const main = document.querySelector<HTMLElement>('.marketing-site');
  const preference = matchMedia('(prefers-reduced-motion: reduce)');
  if (!main || preference.matches) return;
  const animation = main.animate(
    [{ transform: 'translateY(28px)' }, { transform: 'translateY(0)' }],
    { duration: 320, easing: 'cubic-bezier(.22,1,.36,1)', fill: 'both' },
  );
  let cancelled = false;
  const cancel = () => {
    if (cancelled) return;
    cancelled = true;
    animation.cancel();
    main.removeAttribute('data-marketing-transition');
    window.removeEventListener('wheel', cancel);
    window.removeEventListener('touchstart', cancel);
    window.removeEventListener('keydown', handleKey);
    preference.removeEventListener('change', cancel);
    transition = undefined;
  };
  const handleKey = (event: KeyboardEvent) => {
    if (['ArrowDown', 'ArrowUp', 'PageDown', 'PageUp', 'Home', 'End', ' '].includes(event.key))
      cancel();
  };
  transition = { hash: '__page__', cancel };
  main.setAttribute('data-marketing-transition', '');
  window.addEventListener('wheel', cancel, { passive: true });
  window.addEventListener('touchstart', cancel, { passive: true });
  window.addEventListener('keydown', handleKey);
  preference.addEventListener('change', cancel);
  void animation.finished.then(cancel, cancel);
}
