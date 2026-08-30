import catalogJson from '@/content/slb-fallback-content.json';
import {
  hasLegacySolterraRouteContent,
  hasLegacySolterraSignature,
  readSlbFieldText,
} from '@/lib/slb-content-safety';

export type SlbLocale = 'en' | 'es-MX';

export interface SlbFallbackCta {
  label: string;
  target: string;
  targetType: string;
}

export interface SlbFallbackImage {
  filename: string;
  alt: string;
}

export interface SlbFallbackItem {
  title: string;
  summary: string;
}

export interface SlbFallbackComponent {
  id: string;
  type:
    | 'cardGrid'
    | 'contentSection'
    | 'contentRail'
    | 'filterBar'
    | 'processSteps'
    | 'productFeature'
    | 'resourceLinks';
  order: number;
  anchorId?: string;
  heading?: string;
  body?: string;
  items?: SlbFallbackItem[];
  cta?: SlbFallbackCta;
}

export interface SlbFallbackFields {
  pageTitle: string;
  navigationTitle: string;
  seo: {
    title: string;
    description: string;
    openGraphTitle: string;
    openGraphDescription: string;
    openGraphImageFilename: string;
  };
  hero: {
    eyebrow?: string;
    heading: string;
    summary: string;
    image?: SlbFallbackImage;
    primaryCta?: SlbFallbackCta;
    secondaryCta?: SlbFallbackCta;
    searchLabel?: string;
    filterLabels?: string[];
  };
  components: SlbFallbackComponent[];
  supportingImages: SlbFallbackImage[];
  finalCta?: SlbFallbackCta & { heading: string };
}

interface SlbFallbackCatalogPage {
  id: string;
  section: string;
  template: string;
  routes: Record<SlbLocale, string>;
  routeAliases?: Record<SlbLocale, string[]>;
  relatedPageRoutes: Record<SlbLocale, string[]>;
  fields: Record<SlbLocale, SlbFallbackFields>;
}

interface SlbFallbackCatalog {
  site: {
    name: string;
    purposeLine: string;
    locales: Array<{
      code: SlbLocale;
      displayName: string;
      routePrefix: string;
    }>;
  };
  pages: SlbFallbackCatalogPage[];
}

export interface SlbFallbackRelatedPage {
  title: string;
  route: string;
}

export interface SlbFallbackPageModel {
  id: string;
  locale: SlbLocale;
  route: string;
  canonicalRoute: string;
  alternateRoute: string;
  alternateLocaleLabel: string;
  section: string;
  template: string;
  fields: SlbFallbackFields;
  relatedPages: SlbFallbackRelatedPage[];
}

export interface SlbLanguageRoutes {
  en: string;
  'es-MX': string;
  'x-default': string;
}

const catalog = catalogJson as SlbFallbackCatalog;

