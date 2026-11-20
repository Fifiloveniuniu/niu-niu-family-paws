import React from 'react';
import { useTranslation } from 'react-i18next';
import CustomSelect from './custom-select';
import Icon from './icons';
import { htmlLanguage, languageName, resolveLanguage, supportedLanguages, uiText } from './i18n';
import { priceName } from './price-label';
import type { PriceRate } from '../../../packages/pricing/calculations';
import './price-name-editor.css';

type NameLanguage = 'en' | 'zh' | 'es';
export default function PriceNameEditor({
  rate,
  onChange,
}: {
  rate: PriceRate;
  onChange: (patch: Partial<PriceRate>) => void;
}) {
  const { i18n } = useTranslation();
  const [language, setLanguage] = React.useState<NameLanguage>(() =>
    resolveLanguage(i18n.language),
  );
  const id = React.useId();
  const t = (key: string, values: Record<string, unknown> = {}) =>
    uiText('ui.priceNameEditor.' + key, values);
  const names = { en: rate.name, zh: rate.nameZh, es: rate.nameEs ?? '' };
  const missing = (['en', 'zh'] as const).filter((code) => !names[code].trim());
  const completed = Object.values(names).filter((value) => value.trim()).length;
  const required = language !== 'es';
  const preview = priceName(rate, language);
  return (
    <fieldset className="price-name-editor">
      <legend>
        <Icon name="globe" />
        {t('title')}
      </legend>
      <p id={id + '-hint'} className="price-name-hint">
        {t('hint')}
      </p>
      <label>
        {t('language')}
        <CustomSelect
          value={language}
          onChange={(event) => setLanguage(event.target.value as NameLanguage)}
          renderChoice={(value, label) => (
            <span className="price-name-language">
              <Icon name={names[value as NameLanguage].trim() ? 'check' : 'globe'} />
              <span>{label}</span>
              <small aria-hidden="true">
                {t(
                  names[value as NameLanguage].trim()
                    ? 'added'
                    : value === 'es'
                      ? 'optional'
                      : 'required',
                )}
              </small>
            </span>
          )}
        >
          {supportedLanguages.map(({ code, name, htmlLang }) => (
            <option key={code} value={code} lang={htmlLang}>
              {name}
            </option>
          ))}
        </CustomSelect>
      </label>
      <div className="price-name-field">
        <div className="price-name-field-heading">
          <label htmlFor={id}>{languageName(language)}</label>
          <span>{t(required ? 'required' : 'optional')}</span>
        </div>
        <input
          id={id}
          value={names[language]}
          lang={htmlLanguage(language)}
          dir="auto"
          autoComplete="off"
          maxLength={160}
          required={required}
          aria-describedby={
            id + '-hint ' + id + '-completion' + (language === 'es' ? ' ' + id + '-fallback' : '')
          }
          onChange={(event) => {
            const next = { ...names, [language]: event.target.value };
            onChange({
              name: next.en,
              nameZh: next.zh,
              nameEs: next.es.trim() ? next.es : undefined,
            });
          }}
        />
        {language === 'es' && (
          <p className="price-name-hint" id={id + '-fallback'}>
            {t('fallback')}
          </p>
        )}
      </div>
      <div id={id + '-completion'} className="price-name-completion" role="status">
        <span>
          <Icon name={missing.length ? 'edit' : 'check'} />
          {t('progress', { count: completed })}
        </span>
        <span>
          {missing.length
            ? t('missing', { languages: missing.map(languageName).join(', ') })
            : t('ready')}
        </span>
      </div>
      <div className="price-name-preview">
        <span>{t('preview')}</span>
        <strong lang={htmlLanguage(language)} dir="auto">
          {preview || t('empty')}
        </strong>
      </div>
    </fieldset>
  );
}
