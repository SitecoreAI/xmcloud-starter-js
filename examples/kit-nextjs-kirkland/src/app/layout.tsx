import './globals.css';
import { headers } from 'next/headers';
import { getLocaleOption, SITE_LOCALE_HEADER } from '@/i18n/locales';
import { bodyFont, headingFont } from './fonts';

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const requestHeaders = await headers();
  const locale = getLocaleOption(
    requestHeaders.get(SITE_LOCALE_HEADER) ?? undefined,
  ).code;

  return (
    <html lang={locale} suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://edge-platform.sitecorecloud.io" />
        <link rel="preconnect" href="https://maps.googleapis.com" />
        <link
          rel="preconnect"
          href="https://maps.gstatic.com"
          crossOrigin="anonymous"
        />
        <link rel="icon" href="/favicon.ico" />
      </head>
      <body className={`${bodyFont.variable} ${headingFont.variable}`}>
        {children}
      </body>
    </html>
  );
}
