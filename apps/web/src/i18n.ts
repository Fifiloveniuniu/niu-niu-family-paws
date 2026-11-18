import i18n from 'i18next';
import en from './locales/en.json' with { type: 'json' };
import zh from './locales/zh.json' with { type: 'json' };

export type Language = string;
export const supportedLanguages = [
  { code: 'en', name: 'English', locale: 'en-US', htmlLang: 'en' },
  { code: 'zh', name: '简体中文', locale: 'zh-CN', htmlLang: 'zh-Hans' },
] as const;
export const englishCatalog = en;
export const catalogs = { en, zh };
export function resolveLanguage(language?: string | null) {
  return supportedLanguages.find((item) => item.code === language)?.code ?? 'en';
}
export function localeFor(language = i18n.resolvedLanguage ?? i18n.language) {
  return supportedLanguages.find((item) => item.code === resolveLanguage(language))!.locale;
}
export const profileLanguage = (language: string): string => resolveLanguage(language);
export function languageName(language: string) {
  return supportedLanguages.find((item) => item.code === language)?.name ?? language;
}
export function htmlLanguage(language: string) {
  return supportedLanguages.find((item) => item.code === language)?.htmlLang ?? language;
}
export function uiText(
  key: string,
  values: Record<string, unknown> = {},
  language?: string,
): string {
  const lang = resolveLanguage(language ?? i18n.resolvedLanguage ?? i18n.language);
  return String(i18n.getFixedT(lang)(key, values));
}
export function uiValue<K extends keyof typeof en>(key: K, language?: string): (typeof en)[K] {
  const lang = resolveLanguage(language ?? i18n.resolvedLanguage ?? i18n.language);
  return i18n.getFixedT(lang)(key, { returnObjects: true }) as (typeof en)[K];
}
export function localizedText(key: keyof typeof en): {
  en: string;
  zh: string;
  [language: string]: string;
} {
  return Object.fromEntries(
    supportedLanguages.map(({ code }) => [
      code,
      (catalogs[code] as Record<string, unknown>)[key] ?? en[key],
    ]),
  ) as { en: string; zh: string; [language: string]: string };
}
export function publicText(
  value: Record<string, string> | undefined,
  language = i18n.resolvedLanguage ?? i18n.language,
) {
  return value?.[language] ?? value?.[resolveLanguage(language)] ?? value?.en ?? '';
}
export const speciesText = (species: string) => uiText(`common.species.${species}`);
