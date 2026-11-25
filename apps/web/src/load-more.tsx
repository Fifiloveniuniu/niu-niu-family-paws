import Button from './button';
import './load-more.css';

/** Additional records load only through an explicit, keyboard-accessible action. */
export default function LoadMore({
  hasMore,
  loading,
  error,
  disabled = false,
  label,
  loadingLabel,
  retryLabel,
  onLoad,
}: {
  hasMore: boolean;
  loading: boolean;
  error: boolean;
  disabled?: boolean;
  label: string;
  loadingLabel: string;
  retryLabel: string;
  onLoad: () => void;
}) {
  if (!hasMore && !error && !loading) return null;
  return (
    <div className="list-load-more">
      {loading && (
        <span role="status" aria-live="polite">
          {loadingLabel}
        </span>
      )}
      {(hasMore || error) && (
        <Button
          type="button"
          variant="secondary"
          disabled={disabled}
          aria-disabled={disabled || loading}
          onClick={() => {
            if (!loading && !disabled) onLoad();
          }}
        >
          {error ? retryLabel : label}
        </Button>
      )}
    </div>
  );
}
