const LEGACY_STARTER_PATTERN =
  /\b(?:alaris|aero|nexa|terra|automotive|dealerships?|nw\s+natural|pacific northwest)\b|test[-\s]?drive|electric future|drivesense|nwnatural(?:\.com)?|nw-natural|nwnpartnerlink|nwn-images|800[-\s]?422[-\s]?4012|800[-\s]?882[-\s]?3377|less we can|\/vehicles?(?:\/|[?"\s]|$)|\/(?:account-billing|ways-to-save|get-natural-gas|about-us)(?:\/|[?#"'\s]|$)|\/services(?:\/|[?#"'\s]|$)|\/safety\/(?:smell-natural-gas|call-before-you-dig)(?:\/|[?#"'\s]|$)/i;

export const isLegacyStarterDataValue = (value: string | undefined): boolean =>
  LEGACY_STARTER_PATTERN.test(value ?? '');

export const containsLegacyStarterData = (value: unknown): boolean =>
  isLegacyStarterDataValue(JSON.stringify(value ?? ''));

/**
 * Removes inherited starter and NWN strings from normal-mode route data
 * before React serializes it into the HTML response. Editing mode keeps the
 * original data so authors can repair it.
 */
export const sanitizeLegacyStarterData = <T>(value: T): T => {
  if (typeof value === 'string') {
    return (isLegacyStarterDataValue(value) ? '' : value) as T;
  }

  if (Array.isArray(value)) {
    return value.map((item) => sanitizeLegacyStarterData(item)) as T;
  }

  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [
        key,
        sanitizeLegacyStarterData(item),
      ]),
    ) as T;
  }

  return value;
};
