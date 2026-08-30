import './globals.css';

import { headers as nextHeaders } from 'next/headers';
import { StructuredData } from '@/components/structured-data/StructuredData';
import {
  generateOrganizationSchema,
  generateWebSiteSchema,
} from '@/lib/structured-data/schema';
import type { JsonLdValue } from '@/lib/structured-data/jsonld';
import { getBaseUrl } from '@/lib/utils';

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const headers = await nextHeaders();
  const baseUrl = getBaseUrl(
    headers.get('x-forwarded-host') || headers.get('host'),
    headers.get('x-forwarded-proto'),
  );
  const locale =
    headers.get('x-sc-locale')?.toLocaleLowerCase() === 'es-mx'
      ? 'es-MX'
      : 'en';

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
        <link rel="icon" href="/favicon.ico" />
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
