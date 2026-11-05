/** Public route identity for comparison only; this helper never creates links. */
function publicPath(value: unknown): string | undefined {
  if (typeof value !== 'string' || !value.startsWith('/') || value.startsWith('//') ||
    /[\\?#\u0000-\u0020\u007f]/.test(value) || /%(?:2f|5c|2e)/i.test(value) ||
    value.split('/').some((segment) => segment === '.' || segment === '..') ||
    /^\/(?:api|sitecore|_next|_site_[^/]*)(?:\/|$)/i.test(value)) return undefined;
  return value.toLowerCase().replace(/\/+$/, '') || '/';
}

function sourcePath(value: unknown): string | undefined {
  if (typeof value !== 'string' || value !== value.trim() ||
    /[\u0000-\u0020\u007f]/.test(value) ||
    value.split('/').some((segment) => segment === '.' || segment === '..')) return undefined;
  try {
    const source = new URL(value);
    if (source.origin !== 'https://www.allianzlife.com' || source.username || source.password ||
      source.search || source.hash || value.includes('\\') || /%(?:2f|5c|2e)/i.test(value)) return undefined;
    return publicPath(source.pathname);
  } catch { return undefined; }
}

/** Native Preview runs at a transport URL rather than the authored public path.
 * Use its existing source identity only there. Ordinary visitors and rewritten
 * routes retain the SDK itemPath precedence and never infer a route from copy. */
export function legacySidebarCurrentPath(pathname: string | null, itemPath?: unknown, sourceUrl?: unknown): string {
  const context = publicPath(itemPath);
  if (/^\/api\/editing\/render\/?$/i.test(pathname ?? '')) {
    return sourcePath(sourceUrl) ?? context ?? '';
  }
  return context ?? publicPath(pathname) ?? '';
}
