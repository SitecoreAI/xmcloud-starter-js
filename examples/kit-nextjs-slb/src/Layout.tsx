/**
 * This Layout is needed for Starter Kit.
 */
import React, { type JSX } from 'react';
import {
  Page,
  Field,
  ImageField,
  AppPlaceholder,
  DesignLibraryApp,
} from '@sitecore-content-sdk/nextjs';
import Scripts from '@/Scripts';
import SitecoreStyles from '@/components/content-sdk/SitecoreStyles';
import componentMap from '.sitecore/component-map';
import Providers from './Providers';
import SlbFallbackPage from '@/components/slb-fallback/SlbFallbackPage';
import { LocalSlbHeader } from '@/components/global-header/GlobalHeader';
import { LocalSlbFooter } from '@/components/global-footer/GlobalFooter';
import {
  hasPlaceholderPresentation,
  shouldRenderSlbFallback,
  type SlbFallbackPageModel,
} from '@/lib/slb-fallback-content';
import { hasLegacySolterraRouteContent } from '@/lib/slb-content-safety';

interface LayoutProps {
  page: Page;
  fallbackPage?: SlbFallbackPageModel;
}

export interface RouteFields {
  [key: string]: unknown;
  Title?: Field;
  metadataTitle?: Field;
  metadataAuthor?: Field;
  metadataKeywords?: Field;
  pageTitle?: Field;
  metadataDescription?: Field;
  pageSummary?: Field;
  ogTitle?: Field;
  ogDescription?: Field;
  ogImage?: ImageField;
  thumbnailImage?: ImageField;
}

const slbFallbackCompatibleMainComponents = new Set(['CtaBanner']);

function createCompatibleSlbMainRoute<TRoute>(
  route: TRoute,
): Exclude<TRoute, null | undefined> | undefined {
  if (!route || typeof route !== 'object') return undefined;

  const placeholders = (route as { placeholders?: Record<string, unknown> })
    .placeholders;
  const mainPresentation = placeholders?.['headless-main'];
  if (!Array.isArray(mainPresentation)) return undefined;

  const compatibleMainPresentation = mainPresentation.filter(
    (rendering) =>
      rendering !== null &&
      typeof rendering === 'object' &&
      slbFallbackCompatibleMainComponents.has(
        String((rendering as { componentName?: unknown }).componentName || ''),
      ),
  );
  if (!compatibleMainPresentation.length) return undefined;

  return {
    ...(route as Record<string, unknown>),
    placeholders: {
      ...placeholders,
      'headless-main': compatibleMainPresentation,
    },
  } as Exclude<TRoute, null | undefined>;
}

const Layout = ({ page, fallbackPage }: LayoutProps): JSX.Element => {
  const { layout, mode } = page;
  const { route } = layout.sitecore;
  const mainClassPageEditing = mode.isEditing ? 'editing-mode' : 'prod-mode';
  const classNamesMain = `${mainClassPageEditing} slb-fonts main-layout`;
  const showFallback = shouldRenderSlbFallback({
    route,
    fallbackPage,
    isDesignLibrary: mode.isDesignLibrary,
  });
  const compatibleMainRoute = fallbackPage
    ? createCompatibleSlbMainRoute(route)
    : undefined;
  const hasLegacyMainContent = Boolean(
    fallbackPage && hasLegacySolterraRouteContent(route),
  );
  const hasCompatibleMainContent = Boolean(compatibleMainRoute);
  const exposeLegacyAuthoringPresentation = Boolean(
    fallbackPage && mode.isEditing && hasLegacyMainContent && route,
  );
  const showFallbackPage = Boolean(
    fallbackPage &&
      !exposeLegacyAuthoringPresentation &&
      (showFallback || hasCompatibleMainContent),
  );
  const showUnfilteredMainPlaceholder = Boolean(
    route &&
      (!showFallbackPage ||
        (showFallback && mode.isEditing && !hasLegacyMainContent)),
  );
  const mainPlaceholderRoute = exposeLegacyAuthoringPresentation
    ? route
    : compatibleMainRoute ||
      (showUnfilteredMainPlaceholder ? route : undefined);
  const showLocalHeader = Boolean(
    route &&
      fallbackPage &&
      !hasPlaceholderPresentation(route, 'headless-header'),
  );
  const showLocalFooter = Boolean(
    route &&
      fallbackPage &&
      !hasPlaceholderPresentation(route, 'headless-footer'),
  );

  return (
    <>
      <SitecoreStyles layoutData={layout} />
      <Providers page={page}>
        <Scripts />
        {/* root placeholder for the app, which we add components to using route data */}
        <div
          className={`bg-background text-foreground min-h-screen flex flex-col ${classNamesMain}`}
        >
          {mode.isDesignLibrary ? (
            route && (
              <DesignLibraryApp
                page={page}
                rendering={route}
                componentMap={componentMap}
                loadServerImportMap={() =>
                  import('.sitecore/import-map.server')
                }
              />
            )
          ) : (
            <>
              <div id="header">
                {route && (!showLocalHeader || mode.isEditing) && (
                  <AppPlaceholder
                    page={page}
                    componentMap={componentMap}
                    name="headless-header"
                    rendering={route}
                  />
                )}
                {showLocalHeader && <LocalSlbHeader page={page} />}
              </div>
              <main className="flex-1">
                <div id="content" className="antialiased">
                  {mainPlaceholderRoute && (
                    <AppPlaceholder
                      page={page}
                      componentMap={componentMap}
                      name="headless-main"
                      rendering={mainPlaceholderRoute}
                    />
                  )}
                  {showFallbackPage && fallbackPage ? (
                    <SlbFallbackPage
                      page={fallbackPage}
                      editing={mode.isEditing}
                    />
                  ) : null}
                </div>
              </main>
              <div id="footer">
                {route && (!showLocalFooter || mode.isEditing) && (
                  <AppPlaceholder
                    page={page}
                    componentMap={componentMap}
                    name="headless-footer"
                    rendering={route}
                  />
                )}
                {showLocalFooter && (
                  <LocalSlbFooter
                    locale={page.locale}
                    trackingEnabled={page.mode.isNormal}
                  />
                )}
              </div>
            </>
          )}
        </div>
      </Providers>
    </>
  );
};

export default Layout;
