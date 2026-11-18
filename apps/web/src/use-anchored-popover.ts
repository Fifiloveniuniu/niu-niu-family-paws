import React from 'react';

type Options = {
  open: boolean;
  close: () => void;
  root: React.RefObject<HTMLElement | null>;
  anchor: React.RefObject<HTMLElement | null>;
  popup: React.RefObject<HTMLElement | null>;
  width?: number;
  maxHeight?: number;
};
/** Keep a custom popover above clipping/stacking containers, including modal dialogs. */
export default function useAnchoredPopover({
  open,
  close,
  root,
  anchor,
  popup,
  width,
  maxHeight = 320,
}: Options) {
  React.useLayoutEffect(() => {
    if (!open || !popup.current || !anchor.current) return;
    const panel = popup.current;
    const position = () => {
      const rect = anchor.current!.getBoundingClientRect();
      const viewport = window.visualViewport;
      const viewportTop = viewport?.offsetTop ?? 0;
      const viewportBottom = viewportTop + (viewport?.height ?? innerHeight);
      const below = viewportBottom - rect.bottom - 12;
      const above = rect.top - viewportTop - 12;
      const available = Math.max(below, above);
      const centered =
        maxHeight > 400 &&
        available < Math.min(400, maxHeight) &&
        viewportBottom - viewportTop > available + 40;
      const onTop = !centered && below < Math.min(200, maxHeight) && above > below;
      const panelWidth = Math.min(width ?? Math.max(rect.width, 180), innerWidth - 24);
      panel.style.width = `${panelWidth}px`;
      panel.style.maxHeight = `${Math.max(80, Math.min(maxHeight, centered ? viewportBottom - viewportTop - 24 : onTop ? above : below))}px`;
      panel.style.left = `${Math.max(12, Math.min(rect.left, innerWidth - panelWidth - 12))}px`;
      panel.style.top = centered
        ? `${viewportTop + 12}px`
        : onTop
          ? 'auto'
          : `${rect.bottom + 6}px`;
      panel.style.bottom = onTop ? `${innerHeight - rect.top + 6}px` : 'auto';
    };
    position();
    panel.showPopover();
    const outside = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node) && !panel.contains(event.target as Node))
        close();
    };
    const scroll = (event: Event) => {
      if (event.target instanceof Node && panel.contains(event.target)) return;
      const rect = anchor.current!.getBoundingClientRect();
      if (rect.bottom < 0 || rect.top > innerHeight) close();
      else position();
    };
    document.addEventListener('pointerdown', outside);
    document.addEventListener('scroll', scroll, true);
    window.addEventListener('resize', position);
    window.visualViewport?.addEventListener('resize', position);
    return () => {
      if (panel.matches(':popover-open')) panel.hidePopover();
      document.removeEventListener('pointerdown', outside);
      document.removeEventListener('scroll', scroll, true);
      window.removeEventListener('resize', position);
      window.visualViewport?.removeEventListener('resize', position);
    };
  }, [open, close, root, anchor, popup, width, maxHeight]);
}
