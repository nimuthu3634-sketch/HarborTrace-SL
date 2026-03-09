export function getLocalizedText(item, field, language = 'en') {
  const suffix = language.charAt(0).toUpperCase() + language.slice(1);
  const localizedKey = `${field}${suffix}`;
  return item?.[localizedKey] || item?.[field] || item?.[`${field}En`] || '';
}
