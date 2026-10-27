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

interface NewYorkSearchUtilityShellProps {
  site: string;
  locale: string;
  kind: 'search' | 'advanced';
  children: ReactNode;
}

/** Reuse the native NY shell without publishing or replacing its authored main. */
export default async function NewYorkSearchUtilityShell({
  site, locale, kind, children,
}: NewYorkSearchUtilityShellProps) {
  if (!isLocalSearchScope(site, locale)) notFound();
  setRequestLocale(`${site}_${locale}`);
  const segments = kind === 'advanced'
    ? ['new-york', 'search', 'advanced-search'] : ['new-york', 'search'];
  const { page, needsComponentData, componentFetchOptions } = await loadAllianzPage(site, locale, ...segments);
  const route = page?.layout.sitecore.route;
  if (!page || !route) notFound();

  // Only normal delivery replaces the main region with this app-owned utility.
  // Preview/editing retain the original native metadata and insertion geometry.
  const utilityMain = page.mode.isNormal && !page.mode.isPreview &&
    !page.mode.isEditing && !page.mode.isDesignLibrary;
  const viewPage: Page = utilityMain ? {
    ...page,
    layout: {
      ...page.layout,
      sitecore: {
        ...page.layout.sitecore,
        route: {
          ...route,
          placeholders: { ...route.placeholders, 'headless-main': [] },
        },
      },
    },
  } : page;

  // The unrendered native main is not fetched in normal mode. Header/footer and
  // every other retained placeholder still use the existing completeness gate.
  const componentProps = needsComponentData
    ? await client.getComponentData(viewPage.layout, {}, enrichAllianzComponentMap(components, {
      getData: client.getData.bind(client),
      fetchOptions: componentFetchOptions,
    })) : {};

  return <NextIntlClientProvider>
    <Providers page={viewPage} componentProps={componentProps}>
      <Layout page={viewPage} {...(utilityMain ? { mainContent: children } : {})} />
    </Providers>
  </NextIntlClientProvider>;
}
