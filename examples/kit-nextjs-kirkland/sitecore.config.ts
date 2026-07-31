import { defineConfig } from '@sitecore-content-sdk/nextjs/config';
/**
 * @type {import('@sitecore-content-sdk/nextjs/config').SitecoreConfig}
 * See the documentation for `defineConfig`:
 * https://doc.sitecore.com/xmc/en/developers/content-sdk/the-sitecore-configuration-file.html
 */
export default defineConfig({
  defaultSite:
    process.env.NEXT_PUBLIC_DEFAULT_SITE_NAME || 'kit-nextjs-kirkland',
  defaultLanguage: process.env.NEXT_PUBLIC_DEFAULT_LANGUAGE || 'en',
});
