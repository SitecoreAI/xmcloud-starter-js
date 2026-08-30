import { defineConfig } from '@sitecore-content-sdk/nextjs/config';
/**
 * @type {import('@sitecore-content-sdk/nextjs/config').SitecoreConfig}
 * See the documentation for `defineConfig`:
 * https://doc.sitecore.com/xmc/en/developers/content-sdk/the-sitecore-configuration-file.html
 */
export default defineConfig({
  // Editing hosts render draft routes on demand. Public hosts can opt into
  // pre-rendering by setting GENERATE_STATIC_PATHS=true.
  generateStaticPaths: false,
});
