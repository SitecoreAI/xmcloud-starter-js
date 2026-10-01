/* eslint-disable @next/next/no-css-tags -- Preserve source CSS grammar; processing changes source media breakpoints. */
import './globals.css';
import '../assets/allianz-native-overrides.css';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="stylesheet" href="/allianz-assets/source-style.css" />
        <link rel="stylesheet" href="/allianz-legacy-assets/legacy-style.css" />
        <link rel="icon" href="/favicon.ico" />
      </head>
      <body>{children}</body>
    </html>
  );
}
