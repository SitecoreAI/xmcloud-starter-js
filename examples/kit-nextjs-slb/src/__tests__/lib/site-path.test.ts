import { buildSiteDataPath } from '@/lib/site-path';

describe('buildSiteDataPath', () => {
  const originalSiteCollectionName = process.env.SITECORE_SITE_COLLECTION_NAME;

  afterEach(() => {
    if (originalSiteCollectionName === undefined) {
      delete process.env.SITECORE_SITE_COLLECTION_NAME;
    } else {
      process.env.SITECORE_SITE_COLLECTION_NAME = originalSiteCollectionName;
    }
  });

  it('uses the SLB collection as the default', () => {
    delete process.env.SITECORE_SITE_COLLECTION_NAME;

    expect(buildSiteDataPath('slb', '/Data/AI Config/Summary')).toBe(
      '/sitecore/content/SLB/slb/Data/AI Config/Summary',
    );
  });

  it('uses the configured Sitecore collection name', () => {
    process.env.SITECORE_SITE_COLLECTION_NAME = ' SLB ';

    expect(buildSiteDataPath('slb', '/Data/AI Config/FAQ')).toBe(
      '/sitecore/content/SLB/slb/Data/AI Config/FAQ',
    );
  });
});
