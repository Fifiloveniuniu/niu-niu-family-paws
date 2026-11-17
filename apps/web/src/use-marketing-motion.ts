import { useEffect, type RefObject } from 'react';

/** One deterministic scroll position drives every object, in both directions. */
export default function useMarketingMotion(root: RefObject<HTMLElement | null>, page: string) {
  useEffect(() => {
    const element = root.current;
    if (!element) return;
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
    let dispose = () => {};
    function configure() {
      dispose();
      if (!element || preference.matches) return;
      const scenes = Array.from(element.querySelectorAll<HTMLElement>('[data-scroll-scene]'));
      let frame = 0;
      element.setAttribute('data-scroll-enabled', '');
      function update() {
        frame = 0;
        const viewport = window.innerHeight;
        // Read layout before writing styles; transforms never change scene geometry.
        const positions = scenes.map((scene) => {
          const bounds = scene.getBoundingClientRect();
          const sticky = getComputedStyle(scene).getPropertyValue('--sticky-scene').trim() === '1';
          const distance = sticky
            ? Math.max(1, bounds.height - viewport)
            : viewport + bounds.height;
          const progress = (sticky ? -bounds.top : viewport - bounds.top) / distance;
          return Math.max(0, Math.min(1, progress));
        });
        scenes.forEach((scene, index) =>
          scene.style.setProperty('--scroll', String(positions[index])),
        );
      }
      function schedule() {
        if (!frame) frame = requestAnimationFrame(update);
      }
      const resize = new ResizeObserver(schedule);
      resize.observe(element);
      window.addEventListener('scroll', schedule, { passive: true });
      window.addEventListener('resize', schedule);
      update();
      dispose = () => {
        cancelAnimationFrame(frame);
        resize.disconnect();
        window.removeEventListener('scroll', schedule);
        window.removeEventListener('resize', schedule);
        element.removeAttribute('data-scroll-enabled');
        scenes.forEach((scene) => scene.style.removeProperty('--scroll'));
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
