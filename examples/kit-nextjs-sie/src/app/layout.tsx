import './globals.css';
import { sieFontClassName } from './fonts';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://edge-platform.sitecorecloud.io" />
        <link rel="preconnect" href="https://maps.googleapis.com" />
        <link
          rel="preconnect"
          href="https://maps.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          rel="icon"
          href="/assets/sie-images/sienergy-official-favicon.png"
          type="image/png"
        />
        <link
          rel="apple-touch-icon"
          href="/assets/sie-images/sienergy-official-favicon.png"
        />
      </head>
      <body className={sieFontClassName}>{children}</body>
    </html>
  );
}
