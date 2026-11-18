import { useTranslation } from 'react-i18next';
import { uiText } from './i18n.ts';
export function useWorkspaceText() {
  const { i18n } = useTranslation();
  return (key: string, values: Record<string, unknown> = {}) =>
    uiText('ui.workspace.' + key, values, i18n.language);
}
