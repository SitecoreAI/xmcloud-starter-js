import type { SlbFallbackPageModel } from '@/lib/slb-fallback-content';

type PageFetcher<T> = (
  path: string[],
  options: { site: string; locale: string },
) => Promise<T | null | undefined>;

function routeSegments(route: string): string[] {
  return route.split(/[?#]/, 1)[0].split('/').filter(Boolean);
}

function sameSegments(
  left: readonly string[] | undefined,
  right: readonly string[],
): boolean {
  const requested = left ?? [];
  return (
    requested.length === right.length &&
    requested.every(
      (segment, index) =>
        segment.toLocaleLowerCase() === right[index].toLocaleLowerCase(),
    )
  );
}

/**
 * Editing requests carry their authoritative language in Sitecore preview
 * data, while their internal route may still resolve to the default locale.
 */
export function resolveSlbPageLocale(
  previewLanguage: unknown,
  routeLocale: string,
): string {
  if (typeof previewLanguage === 'string') {
    const normalizedPreviewLanguage = previewLanguage.toLocaleLowerCase();
    if (normalizedPreviewLanguage === 'es-mx') return 'es-MX';
    if (normalizedPreviewLanguage === 'en') return 'en';
  }

  return routeLocale.toLocaleLowerCase() === 'es-mx' ? 'es-MX' : 'en';
}

/**
 * Spanish public aliases are presentation routes. Sitecore language versions
 * still live beneath the shared English item path, so retry that path before
 * treating an otherwise valid localized URL as missing.
 */
export async function getPageWithFallbackAlias<T>({
  getPage,
  path,
  site,
  locale,
  fallbackPage,
}: {
  getPage: PageFetcher<T>;
  path?: readonly string[];
  site: string;
  locale: string;
  fallbackPage?: SlbFallbackPageModel;
}): Promise<T | null | undefined> {
  const requestedPath = [...(path ?? [])];
  const page = await getPage(requestedPath, { site, locale });

  if (page || locale.toLocaleLowerCase() !== 'es-mx' || !fallbackPage) {
    return page;
  }

  const sharedItemPath = routeSegments(fallbackPage.alternateRoute);
  if (sameSegments(requestedPath, sharedItemPath)) return page;

  return getPage(sharedItemPath, { site, locale });
}
