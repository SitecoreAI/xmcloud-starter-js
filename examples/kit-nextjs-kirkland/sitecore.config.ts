import { defineConfig } from '@sitecore-content-sdk/nextjs/config';
/**
 * @type {import('@sitecore-content-sdk/nextjs/config').SitecoreConfig}
 * See the documentation for `defineConfig`:
 * https://doc.sitecore.com/xmc/en/developers/content-sdk/the-sitecore-configuration-file.html
 */
export default defineConfig({
  // This is a dedicated rendering host. Pin the Sitecore route key so a stale
  // Vercel environment value cannot resolve requests against another site.
  defaultSite: 'kit-nextjs-kirkland',
  defaultLanguage: process.env.NEXT_PUBLIC_DEFAULT_LANGUAGE || 'en',
});
