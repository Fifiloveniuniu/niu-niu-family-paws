/** Explicit destinations jump directly; manual scrolling still scrubs the story. */
export function scrollMarketingTarget(hash: string) {
  if (!hash || hash === '#main') {
    window.scrollTo({ top: 0, behavior: 'instant' });
    return;
  }
  document.getElementById(hash.slice(1))?.scrollIntoView({ behavior: 'instant' });
}
