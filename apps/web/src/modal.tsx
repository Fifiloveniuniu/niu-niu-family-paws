import IconButton from './icon-button';
import { uiText } from './i18n.ts';
import React from 'react';
import { useTranslation } from 'react-i18next';
import Icon from './icons';
function NativeModal({
  title,
  children,
  onClose,
  disabled = false,
  className = '',
  header,
  dismissOnBackdrop = false,
}: {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
  disabled?: boolean;
  className?: string;
  header?: React.ReactNode;
  dismissOnBackdrop?: boolean;
}) {
  const ref = React.useRef<HTMLDialogElement>(null);
  const id = React.useId();
  const { i18n } = useTranslation();
  React.useEffect(() => {
    const dialog = ref.current;
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    dialog?.showModal();
    [
      ...(dialog?.querySelectorAll<HTMLElement>(
        'input:not(:disabled):not([type=file]), [role=combobox]:not(:disabled)',
      ) ?? []),
    ]
      .find((node) => node.getClientRects().length > 0 && !node.closest('[hidden]'))
      ?.focus({ preventScroll: className.split(' ').includes('workflow-dialog') });
    return () => {
      dialog?.close();
      if (opener?.isConnected) opener.focus({ preventScroll: true });
    };
  }, []);
  const heading = (
    <div className="dialog-heading">
      <h2 id={id}>{title}</h2>
      <IconButton
        type="button"
        aria-label={uiText('ui.modal.close', {}, i18n.language)}
        title={uiText('ui.modal.close', {}, i18n.language)}
        disabled={disabled}
        onClick={onClose}
      >
        <Icon name="close" />
      </IconButton>
    </div>
  );
  return (
    <dialog
      ref={ref}
      className={'app-dialog ' + className}
      aria-labelledby={id}
      onClick={(event) => {
        if (dismissOnBackdrop && !disabled && event.target === event.currentTarget) onClose();
      }}
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
      {header ? (
        <div className="dialog-fixed-header">
          {heading}
          {header}
        </div>
      ) : (
        heading
      )}
      {children}
    </dialog>
  );
}

// Embedded editors reuse the owning dialog instead of opening a second native modal.
type ModalProps = React.ComponentProps<typeof NativeModal> & { embedded?: boolean };
export default function Modal({ embedded = false, ...props }: ModalProps) {
  return embedded ? <>{props.children}</> : <NativeModal {...props} />;
}
