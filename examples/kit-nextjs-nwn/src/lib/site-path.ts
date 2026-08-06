export const NWN_SITE_NAME = 'kit-nextjs-nwn';
export const NWN_SITE_COLLECTION_NAME = 'utilities';

/**
 * Builds a content-tree path without coupling the rendering host to a shared
 * starter collection. An environment override supports alternate collection
 * names while retaining a safe NW Natural default.
 */
export function buildSiteDataPath(siteName: string, suffix: string): string {
  const siteCollectionName =
    process.env.SITECORE_SITE_COLLECTION_NAME?.trim() ||
    NWN_SITE_COLLECTION_NAME;

  return '/sitecore/content/' + siteCollectionName + '/' + siteName + suffix;
}
