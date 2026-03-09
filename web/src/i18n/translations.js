import en from '../locales/en.json';
import si from '../locales/si.json';
import ta from '../locales/ta.json';

export const LANGUAGE_STORAGE_KEY = 'harbortrace.locale';
export const SUPPORTED_LANGUAGES = ['en', 'si', 'ta'];
export const resources = { en, si, ta };

export function normalizeLanguage(value) {
  const normalized = String(value || '').split('-')[0].toLowerCase();
  return SUPPORTED_LANGUAGES.includes(normalized) ? normalized : 'en';
}

export function translate(language, key, params = {}) {
  const path = key.split('.');
  let value = resources[language];
  for (const segment of path) {
    value = value?.[segment];
  }
  if (typeof value !== 'string') {
    value = path.reduce((acc, segment) => acc?.[segment], resources.en) || key;
  }
  return Object.entries(params).reduce((output, [name, param]) => output.replaceAll(`{{${name}}}`, String(param)), value);
}
