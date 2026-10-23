import React from 'react';
import { useTranslation } from 'react-i18next';

const drafts = new Set<HTMLElement>();

export function confirmDiscardChanges(language: string, container?: Element | null) {
  if (![...drafts].some(element => container === undefined || container?.contains(element))) return true;
  return window.confirm(language === 'zh'
    ? '还有修改未保存，继续操作会丢失这些内容。确定放弃修改吗？'
    : 'You have unsaved changes. Continue and discard them?');
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
    return () => { drafts.delete(element); window.removeEventListener('beforeunload', warn); };
  }, [active]);
  return active ? <p ref={notice} className="unsaved-notice" role="status">{i18n.language === 'zh'
    ? '修改尚未保存。请保存后再刷新或关闭页面。'
    : 'You have unsaved changes. Save before refreshing or closing this page.'}</p> : null;
}
