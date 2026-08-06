const LEGACY_ROUTE_SEGMENTS = new Set(['products', 'test-drive']);

export const isLegacyStarterRoute = (
  path: readonly string[] | undefined,
): boolean => {
  const firstSegment = path?.[0]?.trim().toLowerCase();
  return Boolean(firstSegment && LEGACY_ROUTE_SEGMENTS.has(firstSegment));
};

export const isLegacyStarterUrl = (url: string): boolean => {
  try {
    const segments = new URL(url, 'https://www.sienergy.com').pathname
      .split('/')
      .filter(Boolean);
    return segments.some((segment) =>
      LEGACY_ROUTE_SEGMENTS.has(segment.trim().toLowerCase()),
    );
  } catch {
    return false;
  }
};

export const filterLegacyStarterSitemapEntries = (xml: string): string =>
  xml.replace(/<url>([\s\S]*?)<\/url>/gi, (entry) => {
    const loc = entry.match(/<loc>([^<]+)<\/loc>/i)?.[1];
    return loc && isLegacyStarterUrl(loc) ? '' : entry;
  });
