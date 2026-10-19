import 'server-only';

import type { EditingPreviewData } from '@sitecore-content-sdk/content/editing';

import { isDesignLibraryPreviewData, PREVIEW_COOKIES } from '@sitecore-content-sdk/nextjs/editing';
import { cookies, draftMode, headers } from 'next/headers';
import { cache } from 'react';
import { getFixturePage, isConnected } from './allianz-page';
import client from './sitecore-client';

// The SDK's App Router editing transport header is not exported from its public editing entry point.
const EDITING_PARAMS_HEADER = 'x-sitecore-editing-params';

const APPROVED_CASH_PATHS = [
  ['what-we-offer', 'annuities', 'investment-strategies', 'cash-equivalent'],
  ['new-york', 'annuities', 'investment-strategies', 'cash-equivalent'],
] as const;

/** Describe complete bundled navigation arrays, never native query results. */
function completeSnapshotNavigation(value: unknown): void {
  if (!value || typeof value !== 'object') return;
  if (Array.isArray(value)) {
    value.forEach(completeSnapshotNavigation);
    return;
  }
  const record = value as Record<string, unknown>;
  if (record.children && typeof record.children === 'object') {
    const children = record.children as Record<string, unknown>;
    if (Array.isArray(children.results)) {
      children.total = children.results.length;
      children.pageInfo = { hasNext: false };
    }
  }
  Object.values(record).forEach(completeSnapshotNavigation);
}

/** Approved public snapshots do not imply that their native CMS items published. */
function getApprovedCashSnapshot(site: string, locale: string, path: string[]) {
  if (site !== 'allianz-life' || locale !== 'en' ||
    !APPROVED_CASH_PATHS.some((approved) => approved.length === path.length &&
      approved.every((segment, index) => segment === path[index]))) return null;

  const page = structuredClone(getFixturePage(path.map(encodeURIComponent), site, locale));
  const route = page?.layout.sitecore.route;
  if (!page || !route) return null;

  // The adapter's inventory datasource ID is not a published native page identity.
  delete route.itemId;
  page.layout.sitecore.context.itemPath = `/${path.join('/')}`;
  page.layout.sitecore.context.allianzContentSource = {
    kind: 'approved-cash-bundled-snapshot',
    canonicalPath: `/${path.join('/')}`,
    nativePublicationVerified: false,
  };
  completeSnapshotNavigation(route.placeholders['headless-header']);
  completeSnapshotNavigation(route.placeholders['headless-footer']);
  return page;
}

const APPROVED_DEATH_CLAIM_PATHS = [
  ['report-a-death'],
  ['new-york', 'report-a-death'],
] as const;

/** Demo snapshots are separate from guarded native CMS publication. */
function getApprovedDeathClaimSnapshot(site: string, locale: string, path: string[]) {
  if (site !== 'allianz-life' || locale !== 'en' ||
    !APPROVED_DEATH_CLAIM_PATHS.some((approved) => approved.length === path.length &&
      approved.every((segment, index) => segment === path[index]))) return null;

  const page = structuredClone(getFixturePage(path.map(encodeURIComponent), site, locale));
  const route = page?.layout.sitecore.route;
  if (!page || !route) return null;

  delete route.itemId;
  page.layout.sitecore.context.itemPath = `/${path.join('/')}`;
  page.layout.sitecore.context.allianzContentSource = {
    kind: 'approved-death-claim-bundled-snapshot',
    canonicalPath: `/${path.join('/')}`,
    nativePublicationVerified: false,
  };
  // The captured NY tools list also needs complete bundled collection metadata.
  completeSnapshotNavigation(route.placeholders);
  return page;
}

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

  // Only an absent delivery route can select the exact approved snapshots.
  // Authoring returns above; request failures still propagate from getPage.
  if (connected && page === null) {
    const snapshot = getApprovedCashSnapshot(site, locale, path) ||
      getApprovedDeathClaimSnapshot(site, locale, path);
    if (snapshot) return { page: snapshot, needsComponentData: false, componentFetchOptions: undefined };
  }

  return { page, needsComponentData: connected, componentFetchOptions: undefined };
});
