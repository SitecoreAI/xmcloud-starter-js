import './globals.css';

import { StructuredData } from '@/components/structured-data/StructuredData';
import {
  generateOrganizationSchema,
  generateWebSiteSchema,
} from '@/lib/structured-data/schema';
import type { JsonLdValue } from '@/lib/structured-data/jsonld';
import { getBaseUrl } from '@/lib/utils';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const baseUrl = getBaseUrl();
  const locale =
    process.env.NEXT_PUBLIC_DEFAULT_LANGUAGE?.toLocaleLowerCase() === 'es-mx'
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
