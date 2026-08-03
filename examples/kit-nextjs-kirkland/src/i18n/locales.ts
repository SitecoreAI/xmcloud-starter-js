export const DEFAULT_LOCALE = 'en';
export const SITE_LOCALE_HEADER = 'x-kirkland-locale';

export const LOCALE_OPTIONS = [
  {
    code: 'en',
    country: 'United States',
    language: 'English',
    shortLabel: 'US / EN',
    hrefLang: 'en-US',
  },
  {
    code: 'es-MX',
    country: 'Mexico',
    language: 'Spanish',
    shortLabel: 'MX / ES',
    hrefLang: 'es-MX',
  },
  {
    code: 'fr-FR',
    country: 'France',
    language: 'French',
    shortLabel: 'FR / FR',
    hrefLang: 'fr-FR',
  },
  {
    code: 'ja-JP',
    country: 'Japan',
    language: 'Japanese',
    shortLabel: 'JP / JA',
    hrefLang: 'ja-JP',
  },
] as const;

export type SupportedLocale = (typeof LOCALE_OPTIONS)[number]['code'];

export const SUPPORTED_LOCALES = LOCALE_OPTIONS.map(({ code }) => code);

export const isSupportedLocale = (locale?: string): locale is SupportedLocale =>
  Boolean(
    locale &&
      SUPPORTED_LOCALES.some(
        (supportedLocale) =>
          supportedLocale.toLowerCase() === locale.toLowerCase(),
      ),
  );

export const getLocaleOption = (locale?: string) => {
  const exactMatch = LOCALE_OPTIONS.find(
    ({ code }) => code.toLowerCase() === locale?.toLowerCase(),
  );

  if (exactMatch) return exactMatch;

  const languageCode = locale?.toLowerCase().split('-')[0];

  return (
    LOCALE_OPTIONS.find(
      ({ code }) => code.toLowerCase().split('-')[0] === languageCode,
    ) ?? LOCALE_OPTIONS[0]
  );
};

export const getPathLocale = (pathname: string): SupportedLocale => {
  const localeSegment = pathname
    .split('/')
    .filter(Boolean)
    .find(isSupportedLocale);

  return localeSegment ?? DEFAULT_LOCALE;
};

/**
 * Replaces the locale prefix while preserving the requested content path.
 * English is intentionally unprefixed to match the app's `as-needed` routing.
 */
export const getLocalizedPathname = (
  pathname: string,
  targetLocale: SupportedLocale,
): string => {
  const parsedUrl = new URL(pathname || '/', 'https://kirkland.local');
  const segments = parsedUrl.pathname.split('/').filter(Boolean);
  const firstSegment = segments[0];

  if (isSupportedLocale(firstSegment)) {
    segments.shift();
  }

  const contentPath = segments.length ? `/${segments.join('/')}` : '/';
  const localizedPath =
    targetLocale === DEFAULT_LOCALE
      ? contentPath
      : `/${targetLocale}${contentPath === '/' ? '' : contentPath}`;

  return `${localizedPath}${parsedUrl.search}${parsedUrl.hash}`;
};
