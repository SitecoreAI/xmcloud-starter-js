import { defineConfig } from '@sitecore-content-sdk/nextjs/config';
/**
 * @type {import('@sitecore-content-sdk/nextjs/config').SitecoreConfig}
 * See the documentation for `defineConfig`:
 * https://doc.sitecore.com/xmc/en/developers/content-sdk/the-sitecore-configuration-file.html
 */
const isConnected = process.env.NEXT_PUBLIC_ALLIANZ_CONTENT_MODE === 'connected';
export default defineConfig({
  api: {
    edge: {
      // SDK configuration requires an identifier even for fixtures; it is never
      // sent because every fixture read and proxy path uses the local adapter.
      contextId: isConnected ? process.env.SITECORE_EDGE_CONTEXT_ID || process.env.NEXT_PUBLIC_SITECORE_EDGE_CONTEXT_ID || '' : 'disconnected-fixture-do-not-send',
      clientContextId: isConnected ? process.env.NEXT_PUBLIC_SITECORE_EDGE_CONTEXT_ID || '' : '',
    },
  },
  defaultSite: process.env.NEXT_PUBLIC_DEFAULT_SITE_NAME || 'allianz-life',
  defaultLanguage: 'en',
  generateStaticPaths: isConnected,
  disableCodeGeneration: !isConnected,
  multisite: { enabled: isConnected },
  redirects: { enabled: isConnected },
  personalize: { enabled: isConnected, scope: process.env.NEXT_PUBLIC_PERSONALIZE_SCOPE },
});
