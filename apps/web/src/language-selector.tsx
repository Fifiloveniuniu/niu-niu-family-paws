import React from 'react';
import { useTranslation } from 'react-i18next';

export default function LanguageSelector({ onChange }: { onChange: (language: 'en' | 'zh') => void }) {
  const { i18n } = useTranslation();
  return <label className="language-selector">
    <span><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c5 5 5 13 0 18-5-5-5-13 0-18Z"/></svg>Language / 语言</span>
    <select value={i18n.language === 'zh' ? 'zh' : 'en'} onChange={event => onChange(event.target.value as 'en' | 'zh')}>
      <option value="en" lang="en">English</option>
      <option value="zh" lang="zh-Hans">简体中文</option>
    </select>
  </label>;
}
