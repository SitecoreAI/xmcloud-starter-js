import { isDesignLibraryPreviewData } from '@sitecore-content-sdk/nextjs/editing';
import { notFound } from 'next/navigation';
import { draftMode, headers as nextHeaders } from 'next/headers';
import { SiteInfo } from '@sitecore-content-sdk/nextjs';
import sites from '.sitecore/sites.json';
import { routing } from '@/i18n/routing';
import scConfig from 'sitecore.config';
import client from '@/lib/sitecore-client';
import Layout, { RouteFields } from '@/Layout';
import { NextIntlClientProvider } from 'next-intl';
import { setRequestLocale } from 'next-intl/server';
import { StructuredData } from '@/components/structured-data/StructuredData';
import { generateWebPageSchema } from '@/lib/structured-data/schema';
import { getBaseUrl } from '@/lib/utils';
import {
  getSlbLanguageRoutes,
  mergeSlbFallbackRouteFields,
  resolveSlbFallbackPage,
} from '@/lib/slb-fallback-content';
import {
  getPageWithFallbackAlias,
  resolveSlbPageLocale,
} from '@/lib/slb-page-resolution';
import { getSlbDamAssetUrl } from '@/lib/slb-dam-assets';
import {
  hasLegacySolterraRouteContent,
  readSlbFieldText,
  sanitizeLegacySolterraPage,
} from '@/lib/slb-content-safety';

type PageProps = {
  params: Promise<{
    site: string;
    locale: string;
    path?: string[];
    [key: string]: string | string[] | undefined;
  }>;
};

export default async function Page({ params }: PageProps) {
  const { site, locale, path } = await params;
  const draft = await draftMode();
  const baseUrl = getBaseUrl();
  let effectiveLocale = locale;
  let catalogFallbackPage = resolveSlbFallbackPage(effectiveLocale, path);

  // Fetch the page data from Sitecore
  let page;
  if (draft.isEnabled) {
    const headers = await nextHeaders();
    const previewData = client.getPreviewData(headers);
    effectiveLocale = resolveSlbPageLocale(
      (previewData as { language?: unknown }).language,
      locale,
    );
    catalogFallbackPage = resolveSlbFallbackPage(effectiveLocale, path);
    if (isDesignLibraryPreviewData(previewData)) {
      page = await client.getDesignLibraryData(previewData);
    } else {
      page = await client.getPreview(previewData);
    }
  } else {
    page = await getPageWithFallbackAlias({
      getPage: client.getPage.bind(client),
      path,
      site,
      locale: effectiveLocale,
      fallbackPage: catalogFallbackPage,
    });
  }

  // Set site and locale to be available in src/i18n/request.ts for fetching the dictionary.
  setRequestLocale(`${site}_${effectiveLocale}`);

  // If the page is not found, return a 404
  if (!page) {
    notFound();
  }

  const renderPage =
    !draft.isEnabled && catalogFallbackPage
      ? sanitizeLegacySolterraPage(page)
      : page;
  const routeFields = renderPage.layout.sitecore.route?.fields as RouteFields;
  const hasLegacyRouteContent = Boolean(
    catalogFallbackPage &&
      hasLegacySolterraRouteContent(page.layout.sitecore.route),
  );
  const sitecoreText = (field: unknown) =>
    hasLegacyRouteContent ? undefined : readSlbFieldText(field);
  const fallbackPage = mergeSlbFallbackRouteFields(
    catalogFallbackPage,
    routeFields,
  );
  const pageTitle =
    sitecoreText(routeFields?.Title) || fallbackPage?.fields.pageTitle || 'SLB';
  const pageDescription =
    sitecoreText(routeFields?.ogDescription) ||
    fallbackPage?.fields.seo.description;

  const pathSegments = path && path.length > 0 ? path.join('/') : '';
  const urlPath =
    fallbackPage?.canonicalRoute || (pathSegments ? `/${pathSegments}` : '');
  const fullUrl = baseUrl ? `${baseUrl}${urlPath}` : undefined;

  const webPageSchema = generateWebPageSchema({
    name: pageTitle,
    description: pageDescription,
    url: fullUrl,
    inLanguage: effectiveLocale.replace('_', '-'),
    ...(baseUrl && {
      isPartOf: {
        name: 'SLB',
        url: baseUrl,
      },
    }),
  });

  return (
    <NextIntlClientProvider>
      <StructuredData id="webpage-schema" data={webPageSchema} />
      <Layout page={renderPage} fallbackPage={fallbackPage} />
    </NextIntlClientProvider>
  );
}

// This function gets called at build and export time to determine
// pages for SSG ("paths", as tokenized array).
export const generateStaticParams = async () => {
  if (process.env.NODE_ENV !== 'development' && scConfig.generateStaticPaths) {
    // Filter sites to only include the sites this starter is designed to serve.
    // This prevents cross-site build errors when multiple starters share the same XM Cloud instance.
    const defaultSite = scConfig.defaultSite;
    const allowedSites = defaultSite
      ? sites
          .filter((site: SiteInfo) => site.name === defaultSite)
          .map((site: SiteInfo) => site.name)
      : sites.map((site: SiteInfo) => site.name);
    return await client.getAppRouterStaticParams(
      allowedSites,
      routing.locales.slice(),
    );
  }
  return [];
};

