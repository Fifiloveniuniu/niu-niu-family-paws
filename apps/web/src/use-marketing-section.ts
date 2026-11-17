import { useEffect, useState, type RefObject } from 'react';

const sections = ['main', 'experience', 'about', 'services', 'faq', 'contact'];

/** Follow the visible chapter, including manual scrolling and static layouts. */
export default function useMarketingSection(root: RefObject<HTMLElement | null>, page: string) {
  const [section, setSection] = useState('main');
  useEffect(() => {
    const element = root.current;
    if (!element || page !== 'home') return;
    const story = element.querySelector<HTMLElement>('[data-cinematic-story]');
    if (!story) return;
    let frame = 0;
    const update = () => {
      frame = 0;
      let current: string;
      if (story.hasAttribute('data-cinema-enabled')) {
        current = sections[Number(story.dataset.activeChapter) || 0];
      } else {
        const header = document.querySelector('.marketing-header')!.getBoundingClientRect().bottom;
        current = 'main';
        for (const panel of story.querySelectorAll<HTMLElement>('[data-cinematic-panel]')) {
          if (panel.getBoundingClientRect().top <= header + (innerHeight - header) * 0.35)
            current = panel.id || 'main';
        }
      }
      setSection(current === 'experience' ? 'main' : current);
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    const observer = new MutationObserver(schedule);
    observer.observe(story, {
      attributes: true,
      attributeFilter: ['data-active-chapter', 'data-cinema-enabled'],
    });
    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule);
    update();
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      window.removeEventListener('scroll', schedule);
      window.removeEventListener('resize', schedule);
    };
  }, [root, page]);
  return section;
}
