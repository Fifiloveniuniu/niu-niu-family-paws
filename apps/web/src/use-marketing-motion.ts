import { createShapeMorpher } from './shape-morphs';
import { useEffect, type RefObject } from 'react';
import { installCinematicStory } from './cinematic-scroll';

const opened = new WeakMap<HTMLElement, number>();

/** One deterministic scroll position drives every object, in both directions. */
export default function useMarketingMotion(
  root: RefObject<HTMLElement | null>,
  page: string,
  language: string,
) {
  useEffect(() => {
    const element = root.current;
    if (!element) return;
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
    // Browser chrome can change the dynamic viewport during a phone scroll.
    // Use the same stable viewport as the stage so all chapters keep one layout mode.
    const viewportProbe = document.createElement('div');
    viewportProbe.style.cssText =
      'position:fixed;height:100svh;width:0;visibility:hidden;pointer-events:none';
    viewportProbe.setAttribute('aria-hidden', 'true');
    element.append(viewportProbe);
    let cinematicViewport = viewportProbe.getBoundingClientRect().height >= 810;
    let dispose = () => {};
    const welcome: Animation[] = [];
    if (!preference.matches && !cinematicViewport && !location.hash && scrollY < 8) {
      const hero = element.querySelector<HTMLElement>('.hero-world');
      const copy = element.querySelector<HTMLElement>('.hero-message');
      if (hero && copy) {
        if (!opened.has(element)) opened.set(element, performance.now());
        const elapsed = performance.now() - opened.get(element)!;
        if (elapsed < 1100) {
          welcome.push(
            hero.animate(
              [
                { translate: '0 20px', scale: 0.94 },
                { translate: '0 0', scale: 1 },
              ],
              { duration: 1100, easing: 'cubic-bezier(.16,1,.3,1)' },
            ),
          );
          welcome.push(
            copy.animate([{ translate: '0 12px' }, { translate: '0 0' }], {
              duration: 900,
              easing: 'cubic-bezier(.16,1,.3,1)',
            }),
          );
          welcome.forEach((animation) => {
            animation.currentTime = elapsed;
          });
        }
      }
    }
    function configure() {
      dispose();
      if (!element || preference.matches) {
        welcome.forEach((animation) => animation.cancel());
        return;
      }
      const story = element.querySelector<HTMLElement>('[data-cinematic-story]');
      if (story && cinematicViewport) {
        element.setAttribute('data-scroll-enabled', '');
        const stop = installCinematicStory(story);
        dispose = () => {
          stop();
          element.removeAttribute('data-scroll-enabled');
        };
        return;
      }
      const scenes = Array.from(
        element.querySelectorAll<HTMLElement>('[data-scroll-scene], [data-icon-scene]'),
      );
      const shapeMorphers = scenes.map(createShapeMorpher);
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
        scenes.forEach((scene, index) => {
          const progress = positions[index];
          scene.style.setProperty('--scroll', String(progress));
          if (scene.classList.contains('experience-scene')) {
            const ease = (v: number) => {
              const t = Math.max(0, Math.min(1, v));
              return t * t * (3 - 2 * t);
            };
            scene.style.setProperty('--pet-entry', String(ease((0.5 - progress) / 0.35)));
            scene.style.setProperty('--pet-gather', String(ease((progress - 0.5) / 0.35)));
          }
          if (scene.classList.contains('home-spaces')) {
            scene.style.setProperty(
              '--photo-entry',
              String(Math.max(0, Math.min(1, (0.5 - progress) / 0.4))),
            );
            scene.style.setProperty(
              '--photo-exit',
              String(Math.max(0, Math.min(1, (progress - 0.5) / 0.4))),
            );
          }
          scene.style.setProperty('--care-progress', String(progress));
          scene.style.setProperty('--expression', String(progress));
          shapeMorphers[index].update(progress);
          scene.style.setProperty('--sway', String(Math.sin(progress * Math.PI * 2)));
          scene.style.setProperty(
            '--blink',
            String(1 - 0.85 * Math.exp(-(((progress - 0.55) / 0.045) ** 2))),
          );
        });
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
        shapeMorphers.forEach((morpher) => morpher.dispose());
        scenes.forEach((scene) => {
          for (const property of [
            '--scroll',
            '--pet-entry',
            '--pet-gather',
            '--photo-entry',
            '--photo-exit',
            '--care-progress',
            '--expression',
            '--sway',
            '--blink',
          ])
            scene.style.removeProperty(property);
        });
      };
    }
    configure();
    preference.addEventListener('change', configure);
    const viewportResize = new ResizeObserver(() => {
      const enabled = viewportProbe.getBoundingClientRect().height >= 810;
      if (enabled === cinematicViewport) return;
      cinematicViewport = enabled;
      configure();
    });
    viewportResize.observe(viewportProbe);
    return () => {
      dispose();
      welcome.forEach((animation) => animation.cancel());
      preference.removeEventListener('change', configure);
      viewportResize.disconnect();
      viewportProbe.remove();
    };
  }, [root, page, language]);
}
