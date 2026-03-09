import { createContext, useContext, useMemo, useState } from 'react';
import { LANGUAGE_STORAGE_KEY, normalizeLanguage, translate } from './translations';

const I18nContext = createContext(null);

function detectInitialLanguage() {
  const stored = localStorage.getItem(LANGUAGE_STORAGE_KEY);
  if (stored) return normalizeLanguage(stored);
  return normalizeLanguage(navigator.language || 'en');
}

export function I18nProvider({ children }) {
  const [language, setLanguageState] = useState(detectInitialLanguage);

  const setLanguage = (nextLanguage) => {
    const normalized = normalizeLanguage(nextLanguage);
    localStorage.setItem(LANGUAGE_STORAGE_KEY, normalized);
    setLanguageState(normalized);
  };

  const value = useMemo(() => ({
    language,
    setLanguage,
    t: (key, params) => translate(language, key, params)
  }), [language]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  return useContext(I18nContext);
}
