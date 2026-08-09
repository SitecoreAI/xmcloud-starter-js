import {
  getPathLocale,
  getLocaleOption,
  getLocalizedPathname,
  isSupportedLocale,
} from '@/i18n/locales';

describe('NWN locale helpers', () => {
  it('keeps English URLs unprefixed', () => {
    expect(
      getLocalizedPathname('/es-MX/safety/winter-service-advisory', 'en'),
    ).toBe('/safety/winter-service-advisory');
  });

  it('adds Spanish while preserving the content path', () => {
    expect(
      getLocalizedPathname('/safety/winter-service-advisory', 'es-MX'),
    ).toBe('/es-MX/safety/winter-service-advisory');
  });

  it('replaces an existing locale and preserves search and hash values', () => {
    expect(getLocalizedPathname('/es-MX/search?q=gas#results', 'en')).toBe(
      '/search?q=gas#results',
    );
  });

  it('matches configured locales without regard to case', () => {
    expect(isSupportedLocale('ES-mx')).toBe(true);
    expect(isSupportedLocale('es-ES')).toBe(false);
  });

  it('resolves a language-only value to Spanish (Mexico)', () => {
    expect(getLocaleOption('es').code).toBe('es-MX');
    expect(getLocaleOption('unknown').code).toBe('en');
  });

  it.each([
    ['/', 'en'],
    ['/safety', 'en'],
    ['/es-MX/safety', 'es-MX'],
    ['/kit-nextjs-nwn/es-MX/safety', 'es-MX'],
  ])('gets the locale from routed pathname %s', (pathname, expected) => {
    expect(getPathLocale(pathname)).toBe(expected);
  });
});
