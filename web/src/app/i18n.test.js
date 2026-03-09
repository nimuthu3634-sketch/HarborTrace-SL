import { describe, expect, it } from 'vitest';
import { normalizeLanguage, translate } from '../i18n/translations';
import { getLocalizedRole, getLocalizedText } from '../lib/localizedNotice';

describe('i18n helpers', () => {
  it('normalizes supported locale', () => {
    expect(normalizeLanguage('si-LK')).toBe('si');
    expect(normalizeLanguage('ta')).toBe('ta');
    expect(normalizeLanguage('fr')).toBe('en');
  });

  it('falls back to english key when missing', () => {
    expect(translate('si', 'nonexistent.key')).toBe('nonexistent.key');
    expect(translate('si', 'nav.notices')).toBeTruthy();
  });

  it('resolves localized notice content with english fallback', () => {
    const notice = { titleEn: 'Harbor Notice', titleSi: '', titleTa: 'துறைமுக அறிவிப்பு', title: 'Harbor Notice' };
    expect(getLocalizedText(notice, 'title', 'ta')).toBe('துறைமுக அறிவிப்பு');
    expect(getLocalizedText(notice, 'title', 'si')).toBe('Harbor Notice');
  });

  it('normalizes locale variants for localized notice fields', () => {
    const notice = { bodyEn: 'English body', bodySi: 'සිංහල', bodyTa: 'தமிழ்' };
    expect(getLocalizedText(notice, 'body', 'ta-LK')).toBe('தமிழ்');
    expect(getLocalizedText(notice, 'body', 'si-LK')).toBe('සිංහල');
  });

  it('falls back to unassigned role label when role key is unknown', () => {
    const t = (key) => ({ 'roles.all': 'All roles', 'roles.unassigned': 'Unassigned' }[key] || key);
    expect(getLocalizedRole('mystery_role', t)).toBe('Unassigned');
    expect(getLocalizedRole('all', t)).toBe('All roles');
  });
});
