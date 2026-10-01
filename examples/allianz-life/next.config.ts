import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';
import { EDITING_ALLOWED_ORIGINS } from '@sitecore-content-sdk/content/editing';
import { getAllowedOriginsFromEnv } from '@sitecore-content-sdk/core/tools';

const getVisitorCsp = () => "default-src 'self'; script-src 'self' 'unsafe-inline'" + (process.env.NODE_ENV === 'development' ? " 'unsafe-eval'" : '') + "; style-src 'self' 'unsafe-inline'; img-src 'self' data: https://*.sitecorecloud.io https://*.sitecore.io; font-src 'self' data:; connect-src 'self' https://*.sitecorecloud.io https://*.sitecore.io; frame-src 'self'; form-action 'none'; base-uri 'self'; object-src 'none'";

// These three origins were observed in the native Home editing response's clientScripts.
const editingScriptOrigins = [
  'https://xmc-sitecoresaaef4e-thltmnpdemof1fc-devdd6f.sitecorecloud.io',
  'https://feaasstatic.blob.core.windows.net',
  'https://pages.sitecorecloud.io',
];
const getEditingCsp = () => getVisitorCsp().replace(
  "script-src 'self' 'unsafe-inline'",
  "script-src 'self' 'unsafe-inline' " + editingScriptOrigins.join(' '),
) + `; frame-ancestors 'self' ${[...getAllowedOriginsFromEnv(), ...EDITING_ALLOWED_ORIGINS].join(' ')}`;

const nextConfig: NextConfig = {
  // Allow specifying a distinct distDir when concurrently running app in a container
  distDir: process.env.NEXTJS_DIST_DIR || '.next',
  
  // Enable React Strict Mode
  reactStrictMode: true,

  // Disable the X-Powered-By header. Follows security best practices.
  poweredByHeader: false,
  headers: async () => [{ source: '/:path*', headers: [
    { key: 'X-Robots-Tag', value: 'noindex, nofollow, noarchive' },
    { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
    { key: 'Content-Security-Policy', value: getVisitorCsp() },
  ] }, {
    // Next's Node transport keeps config headers ahead of Route Handler response headers.
    // A later exact-path rule preserves the SDK framing contract and visitor restrictions.
    source: '/api/editing/render',
    headers: [{ key: 'Content-Security-Policy', value: getEditingCsp() }],
  }],

  // use this configuration to ensure that only images from the whitelisted domains
  // can be served from the Next.js Image Optimization API
  // see https://nextjs.org/docs/app/api-reference/components/image#remotepatterns
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'edge*.**',
        port: '',
      },
      {
        protocol: 'https',
        hostname: 'xmc-*.**',
        port: '',
      },
    ],
    // Disable image optimization in development to avoid upstream timeouts
    unoptimized: process.env.NODE_ENV === 'development',
  },
  
  // use this configuration to serve the sitemap.xml and robots.txt files from the API route handlers
  rewrites: async () => {
    return [
      {
        // sitemap.xml serves the main sitemap
        source: '/sitemap.xml',
        destination: '/api/sitemap',
        locale: false,
      },
      {
        // Numbered sitemap index pages (e.g. /sitemap-0.xml, /sitemap-1.xml)
        source: '/sitemap-:id(\\d+).xml',
        destination: '/api/sitemap',
        locale: false,
      },
      {
        // LLM-optimized sitemap for AI crawler ingestion
        source: '/sitemap-llm.xml',
        destination: '/api/sitemap-llm',
        locale: false,
      },
      {
        source: '/robots.txt',
        destination: '/api/robots',
        locale: false,
      },
      {
        source: '/llms.txt',
        destination: '/api/llms-txt',
        locale: false,
      },
      {
        source: '/.well-known/ai.txt',
        destination: '/api/well-known/ai-txt',
        locale: false,
      },
    ];
  },
};

const withNextIntl = createNextIntlPlugin();
export default withNextIntl(nextConfig);
