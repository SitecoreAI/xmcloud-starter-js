import { defineConfig } from '@sitecore-content-sdk/nextjs/config';
import { usesFixtureContent } from './src/lib/allianz-content-mode';
/**
 * @type {import('@sitecore-content-sdk/nextjs/config').SitecoreConfig}
 * See the documentation for `defineConfig`:
 * https://doc.sitecore.com/xmc/en/developers/content-sdk/the-sitecore-configuration-file.html
 */
const fixtures = usesFixtureContent();
export default defineConfig({
  ...(fixtures && { api: {
    edge: {
      // The explicit development/test adapter makes no CMS requests.
      contextId: 'disconnected-fixture-do-not-send',
      clientContextId: '',
    },
  } }),
  defaultSite: process.env.NEXT_PUBLIC_DEFAULT_SITE_NAME || 'allianz-life',
  defaultLanguage: 'en',
  generateStaticPaths: !fixtures,
  disableCodeGeneration: fixtures,
  multisite: { enabled: !fixtures },
  redirects: { enabled: !fixtures },
  personalize: { enabled: !fixtures, scope: process.env.NEXT_PUBLIC_PERSONALIZE_SCOPE },
});
