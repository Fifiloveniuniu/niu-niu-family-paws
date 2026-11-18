import React from 'react';
import { useTranslation } from 'react-i18next';
import Icon from './icons';
export default function Modal({
  title,
  children,
  onClose,
  disabled = false,
  className = '',
}: {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
  disabled?: boolean;
  className?: string;
}) {
  const ref = React.useRef<HTMLDialogElement>(null);
  const id = React.useId();
  const { i18n } = useTranslation();
  React.useEffect(() => {
    const dialog = ref.current;
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    dialog?.showModal();
    dialog?.querySelector<HTMLInputElement>('input:not([type=file]), [role=combobox]')?.focus();
    return () => {
      dialog?.close();
      if (opener?.isConnected) opener.focus({ preventScroll: true });
    };
  }, []);
  return (
    <dialog
      ref={ref}
      className={'app-dialog ' + className}
      aria-labelledby={id}
      onKeyDown={(event) => {
        if (event.key !== 'Tab') return;
        const nodes = [
          ...event.currentTarget.querySelectorAll<HTMLElement>(
            'button:not(:disabled), a[href], input:not(:disabled), textarea:not(:disabled), [tabindex]:not([tabindex="-1"])',
          ),
        ].filter(
          (node) =>
            node.getClientRects().length > 0 &&
            !node.closest('[hidden]') &&
            node.getAttribute('aria-hidden') !== 'true',
        );
        const first = nodes[0];
        const last = nodes.at(-1);
        if (!first) {
          event.preventDefault();
          return;
        }
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last?.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }}
      onCancel={(event) => {
        event.preventDefault();
        if (!disabled) onClose();
      }}
    >
      <div className="dialog-heading">
        <h2 id={id}>{title}</h2>
        <button
          className="icon-button"
          type="button"
          aria-label={i18n.language === 'zh' ? '关闭' : 'Close'}
          title={i18n.language === 'zh' ? '关闭' : 'Close'}
          disabled={disabled}
          onClick={onClose}
        >
          <Icon name="close" />
        </button>
      </div>
      {children}
    </dialog>
  );
}
