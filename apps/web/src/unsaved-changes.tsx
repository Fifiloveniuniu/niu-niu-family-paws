import { uiText } from './i18n.ts';
import React from 'react';
import { useTranslation } from 'react-i18next';

const drafts = new Set<HTMLElement>();

export function confirmDiscardChanges(
  language: string,
  container?: Element | null,
  retainWorkspace = false,
) {
  if (
    ![...drafts].some(
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
    drafts.add(element);
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', warn);
    return () => {
      drafts.delete(element);
      window.removeEventListener('beforeunload', warn);
    };
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
