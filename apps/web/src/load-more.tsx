import React from 'react';
import Button from './button';

/** Cursor loading stays usable with a keyboard and without IntersectionObserver. */
export default function LoadMore({
  root,
  hasMore,
  loading,
  error,
  disabled = false,
  label,
  loadingLabel,
  retryLabel,
  onLoad,
}: {
  root: React.RefObject<HTMLElement | null>;
  hasMore: boolean;
  loading: boolean;
  error: boolean;
  disabled?: boolean;
  label: string;
  loadingLabel: string;
  retryLabel: string;
  onLoad: () => void;
}) {
  const sentinel = React.useRef<HTMLDivElement>(null);
  React.useEffect(() => {
    if (!hasMore || loading || error || disabled || !sentinel.current || !root.current) return;
    if (!('IntersectionObserver' in window)) return;
    // An unconstrained pet list uses normal document scrolling instead.
    const scrollRoot = root.current;
    const constrained = ['auto', 'scroll'].includes(getComputedStyle(scrollRoot).overflowY);
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) onLoad();
      },
      { root: constrained ? scrollRoot : null, rootMargin: '0px 0px 120px 0px' },
    );
    observer.observe(sentinel.current);
    return () => observer.disconnect();
  }, [root, hasMore, loading, error, disabled, onLoad]);
  if (!hasMore && !error && !loading) return null;
  return (
    <div ref={sentinel} className="list-load-more">
      {loading && (
        <span role="status" aria-live="polite">
          {loadingLabel}
        </span>
      )}
      {(hasMore || error) && (
        <Button variant="secondary" disabled={disabled || loading} onClick={onLoad}>
          {error ? retryLabel : label}
        </Button>
      )}
    </div>
  );
}
