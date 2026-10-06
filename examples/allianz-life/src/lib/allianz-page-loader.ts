import 'server-only';

import type { EditingPreviewData } from '@sitecore-content-sdk/content/editing';

import { isDesignLibraryPreviewData, PREVIEW_COOKIES } from '@sitecore-content-sdk/nextjs/editing';
import { cookies, draftMode, headers } from 'next/headers';
import { cache } from 'react';
import { getFixturePage, isConnected } from './allianz-page';
import client from './sitecore-client';

// The SDK's App Router editing transport header is not exported from its public editing entry point.
const EDITING_PARAMS_HEADER = 'x-sitecore-editing-params';

/** Share authoring/delivery selection for native decoded paths within a request. */
export const loadAllianzPage = cache(async (site: string, locale: string, ...path: string[]) => {
  const draft = await draftMode();

  if (draft.isEnabled) {
    const requestHeaders = await headers();
    // Match the SDK PreviewProxy: editing render header first, navigation cookie second.
    const authorization = requestHeaders.get('Authorization') ||
      (await cookies()).get(PREVIEW_COOKIES.PREVIEW_TOKEN)?.value;
    const fetchOptions = authorization ? { headers: { Authorization: authorization } } : undefined;
    const navigationFetchOptions = {
      headers: { ...fetchOptions?.headers, sc_previewMode: 'true', sc_site: site },
    };

    // Navigation has no editing payload; PreviewProxy scopes this route read to authoring.
    if (!requestHeaders.get(EDITING_PARAMS_HEADER)) {
      const page = await client.getPage(path, { site, locale }, navigationFetchOptions);
      return { page, needsComponentData: true, componentFetchOptions: navigationFetchOptions };
    }

    const previewData = client.getPreviewData(requestHeaders);
    const page = isDesignLibraryPreviewData(previewData)
      ? await client.getDesignLibraryData(previewData, fetchOptions)
      : await client.getPreview(previewData, fetchOptions);

    // Mirror the installed SDK EditingService's native routing headers for
    // component-level GraphQL reads. Keep authorization server-side only.
    const editingData = typeof previewData === 'object' && previewData !== null &&
      'mode' in previewData && (previewData.mode === 'edit' || previewData.mode === 'preview')
      ? previewData as EditingPreviewData : undefined;
    const componentFetchOptions = !editingData
      ? navigationFetchOptions
      : { headers: {
        ...fetchOptions?.headers,
        sc_layoutKind: editingData.layoutKind ?? 'final',
        sc_editMode: editingData.mode === 'edit' ? 'true' : 'false',
        sc_previewMode: editingData.mode === 'preview' ? 'true' : 'false',
        sc_site: site,
        ...(editingData.previewTime ? { sc_previewTime: editingData.previewTime } : {}),
      } };
    return { page, needsComponentData: true, componentFetchOptions };
  }

  const connected = isConnected();
  const page = connected
    ? await client.getPage(path, { site, locale })
    // The legacy fixture adapter decodes its input; encode native segments to
    // preserve literal percent sequences while keeping its existing API intact.
    : getFixturePage(path.map(encodeURIComponent), site, locale);

  return { page, needsComponentData: connected, componentFetchOptions: undefined };
});
