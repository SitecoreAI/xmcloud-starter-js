import { isDesignLibraryPreviewData } from '@sitecore-content-sdk/nextjs/editing';
import { notFound } from 'next/navigation';
import { draftMode, headers as nextHeaders } from 'next/headers';
import { SiteInfo } from '@sitecore-content-sdk/nextjs';
import sites from '.sitecore/sites.json';
import { routing } from '@/i18n/routing';
import scConfig from 'sitecore.config';
import client from '@/lib/sitecore-client';
import Layout, { RouteFields } from '@/Layout';
import Providers from '@/Providers';
import { NextIntlClientProvider } from 'next-intl';
import { setRequestLocale } from 'next-intl/server';
import { StructuredData } from '@/components/structured-data/StructuredData';
import { generateWebPageSchema } from '@/lib/structured-data/schema';
import { getBaseUrl } from '@/lib/utils';
import {
  mergeSlbFallbackRouteFields,
  resolveSlbFallbackPage,
} from '@/lib/slb-fallback-content';

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
  const catalogFallbackPage = resolveSlbFallbackPage(locale, path);

  // Set site and locale to be available in src/i18n/request.ts for fetching the dictionary
  setRequestLocale(`${site}_${locale}`);

  // Fetch the page data from Sitecore
  let page;
  if (draft.isEnabled) {
    const headers = await nextHeaders();
    const previewData = client.getPreviewData(headers);
    if (isDesignLibraryPreviewData(previewData)) {
      page = await client.getDesignLibraryData(previewData);
    } else {
      page = await client.getPreview(previewData);
    }
  } else {
    page = await client.getPage(path ?? [], { site, locale });
  }

  // If the page is not found, return a 404
  if (!page) {
    notFound();
  }

  const routeFields = page.layout.sitecore.route?.fields as RouteFields;
  const fallbackPage = mergeSlbFallbackRouteFields(
    catalogFallbackPage,
    routeFields,
  );
  const pageTitle =
    routeFields?.Title?.value?.toString() ||
    fallbackPage?.fields.pageTitle ||
    'SLB';
  const pageDescription =
    routeFields?.ogDescription?.value?.toString() ||
    fallbackPage?.fields.seo.description;

  const pathSegments = path && path.length > 0 ? path.join('/') : '';
  const urlPath =
    fallbackPage?.route || (pathSegments ? `/${pathSegments}` : '');
  const fullUrl = baseUrl ? `${baseUrl}${urlPath}` : undefined;

  const webPageSchema = generateWebPageSchema({
    name: pageTitle,
    description: pageDescription,
    url: fullUrl,
    inLanguage: locale.replace('_', '-'),
    ...(baseUrl && {
      isPartOf: {
        name: 'SLB',
        url: baseUrl,
      },
    }),
  });

  return (
    <NextIntlClientProvider>
      <Providers page={page}>
        <StructuredData id="webpage-schema" data={webPageSchema} />
        <Layout page={page} fallbackPage={fallbackPage} />
      </Providers>
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
  const catalogFallbackPage = resolveSlbFallbackPage(locale, path);

  // Canonical URL: base URL + content path only (no site/locale segments)
  const pathSegment =
    catalogFallbackPage?.route || (path?.length ? `/${path.join('/')}` : '');
  const canonicalUrl = baseUrl ? `${baseUrl}${pathSegment}` : undefined;

  // The same call as for rendering the page. Should be cached by default react behavior
  const page = await client.getPage(path ?? [], { site, locale });

  // Cast route fields once to avoid repeated type assertions
  const routeFields = (page?.layout.sitecore.route?.fields ??
    {}) as RouteFields;
  const fallbackPage = mergeSlbFallbackRouteFields(
    catalogFallbackPage,
    routeFields,
  );

  // Extract metadata values with fallback chain
  const metadataTitle =
    routeFields?.metadataTitle?.value?.toString() ||
    routeFields?.pageTitle?.value?.toString() ||
    routeFields?.Title?.value?.toString() ||
    fallbackPage?.fields.seo.title ||
    'SLB';

  const metadataDescription =
    routeFields?.metadataDescription?.value?.toString() ||
    routeFields?.pageSummary?.value?.toString() ||
    fallbackPage?.fields.seo.description ||
    'SLB drives energy innovation for a balanced planet.';

  const ogTitle =
    routeFields?.ogTitle?.value?.toString() ||
    fallbackPage?.fields.seo.openGraphTitle ||
    metadataTitle;

  const ogDescription =
    routeFields?.ogDescription?.value?.toString() ||
    fallbackPage?.fields.seo.openGraphDescription ||
    metadataDescription;

  // Ensure image URL is absolute (HTTPS preferred)
  const imageSource =
    routeFields?.ogImage?.value?.src ||
    routeFields?.thumbnailImage?.value?.src ||
    (fallbackPage
      ? `/images/slb/${fallbackPage.fields.seo.openGraphImageFilename}`
      : undefined);

  const ogImageUrl = imageSource
    ? imageSource.startsWith('http')
      ? imageSource
      : `${baseUrl}${imageSource.startsWith('/') ? '' : '/'}${imageSource}`
    : undefined;

  const pageUrl = canonicalUrl;

  // Parse keywords from comma-separated string to array (for <meta name="keywords">)
  const keywordsString = routeFields?.metadataKeywords?.value?.toString() || '';
  const keywords = keywordsString
    ? keywordsString.split(',').map((k: string) => k.trim())
    : [];

  const metadataAuthor =
    routeFields?.metadataAuthor?.value?.toString() || 'SLB';

  return {
    title: metadataTitle,
    description: metadataDescription,
    authors: [{ name: metadataAuthor }],
    ...(keywords.length > 0 && { keywords }),
    ...(canonicalUrl && {
      alternates: {
        canonical: canonicalUrl,
      },
    }),
    openGraph: {
      title: ogTitle,
      description: ogDescription,
      url: pageUrl,
      type: 'website',
      siteName: 'SLB',
      locale: locale || 'en',
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
