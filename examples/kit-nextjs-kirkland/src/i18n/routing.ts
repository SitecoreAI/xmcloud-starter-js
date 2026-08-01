import { defineRouting } from 'next-intl/routing';
import sitecoreConfig from 'sitecore.config';
import { SUPPORTED_LOCALES } from './locales';

const defaultLocale =
  SUPPORTED_LOCALES.find(
    (locale) => locale === sitecoreConfig.defaultLanguage,
  ) ?? SUPPORTED_LOCALES[0];

export const routing = defineRouting({
  // A list of all locales that are supported
  locales: SUPPORTED_LOCALES,

  // Used when no locale matches
  defaultLocale,

  // No prefix is added for the default locale ("as-needed").
  // For other configuration options, refer to the next-intl documentation:
  // https://next-intl.dev/docs/routing/configuration
  localePrefix: 'as-needed',
});
