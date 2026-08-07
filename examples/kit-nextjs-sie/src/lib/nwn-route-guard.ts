const LEGACY_ROUTE_SEGMENTS = new Set([
  'products',
  'test-drive',
  'account-billing',
  'ways-to-save',
  'services',
  'get-natural-gas',
  'about-us',
]);

const LEGACY_NESTED_ROUTES = new Set([
  'safety/smell-natural-gas',
  'safety/call-before-you-dig',
]);

const isLegacyPathSegments = (segments: readonly string[]): boolean => {
  const normalized = segments.map((segment) => segment.trim().toLowerCase());

  return (
    normalized.some((segment) => LEGACY_ROUTE_SEGMENTS.has(segment)) ||
    normalized.some((segment, index) =>
      LEGACY_NESTED_ROUTES.has(`${segment}/${normalized[index + 1] ?? ''}`),
    )
  );
};

export const isLegacyStarterRoute = (
  path: readonly string[] | undefined,
): boolean => {
  return isLegacyPathSegments(path ?? []);
};

export const isLegacyStarterUrl = (url: string): boolean => {
  try {
    const parsedUrl = new URL(url, 'https://www.sienergy.com');
    if (/^(?:www\.)?nwnatural\.com$/i.test(parsedUrl.hostname)) return true;

    const segments = parsedUrl.pathname.split('/').filter(Boolean);
    return isLegacyPathSegments(segments);
  } catch {
    return false;
  }
};

export const filterLegacyStarterSitemapEntries = (xml: string): string =>
  xml.replace(/<url>([\s\S]*?)<\/url>/gi, (entry) => {
    const loc = entry.match(/<loc>([^<]+)<\/loc>/i)?.[1];
    return loc && isLegacyStarterUrl(loc) ? '' : entry;
  });
