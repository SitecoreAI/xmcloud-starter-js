export const KIRKLAND_SITE_NAME = 'kit-nextjs-kirkland';
export const KIRKLAND_SITE_COLLECTION_NAME = 'legal';

/**
 * Builds a content-tree path without coupling the rendering host to a specific
 * Sitecore site collection. Sitecore item paths are case-insensitive, but the
 * configured name should match the collection created for the demo.
 */
export function buildSiteDataPath(siteName: string, suffix: string): string {
  const siteCollectionName =
    process.env.SITECORE_SITE_COLLECTION_NAME?.trim() ||
    KIRKLAND_SITE_COLLECTION_NAME;

  return `/sitecore/content/${siteCollectionName}/${siteName}${suffix}`;
}
