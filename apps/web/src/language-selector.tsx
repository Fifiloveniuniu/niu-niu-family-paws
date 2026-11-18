import { languageName, localeFor, supportedLanguages, type Language, uiText } from './i18n.ts';
import CustomSelect from './custom-select';
import React from 'react';
import { useTranslation } from 'react-i18next';

export default function LanguageSelector({
  onChange,
  showIcon = false,
}: {
  onChange: (language: Language) => void;
  showIcon?: boolean;
}) {
  const { i18n } = useTranslation();
  return (
    <label className={`language-selector${showIcon ? ' language-selector-with-icon' : ''}`}>
      <span>
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <circle cx="12" cy="12" r="9" />
          <path d="M3 12h18M12 3c5 5 5 13 0 18-5-5-5-13 0-18Z" />
        </svg>
        <span>{uiText('common.languageMenu')}</span>
      </span>
      <CustomSelect value={i18n.language} onChange={(event) => onChange(event.target.value)}>
        {supportedLanguages.map(({ code, name, htmlLang }) => (
          <option key={code} value={code} lang={htmlLang}>
            {name}
          </option>
        ))}
      </CustomSelect>
    </label>
  );
}
