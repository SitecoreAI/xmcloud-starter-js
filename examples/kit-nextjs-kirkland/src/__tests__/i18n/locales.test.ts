import {
  getPathLocale,
  getLocaleOption,
  getLocalizedPathname,
  isSupportedLocale,
} from '@/i18n/locales';

describe('locale helpers', () => {
  it('keeps English URLs unprefixed', () => {
    expect(getLocalizedPathname('/fr-FR/Lawyers', 'en')).toBe('/Lawyers');
    expect(getLocalizedPathname('/ja-JP', 'en')).toBe('/');
  });

  it('adds the selected locale while preserving the content path', () => {
    expect(
      getLocalizedPathname('/News-and-Insights/Client-Alert', 'es-MX'),
    ).toBe('/es-MX/News-and-Insights/Client-Alert');
  });

  it('replaces an existing locale and preserves search and hash values', () => {
    expect(
      getLocalizedPathname('/es-MX/Locations?office=1#details', 'ja-JP'),
    ).toBe('/ja-JP/Locations?office=1#details');
  });

  it('matches configured locales without regard to case', () => {
    expect(isSupportedLocale('FR-fr')).toBe(true);
    expect(isSupportedLocale('de-DE')).toBe(false);
  });

  it('resolves a language-only value to the configured regional locale', () => {
    expect(getLocaleOption('ja').code).toBe('ja-JP');
    expect(getLocaleOption('unknown').code).toBe('en');
  });

  it.each([
    ['/', 'en'],
    ['/News-and-Insights', 'en'],
    ['/fr-FR/News-and-Insights', 'fr-FR'],
    ['/kit-nextjs-kirkland/ja-JP/Lawyers', 'ja-JP'],
    ['/es-MX', 'es-MX'],
  ])('gets the locale from routed pathname %s', (pathname, expected) => {
    expect(getPathLocale(pathname)).toBe(expected);
  });
});
