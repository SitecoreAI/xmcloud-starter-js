import { isDesignLibraryPreviewData } from '@sitecore-content-sdk/nextjs/editing';
import { notFound } from 'next/navigation';
import { draftMode, headers as nextHeaders } from 'next/headers';
import { SiteInfo } from '@sitecore-content-sdk/nextjs';
import { preload } from 'react-dom';
import sites from '.sitecore/sites.json';
import { routing } from 'src/i18n/routing';
import scConfig from 'sitecore.config';
import client from 'src/lib/sitecore-client';
import Layout, { RouteFields } from 'src/Layout';
import Providers from 'src/Providers';
import { NextIntlClientProvider } from 'next-intl';
import { setRequestLocale } from 'next-intl/server';
import { generateWebPageSchema } from 'src/lib/structured-data/schema';
import { StructuredData } from '@/components/structured-data/StructuredData';
import { getBaseUrlFromHeaders } from '@/lib/utils';
import { isLegacyStarterRoute } from '@/lib/nwn-route-guard';
import { sanitizeLegacyStarterData } from '@/lib/nwn-content-sanitizer';

const HOME_HERO_IMAGE =
  '/assets/nwn-images/homepage-hero-family-comfort-pacific-northwest-wide.png';
const DEFAULT_DESCRIPTION =
  'NW Natural provides safe, reliable and affordable energy for the communities we serve.';
const DEFAULT_KEYWORDS = [
  'natural gas',
  'account support',
  'energy safety',
  'Pacific Northwest',
];

const isLegacyStarterValue = (value: string | undefined): boolean =>
  /\b(?:alaris|aero|nexa|terra|automotive|vehicles?|dealerships?)\b|test[-\s]?drive|electric future|drivesense/i.test(
    value ?? '',
  );

const useNwnValue = (
  ...values: Array<string | undefined>
): string | undefined =>
  values.find((value) => value?.trim() && !isLegacyStarterValue(value));

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function findHeroImageSrc(page: any): string | undefined {
  const placeholders = page?.layout?.sitecore?.route?.placeholders;
  if (!placeholders) return undefined;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const search = (components: any[]): string | undefined => {
    for (const comp of components) {
      if (comp.componentName === 'Hero') {
        const serializedFields = JSON.stringify(comp.fields);
        const imageSrc = comp.fields?.image?.value?.src;
        return !imageSrc || isLegacyStarterValue(serializedFields)
          ? HOME_HERO_IMAGE
          : imageSrc;
      }
      // Recurse into nested placeholders (containers / flex)
      if (comp.placeholders) {
        for (const nested of Object.values(comp.placeholders)) {
          if (Array.isArray(nested)) {
            const found = search(nested);
            if (found) return found;
          }
        }
      }
    }
    return undefined;
  };

  for (const phComponents of Object.values(placeholders)) {
    if (Array.isArray(phComponents)) {
      const found = search(phComponents);
      if (found) return found;
    }
  }
  return undefined;
}

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

  if (isLegacyStarterRoute(path)) {
    notFound();
  }

  const draft = await draftMode();
  const requestHeaders = await nextHeaders();
  const baseUrl = getBaseUrlFromHeaders(requestHeaders);

  setRequestLocale(`${site}_${locale}`);

  // Fetch the page data from Sitecore
  let page;
  if (draft.isEnabled) {
    const previewData = client.getPreviewData(requestHeaders);
    if (isDesignLibraryPreviewData(previewData)) {
      page = await client.getDesignLibraryData(previewData);
    } else {
      page = await client.getPreview(previewData);
    }
  } else {
    try {
      page = await client.getPage(path ?? [], { site, locale });
    } catch (error) {
      console.error(
        `[NWN page] Failed to load /${(path ?? []).join('/')}:`,
        error,
      );
      throw error;
    }
  }

  if (!page) {
    notFound();
  }

  const renderPage =
    draft.isEnabled || page.mode.isEditing
      ? page
      : sanitizeLegacyStarterData(page);

  const heroImageSrc = findHeroImageSrc(renderPage);
  if (heroImageSrc) {
    preload(heroImageSrc, { as: 'image', fetchPriority: 'high' });
  }

  // Generate page-specific structured data
  const fields = renderPage.layout.sitecore.route?.fields as RouteFields;
  const pageTitle =
    useNwnValue(
      fields?.Title?.value?.toString(),
      fields?.pageTitle?.value?.toString(),
    ) ||
    (path?.length
      ? 'NW Natural'
      : 'NW Natural | Home Energy, Account Help & Safety');
  const pageDescription =
    useNwnValue(
      fields?.metadataDescription?.value?.toString(),
      fields?.ogDescription?.value?.toString(),
    ) || DEFAULT_DESCRIPTION;
  const currentPath = path?.length ? `/${path.join('/')}` : '/';
  const fullUrl = `${baseUrl}${currentPath}`;
  const webPageSchema = generateWebPageSchema(
    pageTitle,
    fullUrl,
    pageDescription,
    locale,
  );

  return (
    <NextIntlClientProvider>
      <Providers page={renderPage}>
        {/* Page-specific structured data */}
        <StructuredData id="webpage-schema" data={webPageSchema} />
        <Layout page={renderPage} baseUrl={baseUrl || undefined} />
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
    const staticParams = await client.getAppRouterStaticParams(
      allowedSites,
      routing.locales.slice(),
    );
    return staticParams.filter(
      (staticPath) => !isLegacyStarterRoute(staticPath.path),
    );
  }
  return [];
};

