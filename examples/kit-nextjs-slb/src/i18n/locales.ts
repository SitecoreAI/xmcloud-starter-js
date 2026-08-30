export const SUPPORTED_LOCALES = ['en', 'es-MX'] as const;

export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number];
