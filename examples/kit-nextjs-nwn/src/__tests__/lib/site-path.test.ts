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

  it('uses the live utilities collection by default', () => {
    delete process.env.SITECORE_SITE_COLLECTION_NAME;

    expect(buildSiteDataPath('kit-nextjs-nwn', '/Data/AI Config/Summary')).toBe(
      '/sitecore/content/utilities/kit-nextjs-nwn/Data/AI Config/Summary',
    );
  });

  it('uses and trims an explicitly configured collection name', () => {
    process.env.SITECORE_SITE_COLLECTION_NAME = ' Utility Sites ';

    expect(buildSiteDataPath('kit-nextjs-nwn', '/Data/AI Config/FAQ')).toBe(
      '/sitecore/content/Utility Sites/kit-nextjs-nwn/Data/AI Config/FAQ',
    );
  });
});
