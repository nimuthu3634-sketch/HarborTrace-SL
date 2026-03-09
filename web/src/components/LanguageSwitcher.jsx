import { useI18n } from '../i18n/I18nProvider';

export default function LanguageSwitcher() {
  const { t, language, setLanguage } = useI18n();

  return (
    <label className="language-switcher">
      <span>{t('language')}:</span>
      <select value={language} onChange={(event) => setLanguage(event.target.value)} aria-label={t('language')}>
        <option value="en">{t('languages.en')}</option>
        <option value="si">{t('languages.si')}</option>
        <option value="ta">{t('languages.ta')}</option>
      </select>
    </label>
  );
}
