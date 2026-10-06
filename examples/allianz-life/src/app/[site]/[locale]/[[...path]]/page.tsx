import { notFound } from "next/navigation";
import { SiteInfo } from "@sitecore-content-sdk/nextjs";
import sites from ".sitecore/sites.json";
import { routing } from "src/i18n/routing";
import scConfig from "sitecore.config";
import client from "src/lib/sitecore-client";
import Layout, { RouteFields } from "src/Layout";
import components from ".sitecore/component-map";
import Providers from "src/Providers";
import { NextIntlClientProvider } from "next-intl";
import { setRequestLocale } from "next-intl/server";
import { getBaseUrl } from "lib/utils";
import { loadAllianzPage } from 'lib/allianz-page-loader';
import { allianzMetadata } from 'lib/allianz-metadata';
import { enrichAllianzComponentMap } from 'lib/allianz-automatic-components';

// Refresh prerendered CMS pages after 60 seconds using stale-while-revalidate.
export const revalidate = 60;

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
  // Next.js encodes page params; metadata already receives native decoded params.
  // Normalize only this boundary so the shared loader never decodes twice.
  const contentPath = (path ?? []).map((segment) => {
    try { return decodeURIComponent(segment); }
    catch { return segment; }
  });

  // Set site and locale to be available in src/i18n/request.ts for fetching the dictionary
  setRequestLocale(`${site}_${locale}`);

  const { page, needsComponentData, componentFetchOptions } = await loadAllianzPage(site, locale, ...contentPath);

  // If the page is not found, return a 404
  if (!page) {
    notFound();
  }

  // Fetch the component data from Sitecore (Likely will be deprecated)
  const componentProps = needsComponentData
    ? await client.getComponentData(page.layout, {}, enrichAllianzComponentMap(components, {
      getData: client.getData.bind(client),
      fetchOptions: componentFetchOptions,
      investmentPortfolioBindings: {
        datasourceTemplateId: 'e0d28f7b-050f-4656-b866-98edfcdf1ec5',
        investmentTemplateId: 'a81701f3-f3e3-4dce-b434-662ed99210f5',
        siteName: 'allianz-life',
        siteRootPath: '/sitecore/content/allianz/allianz-life',
      },
    }))
    : {};

  return (
    <NextIntlClientProvider>
      <Providers page={page} componentProps={componentProps}>
        <Layout page={page} />
      </Providers>
    </NextIntlClientProvider>
  );
}

// This function gets called at build and export time to determine
// pages for SSG ("paths", as tokenized array).
export const generateStaticParams = async () => {
  if (process.env.NODE_ENV !== "development" && scConfig.generateStaticPaths) {
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

// Metadata fields for the page.
export const generateMetadata = async ({ params }: PageProps) => {
  const baseUrl = getBaseUrl();

  const { path, site, locale } = await params;

  // Canonical URL: base URL + content path only (no site/locale segments)
  const pathSegment = path?.length ? `/${path.join("/")}` : "";
  const canonicalUrl = baseUrl ? `${baseUrl}${pathSegment}` : undefined;

  const { page } = await loadAllianzPage(site, locale, ...(path ?? []));
  const fields = page?.layout.sitecore.route?.fields as RouteFields;
  const metadata = allianzMetadata(fields);

  // Parse keywords from comma-separated string to array
  const keywordsString = fields?.metadataKeywords?.value?.toString() || "";
  const keywords = keywordsString
    ? keywordsString.split(",").map((k: string) => k.trim())
    : [];

  return {
    robots: { index: false, follow: false, noarchive: true },
    title: metadata.title,
    description: metadata.description,
    keywords,
    ...(canonicalUrl && {
      alternates: {
        canonical: canonicalUrl,
      },
    }),
    openGraph: {
      title: metadata.openGraphTitle,
      description: metadata.openGraphDescription,
      url: canonicalUrl,
      images: fields?.ogImage?.value?.src || fields?.thumbnailImage?.value?.src,
    },
  };
};
