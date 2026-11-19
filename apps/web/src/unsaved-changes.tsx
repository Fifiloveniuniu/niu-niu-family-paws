import { uiText } from './i18n.ts';
import React from 'react';
import { useTranslation } from 'react-i18next';

const drafts = new Map<HTMLElement, () => void>();

/** Release only a form whose write has been confirmed by the server. */
export function markFormSaved(container: Element | null) {
  if (!container) return;
  for (const [element, release] of drafts) if (container.contains(element)) release();
}

export function confirmDiscardChanges(
  language: string,
  container?: Element | null,
  retainWorkspace = false,
) {
  if (
    ![...drafts.keys()].some(
      (element) =>
        (!retainWorkspace || !element.closest('[data-retained-workspace]')) &&
        (container === undefined || container?.contains(element)),
    )
  )
    return true;
  return window.confirm(
    uiText('ui.unsavedChanges.youHaveUnsavedChangesContinueAndDiscardThem', {}, language),
  );
}

/** Register only while a form has changes, including saves awaiting confirmation. */
export default function UnsavedChanges({ active }: { active: boolean }) {
  const { i18n } = useTranslation();
  const notice = React.useRef<HTMLParagraphElement>(null);
  React.useEffect(() => {
    const element = notice.current;
    if (!active || !element) return;
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = '';
    };
    const release = () => {
      drafts.delete(element);
      window.removeEventListener('beforeunload', warn);
    };
    drafts.set(element, release);
    window.addEventListener('beforeunload', warn);
    return release;
  }, [active]);
  return active ? (
    <p ref={notice} className="unsaved-notice" role="status">
      {uiText(
        'ui.unsavedChanges.youHaveUnsavedChangesSaveBeforeRefreshingOrClosing',
        {},
        i18n.language,
      )}
    </p>
  ) : null;
}