function normalizePath(path: string): string {
  const pathname = path.split(/[?#]/, 1)[0] || '/';
  const normalized = `/${pathname}`.replace(/\/{2,}/g, '/').replace(/\/$/, '');
  return normalized || '/';
}

function localeDefinition(locale: string) {
  return catalog.site.locales.find(
    (entry) => entry.code.toLowerCase() === locale.toLowerCase(),
  );
}

function contentPathForRoute(route: string, locale: SlbLocale): string {
  const localeConfig = localeDefinition(locale);
  const normalizedRoute = normalizePath(route);
  const prefix = normalizePath(localeConfig?.routePrefix || '/');

  if (prefix === '/') return normalizedRoute;
  if (normalizedRoute === prefix) return '/';
  if (normalizedRoute.startsWith(`${prefix}/`)) {
    return normalizePath(normalizedRoute.slice(prefix.length));
  }

  return normalizedRoute;
}

function requestedContentPath(path: readonly string[] | undefined): string {
  return normalizePath(path?.length ? path.join('/') : '/');
}

function sharedLanguageRoute(page: SlbFallbackCatalogPage): string {
  return `/es-mx${page.routes.en === '/' ? '/' : page.routes.en}`;
}

function outputRouteForPage(
  page: SlbFallbackCatalogPage,
  locale: SlbLocale,
  useSharedSpanishRoutes: boolean,
): string {
  return locale === 'es-MX' && useSharedSpanishRoutes
    ? sharedLanguageRoute(page)
    : page.routes[locale];
}

function pageForPublicRoute(
  route: string,
  locale: SlbLocale,
): SlbFallbackCatalogPage | undefined {
  const requested = contentPathForRoute(route, locale);
  return catalog.pages.find((page) => pageMatchesPath(page, locale, requested));
}

function pageMatchesPath(
  page: SlbFallbackCatalogPage,
  locale: SlbLocale,
  requestedPath: string,
): boolean {
  const sourceLanguageRoute =
    locale === 'es-MX' ? sharedLanguageRoute(page) : undefined;

  return [
    page.routes[locale],
    ...(page.routeAliases?.[locale] || []),
    ...(sourceLanguageRoute ? [sourceLanguageRoute] : []),
  ].some((route) => contentPathForRoute(route, locale) === requestedPath);
}

export function resolveSlbFallbackPage(
  locale: string,
  path?: readonly string[],
): SlbFallbackPageModel | undefined {
  const localeConfig = localeDefinition(locale);
  if (!localeConfig) return undefined;

  const currentLocale = localeConfig.code;
  const currentPath = requestedContentPath(path);
  const page = catalog.pages.find((candidate) =>
    pageMatchesPath(candidate, currentLocale, currentPath),
  );
  if (!page) return undefined;

  const useSharedSpanishRoutes =
    currentLocale === 'es-MX' &&
    contentPathForRoute(sharedLanguageRoute(page), currentLocale) ===
      currentPath &&
    contentPathForRoute(page.routes[currentLocale], currentLocale) !==
      currentPath;

  const translateTarget = (target: string): string => {
    if (!target.startsWith('/')) return target;

    const [pathname, fragment] = target.split('#', 2);
    const targetPage = pageForPublicRoute(pathname, currentLocale);
    if (!targetPage) return target;

    const translatedPath = outputRouteForPage(
      targetPage,
      currentLocale,
      useSharedSpanishRoutes,
    );
    return fragment ? `${translatedPath}#${fragment}` : translatedPath;
  };

  const localizedFields: SlbFallbackFields = {
    ...page.fields[currentLocale],
    hero: {
      ...page.fields[currentLocale].hero,
      primaryCta: page.fields[currentLocale].hero.primaryCta
        ? {
            ...page.fields[currentLocale].hero.primaryCta,
            target: translateTarget(
              page.fields[currentLocale].hero.primaryCta.target,
            ),
          }
        : undefined,
      secondaryCta: page.fields[currentLocale].hero.secondaryCta
        ? {
            ...page.fields[currentLocale].hero.secondaryCta,
            target: translateTarget(
              page.fields[currentLocale].hero.secondaryCta.target,
            ),
          }
        : undefined,
    },
    components: page.fields[currentLocale].components.map((component) => ({
      ...component,
      cta: component.cta
        ? {
            ...component.cta,
            target: translateTarget(component.cta.target),
          }
        : undefined,
    })),
    finalCta: page.fields[currentLocale].finalCta
      ? {
          ...page.fields[currentLocale].finalCta,
          target: translateTarget(page.fields[currentLocale].finalCta.target),
        }
      : undefined,
  };

  const alternateLocale = currentLocale === 'en' ? 'es-MX' : 'en';
  const alternateConfig = localeDefinition(alternateLocale);
  const relatedPages = page.relatedPageRoutes[currentLocale]
    .map((route) => {
      const relatedPage = pageForPublicRoute(route, currentLocale);
      return relatedPage
        ? {
            title: relatedPage.fields[currentLocale].navigationTitle,
            route: outputRouteForPage(
              relatedPage,
              currentLocale,
              useSharedSpanishRoutes,
            ),
          }
        : undefined;
    })
    .filter((item): item is SlbFallbackRelatedPage => Boolean(item));

  return {
    id: page.id,
    locale: currentLocale,
    route: outputRouteForPage(page, currentLocale, useSharedSpanishRoutes),
    canonicalRoute: page.routes[currentLocale],
    alternateRoute: page.routes[alternateLocale],
    alternateLocaleLabel: alternateConfig?.displayName || alternateLocale,
    section: page.section,
    template: page.template,
    fields: localizedFields,
    relatedPages,
  };
}

export function getSlbLanguageRoutes(
  page: SlbFallbackPageModel,
): SlbLanguageRoutes {
  const englishRoute =
    page.locale === 'en' ? page.canonicalRoute : page.alternateRoute;
  const spanishRoute =
    page.locale === 'es-MX' ? page.canonicalRoute : page.alternateRoute;

  return {
    en: englishRoute,
    'es-MX': spanishRoute,
    'x-default': englishRoute,
  };
}

type RouteWithPlaceholders = {
  placeholders?: Record<string, unknown>;
};

export function hasPlaceholderPresentation(
  route: unknown,
  placeholderName: string,
): boolean {
  if (!route || typeof route !== 'object') return false;

  const placeholders = (route as RouteWithPlaceholders).placeholders;
  if (!placeholders || typeof placeholders !== 'object') return false;

  const presentation = placeholders[placeholderName];
  if (Array.isArray(presentation)) return presentation.length > 0;

  // Unknown non-array shapes are treated as CMS-owned content. This fails
  // closed so a future SDK response cannot be hidden by the fallback.
  return presentation !== undefined && presentation !== null;
}

export function shouldRenderSlbFallback({
  route,
  fallbackPage,
  isDesignLibrary,
}: {
  route: unknown;
  fallbackPage?: SlbFallbackPageModel;
  isDesignLibrary: boolean;
}): boolean {
  return Boolean(
    route &&
      fallbackPage &&
      !isDesignLibrary &&
      (hasLegacySolterraRouteContent(route) ||
        !hasPlaceholderPresentation(route, 'headless-main')),
  );
}

function firstField(
  fields: Record<string, unknown>,
  ...names: string[]
): string | undefined {
  for (const name of names) {
    const value = readSlbFieldText(fields[name]);
    if (value) return value;
  }
  return undefined;
}

export function mergeSlbFallbackRouteFields(
  page: SlbFallbackPageModel | undefined,
  routeFields: unknown,
): SlbFallbackPageModel | undefined {
  if (!page || !routeFields || typeof routeFields !== 'object') return page;
  if (hasLegacySolterraSignature(routeFields)) return page;

  const fields = routeFields as Record<string, unknown>;
  const pageTitle = firstField(fields, 'pageTitle', 'Title');
  const heroHeading =
    firstField(fields, 'pageHeaderTitle', 'headerTitle') || pageTitle;
  const heroSummary = firstField(fields, 'pageSubtitle', 'pageSummary');
  const navigationTitle = firstField(fields, 'navigationTitle');
  const metadataTitle = firstField(fields, 'metadataTitle');
  const metadataDescription = firstField(
    fields,
    'metadataDescription',
    'pageSummary',
  );
  const ogTitle = firstField(fields, 'ogTitle');
  const ogDescription = firstField(fields, 'ogDescription');

  return {
    ...page,
    fields: {
      ...page.fields,
      pageTitle: pageTitle || page.fields.pageTitle,
      navigationTitle: navigationTitle || page.fields.navigationTitle,
      seo: {
        ...page.fields.seo,
        title: metadataTitle || page.fields.seo.title,
        description: metadataDescription || page.fields.seo.description,
        openGraphTitle: ogTitle || page.fields.seo.openGraphTitle,
        openGraphDescription:
          ogDescription || page.fields.seo.openGraphDescription,
      },
      hero: {
        ...page.fields.hero,
        heading: heroHeading || page.fields.hero.heading,
        summary: heroSummary || page.fields.hero.summary,
      },
    },
  };
}

export function getSlbSiteIdentity() {
  return catalog.site;
}
