export const DEFAULT_SITE_COLLECTION_NAME = 'SLB';

/**
 * Builds a Sitecore content-tree path without coupling the rendering host to
 * one site collection. Deployments can override the SLB collection with
 * SITECORE_SITE_COLLECTION_NAME when the content tree uses another name.
 */
export function buildSiteDataPath(siteName: string, suffix: string): string {
  const siteCollectionName =
    process.env.SITECORE_SITE_COLLECTION_NAME?.trim() ||
    DEFAULT_SITE_COLLECTION_NAME;

  return `/sitecore/content/${siteCollectionName}/${siteName}${suffix}`;
}