export const generateMetadata = async ({ params }: PageProps) => {
  const baseUrl = getBaseUrl();

  const { path, site, locale } = await params;
  const draft = await draftMode();
  let effectiveLocale = locale;
  if (draft.isEnabled) {
    const previewData = client.getPreviewData(await nextHeaders());
    effectiveLocale = resolveSlbPageLocale(
      (previewData as { language?: unknown }).language,
      locale,
    );
  }
  const catalogFallbackPage = resolveSlbFallbackPage(effectiveLocale, path);

  // Canonical URL: base URL + content path only (no site/locale segments)
  const pathSegment =
    catalogFallbackPage?.canonicalRoute ||
    (path?.length ? `/${path.join('/')}` : '');
  const canonicalUrl = baseUrl ? `${baseUrl}${pathSegment}` : undefined;
  const slbLanguageRoutes = catalogFallbackPage
    ? getSlbLanguageRoutes(catalogFallbackPage)
    : undefined;
  const languageAlternates =
    baseUrl && slbLanguageRoutes
      ? {
          en: `${baseUrl}${slbLanguageRoutes.en}`,
          'es-MX': `${baseUrl}${slbLanguageRoutes['es-MX']}`,
          'x-default': `${baseUrl}${slbLanguageRoutes['x-default']}`,
        }
      : undefined;

  // The same call as for rendering the page. Should be cached by default react behavior
  const page = await getPageWithFallbackAlias({
    getPage: client.getPage.bind(client),
    path,
    site,
    locale: effectiveLocale,
    fallbackPage: catalogFallbackPage,
  });

  // Cast route fields once to avoid repeated type assertions
  const routeFields = (page?.layout.sitecore.route?.fields ??
    {}) as RouteFields;
  const hasLegacyRouteContent = Boolean(
    catalogFallbackPage &&
      hasLegacySolterraRouteContent(page?.layout.sitecore.route),
  );
  const sitecoreText = (field: unknown) =>
    hasLegacyRouteContent ? undefined : readSlbFieldText(field);
  const fallbackPage = mergeSlbFallbackRouteFields(
    catalogFallbackPage,
    routeFields,
  );

  // Extract metadata values with fallback chain
  const metadataTitle =
    sitecoreText(routeFields?.metadataTitle) ||
    sitecoreText(routeFields?.pageTitle) ||
    sitecoreText(routeFields?.Title) ||
    fallbackPage?.fields.seo.title ||
    'SLB';

  const metadataDescription =
    sitecoreText(routeFields?.metadataDescription) ||
    sitecoreText(routeFields?.pageSummary) ||
    fallbackPage?.fields.seo.description ||
    'SLB drives energy innovation for a balanced planet.';

  const ogTitle =
    sitecoreText(routeFields?.ogTitle) ||
    fallbackPage?.fields.seo.openGraphTitle ||
    metadataTitle;

  const ogDescription =
    sitecoreText(routeFields?.ogDescription) ||
    fallbackPage?.fields.seo.openGraphDescription ||
    metadataDescription;

  // Ensure image URL is absolute (HTTPS preferred)
  const imageSource =
    (!hasLegacyRouteContent && routeFields?.ogImage?.value?.src) ||
    (!hasLegacyRouteContent && routeFields?.thumbnailImage?.value?.src) ||
    (fallbackPage
      ? getSlbDamAssetUrl(fallbackPage.fields.seo.openGraphImageFilename)
      : undefined);

  const ogImageUrl = imageSource
    ? imageSource.startsWith('http')
      ? imageSource
      : baseUrl
        ? `${baseUrl}${imageSource.startsWith('/') ? '' : '/'}${imageSource}`
        : undefined
    : undefined;

  const pageUrl = canonicalUrl;

  // Parse keywords from comma-separated string to array (for <meta name="keywords">)
  const keywordsString = sitecoreText(routeFields?.metadataKeywords) || '';
  const keywords = keywordsString
    ? keywordsString.split(',').map((k: string) => k.trim())
    : [];

  const metadataAuthor = sitecoreText(routeFields?.metadataAuthor) || 'SLB';

  return {
    title: metadataTitle,
    description: metadataDescription,
    authors: [{ name: metadataAuthor }],
    ...(keywords.length > 0 && { keywords }),
    ...(canonicalUrl && {
      alternates: {
        canonical: canonicalUrl,
        ...(languageAlternates && { languages: languageAlternates }),
      },
    }),
    openGraph: {
      title: ogTitle,
      description: ogDescription,
      url: pageUrl,
      type: 'website',
      siteName: 'SLB',
      locale: effectiveLocale.toLowerCase() === 'es-mx' ? 'es_MX' : 'en_US',
      images: ogImageUrl
        ? [
            {
              url: ogImageUrl,
              width: 1200,
              height: 630,
              alt: ogTitle,
            },
          ]
        : undefined,
    },
    twitter: {
      card: 'summary_large_image',
      title: ogTitle,
      description: ogDescription,
      images: ogImageUrl ? [ogImageUrl] : undefined,
    },
  };
};