export const generateMetadata = async ({ params }: PageProps) => {
  const baseUrl = getBaseUrlFromHeaders(await nextHeaders());

  const { site, locale, path } = await params;

  if (isLegacyStarterRoute(path)) {
    notFound();
  }

  // Canonical URL: base URL + content path only (no site/locale segments)
  const pathSegment = path?.length ? `/${path.join('/')}` : '';
  const canonicalUrl = baseUrl ? `${baseUrl}${pathSegment}` : undefined;

  // The same call as for rendering the page. Should be cached by default react behavior
  let page;
  try {
    page = await client.getPage(path ?? [], { site, locale });
  } catch (error) {
    console.error(
      `[NWN metadata] Failed to load /${(path ?? []).join('/')}:`,
      error,
    );
  }

  // Cast route fields once to avoid repeated type assertions
  const routeFields = (page?.layout.sitecore.route?.fields ??
    {}) as RouteFields;

  const isHome = !path?.length;

  // Ignore inherited Alaris starter values while live authoring catches up.
  const metadataTitle =
    useNwnValue(
      routeFields?.metadataTitle?.value?.toString(),
      routeFields?.pageTitle?.value?.toString(),
      routeFields?.Title?.value?.toString(),
      routeFields?.ogTitle?.value?.toString(),
    ) ||
    (isHome ? 'NW Natural | Home Energy, Account Help & Safety' : 'NW Natural');

  const metadataDescription =
    useNwnValue(
      routeFields?.metadataDescription?.value?.toString(),
      routeFields?.pageSummary?.value?.toString(),
      routeFields?.ogDescription?.value?.toString(),
    ) || DEFAULT_DESCRIPTION;

  const ogTitle =
    useNwnValue(
      routeFields?.ogTitle?.value?.toString(),
      routeFields?.Title?.value?.toString(),
    ) || metadataTitle;

  const ogDescription =
    useNwnValue(routeFields?.ogDescription?.value?.toString()) ||
    metadataDescription;

  // Ensure image URL is absolute (HTTPS preferred)
  const authoredImageSource =
    routeFields?.ogImage?.value?.src || routeFields?.thumbnailImage?.value?.src;
  const authoredImageAltValue =
    routeFields?.ogImage?.value?.alt || routeFields?.thumbnailImage?.value?.alt;
  const authoredImageAlt =
    typeof authoredImageAltValue === 'string'
      ? authoredImageAltValue
      : undefined;
  const authoredImageIsNwn =
    Boolean(authoredImageSource) &&
    !isLegacyStarterValue(authoredImageSource) &&
    !isLegacyStarterValue(authoredImageAlt);
  const imageSource = authoredImageIsNwn
    ? authoredImageSource
    : isHome
      ? HOME_HERO_IMAGE
      : undefined;

  const ogImageUrl = imageSource
    ? imageSource.startsWith('http')
      ? imageSource
      : `${baseUrl}${imageSource.startsWith('/') ? '' : '/'}${imageSource}`
    : undefined;

  const pageUrl = canonicalUrl;

  // Parse keywords from comma-separated string to array (for <meta name="keywords">)
  const keywordsString = useNwnValue(
    routeFields?.metadataKeywords?.value?.toString(),
  );
  const keywords = keywordsString
    ? keywordsString.split(',').map((k: string) => k.trim())
    : isHome
      ? DEFAULT_KEYWORDS
      : [];

  const metadataAuthor =
    useNwnValue(routeFields?.metadataAuthor?.value?.toString()) || 'NW Natural';

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
      siteName: 'NW Natural',
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
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        'max-video-preview': -1,
        'max-image-preview': 'large',
        'max-snippet': -1,
      },
    },
  };
};
