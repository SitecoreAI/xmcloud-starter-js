const firstForwardedValue = (value: string | null): string =>
  value?.split(',')[0]?.trim() || '';

/** Returns the public origin represented by the incoming request headers. */
export function getRequestOrigin(
  request: Pick<Request, 'headers' | 'url'>,
): string {
  const requestUrl = new URL(request.url);
  const forwardedHost = firstForwardedValue(
    request.headers.get('x-forwarded-host'),
  );
  const host = forwardedHost || request.headers.get('host') || requestUrl.host;
  const forwardedProtocol = firstForwardedValue(
    request.headers.get('x-forwarded-proto'),
  );
  const protocol = forwardedProtocol || requestUrl.protocol.replace(':', '');

  try {
    return new URL(`${protocol}://${host}`).origin;
  } catch {
    return requestUrl.origin;
  }
}

/** Replaces an absolute URL's origin while preserving its path, query, and hash. */
export function rewriteAbsoluteUrlOrigin(
  value: string,
  publicOrigin: string,
): string {
  return value.replace(
    /^https?:\/\/[^/?#\s<>"']+/i,
    publicOrigin.replace(/\/+$/, ''),
  );
}

/** Rewrites page and alternate-language URLs in Sitecore-generated sitemap XML. */
export function rewriteSitemapOrigins(
  xml: string,
  publicOrigin: string,
): string {
  return xml
    .replace(
      /(<loc\b[^>]*>\s*)(https?:\/\/[^<\s]+)(\s*<\/loc>)/gi,
      (_match, opening: string, url: string, closing: string) =>
        `${opening}${rewriteAbsoluteUrlOrigin(url, publicOrigin)}${closing}`,
    )
    .replace(
      /(<xhtml:link\b[^>]*\bhref\s*=\s*["'])(https?:\/\/[^"']+)(["'])/gi,
      (_match, opening: string, url: string, closing: string) =>
        `${opening}${rewriteAbsoluteUrlOrigin(url, publicOrigin)}${closing}`,
    );
}
