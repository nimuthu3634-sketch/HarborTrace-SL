export function getLocalizedText(item, field, language = 'en') {
  const normalizedLanguage = String(language || 'en').split('-')[0].toLowerCase();
  const suffix = normalizedLanguage.charAt(0).toUpperCase() + normalizedLanguage.slice(1);
  const localizedKey = `${field}${suffix}`;
  return item?.[localizedKey] || item?.[field] || item?.[`${field}En`] || '';
}

export function getLocalizedRole(role, t) {
  const roleKey = `roles.${role || 'all'}`;
  const translated = t(roleKey);
  return translated === roleKey ? t('roles.unassigned') : translated;
}
