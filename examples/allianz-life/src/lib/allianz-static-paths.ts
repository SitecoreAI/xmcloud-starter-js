/** Leave app-owned New York search routes to their request-time page handlers. */
export function excludeNewYorkSearchStaticPaths<T extends { site: string; locale: string; path: string[] }>(paths: T[]): T[] {
  return paths.filter(({ site, locale, path }) => {
    if (site !== 'allianz-life' || locale !== 'en') return true;
    return !(path.length === 2 && path[0] === 'new-york' && path[1] === 'search') &&
      !(path.length === 3 && path[0] === 'new-york' && path[1] === 'search' && path[2] === 'advanced-search');
  });
}
