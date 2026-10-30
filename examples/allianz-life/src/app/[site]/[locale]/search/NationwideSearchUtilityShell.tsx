import 'server-only';

import type { ReactNode } from 'react';
import type { Page } from '@sitecore-content-sdk/nextjs';
import { notFound } from 'next/navigation';
import { NextIntlClientProvider } from 'next-intl';
import { setRequestLocale } from 'next-intl/server';
import components from '.sitecore/component-map';
import Layout from 'src/Layout';
import Providers from 'src/Providers';
import client from 'src/lib/sitecore-client';
import { loadAllianzPage } from 'lib/allianz-page-loader';
import { enrichAllianzComponentMap } from 'lib/allianz-automatic-components';
import { isLocalSearchScope } from './search-data';

/** A utility route with the published nationwide shell, not the Home page's main content. */
export default async function NationwideSearchUtilityShell({
  site, locale, children,
}: { site: string; locale: string; children: ReactNode }) {
  if (!isLocalSearchScope(site, locale)) notFound();
  setRequestLocale(`${site}_${locale}`);
  // Search remains usable if the separate Home shell cannot be fetched.
  let loaded: Awaited<ReturnType<typeof loadAllianzPage>>;
  try {
    loaded = await loadAllianzPage(site, locale);
  } catch {
    return children;
  }
  const { page, needsComponentData, componentFetchOptions } = loaded;
  const route = page?.layout.sitecore.route;
  // This utility has no native CMS page. Never expose Home authoring controls
  // or its content when editing/previewing the utility route.
  if (!page || !route || !page.mode.isNormal || page.mode.isPreview ||
      page.mode.isEditing || page.mode.isDesignLibrary) return children;

  const viewPage: Page = {
    ...page,
    layout: {
      ...page.layout,
      sitecore: {
        ...page.layout.sitecore,
        context: { ...page.layout.sitecore.context, itemPath: '/search' },
        route: {
          name: 'search',
          fields: {},
          placeholders: {
            'headless-header': route.placeholders['headless-header'] ?? [],
            'headless-footer': route.placeholders['headless-footer'] ?? [],
            'headless-main': [],
          },
        },
      },
    },
  };
  let componentProps = {};
  if (needsComponentData) {
    try {
      componentProps = await client.getComponentData(viewPage.layout, {}, enrichAllianzComponentMap(components, {
        getData: client.getData.bind(client),
        fetchOptions: componentFetchOptions,
      }));
    } catch {
      return children;
    }
  }

  return <NextIntlClientProvider>
    <Providers page={viewPage} componentProps={componentProps}>
      <Layout page={viewPage} mainContent={children} />
    </Providers>
  </NextIntlClientProvider>;
}
