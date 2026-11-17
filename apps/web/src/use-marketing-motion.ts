import { useEffect, type RefObject } from 'react';

/** Progressive enhancement: content stays visible without motion or JavaScript. */
export default function useMarketingMotion(root: RefObject<HTMLElement | null>, page: string) {
  useEffect(() => {
    const element = root.current;
    if (!element) return;
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
    let dispose = () => {};
    function configure() {
      dispose();
      if (!element || preference.matches) return;
      const animations = new Set<Animation>();
      const observer = new IntersectionObserver(
        (entries) => {
          for (const entry of entries) {
            if (!entry.isIntersecting) continue;
            observer.unobserve(entry.target);
            const animation = entry.target.animate(
              [
                { opacity: 0, transform: 'translateY(24px)' },
                { opacity: 1, transform: 'translateY(0)' },
              ],
              {
                duration: 700,
                delay: Number((entry.target as HTMLElement).dataset.motionDelay || 0),
                easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
                fill: 'backwards',
              },
            );
            animations.add(animation);
            animation.onfinish = () => animations.delete(animation);
          }
        },
        { threshold: 0.08 },
      );
      element
        .querySelectorAll(
          '.hero > div:first-child > *, .hero-art, .section-heading, .service, .about > div, .about li, .faq > div, .contact > *, .public-policy > *',
        )
        .forEach((target, index) => {
          (target as HTMLElement).dataset.motionDelay = String((index % 3) * 85);
          observer.observe(target);
        });
      const art = element.querySelector<HTMLElement>('.hero-art');
      const hero = element.querySelector<HTMLElement>('.hero');
      let frame = 0;
      function update() {
        frame = 0;
        if (!art || !hero) return;
        const bounds = hero.getBoundingClientRect();
        if (bounds.bottom < 0 || bounds.top > window.innerHeight) return;
        const travel = Math.max(-1, Math.min(1, -bounds.top / bounds.height));
        const distance = window.innerWidth <= 760 ? 24 : 64;
        art.style.setProperty('--art-travel', `${travel * distance}px`);
        art.style.setProperty('--halo-travel', `${travel * distance * -0.6}px`);
      }
      function schedule() {
        if (!frame) frame = requestAnimationFrame(update);
      }
      update();
      window.addEventListener('scroll', schedule, { passive: true });
      window.addEventListener('resize', schedule);
      dispose = () => {
        observer.disconnect();
        animations.forEach((animation) => animation.cancel());
        window.removeEventListener('scroll', schedule);
        window.removeEventListener('resize', schedule);
        cancelAnimationFrame(frame);
        art?.style.removeProperty('--art-travel');
        art?.style.removeProperty('--halo-travel');
      };
    }
    configure();
    preference.addEventListener('change', configure);
    return () => {
      dispose();
      preference.removeEventListener('change', configure);
    };
  }, [root, page]);
}
