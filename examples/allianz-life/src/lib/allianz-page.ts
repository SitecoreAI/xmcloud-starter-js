import { LayoutServicePageState, type Page, type ComponentRendering } from '@sitecore-content-sdk/nextjs';
import fixtureJson from '../../content/native-content.json';
import type { FixtureContent } from '../content/types';
import { publicRouteAliases } from './public-routes';

export const fixtureContent = fixtureJson as unknown as FixtureContent;
const aliases = publicRouteAliases(fixtureContent.routes);
export const isConnected = () => process.env.NEXT_PUBLIC_ALLIANZ_CONTENT_MODE === 'connected';

/** The fixture adapter produces the same Layout Service payload as connected Edge. */
export function getFixturePage(path: string[], site = 'allianz-life', locale = 'en'): Page | null {
  // App Router can supply encoded segments to the page while metadata receives
  // decoded segments. Decode once so public slugs containing "$" resolve in both.
  const segments = path.map((segment) => {
    try { return decodeURIComponent(segment); }
    catch { return segment; }
  });
  const key = `/${segments.join('/')}`.replace(/\/$/, '') || '/';
  const canonical = aliases.get(key.toLowerCase()) || key.toLowerCase();
  const fixture = fixtureContent.routes[canonical];
  if (!fixture) return null;
  const legacy = fixture.shellFamily === 'legacy' || fixture.shellFamily?.startsWith('Legacy');
  const shared = legacy ? fixtureContent.shared.legacyShared?.[fixture.legacySharedKey || (key.startsWith('/new-york') ? 'new-york' : 'allianz-life')] : undefined;
  const headers = fixture.components.filter((component) => ['AllianzBreadcrumbs','AllianzLegacyBreadcrumbs'].includes(component.componentName));
  const sidebars = fixture.components.filter((component) => component.componentName === 'AllianzLegacySidebar');
  const main = fixture.components.filter((component) => !headers.includes(component) && !sidebars.includes(component));
  return {
    siteName: site,
    locale,
    mode: { name: LayoutServicePageState.Normal, isNormal: true, isEditing: false, isPreview: false, isDesignLibrary: false, designLibrary: { isVariantGeneration: false } },
    layout: { sitecore: {
      context: { pageState: LayoutServicePageState.Normal, pageEditing: false, language: locale, site: { name: site } },
      route: {
        name: fixture.title,
        itemId: fixture.components[0]?.dataSource,
        itemLanguage: locale,
        fields: { Title: { value: fixture.title }, metadataDescription: { value: fixture.description }, shellFamily: {value: legacy ? 'legacy' : 'modern'}, legacySharedKey: {value: fixture.legacySharedKey || (key.startsWith('/new-york') ? 'new-york' : 'allianz-life')}, sourceBodyId: {value: fixture.sourceBodyId || ''}, sourceBodyClasses: {value: fixture.sourceBodyClasses?.join(' ') || ''} },
        placeholders: {
          // SDK's default ComponentFields type omits integrated GraphQL payloads.
          // Only this adapter boundary coerces the already typed datasource contract.
          'headless-header': [shared?.header || fixtureContent.shared.header, ...headers] as unknown as ComponentRendering[],
          'headless-sidebar': sidebars as unknown as ComponentRendering[],
          'headless-main': main as unknown as ComponentRendering[],
          'headless-footer': [shared?.footer || fixtureContent.shared.footer] as unknown as ComponentRendering[],
        },
      },
    } },
  };
}
