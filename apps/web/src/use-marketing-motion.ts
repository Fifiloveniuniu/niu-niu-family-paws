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
            const variant = (entry.target as HTMLElement).dataset.reveal;
            const entrance =
              variant === 'art'
                ? 'scale(0.92) rotate(-3deg)'
                : variant === 'line'
                  ? 'scaleX(0)'
                  : 'translateY(32px)';
            const animation = entry.target.animate(
              [
                { opacity: 0, transform: entrance },
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
          '.hero > div:first-child > *, .hero-art, .section-heading, .service, .about > div, .about li, .faq > div, .contact > *, .public-policy > *, [data-reveal]',
        )
        .forEach((target, index) => {
          (target as HTMLElement).dataset.motionDelay = String((index % 3) * 85);
          observer.observe(target);
        });
      dispose = () => {
        observer.disconnect();
        animations.forEach((animation) => animation.cancel());
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
