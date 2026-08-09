const LEGACY_STARTER_PATTERN =
  /\b(?:alaris|aero|nexa|terra|automotive|dealerships?)\b|test[-\s]?drive|electric future|drivesense/i;
const LEGACY_VEHICLE_ROUTE_PATTERN =
  /\/vehicles?(?:\/|\b)|\b(?:view all|explore|shop|browse)\s+vehicles?\b/i;

export const isLegacyStarterDataValue = (value: string | undefined): boolean =>
  LEGACY_STARTER_PATTERN.test(value ?? '') ||
  LEGACY_VEHICLE_ROUTE_PATTERN.test(value ?? '');

/**
 * Removes inherited Alaris strings from normal-mode route data before React
 * serializes it into the HTML response. Editing mode keeps the original data.
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
