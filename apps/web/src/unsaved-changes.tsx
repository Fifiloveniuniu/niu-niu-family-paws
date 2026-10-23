import React from 'react';
import { useTranslation } from 'react-i18next';

/** Register only while a form has changes, including saves awaiting confirmation. */
export default function UnsavedChanges({ active }: { active: boolean }) {
  const { i18n } = useTranslation();
  React.useEffect(() => {
    if (!active) return;
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [active]);
  return active ? <p className="unsaved-notice" role="status">{i18n.language === 'zh'
    ? '修改尚未保存。请保存后再刷新或关闭页面。'
    : 'You have unsaved changes. Save before refreshing or closing this page.'}</p> : null;
}
