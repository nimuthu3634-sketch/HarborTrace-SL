import { useI18n } from '../i18n/I18nProvider';

const LANGUAGE_OPTIONS = [
  { code: 'en', label: 'EN' },
  { code: 'si', label: 'සි' },
  { code: 'ta', label: 'த' }
];

export default function LanguageSwitcher() {
  const { t, language, setLanguage } = useI18n();

  return (
    <div className="language-switcher" role="group" aria-label={t('language')}>
      <span className="language-switcher-icon" aria-hidden="true">
        <svg viewBox="0 0 24 24" focusable="false">
          <path d="M12 3a9 9 0 1 0 0 18a9 9 0 0 0 0-18m6.9 8h-3a13.6 13.6 0 0 0-1.3-5a7.1 7.1 0 0 1 4.3 5M12 5c.8 1 1.8 3.1 2.1 6H9.9c.3-2.9 1.3-5 2.1-6m-3.6 1A13.4 13.4 0 0 0 7.1 11h-3a7.1 7.1 0 0 1 4.3-5M4.1 13h3a13.6 13.6 0 0 0 1.3 5a7.1 7.1 0 0 1-4.3-5M12 19c-.8-1-1.8-3.1-2.1-6h4.2c-.3 2.9-1.3 5-2.1 6m2.6-1a13.4 13.4 0 0 0 1.3-5h3a7.1 7.1 0 0 1-4.3 5" />
        </svg>
      </span>
      <div className="language-switcher-options">
        {LANGUAGE_OPTIONS.map(({ code, label }) => {
          const isActive = language === code;
          return (
            <button
              key={code}
              type="button"
              className={`language-switcher-option${isActive ? ' is-active' : ''}`}
              aria-label={`${t('language')} ${label}`}
              aria-pressed={isActive}
              onClick={() => setLanguage(code)}
            >
              {label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
