import { useEffect } from 'react';
import { useI18n } from '../i18n/I18nProvider';

export default function FeaturePage({ title, titleKey, children }) {
  const { t } = useI18n();
  const resolvedTitle = titleKey ? t(titleKey) : title;

  useEffect(() => {
    document.title = `${t('appName')} | ${resolvedTitle}`;
  }, [resolvedTitle, t]);

  return (
    <section className="card feature-page">
      <h2>{resolvedTitle}</h2>
      {children}
    </section>
  );
}
