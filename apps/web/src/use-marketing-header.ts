import { useEffect } from 'react';

/** Keep scenes and anchor destinations clear of the real, localized header height. */
export default function useMarketingHeader(active: boolean) {
  useEffect(() => {
    if (!active) return;
    const header = document.querySelector<HTMLElement>('.marketing-header');
    if (!header) return;
    const update = () =>
      document.documentElement.style.setProperty(
        '--marketing-header-height',
        `${header.getBoundingClientRect().height}px`,
      );
    update();
    const observer = new ResizeObserver(update);
    observer.observe(header);
    return () => {
      observer.disconnect();
      document.documentElement.style.removeProperty('--marketing-header-height');
    };
  }, [active]);
}
