import './globals.css';

import { StructuredData } from '@/components/structured-data/StructuredData';
import { headers } from 'next/headers';
import {
  generateOrganizationSchema,
  generateWebSiteSchema,
} from '@/lib/structured-data/schema';
import type { JsonLdValue } from '@/lib/structured-data/jsonld';
import { getBaseUrl } from '@/lib/utils';

// The document language comes from a request header set by the Sitecore proxy.
// Be explicit about request-time rendering so Next.js does not persist an
// on-demand route as static HTML and then reject headers() at runtime.
export const dynamic = 'force-dynamic';

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const baseUrl = getBaseUrl();
  const requestHeaders = await headers();
  const requestedLocale = requestHeaders.get('x-slb-document-locale');
  const locale =
    requestedLocale?.toLocaleLowerCase() === 'es-mx' ? 'es-MX' : 'en';

  // Site-wide schemas: Organization + WebSite (injected once per page)
  const organizationSchema = generateOrganizationSchema({
    name: 'SLB',
    url: baseUrl || undefined,
  });

  const webSiteSchema = baseUrl
    ? generateWebSiteSchema({
        name: 'SLB',
        url: baseUrl,
      })
    : null;

  return (
    <html lang={locale} suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://edge-platform.sitecorecloud.io" />
      </head>
      <body>
        <StructuredData
          id="organization-schema"
          data={organizationSchema as JsonLdValue}
        />
        {webSiteSchema && (
          <StructuredData
            id="website-schema"
            data={webSiteSchema as JsonLdValue}
          />
        )}
        {children}
      </body>
    </html>
  );
}
