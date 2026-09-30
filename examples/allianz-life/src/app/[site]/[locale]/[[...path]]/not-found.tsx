import Link from "next/link";
import { ErrorPage, getCachedPageParams } from "@sitecore-content-sdk/nextjs";
import client from "lib/sitecore-client";
import scConfig from "sitecore.config";
import Layout from "src/Layout";
import Providers from "src/Providers";
import { NextIntlClientProvider } from "next-intl";
import { isConnected } from 'lib/allianz-page';

export default async function NotFound() {
  const { site, locale } = getCachedPageParams();

  let page;
  try {
    page = isConnected() ? await client.getErrorPage(ErrorPage.NotFound, {
      site: site || scConfig.defaultSite,
      locale: locale || scConfig.defaultLanguage,
    }) : null;
  } catch (error) {
    console.error("Error fetching 404 page:", error);
  }

  if (page) return <NextIntlClientProvider><Providers page={page}><Layout page={page} /></Providers></NextIntlClientProvider>;

  return (
    <div style={{ padding: 10 }}>
      <h1>Page not found</h1>
      <p>This page does not exist.</p>
      <Link href="/">Go to the Home page</Link>
    </div>
  );
}
