import 'server-only';

import { isDesignLibraryPreviewData, PREVIEW_COOKIES } from '@sitecore-content-sdk/nextjs/editing';
import { cookies, draftMode, headers } from 'next/headers';
import { cache } from 'react';
import { getFixturePage, isConnected } from './allianz-page';
import client from './sitecore-client';

// The SDK's App Router editing transport header is not exported from its public editing entry point.
const EDITING_PARAMS_HEADER = 'x-sitecore-editing-params';

/** Share authoring/delivery selection between rendering and metadata within a request. */
export const loadAllianzPage = cache(async (site: string, locale: string, ...path: string[]) => {
  const draft = await draftMode();

  if (draft.isEnabled) {
    const requestHeaders = await headers();
    // Match the SDK PreviewProxy: editing render header first, navigation cookie second.
    const authorization = requestHeaders.get('Authorization') ||
      (await cookies()).get(PREVIEW_COOKIES.PREVIEW_TOKEN)?.value;
    const fetchOptions = authorization ? { headers: { Authorization: authorization } } : undefined;

    // Navigation has no editing payload; PreviewProxy scopes this route read to authoring.
    if (!requestHeaders.get(EDITING_PARAMS_HEADER)) {
      const page = await client.getPage(path, { site, locale }, {
        headers: { ...fetchOptions?.headers, sc_previewMode: 'true', sc_site: site },
      });
      return { page, needsComponentData: true };
    }

    const previewData = client.getPreviewData(requestHeaders);
    const page = isDesignLibraryPreviewData(previewData)
      ? await client.getDesignLibraryData(previewData, fetchOptions)
      : await client.getPreview(previewData, fetchOptions);

    return { page, needsComponentData: true };
  }

  const connected = isConnected();
  const page = connected
    ? await client.getPage(path, { site, locale })
    : getFixturePage(path, site, locale);

  return { page, needsComponentData: connected };
});
