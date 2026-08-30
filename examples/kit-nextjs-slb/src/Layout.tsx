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
import {
  shouldRenderSlbFallback,
  type SlbFallbackPageModel,
} from '@/lib/slb-fallback-content';

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

  return (
    <>
      <Scripts />
      <SitecoreStyles layoutData={layout} />
      <Providers page={page}>
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
                {route && (
                  <AppPlaceholder
                    page={page}
                    componentMap={componentMap}
                    name="headless-header"
                    rendering={route}
                  />
                )}
              </div>
              <main className="flex-1">
                <div id="content" className="antialiased">
                  {showFallback && mode.isEditing && route && (
                    <AppPlaceholder
                      page={page}
                      componentMap={componentMap}
                      name="headless-main"
                      rendering={route}
                    />
                  )}
                  {showFallback && fallbackPage ? (
                    <SlbFallbackPage
                      page={fallbackPage}
                      editing={mode.isEditing}
                    />
                  ) : route ? (
                    <AppPlaceholder
                      page={page}
                      componentMap={componentMap}
                      name="headless-main"
                      rendering={route}
                    />
                  ) : null}
                </div>
              </main>
              <div id="footer">
                {route && (
                  <AppPlaceholder
                    page={page}
                    componentMap={componentMap}
                    name="headless-footer"
                    rendering={route}
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
